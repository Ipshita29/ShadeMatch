"""Depth compatibility component of the Part 7 matching engine.

Depth categories are ordered (never compared alphabetically) using
DEPTH_ORDER from core/config.py, which mirrors Part 5/6's exact category
list. Compatibility falls off with the number of steps between client and
shade on that ordered scale — an exact match scores highest, one step away
scores noticeably lower, and large gaps score close to zero, since a
several-category depth gap reads as an obviously wrong shade regardless of
how well other attributes line up.
"""

from app.core.config import DEPTH_ORDER, DEPTH_STEP_SCORES, DEPTH_STEP_SCORE_FLOOR


def calculate_depth_compatibility(client_depth: str, shade_depth: str) -> float:
    """Returns a 0-1 compatibility score from the ordered-scale distance
    between two depth categories. Unknown/missing categories are treated as
    maximally uncertain (score 0) rather than crashing, since Part 6 data
    may occasionally be incomplete.
    """
    try:
        client_index = DEPTH_ORDER.index(client_depth)
        shade_index = DEPTH_ORDER.index(shade_depth)
    except ValueError:
        return 0.0

    step_distance = abs(client_index - shade_index)
    return DEPTH_STEP_SCORES.get(step_distance, DEPTH_STEP_SCORE_FLOOR)
