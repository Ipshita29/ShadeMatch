"""Extracts skin-region pixels, filters obvious outliers, and computes
representative color statistics. Everything here is vectorized NumPy —
no per-pixel Python loops.
"""

import numpy as np

from app.utils.color_utils import rgb_and_lab_stats, rgb_to_hsv

MAX_SAMPLES_PER_REGION = 1000
MIN_VALID_PIXELS_FOR_STATS = 20

# --- Conservative outlier thresholds -----------------------------------
# These remove pixels that are clearly not usable skin samples. They are
# based only on measured brightness/saturation of the pixel itself — never
# on any assumption about what a given person's skin "should" look like.
# The goal is to clean up obvious problems (shadow, glare, background,
# heavy makeup), not to classify skin tone, which belongs to Part 5.
DARK_LUMINANCE_THRESHOLD = 30       # 0-255: near-black shadow pixels
BRIGHT_LUMINANCE_THRESHOLD = 245    # 0-255: blown-out highlight pixels
LOW_SAT_BG_VALUE_THRESHOLD = 90     # HSV value % — combined with...
LOW_SAT_THRESHOLD = 8               # ...HSV saturation % — flags white/gray background or paper
HIGH_SAT_THRESHOLD = 75             # HSV saturation % — flags saturated makeup, fabric, jewelry
OUTLIER_MAD_MULTIPLIER = 3.5        # secondary robust statistical filter


def extract_region_pixels(image_rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Vectorized: returns an (N, 3) array of RGB pixels where mask is True."""
    return image_rgb[mask]


def _luminance(pixels_rgb: np.ndarray) -> np.ndarray:
    return pixels_rgb[:, 0] * 0.299 + pixels_rgb[:, 1] * 0.587 + pixels_rgb[:, 2] * 0.114


def filter_outliers(pixels_rgb: np.ndarray) -> np.ndarray:
    """Removes shadow/highlight/background/makeup outliers, then applies a
    robust median-absolute-deviation filter as a second, conservative pass.
    """
    if pixels_rgb.shape[0] == 0:
        return pixels_rgb

    luminance = _luminance(pixels_rgb)
    hsv = rgb_to_hsv(pixels_rgb)
    saturation, value = hsv[:, 1], hsv[:, 2]

    keep = (
        (luminance >= DARK_LUMINANCE_THRESHOLD)
        & (luminance <= BRIGHT_LUMINANCE_THRESHOLD)
        & ~((saturation <= LOW_SAT_THRESHOLD) & (value >= LOW_SAT_BG_VALUE_THRESHOLD))
        & (saturation <= HIGH_SAT_THRESHOLD)
    )
    filtered = pixels_rgb[keep]

    if filtered.shape[0] >= MIN_VALID_PIXELS_FOR_STATS:
        median = np.median(filtered, axis=0)
        mad = np.median(np.abs(filtered - median), axis=0)
        mad = np.where(mad == 0, 1e-6, mad)  # avoid divide-by-zero on flat/uniform regions
        distances = np.abs(filtered - median) / mad
        filtered = filtered[np.all(distances <= OUTLIER_MAD_MULTIPLIER, axis=1)]

    return filtered


def sample_region(image_rgb: np.ndarray, mask: np.ndarray, rng: np.random.Generator) -> dict:
    """Returns pixelCount/rgb/lab stats for one region, plus the sampled
    pixel array itself (under "_pixels") for pooling into an overall value.
    """
    raw_pixels = extract_region_pixels(image_rgb, mask)
    filtered_pixels = filter_outliers(raw_pixels)

    if filtered_pixels.shape[0] > MAX_SAMPLES_PER_REGION:
        indices = rng.choice(filtered_pixels.shape[0], size=MAX_SAMPLES_PER_REGION, replace=False)
        sampled_pixels = filtered_pixels[indices]
    else:
        sampled_pixels = filtered_pixels

    if sampled_pixels.shape[0] > 0:
        stats = rgb_and_lab_stats(sampled_pixels)
    else:
        stats = {"rgb": {"mean": [0, 0, 0], "median": [0, 0, 0]}, "lab": {"mean": [0.0, 0.0, 0.0], "median": [0.0, 0.0, 0.0]}}

    return {
        "pixelCount": int(sampled_pixels.shape[0]),
        "rgb": stats["rgb"],
        "lab": stats["lab"],
        "_pixels": sampled_pixels,
    }


def combine_region_pixels(region_results: dict) -> dict:
    """Pools the sampled pixels from all valid regions into one overall
    "representative color sample" — not yet a skin profile, just the
    combined measured statistic (Part 5 turns this into one)."""
    pooled = [
        region["_pixels"]
        for region in region_results.values()
        if region["_pixels"].shape[0] > 0
    ]
    if not pooled:
        return {"rgb": {"mean": [0, 0, 0], "median": [0, 0, 0]}, "lab": {"mean": [0.0, 0.0, 0.0], "median": [0.0, 0.0, 0.0]}}

    all_pixels = np.concatenate(pooled, axis=0)
    return rgb_and_lab_stats(all_pixels)
