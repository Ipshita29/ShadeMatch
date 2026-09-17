"""Part 7 — Foundation Shade Matching Engine.

Top-level orchestrator: takes a Part 5 client skin profile and a list of
Part 6 foundation shades (already filtered to one product / isActive by
Node — this service does not query MongoDB, per the Part 7 spec's
decoupling requirement) and returns a ranked, explainable Top 3.

PIPELINE (see submodules for each step):
  color_matching.py     — CIEDE2000 Delta E -> 0-1 similarity
  depth_matching.py     — ordered-scale depth compatibility
  undertone_matching.py — Warm/Cool/Neutral/Olive/Uncertain compatibility
  hue_matching.py        — Rosy/Neutral/Golden/Olive/Uncertain compatibility
  scoring.py             — weighted combination, reasons, ranking, tie-break

DESIGN PRINCIPLE — NOT AN LLM: every number here comes from a deterministic,
documented formula. No language model decides or influences the ranking.
An LLM may later turn this data into prose (Part 9+), but the underlying
match must stay fully explainable and reproducible.

SCORES ARE NOT PROBABILITIES: "Match Score: 94" means "this shade ranked
highly against our weighted similarity criteria" — never "94% chance this
is correct" or "94% accurate". See core/config.py MATCH_WEIGHTS docstring
for the full reasoning behind the weighting, and STEP 10 handling below for
why a weak result set is flagged rather than dressed up as a confident one.
"""

from app.core.config import LOW_CONFIDENCE_SCORE_THRESHOLD, LOW_PROFILE_CONFIDENCE_THRESHOLD
from app.services.scoring import rank_shades

TOP_N = 3

NO_CANDIDATES_MESSAGE = "This foundation product has no shades available to match against."
LOW_CONFIDENCE_MESSAGE = "No close shade was found in the selected foundation range."
UNUSABLE_PROFILE_MESSAGE = "Please upload a clearer photo before matching."


def run_matching(client_profile: dict, shades: list) -> dict:
    """Returns the full match response body (the API route wraps it in
    {success, data})."""
    # Node is expected to check this before ever calling the ML service (it
    # already has the profile in Mongo, so it's a wasted round-trip
    # otherwise) — this is a defense-in-depth repeat of that same guard, in
    # case this endpoint is ever called directly.
    if client_profile.get("quality", {}).get("usable") is False:
        return {
            "status": "blocked",
            "message": UNUSABLE_PROFILE_MESSAGE,
            "profileConfidence": _profile_confidence_flag(client_profile),
            "matches": [],
        }

    profile_confidence = _profile_confidence_flag(client_profile)

    if not shades:
        return {
            "status": "no_candidates",
            "message": NO_CANDIDATES_MESSAGE,
            "profileConfidence": profile_confidence,
            "matches": [],
        }

    ranked = rank_shades(client_profile, shades)
    top_matches = ranked[:TOP_N]

    best_score = top_matches[0]["score"] if top_matches else 0
    is_low_confidence = best_score < LOW_CONFIDENCE_SCORE_THRESHOLD

    return {
        "status": "low_confidence" if is_low_confidence else "ok",
        "message": LOW_CONFIDENCE_MESSAGE if is_low_confidence else None,
        "profileConfidence": profile_confidence,
        # Even in the low_confidence case, the closest available shades are
        # still returned — a flagged, honestly-labeled option is more useful
        # to an artist than no information at all (see Part 7 spec, Step 10).
        "matches": top_matches,
    }


def _profile_confidence_flag(client_profile: dict) -> str:
    """Kept entirely separate from the shade match score itself — see the
    module docstring. This only reflects how reliable the CLIENT'S measured
    profile is, independent of how well any shade happens to match it.
    """
    overall = client_profile.get("confidence", {}).get("overall")
    if isinstance(overall, (int, float)) and overall < LOW_PROFILE_CONFIDENCE_THRESHOLD:
        return "low"
    return "normal"
