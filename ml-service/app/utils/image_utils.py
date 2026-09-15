"""Image loading, validation and resizing helpers shared by the skin-region
analysis pipeline. Kept free of any MediaPipe/face-specific logic so it can
be reused by future ML endpoints.
"""

import io

import cv2
import numpy as np
import requests
from PIL import Image, UnidentifiedImageError

# Images are downsized so their longest side is at most this many pixels
# before any CV processing runs. 1024px keeps MediaPipe's face landmark
# model fast (sub-second on CPU) while still preserving enough detail for
# reliable cheek/forehead region sampling — well beyond the model's own
# internal working resolution. Very large phone-camera photos (4000px+)
# would otherwise dominate processing time for no accuracy benefit.
MAX_PROCESSING_DIMENSION = 1024

# Anything smaller than this is unlikely to contain enough detail for
# reliable landmark detection or region sampling.
MIN_DIMENSION = 100

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


class ImageDownloadError(Exception):
    """Raised when the source image URL can't be fetched."""


class InvalidImageError(Exception):
    """Raised when the downloaded bytes aren't a usable image."""


def download_image(url: str, timeout: int = 10) -> bytes:
    if not url or not url.lower().startswith(("http://", "https://")):
        raise ImageDownloadError("Image URL must be an absolute http(s) URL.")

    try:
        response = requests.get(url, timeout=timeout)
    except requests.RequestException as error:
        raise ImageDownloadError(f"Could not download image: {error}") from error

    if response.status_code != 200:
        raise ImageDownloadError(f"Image URL returned HTTP {response.status_code}.")

    content_type = response.headers.get("content-type", "")
    if content_type and not content_type.startswith("image/"):
        raise ImageDownloadError(f"URL did not return an image (content-type: {content_type}).")

    return response.content


def load_image(image_bytes: bytes) -> np.ndarray:
    """Decodes image bytes into an RGB numpy array (H, W, 3), validating
    format and dimensions along the way."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as pil_image:
            pil_image.verify()
        # verify() consumes the file handle, so re-open to actually load pixels.
        with Image.open(io.BytesIO(image_bytes)) as pil_image:
            image_format = pil_image.format
            if image_format not in ALLOWED_FORMATS:
                raise InvalidImageError(f"Unsupported image format: {image_format}")
            rgb_image = pil_image.convert("RGB")
            array = np.array(rgb_image)
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise InvalidImageError(f"Could not read image: {error}") from error

    height, width = array.shape[:2]
    if width < MIN_DIMENSION or height < MIN_DIMENSION:
        raise InvalidImageError(
            f"Image is too small to analyze ({width}x{height})."
        )

    return array


def resize_for_processing(image: np.ndarray, max_dimension: int = MAX_PROCESSING_DIMENSION) -> np.ndarray:
    """Downscales large images for faster processing. Never upscales."""
    height, width = image.shape[:2]
    longest_side = max(height, width)

    if longest_side <= max_dimension:
        return image

    scale = max_dimension / longest_side
    new_width = max(1, round(width * scale))
    new_height = max(1, round(height * scale))

    return cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
