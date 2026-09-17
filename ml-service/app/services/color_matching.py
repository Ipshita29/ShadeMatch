"""Color-distance component of the Part 7 matching engine.

Uses CIEDE2000 (via scikit-image's `deltaE_ciede2000`, verified against the
canonical Sharma et al. 2005 reference dataset) rather than a hand-rolled
implementation — CIEDE2000 has many special-case branches and is notoriously
easy to get subtly wrong, and a well-tested library is exactly what the
Part 7 spec recommends reaching for here.

WHY Lab + Delta E: RGB distance doesn't correspond to how humans perceive
color differences (equal RGB steps look like very different amounts of
change depending on where in the space they are). CIE Lab was designed so
that Euclidean-ish distance in the space roughly tracks perceived
difference, and CIEDE2000 refines that further with well-established
perceptual corrections. This is why color similarity is the dominant term
in the final score (see MATCH_WEIGHTS in core/config.py) — it's the only
component derived directly from actually measured pixels on both sides.
"""

import numpy as np
from skimage.color import deltaE_ciede2000

from app.core.config import DELTA_E_THRESHOLDS


def calculate_color_difference(client_lab: dict, shade_lab: dict) -> float:
    """Returns the CIEDE2000 Delta E between two Lab colors. Lower is closer;
    this is a perceptual distance, never a percentage or probability."""
    lab1 = np.array([client_lab["l"], client_lab["a"], client_lab["b"]], dtype=np.float64)
    lab2 = np.array([shade_lab["l"], shade_lab["a"], shade_lab["b"]], dtype=np.float64)
    return float(deltaE_ciede2000(lab1, lab2))


def calculate_color_similarity(delta_e: float) -> float:
    """Maps a Delta E distance to a 0-1 similarity score (1 = identical,
    0 = clearly different), via smooth interpolation between the
    DELTA_E_THRESHOLDS bands. This is a similarity score for RANKING shades
    against each other — it is not a probability that any given shade is
    "the correct" one.
    """
    excellent = DELTA_E_THRESHOLDS["excellent"]
    good = DELTA_E_THRESHOLDS["good"]
    fair = DELTA_E_THRESHOLDS["fair"]
    poor = DELTA_E_THRESHOLDS["poor"]

    if delta_e <= excellent:
        return 1.0
    if delta_e >= poor:
        return 0.0

    # Piecewise-linear interpolation across the three intermediate bands,
    # anchored at fixed similarity values so the curve falls off smoothly
    # rather than in one straight line from "excellent" to "poor".
    anchors = [(excellent, 1.0), (good, 0.75), (fair, 0.4), (poor, 0.0)]
    for (x0, y0), (x1, y1) in zip(anchors, anchors[1:]):
        if x0 <= delta_e <= x1:
            fraction = (delta_e - x0) / (x1 - x0)
            return y0 + fraction * (y1 - y0)

    return 0.0  # unreachable given the bounds checks above, kept for safety
