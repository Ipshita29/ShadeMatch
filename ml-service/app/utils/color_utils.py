"""Color space conversions and summary statistics for arrays of RGB pixels.

All conversions are vectorized (no per-pixel Python loops) and rescale
OpenCV's 8-bit color spaces into their standard scientific ranges:

- RGB:  0-255 per channel (unchanged)
- Lab:  L in 0-100, a/b roughly -128 to 127   (OpenCV stores 0-255 / 0-255 with a +128 offset)
- HSV:  H in 0-360 degrees, S/V in 0-100%     (OpenCV stores H 0-179, S/V 0-255)
"""

import cv2
import numpy as np


def rgb_to_lab(pixels_rgb: np.ndarray) -> np.ndarray:
    """pixels_rgb: (N, 3) uint8 array. Returns (N, 3) float array in standard CIE Lab ranges."""
    if pixels_rgb.size == 0:
        return np.empty((0, 3), dtype=np.float64)

    reshaped = pixels_rgb.reshape(-1, 1, 3).astype(np.uint8)
    lab = cv2.cvtColor(reshaped, cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float64)

    lab[:, 0] = lab[:, 0] * (100.0 / 255.0)
    lab[:, 1] = lab[:, 1] - 128.0
    lab[:, 2] = lab[:, 2] - 128.0
    return lab


def rgb_to_hsv(pixels_rgb: np.ndarray) -> np.ndarray:
    """pixels_rgb: (N, 3) uint8 array. Returns (N, 3) float array — H in [0,360), S/V in [0,100]."""
    if pixels_rgb.size == 0:
        return np.empty((0, 3), dtype=np.float64)

    reshaped = pixels_rgb.reshape(-1, 1, 3).astype(np.uint8)
    hsv = cv2.cvtColor(reshaped, cv2.COLOR_RGB2HSV).reshape(-1, 3).astype(np.float64)

    hsv[:, 0] = hsv[:, 0] * 2.0
    hsv[:, 1] = hsv[:, 1] * (100.0 / 255.0)
    hsv[:, 2] = hsv[:, 2] * (100.0 / 255.0)
    return hsv


def channel_stats(pixels: np.ndarray, decimals: int, as_int: bool = False) -> dict:
    """Returns {"mean": [...], "median": [...]} for an (N, 3) array."""
    mean = np.round(np.mean(pixels, axis=0), decimals)
    median = np.round(np.median(pixels, axis=0), decimals)
    if as_int:
        mean = mean.astype(int)
        median = median.astype(int)
    return {"mean": mean.tolist(), "median": median.tolist()}


def rgb_and_lab_stats(pixels_rgb: np.ndarray) -> dict:
    """Convenience helper combining RGB + Lab stats for a set of pixels."""
    lab_pixels = rgb_to_lab(pixels_rgb)
    return {
        "rgb": channel_stats(pixels_rgb.astype(np.float64), decimals=0, as_int=True),
        "lab": channel_stats(lab_pixels, decimals=1),
    }
