import base64
import traceback

import cv2
import numpy as np
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.skin import SkinAnalysisRequest
from app.services import image_quality, pixel_sampler
from app.services.face_detector import NoFaceDetectedError, detect_primary_face
from app.services.skin_region_extractor import draw_debug_overlay, select_regions
from app.utils.image_utils import (
    ImageDownloadError,
    InvalidImageError,
    download_image,
    load_image,
    resize_for_processing,
)

router = APIRouter()

# Fixed seed keeps region sampling reproducible across requests/tests for
# the same image, without needing every pixel to be included.
_SAMPLING_RNG = np.random.default_rng(42)

_REGION_ORDER = ("forehead", "leftCheek", "rightCheek")


@router.post("/analyze/skin-regions")
def analyze_skin_regions(payload: SkinAnalysisRequest):
    try:
        image_bytes = download_image(payload.imageUrl)
    except ImageDownloadError:
        return JSONResponse(status_code=502, content={"success": False, "error": "Unable to download the image. Please check the photo URL and try again."})

    try:
        image = load_image(image_bytes)
    except InvalidImageError:
        return JSONResponse(status_code=422, content={"success": False, "error": "Unable to process image"})

    try:
        processed_image = resize_for_processing(image)
        proc_height, proc_width = processed_image.shape[:2]

        try:
            face = detect_primary_face(processed_image)
        except NoFaceDetectedError:
            return JSONResponse(
                status_code=422,
                content={
                    "success": False,
                    "error": "No clear face detected. Please upload a front-facing photo with the face clearly visible.",
                },
            )

        regions = select_regions(face, proc_width, proc_height)

        region_results = {
            name: pixel_sampler.sample_region(processed_image, regions[name].mask, _SAMPLING_RNG)
            for name in _REGION_ORDER
        }
        representative_color = pixel_sampler.combine_region_pixels(region_results)
        pixel_counts = {name: result["pixelCount"] for name, result in region_results.items()}
        quality = image_quality.assess(processed_image, face, region_pixel_counts=pixel_counts)

        data = {
            "faceDetected": True,
            "image": {"width": int(proc_width), "height": int(proc_height)},
            "quality": quality,
            "regions": {
                name: {
                    "pixelCount": result["pixelCount"],
                    "rgb": result["rgb"],
                    "lab": result["lab"],
                }
                for name, result in region_results.items()
            },
            "representativeColor": representative_color,
        }

        if payload.debug:
            annotated = draw_debug_overlay(processed_image, face, regions)
            data["debug"] = {"annotatedImageBase64": _encode_jpeg_base64(annotated)}

        return {"success": True, "data": data}

    except Exception:
        # Never leak a Python stack trace to the client — log it server-side
        # and return a clean, generic error instead.
        print("[skin analysis] unexpected error:\n" + traceback.format_exc())
        return JSONResponse(status_code=500, content={"success": False, "error": "Unable to process image"})


def _encode_jpeg_base64(image_rgb: np.ndarray) -> str:
    bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    success, buffer = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not success:
        return ""
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode("ascii")
