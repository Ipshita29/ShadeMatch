"""Samples pixels from inside a detected swatch region and filters out
obvious text/border/glare artifacts, leaving a clean pixel set for
shade_color_extractor to summarize.

Deliberately separate from ml-service/app/services/pixel_sampler.py: that
module's outlier filter assumes it is sampling human SKIN (it rejects
saturated pixels on purpose, since saturated skin usually means makeup or
jewelry). A foundation swatch is not skin — a deep, richly saturated brown
is exactly the color we want to keep, not an outlier — so shade-chart
sampling needs its own, differently-tuned filter rather than reusing that
one.
"""

import numpy as np

from app.utils.color_utils import rgb_and_lab_stats

# Shrinks each detected bounding box toward its center before sampling, so
# pixels right at a swatch's border/outline/drop-shadow are never included.
INSET_RATIO = 0.3

MAX_SAMPLES = 800

# Printed labels/codes are almost always near-pure black or near-pure white
# text on the swatch — these are the two failure modes worth guarding
# against explicitly, everything else is handled by the MAD filter below.
NEAR_BLACK_LUMINANCE = 12
NEAR_WHITE_LUMINANCE = 248
OUTLIER_MAD_MULTIPLIER = 4.0
MIN_PIXELS_FOR_MAD_FILTER = 20


def _luminance(pixels_rgb: np.ndarray) -> np.ndarray:
    return pixels_rgb[:, 0] * 0.299 + pixels_rgb[:, 1] * 0.587 + pixels_rgb[:, 2] * 0.114


def inset_box(box: dict, ratio: float = INSET_RATIO) -> dict:
    inset_x = int(box["width"] * ratio / 2)
    inset_y = int(box["height"] * ratio / 2)
    return {
        "x": box["x"] + inset_x,
        "y": box["y"] + inset_y,
        "width": max(1, box["width"] - 2 * inset_x),
        "height": max(1, box["height"] - 2 * inset_y),
    }


def _filter_text_and_outliers(pixels_rgb: np.ndarray) -> np.ndarray:
    if pixels_rgb.shape[0] == 0:
        return pixels_rgb

    luminance = _luminance(pixels_rgb)
    keep = (luminance >= NEAR_BLACK_LUMINANCE) & (luminance <= NEAR_WHITE_LUMINANCE)
    filtered = pixels_rgb[keep]

    if filtered.shape[0] >= MIN_PIXELS_FOR_MAD_FILTER:
        median = np.median(filtered, axis=0)
        mad = np.median(np.abs(filtered - median), axis=0)
        mad = np.where(mad == 0, 1e-6, mad)
        distances = np.abs(filtered - median) / mad
        filtered = filtered[np.all(distances <= OUTLIER_MAD_MULTIPLIER, axis=1)]

    return filtered


def sample_swatch(image_rgb: np.ndarray, box: dict, rng: np.random.Generator) -> dict | None:
    """Returns {"rgb": {mean, median}, "lab": {mean, median}, "pixelCount"}
    for one swatch region, or None if too few usable pixels remained after
    filtering (rather than returning a color built from almost nothing)."""
    height, width = image_rgb.shape[:2]
    sample_box = inset_box(box)

    x0 = max(0, sample_box["x"])
    y0 = max(0, sample_box["y"])
    x1 = min(width, sample_box["x"] + sample_box["width"])
    y1 = min(height, sample_box["y"] + sample_box["height"])
    if x1 <= x0 or y1 <= y0:
        return None

    region_pixels = image_rgb[y0:y1, x0:x1].reshape(-1, 3)
    filtered = _filter_text_and_outliers(region_pixels)

    if filtered.shape[0] > MAX_SAMPLES:
        indices = rng.choice(filtered.shape[0], size=MAX_SAMPLES, replace=False)
        filtered = filtered[indices]

    if filtered.shape[0] < MIN_PIXELS_FOR_MAD_FILTER:
        return None

    stats = rgb_and_lab_stats(filtered)
    return {"pixelCount": int(filtered.shape[0]), "rgb": stats["rgb"], "lab": stats["lab"]}
