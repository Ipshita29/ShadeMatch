"""Basic, non-sophisticated photo quality flags — enough to warn the artist
about conditions likely to make the skin-region sample unreliable, without
attempting a real image-quality model.
"""

import numpy as np

BRIGHTNESS_DARK_THRESHOLD = 60      # mean luminance, 0-255
BRIGHTNESS_BRIGHT_THRESHOLD = 200   # mean luminance, 0-255
FACE_SIZE_SMALL_RATIO = 0.15        # face bounding-box height / image height

# A whole-image brightness average can look "acceptable" while one region is
# still locally blown out or shadowed (e.g. hard side lighting) — after
# outlier filtering, very few pixels survive from just that region. Checking
# the weakest region's yield catches that even when the global average, and
# even the combined total across all regions, would not.
MIN_PIXELS_PER_REGION = 30


def _mean_luminance(image_rgb: np.ndarray) -> float:
    return float(
        np.mean(image_rgb[:, :, 0] * 0.299 + image_rgb[:, :, 1] * 0.587 + image_rgb[:, :, 2] * 0.114)
    )


def assess(image_rgb: np.ndarray, face, region_pixel_counts: dict | None = None) -> dict:
    height = image_rgb.shape[0]
    brightness_value = _mean_luminance(image_rgb)

    if brightness_value < BRIGHTNESS_DARK_THRESHOLD:
        brightness = "too_dark"
    elif brightness_value > BRIGHTNESS_BRIGHT_THRESHOLD:
        brightness = "too_bright"
    else:
        brightness = "acceptable"

    face_box = face.bounding_box()
    face_height_ratio = (face_box["height"] / height) if height else 0
    face_size = "small" if face_height_ratio < FACE_SIZE_SMALL_RATIO else "acceptable"

    usable = brightness == "acceptable" and face_size == "acceptable"

    if region_pixel_counts is not None and min(region_pixel_counts.values()) < MIN_PIXELS_PER_REGION:
        usable = False

    return {"usable": usable, "brightness": brightness, "faceSize": face_size}
