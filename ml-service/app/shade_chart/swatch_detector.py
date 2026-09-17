"""Locates candidate color-swatch regions in a foundation shade chart image.

This is pure computer vision — it has no idea what a "shade name" or "brand"
is, and never touches the AI/vision extraction step (see Part 9 spec section
8: AI reads labels, CV reads colors, these stay separate services).

Approach: shade chart swatches are large, visually flat/uniform blocks of
color, while text, logos and borders are high local-contrast detail. A local
variance map cheaply tells them apart without needing a trained model:

  image -> grayscale -> local variance (small window)
        -> threshold to a "flat region" mask
        -> morphological close (merge small text/logo holes inside a swatch)
        -> connected components
        -> filter by area/aspect ratio, sort into reading order

Regions that don't look like an isolated block (too small, too large, too
thin) are dropped rather than guessed at — an image with no clear swatches
simply yields an empty list (see chart_parser.py).
"""

import cv2
import numpy as np

# Fraction of local variance below which a pixel is considered part of a
# flat color region rather than text/edge/texture. Tuned against 8-bit
# grayscale variance, not normalized — flat swatch interiors sit well below
# this even with mild JPEG noise; text/edges spike far above it.
FLAT_VARIANCE_THRESHOLD = 60.0

# Window size (pixels) for the local variance calculation.
VARIANCE_WINDOW = 9

# A candidate region must cover at least this fraction of the image to be
# worth sampling (drops noise specks / stray flat pixels).
MIN_AREA_RATIO = 0.004

# ...and no more than this fraction. The border-touching check above does
# most of the work rejecting page background; this is just a generous
# secondary cap for a degenerate case that still doesn't touch the border.
MAX_AREA_RATIO = 0.6

# Extreme aspect ratios (very thin slivers) are never a real swatch block.
MAX_ASPECT_RATIO = 6.0

# Hard cap on how many candidate regions are returned, even if more pass
# the filters — protects against runaway false positives on noisy images.
MAX_CANDIDATES = 60

# Regions whose vertical centers fall within this many pixels of each other
# (relative to image height) are treated as being on the same "row" when
# sorting into reading order.
ROW_GROUPING_RATIO = 0.04


def _local_variance(gray: np.ndarray, window: int) -> np.ndarray:
    gray_f = gray.astype(np.float64)
    mean = cv2.blur(gray_f, (window, window))
    mean_sq = cv2.blur(gray_f * gray_f, (window, window))
    variance = mean_sq - mean * mean
    return np.clip(variance, 0, None)


def _flat_region_mask(image_rgb: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    variance = _local_variance(gray, VARIANCE_WINDOW)
    flat = (variance < FLAT_VARIANCE_THRESHOLD).astype(np.uint8) * 255

    # Merge small interior holes (a shade's printed code/logo) into the
    # surrounding flat block, and drop single-pixel noise.
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    flat = cv2.morphologyEx(flat, cv2.MORPH_CLOSE, kernel)
    flat = cv2.morphologyEx(flat, cv2.MORPH_OPEN, kernel)
    return flat


def _group_into_rows(boxes: list[dict], image_height: int) -> list[dict]:
    """Sorts boxes into reading order: top-to-bottom rows, left-to-right
    within a row. Rows are inferred from vertical center proximity rather
    than assuming a strict grid, since chart layouts vary."""
    if not boxes:
        return []

    row_threshold = image_height * ROW_GROUPING_RATIO
    ordered = sorted(boxes, key=lambda b: b["centerY"])

    rows: list[list[dict]] = []
    for box in ordered:
        placed = False
        for row in rows:
            if abs(row[0]["centerY"] - box["centerY"]) <= row_threshold:
                row.append(box)
                placed = True
                break
        if not placed:
            rows.append([box])

    rows.sort(key=lambda row: sum(b["centerY"] for b in row) / len(row))
    result = []
    for row in rows:
        row.sort(key=lambda b: b["centerX"])
        result.extend(row)
    return result


def detect_swatch_regions(image_rgb: np.ndarray) -> list[dict]:
    """Returns candidate swatch bounding boxes in reading order:
    [{"x", "y", "width", "height"}], already filtered to plausible sizes.
    An image with no clear flat color blocks returns an empty list."""
    height, width = image_rgb.shape[:2]
    image_area = height * width
    if image_area == 0:
        return []

    mask = _flat_region_mask(image_rgb)
    num_labels, _labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)

    candidates = []
    for label in range(1, num_labels):  # label 0 is the background
        x, y, w, h, area = stats[label]

        # A real swatch block is drawn with margin from the image edge; the
        # page background (or a frame wrapping around several swatches) is
        # the thing that actually touches the border. This is a far more
        # reliable "is this background?" signal than area alone — an area
        # cutoff has no good universal value (a background frame can be
        # small relative to a busy chart, and a single big swatch can
        # legitimately dominate a tightly-cropped image).
        touches_border = x <= 1 or y <= 1 or (x + w) >= (width - 1) or (y + h) >= (height - 1)
        if touches_border:
            continue

        area_ratio = area / image_area
        if area_ratio < MIN_AREA_RATIO or area_ratio > MAX_AREA_RATIO:
            continue

        aspect = max(w, h) / max(1, min(w, h))
        if aspect > MAX_ASPECT_RATIO:
            continue

        cx, cy = centroids[label]
        candidates.append(
            {
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h),
                "centerX": float(cx),
                "centerY": float(cy),
            }
        )

    ordered = _group_into_rows(candidates, height)[:MAX_CANDIDATES]
    for box in ordered:
        box.pop("centerX", None)
        box.pop("centerY", None)
    return ordered
