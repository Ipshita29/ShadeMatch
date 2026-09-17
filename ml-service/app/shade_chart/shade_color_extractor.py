"""Ties swatch detection + sampling together into the one function the API
route calls: an ordered list of estimated colors, one per detected swatch.

This module owns no knowledge of shade names/codes/brands — see the module
docstring in swatch_detector.py for why that separation matters. Positional
order (reading order: top-to-bottom, left-to-right) is the only thing this
returns to let the caller line swatches up with AI-extracted labels, since
neither side knows the other exists.
"""

import numpy as np

from app.shade_chart.swatch_detector import detect_swatch_regions
from app.shade_chart.swatch_sampler import sample_swatch

# Deterministic seed — repeated runs on the same image should give the same
# sampled subset when a region has more pixels than MAX_SAMPLES.
_RNG_SEED = 20240601


def extract_swatch_colors(image_rgb: np.ndarray) -> list[dict]:
    """Returns one entry per successfully-sampled swatch, in reading order:
    [{"region": {x,y,width,height}, "pixelCount", "rgb": {...}, "lab": {...}}]

    A region that was detected but yielded too few usable pixels (e.g. it
    was mostly text, or sampling failed) is left out entirely rather than
    padded with a guessed color — callers must handle fewer color entries
    than detected regions, and fewer regions than AI-extracted labels.
    """
    regions = detect_swatch_regions(image_rgb)
    rng = np.random.default_rng(_RNG_SEED)

    results = []
    for region in regions:
        sampled = sample_swatch(image_rgb, region, rng)
        if sampled is None:
            continue
        results.append({"region": region, **sampled})

    return results
