"""Part 5 — Skin Profile Engine.

Converts the raw per-region color measurements produced by Part 4 (face
detection + pixel sampling) into a structured, human-readable skin profile:
depth, undertone, hue, a single representative color, and confidence /
quality indicators.

DESIGN DECISION — no ML model here (see PRODUCT spec for Part 5): we do not
yet have a validated labeled dataset of real skin photographs, so this is a
transparent, documented CIE Lab color-science heuristic instead of a trained
classifier. Every numeric threshold lives in app/core/config.py, labeled as
an initial MVP calibration value that must be revisited against real
reference images.

MODULARITY FOR FUTURE ML: each classification step is a small pure function
that takes a Lab color (and occasionally per-region data) and returns
(label, confidence). To later replace, say, undertone classification with a
trained model, only estimate_undertone() needs to change — its signature
(Lab in, (label, confidence) out) and the rest of this module, the API
response schema, and the frontend can all stay exactly as they are.

WHAT THIS IS NOT: an objective measurement of a person's "true" skin color.
Photographic color capture is affected by lighting, white balance, exposure,
camera processing and more (see module-level NOTE at the bottom). This is an
assistive estimate only.
"""

import numpy as np

from app.core.config import (
    DEPTH_CONFIDENCE_SCALE,
    DEPTH_THRESHOLDS,
    HUE_OLIVE_MAX_A,
    HUE_OLIVE_MIN_B,
    MIN_VALID_PIXELS_PER_REGION,
    MIN_VALID_REGIONS_FOR_USABLE_PROFILE,
    REGION_WEIGHTS,
    REGIONAL_CONSISTENCY_SCALE,
    REGIONAL_CONSISTENCY_UNCERTAIN_THRESHOLD,
    REGIONAL_CONSISTENCY_UNUSABLE_THRESHOLD,
    UNDERTONE_CONFIDENCE_SCALE,
    UNDERTONE_COOL_RATIO,
    UNDERTONE_WARM_RATIO,
)
from app.utils.color_utils import lab_to_rgb

UNCERTAIN_UNDERTONE = "Neutral / Uncertain"
UNCERTAIN_HUE = "Uncertain"

_REGION_ORDER = ("forehead", "leftCheek", "rightCheek")


# ---------------------------------------------------------------------------
# Regional aggregation (Part 5 spec, Step 2 & 3)
# ---------------------------------------------------------------------------

def _valid_regions(regions: dict) -> list[dict]:
    """Regions with too few surviving pixels (after Part 4's own outlier
    filtering) are excluded entirely rather than trusted with partial
    weight — a handful of stray pixels isn't a real observation."""
    valid = []
    for name in _REGION_ORDER:
        region = regions.get(name)
        if not region:
            continue
        if region.get("pixelCount", 0) < MIN_VALID_PIXELS_PER_REGION:
            continue
        valid.append({"name": name, "lab": np.array(region["lab"]["median"], dtype=np.float64)})
    return valid


def aggregate_representative_lab(regions: dict) -> tuple[np.ndarray | None, list[dict]]:
    """Weighted average of valid regions' Lab MEDIAN values (median, not
    mean, to stay robust to whatever outliers slipped past Part 4's own
    filtering). Weights come from REGION_WEIGHTS and are renormalized across
    only the regions that turned out to be valid for this particular photo,
    so losing one region doesn't just discard its share of the estimate.

    Returns (representative_lab_or_None, valid_regions). None means no
    region had enough pixels to say anything at all.
    """
    valid = _valid_regions(regions)
    if not valid:
        return None, valid

    weights = np.array([REGION_WEIGHTS.get(r["name"], 0.0) for r in valid], dtype=np.float64)
    if weights.sum() <= 0:
        weights = np.ones(len(valid))  # fallback: equal weight if config gave us nothing usable
    weights = weights / weights.sum()

    lab_values = np.stack([r["lab"] for r in valid], axis=0)
    representative_lab = np.average(lab_values, axis=0, weights=weights)
    return representative_lab, valid


# ---------------------------------------------------------------------------
# Regional consistency (Part 5 spec, Step 7)
# ---------------------------------------------------------------------------

def calculate_regional_consistency(valid_regions: list[dict]) -> float:
    """Measures agreement of the underlying MEASUREMENTS across facial
    regions — NOT the accuracy of any classification. Computed as the
    average pairwise Euclidean distance between regions' Lab values in the
    a*/b* chroma plane (the axes undertone/hue are read from), mapped to a
    0-1 score via REGIONAL_CONSISTENCY_SCALE: 0 distance -> 1.0, at or
    beyond the configured scale -> 0.0.

    A single valid region can't disagree with itself, so it trivially
    returns 1.0 — but generate_skin_profile() also folds region *count*
    into overall confidence separately, so a lone region doesn't look as
    trustworthy as three that agree.
    """
    if len(valid_regions) < 2:
        return 1.0

    ab_points = np.array([[r["lab"][1], r["lab"][2]] for r in valid_regions])
    n = len(ab_points)
    distances = []
    for i in range(n):
        for j in range(i + 1, n):
            distances.append(float(np.linalg.norm(ab_points[i] - ab_points[j])))

    mean_distance = float(np.mean(distances))
    consistency = 1.0 - min(1.0, mean_distance / REGIONAL_CONSISTENCY_SCALE)
    return round(consistency, 2)


# ---------------------------------------------------------------------------
# Depth (Part 5 spec, Step 4)
# ---------------------------------------------------------------------------

def estimate_depth(lab_color: np.ndarray) -> tuple[str, float]:
    """Classifies depth from L* (CIE Lab lightness) alone, using the
    ordered buckets in DEPTH_THRESHOLDS. These are internal organizational
    categories for grouping foundation shade ranges — not biological or
    demographic categories — derived purely from this image's measured
    lightness, never from any assumption about the person.

    Confidence reflects how far L* sits from the NEAREST bucket boundary,
    not statistical certainty: a value in the middle of a bucket scores
    high, a value right on a boundary scores low, since a tiny measurement
    difference could have tipped it into the neighboring bucket.
    """
    l_value = float(lab_color[0])

    label = DEPTH_THRESHOLDS[-1][1]
    boundaries = [b for b, _ in DEPTH_THRESHOLDS]
    for max_l, bucket_label in DEPTH_THRESHOLDS:
        if l_value < max_l:
            label = bucket_label
            break

    distance_to_boundary = min(abs(l_value - b) for b in boundaries)
    confidence = _distance_to_confidence(distance_to_boundary, DEPTH_CONFIDENCE_SCALE)
    return label, confidence


# ---------------------------------------------------------------------------
# Undertone (Part 5 spec, Step 5)
# ---------------------------------------------------------------------------

def estimate_undertone(lab_color: np.ndarray) -> tuple[str, float]:
    """Classifies undertone from the RATIO of b* (yellow-blue axis) to a*
    (red-green axis), rather than an absolute RGB cutoff: a ratio well above
    1 means yellow dominates over red (Warm), well below 1 means the
    opposite (Cool), and close to 1 is balanced (Neutral). This looks at the
    relationship between the two chromatic axes, as recommended by the
    Part 5 spec, instead of thresholding either channel in isolation.

    Olive is intentionally NOT produced here — see estimate_hue(). We can't
    yet reliably tell a genuine olive undertone apart from a slightly
    desaturated warm tone from Lab alone, and the spec is explicit that
    Olive should only appear as an undertone if the algorithm can justify it
    reliably. Hue is where that more editorial distinction is allowed to live.
    """
    a_value, b_value = float(lab_color[1]), float(lab_color[2])

    # Guard near-zero a* (would make the ratio explode/flip sign for a tiny
    # denominator) by falling back to an additive comparison in that case.
    if abs(a_value) < 1e-3:
        ratio = UNDERTONE_WARM_RATIO if b_value > 0 else UNDERTONE_COOL_RATIO
    else:
        ratio = b_value / a_value

    if ratio >= UNDERTONE_WARM_RATIO:
        label = "Warm"
        distance = ratio - UNDERTONE_WARM_RATIO
    elif ratio <= UNDERTONE_COOL_RATIO:
        label = "Cool"
        distance = UNDERTONE_COOL_RATIO - ratio
    else:
        label = "Neutral"
        # Distance to whichever Warm/Cool boundary is closer — a Neutral
        # reading right next to the Warm cutoff is a weaker "Neutral" than
        # one sitting exactly at the midpoint.
        distance = min(UNDERTONE_WARM_RATIO - ratio, ratio - UNDERTONE_COOL_RATIO)

    confidence = _distance_to_confidence(distance, UNDERTONE_CONFIDENCE_SCALE)
    return label, confidence


# ---------------------------------------------------------------------------
# Hue (Part 5 spec, Step 6)
# ---------------------------------------------------------------------------

def estimate_hue(lab_color: np.ndarray) -> tuple[str, float]:
    """A more descriptive, cosmetic-language sibling of undertone, read from
    the same a*/b* measurements:

    - Cool undertone territory  -> "Rosy"
    - Low a* (suppressed red) + retained b* (still yellow) -> "Olive"
      (a desaturated, slightly green-yellow cast — the textbook description
      of an olive appearance in Lab terms)
    - Remaining warm-leaning territory -> "Golden"
    - Balanced, non-olive territory -> "Neutral"

    Confidence follows the same boundary-distance idea as the other
    estimators, using whichever boundary (undertone warm/cool cutoff, or the
    olive a*/b* thresholds) actually determined the label.
    """
    a_value, b_value = float(lab_color[1]), float(lab_color[2])
    undertone_label, undertone_confidence = estimate_undertone(lab_color)

    is_olive = a_value <= HUE_OLIVE_MAX_A and b_value >= HUE_OLIVE_MIN_B
    if is_olive:
        distance = min(HUE_OLIVE_MAX_A - a_value, b_value - HUE_OLIVE_MIN_B)
        confidence = _distance_to_confidence(distance, UNDERTONE_CONFIDENCE_SCALE * 20)
        return "Olive", confidence

    if undertone_label == "Cool":
        return "Rosy", undertone_confidence
    if undertone_label == "Warm":
        return "Golden", undertone_confidence
    return "Neutral", undertone_confidence


def _distance_to_confidence(distance: float, scale: float) -> float:
    """Maps a non-negative "distance from the nearest decision boundary"
    into a 0.5-0.99 confidence band. Never drops below 0.5 (we did produce a
    definite label, so we don't want to claim near-zero confidence in it)
    and never claims outright certainty."""
    normalized = min(1.0, distance / scale) if scale > 0 else 1.0
    return round(0.5 + normalized * 0.49, 2)


# ---------------------------------------------------------------------------
# Confidence (Part 5 spec, Step 8) & quality (Step 9)
# ---------------------------------------------------------------------------

def calculate_confidence(
    depth_confidence: float,
    undertone_confidence: float,
    hue_confidence: float,
    regional_consistency: float,
    part4_quality: dict,
    valid_region_count: int,
) -> dict:
    """Combines each classifier's own boundary-distance confidence with
    factors Part 4 already measured: how well regions agreed with each
    other, whether the photo itself was flagged as poor quality, and how
    many independent regions we actually had to work with.

    IMPORTANT: these are heuristic reliability scores, not validated model
    probabilities. They should never be shown to end users as a raw
    percentage ("93% accurate") — the frontend maps them to a small number
    of qualitative bands instead (see Step 12 of the Part 5 spec).
    """
    quality_factor = 1.0 if part4_quality.get("usable", True) else 0.7
    region_count_factor = 1.0 if valid_region_count >= 3 else (0.85 if valid_region_count == 2 else 0.6)

    overall = (
        (depth_confidence + undertone_confidence + hue_confidence)
        / 3
        * regional_consistency
        * quality_factor
        * region_count_factor
    )

    return {
        "overall": round(overall, 2),
        "depth": round(depth_confidence, 2),
        "undertone": round(undertone_confidence, 2),
        "hue": round(hue_confidence, 2),
    }


def _usability(regional_consistency: float, valid_region_count: int, part4_quality: dict) -> tuple[bool, str | None]:
    if valid_region_count < MIN_VALID_REGIONS_FOR_USABLE_PROFILE:
        return False, "Not enough of the face was clearly visible for a reliable estimate."

    if not part4_quality.get("usable", True):
        brightness = part4_quality.get("brightness")
        if brightness in ("too_dark", "too_bright"):
            return False, "Image lighting may affect color estimation."
        if part4_quality.get("faceSize") == "small":
            return False, "The face was too small in the photo for a reliable estimate."
        return False, "Image quality may affect color estimation."

    if regional_consistency < REGIONAL_CONSISTENCY_UNUSABLE_THRESHOLD:
        return False, "Facial-region measurements were inconsistent — try a more evenly lit photo."

    return True, None


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def generate_skin_profile(part4_data: dict) -> dict:
    """Main entry point: takes the exact dict Part 4's region extraction
    produces (see app/api/skin.py) and returns the Part 5 profile response
    body (the "data" object — success/error wrapping happens in the route).
    """
    regions = part4_data.get("regions", {})
    part4_quality = part4_data.get("quality", {})

    representative_lab, valid_regions = aggregate_representative_lab(regions)
    valid_region_count = len(valid_regions)

    if representative_lab is None:
        # Nothing usable came out of Part 4 at all — fall back to whatever
        # pooled color it already computed (better than nothing for display)
        # but never present a confident classification on top of it.
        fallback = part4_data.get("representativeColor", {}).get("lab", {}).get("median", [0.0, 0.0, 0.0])
        representative_lab = np.array(fallback, dtype=np.float64)
        regional_consistency = 0.0
        depth_label, depth_confidence = "Uncertain", 0.0
        undertone_label, undertone_confidence = UNCERTAIN_UNDERTONE, 0.0
        hue_label, hue_confidence = UNCERTAIN_HUE, 0.0
    else:
        regional_consistency = calculate_regional_consistency(valid_regions)

        depth_label, depth_confidence = estimate_depth(representative_lab)
        undertone_label, undertone_confidence = estimate_undertone(representative_lab)
        hue_label, hue_confidence = estimate_hue(representative_lab)

        # Regions disagree too much to trust a specific undertone/hue label,
        # even though a number came out of the math above — depth (driven by
        # L*) is left alone since Step 7 frames this as an undertone concern.
        if regional_consistency < REGIONAL_CONSISTENCY_UNCERTAIN_THRESHOLD:
            undertone_label, undertone_confidence = UNCERTAIN_UNDERTONE, min(undertone_confidence, 0.5)
            hue_label, hue_confidence = UNCERTAIN_HUE, min(hue_confidence, 0.5)

    usable, reason = _usability(regional_consistency, valid_region_count, part4_quality)

    confidence = calculate_confidence(
        depth_confidence,
        undertone_confidence,
        hue_confidence,
        regional_consistency,
        part4_quality,
        valid_region_count,
    )

    rgb = lab_to_rgb(representative_lab)

    profile_data = {
        "profile": {
            "depth": depth_label,
            "undertone": undertone_label,
            "hue": hue_label,
        },
        "representativeColor": {
            "rgb": {"r": int(rgb[0]), "g": int(rgb[1]), "b": int(rgb[2])},
            "lab": {
                "l": round(float(representative_lab[0]), 1),
                "a": round(float(representative_lab[1]), 1),
                "b": round(float(representative_lab[2]), 1),
            },
        },
        "confidence": confidence,
        "quality": {"usable": usable, "regionalConsistency": regional_consistency},
    }
    if reason:
        profile_data["quality"]["reason"] = reason

    return profile_data


# -----------------------------------------------------------------------------
# NOTE — scientific limitations (documented per Part 5 spec):
#
# Photographic skin-color estimation is affected by ambient lighting, camera
# white balance, exposure, shadows, highlights, makeup, skincare products,
# filters and image compression. This engine is an assistive estimation
# tool built on measured pixel color from one photograph — it is NOT exact
# skin-tone detection, not 100% accurate, and not an objective measurement
# of anyone's "true" skin color. Physical shade testing in person, under
# suitable lighting, should always precede a final foundation decision.
# -----------------------------------------------------------------------------
