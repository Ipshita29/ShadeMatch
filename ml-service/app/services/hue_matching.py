"""Hue compatibility component of the Part 7 matching engine.

Mirrors undertone_matching.py's structure with its own (gentler) matrix —
see HUE_COMPATIBILITY in core/config.py. Hue carries only a 5% final weight,
so its job is to refine the ranking among otherwise-similar shades, not to
swing it — the color Delta E remains the primary signal throughout.
"""

from app.core.config import HUE_COMPATIBILITY, HUE_UNCERTAIN_SCORE


def calculate_hue_compatibility(client_hue: str, shade_hue: str) -> float:
    if client_hue == "Uncertain" or shade_hue == "Uncertain":
        return HUE_UNCERTAIN_SCORE

    if client_hue == shade_hue:
        return HUE_COMPATIBILITY.get((client_hue, client_hue), 1.0)

    pair = (client_hue, shade_hue)
    reversed_pair = (shade_hue, client_hue)
    if pair in HUE_COMPATIBILITY:
        return HUE_COMPATIBILITY[pair]
    if reversed_pair in HUE_COMPATIBILITY:
        return HUE_COMPATIBILITY[reversed_pair]

    return 0.0
