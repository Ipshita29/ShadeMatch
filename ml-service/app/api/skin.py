import base64
import traceback

import cv2
import numpy as np
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.skin import SkinAnalysisRequest
from app.services import image_quality, pixel_sampler, skin_profile
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

# Errors shared by every route that starts from an image URL — each maps a
# specific failure to the (status_code, response_body) pair the client sees.
GENERIC_PROCESSING_ERROR = JSONResponse(
    status_code=422, content={"success": False, "error": "Unable to process image"}
)


class SkinRegionExtractionError(Exception):
    """Wraps a ready-to-return JSONResponse so callers can short-circuit
    without duplicating error-formatting logic."""

    def __init__(self, response: JSONResponse):
        self.response = response


def _extract_skin_regions(payload: SkinAnalysisRequest) -> dict:
    """Runs the full Part 4 pipeline (download -> validate -> resize ->
    detect face -> select regions -> sample pixels -> assess quality) and
    returns the same "data" dict the /analyze/skin-regions endpoint returns.
    Shared by that endpoint and Part 5's /analyze/skin-profile so the
    extraction logic is never duplicated.

    Raises SkinRegionExtractionError carrying the exact JSONResponse to
    return when a known, expected failure occurs (bad image, no face, etc).
    """
    try:
        image_bytes = download_image(payload.imageUrl)
    except ImageDownloadError:
        raise SkinRegionExtractionError(
            JSONResponse(
                status_code=502,
                content={"success": False, "error": "Unable to download the image. Please check the photo URL and try again."},
            )
        )

    try:
        image = load_image(image_bytes)
    except InvalidImageError:
        raise SkinRegionExtractionError(GENERIC_PROCESSING_ERROR)

    processed_image = resize_for_processing(image)
    proc_height, proc_width = processed_image.shape[:2]

    try:
        face = detect_primary_face(processed_image)
    except NoFaceDetectedError:
        raise SkinRegionExtractionError(
            JSONResponse(
                status_code=422,
                content={
                    "success": False,
                    "error": "No clear face detected. Please upload a front-facing photo with the face clearly visible.",
                },
            )
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

    return data


@router.post("/analyze/skin-regions")
def analyze_skin_regions(payload: SkinAnalysisRequest):
    try:
        data = _extract_skin_regions(payload)
        return {"success": True, "data": data}
    except SkinRegionExtractionError as error:
        return error.response
    except Exception:
        # Never leak a Python stack trace to the client — log it server-side
        # and return a clean, generic error instead.
        print("[skin analysis] unexpected error:\n" + traceback.format_exc())
        return JSONResponse(status_code=500, content={"success": False, "error": "Unable to process image"})


@router.post("/analyze/skin-profile")
def analyze_skin_profile(payload: SkinAnalysisRequest):
    """Part 5: runs the same Part 4 extraction as /analyze/skin-regions,
    then converts the raw region measurements into a structured skin
    profile (depth/undertone/hue/representative color/confidence/quality).
    All classification logic lives in app/services/skin_profile.py.
    """
    try:
        region_data = _extract_skin_regions(payload)
        profile_data = skin_profile.generate_skin_profile(region_data)

        if payload.debug and "debug" in region_data:
            profile_data["debug"] = region_data["debug"]

        return {"success": True, "data": profile_data}
    except SkinRegionExtractionError as error:
        return error.response
    except Exception:
        print("[skin profile] unexpected error:\n" + traceback.format_exc())
        return JSONResponse(status_code=500, content={"success": False, "error": "Unable to process image"})


def _encode_jpeg_base64(image_rgb: np.ndarray) -> str:
    bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    success, buffer = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not success:
        return ""
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode("ascii")
