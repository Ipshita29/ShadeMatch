"""Unit tests for the Part 7 matching engine.

Run with: pytest tests/test_matching.py -v
"""

import pytest

from app.services.color_matching import calculate_color_difference, calculate_color_similarity
from app.services.depth_matching import calculate_depth_compatibility
from app.services.undertone_matching import calculate_undertone_compatibility
from app.services.hue_matching import calculate_hue_compatibility
from app.services.scoring import rank_shades, score_shade
from app.services.matching_engine import run_matching
from tests.fixtures import matching_fixtures as fx


def lab(l, a, b):
    return {"l": l, "a": a, "b": b}


# ---------------------------------------------------------------------------
# Color: Delta E + similarity
# ---------------------------------------------------------------------------

def test_identical_lab_colors_have_zero_delta_e():
    delta_e = calculate_color_difference(lab(54.2, 14.7, 23.8), lab(54.2, 14.7, 23.8))
    assert delta_e == pytest.approx(0.0, abs=1e-6)
    assert calculate_color_similarity(delta_e) == 1.0


def test_very_similar_lab_colors_have_small_delta_e_and_high_similarity():
    delta_e = calculate_color_difference(lab(54.2, 14.7, 23.8), lab(53.8, 15.0, 24.2))
    assert 0 < delta_e < 2.0
    assert calculate_color_similarity(delta_e) > 0.85


def test_moderately_different_lab_colors_have_mid_range_similarity():
    delta_e = calculate_color_difference(lab(54.2, 14.7, 23.8), lab(48.0, 18.0, 20.0))
    similarity = calculate_color_similarity(delta_e)
    assert 0.2 < similarity < 0.85


def test_very_different_lab_colors_have_large_delta_e_and_near_zero_similarity():
    delta_e = calculate_color_difference(lab(54.2, 14.7, 23.8), lab(20.0, 2.0, 2.0))
    assert delta_e > 20
    assert calculate_color_similarity(delta_e) == 0.0


def test_delta_e_matches_known_reference_value():
    # Sharma et al. 2005 canonical CIEDE2000 test dataset, pair 1.
    delta_e = calculate_color_difference(lab(50.0, 2.6772, -79.7751), lab(50.0, 0.0, -82.7485))
    assert delta_e == pytest.approx(2.0425, abs=1e-3)


def test_color_similarity_is_monotonically_non_increasing_with_delta_e():
    deltas = [0, 1, 3, 6, 12, 25]
    similarities = [calculate_color_similarity(d) for d in deltas]
    assert similarities == sorted(similarities, reverse=True)


# ---------------------------------------------------------------------------
# Depth
# ---------------------------------------------------------------------------

def test_exact_depth_match_scores_highest():
    assert calculate_depth_compatibility("Medium Deep", "Medium Deep") == 1.0


def test_adjacent_depth_scores_lower_than_exact():
    adjacent = calculate_depth_compatibility("Medium", "Medium Deep")
    exact = calculate_depth_compatibility("Medium Deep", "Medium Deep")
    assert 0 < adjacent < exact


def test_large_depth_difference_scores_much_lower_than_adjacent():
    large_gap = calculate_depth_compatibility("Light", "Very Deep")
    adjacent = calculate_depth_compatibility("Medium", "Medium Deep")
    assert large_gap < adjacent


def test_unknown_depth_category_does_not_crash():
    assert calculate_depth_compatibility("Not A Real Depth", "Medium") == 0.0


# ---------------------------------------------------------------------------
# Undertone
# ---------------------------------------------------------------------------

def test_warm_warm_is_strongly_compatible():
    assert calculate_undertone_compatibility("Warm", "Warm") == 1.0


def test_cool_cool_is_strongly_compatible():
    assert calculate_undertone_compatibility("Cool", "Cool") == 1.0


def test_neutral_neutral_is_strongly_compatible():
    assert calculate_undertone_compatibility("Neutral", "Neutral") == 1.0


def test_warm_neutral_is_moderately_compatible():
    score = calculate_undertone_compatibility("Warm", "Neutral")
    assert 0.3 < score < 0.9
    # symmetric regardless of argument order
    assert calculate_undertone_compatibility("Neutral", "Warm") == score


def test_warm_cool_is_the_least_compatible_pair():
    warm_cool = calculate_undertone_compatibility("Warm", "Cool")
    warm_neutral = calculate_undertone_compatibility("Warm", "Neutral")
    assert warm_cool < warm_neutral


def test_olive_combinations():
    assert calculate_undertone_compatibility("Olive", "Olive") == 1.0
    warm_olive = calculate_undertone_compatibility("Warm", "Olive")
    cool_olive = calculate_undertone_compatibility("Cool", "Olive")
    # Olive is closer to Warm than to Cool in undertone terms.
    assert warm_olive > cool_olive


def test_uncertain_undertone_is_moderate_not_automatically_bad():
    score = calculate_undertone_compatibility("Uncertain", "Warm")
    worst_case = calculate_undertone_compatibility("Warm", "Cool")
    assert score > worst_case
    assert calculate_undertone_compatibility("Uncertain", "Uncertain") == score


# ---------------------------------------------------------------------------
# Hue
# ---------------------------------------------------------------------------

def test_same_hue_scores_highest():
    assert calculate_hue_compatibility("Golden", "Golden") == 1.0


def test_similar_hue_scores_moderately_high():
    score = calculate_hue_compatibility("Golden", "Neutral")
    assert 0.5 < score < 1.0


def test_different_hue_scores_lowest():
    different = calculate_hue_compatibility("Golden", "Rosy")
    similar = calculate_hue_compatibility("Golden", "Neutral")
    assert different < similar


def test_uncertain_hue_is_moderate():
    score = calculate_hue_compatibility("Uncertain", "Golden")
    assert 0.5 < score < 1.0


# ---------------------------------------------------------------------------
# Overall ranking
# ---------------------------------------------------------------------------

def test_exact_color_depth_undertone_ranks_first_and_scores_very_high():
    client = fx.make_client_profile("Medium Deep", "Warm", "Golden", (54.2, 14.7, 23.8))
    exact = fx.make_shade("exact", "Exact", "Medium Deep", "Warm", "Golden", (54.2, 14.7, 23.8))
    poor = fx.make_shade("poor", "Poor", "Light", "Cool", "Rosy", (80.0, 2.0, 2.0))

    ranked = rank_shades(client, [poor, exact])
    assert ranked[0]["shadeId"] == "exact"
    assert ranked[0]["score"] > 95


def test_similar_color_wrong_undertone_scores_lower_than_similar_color_right_undertone():
    client = fx.make_client_profile("Medium", "Warm", "Golden", (56.0, 14.0, 22.0))
    right_undertone = fx.make_shade("right", "Right", "Medium", "Warm", "Golden", (56.0, 14.0, 22.0))
    # Same Lab position mirrored into cool territory but similar depth/lightness.
    wrong_undertone = fx.make_shade("wrong", "Wrong", "Medium", "Cool", "Rosy", (56.0, 14.0, 22.0))
    wrong_undertone["undertone"] = "Cool"  # scored on stated category, not re-derived from Lab

    right_score = score_shade(client, right_undertone)["score"]
    wrong_score = score_shade(client, wrong_undertone)["score"]
    assert right_score > wrong_score


def test_correct_undertone_but_very_different_color_does_not_auto_rank_first():
    client = fx.make_client_profile("Medium Deep", "Warm", "Golden", (54.2, 14.7, 23.8))
    close_color_neutral_depth = fx.make_shade(
        "close", "Close", "Medium Deep", "Warm", "Golden", (53.0, 15.0, 23.0)
    )
    right_undertone_far_color = fx.make_shade(
        "far", "Far", "Light", "Warm", "Golden", (85.0, 5.0, 10.0)
    )

    ranked = rank_shades(client, [right_undertone_far_color, close_color_neutral_depth])
    assert ranked[0]["shadeId"] == "close"


def test_poor_overall_candidates_receive_lower_scores_than_strong_ones():
    client = fx.make_client_profile("Medium Deep", "Warm", "Golden", (54.2, 14.7, 23.8))
    strong = fx.make_shade("strong", "Strong", "Medium Deep", "Warm", "Golden", (54.0, 15.0, 24.0))
    weak = fx.make_shade("weak", "Weak", "Very Deep", "Cool", "Rosy", (10.0, 2.0, 2.0))

    strong_score = score_shade(client, strong)["score"]
    weak_score = score_shade(client, weak)["score"]
    assert strong_score > weak_score
    assert weak_score < 50


def test_top_3_are_correctly_ordered_descending():
    ranked = rank_shades(fx.SCENARIO_A_CLIENT, fx.SCENARIO_A_SHADES)
    top_3 = ranked[:3]
    scores = [m["score"] for m in top_3]
    assert scores == sorted(scores, reverse=True)


def test_ties_are_broken_deterministically_by_delta_e(monkeypatch):
    """Two shades that reach the IDENTICAL combined score but differ in
    Delta E must sort with the lower-Delta-E one first, regardless of input
    order. Scoring is patched to controlled fixed outputs so this tests the
    tie-break comparator itself, rather than depending on hand-engineering
    real Lab values that happen to collide to one decimal place."""
    import app.services.scoring as scoring_module

    def fake_score_shade(_client_profile, shade):
        return {
            "shadeId": shade["_id"],
            "name": shade["name"],
            "code": None,
            "brandName": None,
            "productName": None,
            "depth": "Medium",
            "undertone": "Warm",
            "hue": "Golden",
            "color": {},
            "score": 90.0,  # identical for both shades -> forces the tie-break path
            "breakdown": {"color": 90, "depth": 100, "undertone": 100, "hue": 100, "calibration": 50},
            "deltaE": 2.0 if shade["_id"] == "closer" else 6.0,
            "reasons": [],
            "_depthScore": 1.0,
            "_undertoneScore": 1.0,
            "_calibrationScore": 0.5,
        }

    monkeypatch.setattr(scoring_module, "score_shade", fake_score_shade)

    closer = {"_id": "closer", "name": "Closer"}
    farther = {"_id": "farther", "name": "Farther"}

    result_1 = scoring_module.rank_shades({}, [farther, closer])
    result_2 = scoring_module.rank_shades({}, [closer, farther])

    assert [m["shadeId"] for m in result_1] == ["closer", "farther"]
    assert [m["shadeId"] for m in result_2] == ["closer", "farther"]


def test_missing_or_invalid_shade_data_does_not_crash_ranking():
    client = fx.SCENARIO_A_CLIENT
    good_shade = fx.SCENARIO_A_SHADES[0]
    broken_shades = [
        {"_id": "missing-color", "name": "Broken1", "depth": "Medium", "undertone": "Warm", "hue": "Golden"},
        {"_id": "missing-depth", "name": "Broken2", "undertone": "Warm", "hue": "Golden", "color": {"lab": {"l": 50, "a": 10, "b": 10}}},
        None,
    ]

    # Should not raise, and the one valid shade should still be scored.
    ranked = rank_shades(client, [good_shade] + [s for s in broken_shades if s is not None])
    assert any(m["shadeId"] == good_shade["_id"] for m in ranked)


def test_empty_shade_list_returns_no_candidates_status_not_a_crash():
    result = run_matching(fx.SCENARIO_A_CLIENT, [])
    assert result["status"] == "no_candidates"
    assert result["matches"] == []


# ---------------------------------------------------------------------------
# Score breakdown / reasons / response shape
# ---------------------------------------------------------------------------

def test_score_breakdown_contains_all_components():
    result = score_shade(fx.SCENARIO_A_CLIENT, fx.SCENARIO_A_SHADES[0])
    assert set(result["breakdown"].keys()) == {"color", "depth", "undertone", "hue", "calibration"}
    assert all(0 <= v <= 100 for v in result["breakdown"].values())
    assert 0 <= result["score"] <= 100


def test_match_reasons_are_generated_deterministically_from_scores():
    result = score_shade(fx.SCENARIO_A_CLIENT, fx.SCENARIO_A_SHADES[0])  # near-identical shade
    assert "Very close color profile" in result["reasons"]
    assert "Same depth category" in result["reasons"]
    assert any("undertone" in r.lower() for r in result["reasons"])


def test_reasons_do_not_claim_a_specific_undertone_when_uncertain():
    client = fx.make_client_profile("Medium", "Uncertain", "Uncertain", (56.0, 11.0, 15.0))
    shade = fx.make_shade("s", "S", "Medium", "Warm", "Golden", (56.0, 11.0, 15.0))
    result = score_shade(client, shade)
    assert not any("undertone" in r.lower() for r in result["reasons"])
    assert not any("hue" in r.lower() for r in result["reasons"])


# ---------------------------------------------------------------------------
# Low-confidence / blocked states
# ---------------------------------------------------------------------------

def test_low_confidence_status_when_best_score_is_poor():
    client = fx.make_client_profile("Very Deep", "Cool", "Rosy", (10.0, 2.0, 2.0))
    only_bad_option = [fx.make_shade("bad", "Bad", "Light", "Warm", "Golden", (85.0, 15.0, 25.0))]
    result = run_matching(client, only_bad_option)
    assert result["status"] == "low_confidence"
    assert result["message"]
    assert len(result["matches"]) > 0  # still returns the closest options


def test_blocked_when_profile_quality_unusable():
    result = run_matching(fx.SCENARIO_D_CLIENT, fx.SCENARIO_D_SHADES)
    assert result["status"] == "blocked"
    assert result["matches"] == []


def test_low_profile_confidence_flag_is_separate_from_score():
    low_conf_client = fx.make_client_profile(
        "Medium Deep", "Warm", "Golden", (54.2, 14.7, 23.8), confidence_overall=0.3
    )
    result = run_matching(low_conf_client, fx.SCENARIO_A_SHADES)
    assert result["profileConfidence"] == "low"
    # A low profile confidence must not itself suppress a good score.
    assert result["matches"][0]["score"] > 90


# ---------------------------------------------------------------------------
# Realistic scenarios (Part 7 spec)
# ---------------------------------------------------------------------------

def test_scenario_a_favors_a_medium_deep_warm_shade_over_the_clearly_wrong_one():
    ranked = rank_shades(fx.SCENARIO_A_CLIENT, fx.SCENARIO_A_SHADES)
    top_shade_id = ranked[0]["shadeId"]
    assert top_shade_id != "nc20"  # the clearly-incompatible light shade must not win
    assert ranked[0]["score"] > next(m["score"] for m in ranked if m["shadeId"] == "nc20")


def test_scenario_b_favors_closest_measured_color_with_compatible_attributes():
    ranked = rank_shades(fx.SCENARIO_B_CLIENT, fx.SCENARIO_B_SHADES)
    assert ranked[0]["shadeId"] == "deep-neutral"


def test_scenario_c_uncertain_undertone_still_produces_a_usable_ranking():
    ranked = rank_shades(fx.SCENARIO_C_CLIENT, fx.SCENARIO_C_SHADES)
    assert len(ranked) == 3
    scores = [m["score"] for m in ranked]
    assert scores == sorted(scores, reverse=True)
    # With undertone/hue uncertain, color+depth should still differentiate —
    # not every candidate should collapse to an identical score.
    assert len(set(scores)) > 1


def test_scenario_d_blocks_matching_on_unusable_profile():
    result = run_matching(fx.SCENARIO_D_CLIENT, fx.SCENARIO_D_SHADES)
    assert result["status"] == "blocked"
