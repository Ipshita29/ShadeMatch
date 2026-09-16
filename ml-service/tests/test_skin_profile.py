"""Unit tests for the Part 5 skin profile engine (app/services/skin_profile.py).

Run with: pytest tests/test_skin_profile.py -v
"""

import numpy as np
import pytest

from app.services.skin_profile import (
    UNCERTAIN_HUE,
    UNCERTAIN_UNDERTONE,
    calculate_regional_consistency,
    estimate_depth,
    estimate_hue,
    estimate_undertone,
    generate_skin_profile,
)
from tests.fixtures import skin_profile_fixtures as fx


# ---------------------------------------------------------------------------
# 1. Depth classification
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "lab, expected_label",
    [
        ((15.0, 10.0, 10.0), "Very Deep"),
        ((28.0, 10.0, 10.0), "Deep"),
        ((43.0, 10.0, 10.0), "Medium Deep"),
        ((56.0, 10.0, 10.0), "Medium"),
        ((69.0, 10.0, 10.0), "Light Medium"),
        ((85.0, 10.0, 10.0), "Light"),
    ],
)
def test_depth_classification_buckets(lab, expected_label):
    label, confidence = estimate_depth(np.array(lab))
    assert label == expected_label
    assert 0.5 <= confidence <= 0.99


# ---------------------------------------------------------------------------
# 2-5. Undertone: warm, cool, neutral, olive (via hue)
# ---------------------------------------------------------------------------

def test_warm_undertone():
    label, confidence = estimate_undertone(np.array(fx.LAB_LIGHT_WARM))
    assert label == "Warm"
    assert confidence > 0.5


def test_cool_undertone():
    label, confidence = estimate_undertone(np.array(fx.LAB_LIGHT_COOL))
    assert label == "Cool"
    assert confidence > 0.5


def test_neutral_undertone():
    label, confidence = estimate_undertone(np.array(fx.LAB_MEDIUM_NEUTRAL))
    assert label == "Neutral"


def test_olive_detection_is_reliable_and_distinct_from_warm():
    """Olive (low a*, retained b*) must not collapse into a generic Warm
    hue — that's the whole point of the extra check in estimate_hue()."""
    hue_label, hue_confidence = estimate_hue(np.array(fx.LAB_OLIVE))
    assert hue_label == "Olive"
    assert hue_confidence > 0.5

    # A clearly warm (but not desaturated) color must NOT be labeled Olive.
    warm_hue_label, _ = estimate_hue(np.array(fx.LAB_LIGHT_WARM))
    assert warm_hue_label != "Olive"


# ---------------------------------------------------------------------------
# 6-7. Hue: golden, rosy
# ---------------------------------------------------------------------------

def test_golden_hue_for_warm_color():
    label, _ = estimate_hue(np.array(fx.LAB_MEDIUM_DEEP_WARM))
    assert label == "Golden"


def test_rosy_hue_for_cool_color():
    label, _ = estimate_hue(np.array(fx.LAB_LIGHT_COOL))
    assert label == "Rosy"


# ---------------------------------------------------------------------------
# 8. Regional consistency
# ---------------------------------------------------------------------------

def test_regional_consistency_high_when_regions_agree():
    regions = [
        {"name": "forehead", "lab": np.array([56.0, 10.0, 20.0])},
        {"name": "leftCheek", "lab": np.array([55.0, 11.0, 19.0])},
        {"name": "rightCheek", "lab": np.array([57.0, 10.0, 21.0])},
    ]
    consistency = calculate_regional_consistency(regions)
    assert consistency > 0.8


def test_regional_consistency_low_when_regions_disagree():
    regions = [
        {"name": "forehead", "lab": np.array([55.0, 15.0, 22.0])},
        {"name": "leftCheek", "lab": np.array([55.0, 15.0, 5.0])},
        {"name": "rightCheek", "lab": np.array([55.0, 2.0, 2.0])},
    ]
    consistency = calculate_regional_consistency(regions)
    assert consistency < 0.5


def test_single_region_is_trivially_consistent():
    regions = [{"name": "forehead", "lab": np.array([56.0, 10.0, 10.0])}]
    assert calculate_regional_consistency(regions) == 1.0


# ---------------------------------------------------------------------------
# 9. Low pixel count
# ---------------------------------------------------------------------------

def test_low_pixel_count_regions_are_excluded_but_still_returns_something():
    result = generate_skin_profile(fx.low_pixel_count_profile_input())
    # All three regions had too few pixels -> nothing valid to aggregate.
    assert result["quality"]["usable"] is False
    assert "reason" in result["quality"]


# ---------------------------------------------------------------------------
# 10. Poor image quality
# ---------------------------------------------------------------------------

def test_poor_image_quality_marks_profile_unusable():
    result = generate_skin_profile(fx.poor_quality_profile_input())
    assert result["quality"]["usable"] is False
    assert result["quality"]["reason"] == "Image lighting may affect color estimation."


# ---------------------------------------------------------------------------
# 11. Ambiguous classification
# ---------------------------------------------------------------------------

def test_ambiguous_undertone_has_low_confidence_but_valid_label():
    label, confidence = estimate_undertone(np.array(fx.LAB_AMBIGUOUS))
    assert label == "Neutral"
    assert confidence < 0.6  # close to a boundary -> low confidence, not high


def test_inconsistent_regions_downgrade_to_uncertain():
    result = generate_skin_profile(fx.inconsistent_regions_profile_input())
    assert result["profile"]["undertone"] == UNCERTAIN_UNDERTONE
    assert result["profile"]["hue"] == UNCERTAIN_HUE
    assert result["quality"]["regionalConsistency"] < 0.55


# ---------------------------------------------------------------------------
# 12. Boundary values — classification must not jump erratically right at a
# threshold, and confidence should be visibly lower there than mid-bucket.
# ---------------------------------------------------------------------------

def test_depth_boundary_is_deterministic():
    just_below, _ = estimate_depth(np.array(fx.LAB_DEPTH_JUST_BELOW_BOUNDARY))
    at_boundary, _ = estimate_depth(np.array(fx.LAB_DEPTH_BOUNDARY_VERY_DEEP_DEEP))
    assert just_below == "Very Deep"
    assert at_boundary == "Deep"


def test_confidence_is_lower_near_depth_boundary_than_mid_bucket():
    _, boundary_confidence = estimate_depth(np.array(fx.LAB_DEPTH_BOUNDARY_VERY_DEEP_DEEP))
    _, mid_bucket_confidence = estimate_depth(np.array((43.0, 10.0, 10.0)))  # middle of "Medium Deep"
    assert boundary_confidence < mid_bucket_confidence


def test_undertone_boundary_values_are_deterministic():
    warm_boundary_label, _ = estimate_undertone(np.array(fx.LAB_UNDERTONE_WARM_BOUNDARY))
    cool_boundary_label, _ = estimate_undertone(np.array(fx.LAB_UNDERTONE_COOL_BOUNDARY))
    assert warm_boundary_label == "Warm"
    assert cool_boundary_label == "Cool"


# ---------------------------------------------------------------------------
# Full end-to-end profile generation sanity checks
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "fixture_fn, expected_depth, expected_undertone",
    [
        (fx.light_warm_profile_input, "Light Medium", "Warm"),
        (fx.light_cool_profile_input, "Light Medium", "Cool"),
        (fx.medium_neutral_profile_input, "Medium", "Neutral"),
        (fx.medium_deep_warm_profile_input, "Medium Deep", "Warm"),
        (fx.deep_warm_profile_input, "Deep", "Warm"),
        (fx.deep_cool_profile_input, "Deep", "Cool"),
    ],
)
def test_full_profile_generation_matches_expected_category(fixture_fn, expected_depth, expected_undertone):
    result = generate_skin_profile(fixture_fn())
    assert result["profile"]["depth"] == expected_depth
    assert result["profile"]["undertone"] == expected_undertone
    assert result["quality"]["usable"] is True
    assert 0 <= result["confidence"]["overall"] <= 1
    assert "rgb" in result["representativeColor"]
    assert "lab" in result["representativeColor"]


def test_response_schema_keys_are_stable():
    result = generate_skin_profile(fx.medium_neutral_profile_input())
    assert set(result.keys()) == {"profile", "representativeColor", "confidence", "quality"}
    assert set(result["profile"].keys()) == {"depth", "undertone", "hue"}
    assert set(result["representativeColor"].keys()) == {"rgb", "lab"}
    assert set(result["representativeColor"]["rgb"].keys()) == {"r", "g", "b"}
    assert set(result["representativeColor"]["lab"].keys()) == {"l", "a", "b"}
    assert set(result["confidence"].keys()) == {"overall", "depth", "undertone", "hue"}
