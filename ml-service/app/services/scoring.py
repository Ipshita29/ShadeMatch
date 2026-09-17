"""Combines color/depth/undertone/hue/calibration components into the final
weighted match score, generates deterministic match reasons, and ranks
shades with well-defined tie-breaking. See MATCH_WEIGHTS in core/config.py
for why color dominates and the categorical terms are secondary.

Reasons are generated ENTIRELY from the scoring components below — no LLM,
no hardcoded per-shade text. This keeps the system explainable: every
reason traces back to a specific number the artist can also see in the
score breakdown.
"""

from app.core.config import (
    CALIBRATION_DEFAULT_SCORE,
    CALIBRATION_STATUS_SCORES,
    DELTA_E_THRESHOLDS,
    MATCH_WEIGHTS,
)
from app.services.color_matching import calculate_color_difference, calculate_color_similarity
from app.services.depth_matching import calculate_depth_compatibility
from app.services.hue_matching import calculate_hue_compatibility
from app.services.undertone_matching import calculate_undertone_compatibility


def calculate_calibration_score(calibration: dict | None) -> float:
    """A small reliability modifier (5% of the final score) — a calibrated
    physical measurement is trusted more than an estimated digital swatch,
    but this never dominates: see MATCH_WEIGHTS."""
    calibration = calibration or {}
    status_score = CALIBRATION_STATUS_SCORES.get(calibration.get("status"), CALIBRATION_DEFAULT_SCORE)
    confidence = calibration.get("confidence")
    if isinstance(confidence, (int, float)):
        return round((status_score * 0.7) + (float(confidence) * 0.3), 4)
    return status_score


def score_shade(client_profile: dict, shade: dict) -> dict:
    """Scores a single shade against the client profile."""
    client_lab = client_profile["representativeColor"]["lab"]
    shade_lab = shade["color"]["lab"]

    delta_e = calculate_color_difference(client_lab, shade_lab)
    color_similarity = calculate_color_similarity(delta_e)
    depth_score = calculate_depth_compatibility(client_profile["depth"], shade["depth"])
    undertone_score = calculate_undertone_compatibility(client_profile["undertone"], shade["undertone"])
    hue_score = calculate_hue_compatibility(client_profile["hue"], shade["hue"])
    calibration_score = calculate_calibration_score(shade.get("calibration"))

    w = MATCH_WEIGHTS
    combined = (
        color_similarity * w["color"]
        + depth_score * w["depth"]
        + undertone_score * w["undertone"]
        + hue_score * w["hue"]
        + calibration_score * w["calibration"]
    )

    return {
        "shadeId": str(shade["_id"]),
        "name": shade["name"],
        "code": shade.get("code"),
        "brandName": shade.get("brandName"),
        "productName": shade.get("productName"),
        "depth": shade["depth"],
        "undertone": shade["undertone"],
        "hue": shade["hue"],
        "color": shade["color"],
        "score": round(combined * 100, 1),
        "breakdown": {
            "color": round(color_similarity * 100, 1),
            "depth": round(depth_score * 100, 1),
            "undertone": round(undertone_score * 100, 1),
            "hue": round(hue_score * 100, 1),
            "calibration": round(calibration_score * 100, 1),
        },
        "deltaE": round(delta_e, 2),
        "reasons": _generate_reasons(delta_e, depth_score, undertone_score, hue_score, client_profile, shade),
        # Internal-only, used for tie-breaking — stripped in rank_shades().
        "_depthScore": depth_score,
        "_undertoneScore": undertone_score,
        "_calibrationScore": calibration_score,
    }


def _generate_reasons(delta_e, depth_score, undertone_score, hue_score, client: dict, shade: dict) -> list:
    reasons = []

    if delta_e <= DELTA_E_THRESHOLDS["excellent"]:
        reasons.append("Very close color profile")
    elif delta_e <= DELTA_E_THRESHOLDS["good"]:
        reasons.append("Close color profile")

    if depth_score >= 0.99:
        reasons.append("Same depth category")
    elif depth_score >= 0.65:
        reasons.append("Similar depth")

    # An "Uncertain" reading on either side isn't evidence of a mismatch —
    # it's just an ambiguous measurement — so no specific undertone/hue
    # claim is made rather than inventing false certainty either way.
    if client["undertone"] != "Uncertain" and shade["undertone"] != "Uncertain":
        if undertone_score >= 0.99:
            reasons.append(f"Compatible {shade['undertone'].lower()} undertone")
        elif undertone_score >= 0.55:
            reasons.append("Reasonably compatible undertone")

    if client["hue"] != "Uncertain" and shade["hue"] != "Uncertain":
        if hue_score >= 0.99:
            reasons.append(f"Similar {shade['hue'].lower()} hue")
        elif hue_score >= 0.65:
            reasons.append("Reasonably similar hue")

    return reasons


def rank_shades(client_profile: dict, shades: list) -> list:
    """Scores every candidate shade and returns them sorted descending by
    score, with deterministic tie-breaking (lower Delta E, then better
    depth/undertone/calibration compatibility — see module docstring).
    Callers slice the top N; this returns the full ranked list so callers
    can also inspect "next best" candidates for the low-confidence state.

    A shade with missing/malformed color or category data is skipped rather
    than allowed to crash the whole batch — one bad record in the database
    shouldn't take down matching for every other shade in the product.
    """
    scored = []
    for shade in shades:
        try:
            scored.append(score_shade(client_profile, shade))
        except (KeyError, TypeError, ValueError):
            continue

    scored.sort(
        key=lambda m: (
            -m["score"],
            m["deltaE"],
            -m["_depthScore"],
            -m["_undertoneScore"],
            -m["_calibrationScore"],
        )
    )

    for match in scored:
        match.pop("_depthScore", None)
        match.pop("_undertoneScore", None)
        match.pop("_calibrationScore", None)

    return scored
