import os

from dotenv import load_dotenv

load_dotenv()

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
CLIENT_URL = os.getenv("CLIENT_URL", "http://localhost:5173")
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:5000")


# =============================================================================
# PART 5 — SKIN PROFILE ENGINE CALIBRATION
# =============================================================================
# Every threshold below is an INITIAL MVP CALIBRATION VALUE chosen from
# general CIE Lab color-science reasoning (how L*/a*/b* relate to perceived
# lightness, redness and yellowness). None of them have been validated
# against a labeled dataset of real skin photographs with ground truth.
#
# They are deliberately centralized here — nowhere else in the codebase
# should a raw number like "50.0" or "1.15" appear for this logic — so that
# recalibrating against real reference images later is a config change, not
# a code change. See app/services/skin_profile.py for how each constant is
# used, and the module docstring there for the full classification design.

# How much each facial region contributes to the aggregated representative
# color. Cheeks are weighted slightly higher since they're the area most
# relevant to foundation application, but not so high that a single
# inconsistent cheek reading can dominate the result.
REGION_WEIGHTS = {
    "forehead": 0.30,
    "leftCheek": 0.35,
    "rightCheek": 0.35,
}

# A region with fewer surviving pixels than this (after Part 4's outlier
# filtering) is excluded from aggregation entirely rather than trusted with
# a full weight — a handful of stray pixels is not a reliable observation.
MIN_VALID_PIXELS_PER_REGION = 30

# --- Depth: classified from L* (CIE Lab lightness, 0=black, 100=white) -----
# Checked in ascending order; the first bucket whose max L* is not exceeded
# wins. These are internal organizational buckets for foundation shade
# ranges, not biological or demographic categories.
DEPTH_THRESHOLDS = [
    (20.0, "Very Deep"),
    (35.0, "Deep"),
    (50.0, "Medium Deep"),
    (62.0, "Medium"),
    (75.0, "Light Medium"),
    (101.0, "Light"),
]
# Half-width (in L* units) used to normalize "distance from the nearest
# boundary" into a confidence score — see calculate_confidence().
DEPTH_CONFIDENCE_SCALE = 7.0

# --- Undertone: classified from the ratio of b* (yellow) to a* (red) ------
# A ratio well above 1 means yellow dominates over red (Warm); well below 1
# means red/blue dominates over yellow (Cool); close to 1 is balanced
# (Neutral). This looks at the RELATIONSHIP between the two chromatic axes
# rather than an arbitrary absolute RGB cutoff, per Part 5 spec guidance.
UNDERTONE_WARM_RATIO = 1.15
UNDERTONE_COOL_RATIO = 0.85
UNDERTONE_CONFIDENCE_SCALE = 0.25  # ratio-units used to normalize confidence

# --- Hue: a more cosmetic/descriptive label, layered on the same a*/b* ----
# measurements as undertone, plus a specific check for a desaturated,
# yellow-retained/red-suppressed ("olive") appearance. Kept separate from
# undertone per spec — Undertone stays a conservative Warm/Cool/Neutral
# split, while Hue is allowed the more editorial "Golden"/"Rosy"/"Olive"
# vocabulary the matching engine (Part 7) and UI can use.
HUE_OLIVE_MAX_A = 8.0   # a* at or below this = redness is suppressed
HUE_OLIVE_MIN_B = 12.0  # b* at or above this = yellow is still clearly present

# --- Regional consistency ---------------------------------------------------
# Average pairwise distance (in a*/b* chroma-plane units) between valid
# regions' Lab medians, above which they're considered to disagree
# meaningfully. 0 distance -> consistency 1.0; at/beyond this scale -> 0.0.
REGIONAL_CONSISTENCY_SCALE = 15.0

# Below this regional-consistency score, undertone/hue are no longer
# reported as a confident category — the regions disagree too much to trust
# any single label, regardless of what the aggregate number says.
REGIONAL_CONSISTENCY_UNCERTAIN_THRESHOLD = 0.55

# Below this regional-consistency score, the whole profile is flagged
# unusable and the artist is asked for a better photo.
REGIONAL_CONSISTENCY_UNUSABLE_THRESHOLD = 0.35

# Fewer than this many valid (post-filter) regions and there isn't enough
# independent agreement to trust the profile at all.
MIN_VALID_REGIONS_FOR_USABLE_PROFILE = 2


# =============================================================================
# PART 7 — FOUNDATION SHADE MATCHING ENGINE CALIBRATION
# =============================================================================
# As with Part 5, every value below is an INITIAL MVP CALIBRATION VALUE, not
# a scientifically validated universal threshold. They are centralized here
# so tuning the algorithm after testing with real makeup artists is a config
# change, not a code change. See app/services/matching_engine.py and its
# submodules for how each constant is used.

# --- Combined score weights --------------------------------------------
# Color similarity (measured Delta E) is the dominant signal because it's
# the only component derived directly from the actual measured pixels on
# both sides of the comparison — depth/undertone/hue are themselves already
# DERIVED FROM color, so weighting them too heavily would double-count the
# same signal. They still matter because Delta E alone can occasionally
# favor a color that "reads" wrong to a human even at a small numeric
# distance (e.g. crossing an undertone boundary) — the categorical terms
# catch that. Calibration quality gets the smallest weight deliberately:
# it should nudge, never override, an otherwise strong or weak color match.
MATCH_WEIGHTS = {
    "color": 0.60,
    "depth": 0.20,
    "undertone": 0.10,
    "hue": 0.05,
    "calibration": 0.05,
}

# --- Delta E (CIEDE2000) interpretation ---------------------------------
# These bands are the commonly-cited rule-of-thumb interpretation of Delta E
# 2000 (≈1 is a just-noticeable difference under ideal conditions; ≈2-3 is
# noticeable to a trained eye; beyond ~10 colors read as clearly different)
# adapted for foundation matching, not a claim specific to skin/cosmetics
# science. Used only to convert Delta E into the 0-1 color similarity score
# and into human-readable match reasons — never shown to the user as-is.
DELTA_E_THRESHOLDS = {
    "excellent": 2.0,   # at or below this -> similarity saturates near 1.0
    "good": 5.0,
    "fair": 10.0,
    "poor": 20.0,        # at or beyond this -> similarity floors near 0.0
}

# --- Depth compatibility -------------------------------------------------
# Ordered scale (NOT alphabetical) mirroring Part 5/6's depth categories.
DEPTH_ORDER = ["Light", "Light Medium", "Medium", "Medium Deep", "Deep", "Very Deep"]

# Compatibility score by |step difference| on the ordered scale above.
# Exact match -> 1.0; each additional step falls off faster than linearly,
# since a 2-step depth gap reads as a visibly wrong shade even if the other
# attributes match well.
DEPTH_STEP_SCORES = {0: 1.0, 1: 0.7, 2: 0.35, 3: 0.15}
DEPTH_STEP_SCORE_FLOOR = 0.05  # any gap beyond the table above

# --- Undertone compatibility ----------------------------------------------
# Symmetric compatibility matrix. "Uncertain" deliberately does not default
# to a low score — an uncertain reading isn't evidence of a bad match, only
# of an ambiguous measurement, so it's scored as a moderate, non-penalizing
# middle value against everything (including itself).
UNDERTONE_COMPATIBILITY = {
    ("Warm", "Warm"): 1.0,
    ("Cool", "Cool"): 1.0,
    ("Neutral", "Neutral"): 1.0,
    ("Olive", "Olive"): 1.0,
    ("Warm", "Neutral"): 0.6,
    ("Cool", "Neutral"): 0.6,
    ("Neutral", "Olive"): 0.55,
    ("Warm", "Olive"): 0.5,
    ("Cool", "Olive"): 0.35,
    ("Warm", "Cool"): 0.2,
}
UNDERTONE_UNCERTAIN_SCORE = 0.65

# --- Hue compatibility -----------------------------------------------------
# Deliberately a smaller, gentler spread than undertone's — hue carries only
# a 5% final weight (see MATCH_WEIGHTS), so it should refine the ranking,
# not swing it.
HUE_COMPATIBILITY = {
    ("Golden", "Golden"): 1.0,
    ("Rosy", "Rosy"): 1.0,
    ("Neutral", "Neutral"): 1.0,
    ("Olive", "Olive"): 1.0,
    ("Golden", "Neutral"): 0.7,
    ("Rosy", "Neutral"): 0.7,
    ("Olive", "Neutral"): 0.65,
    ("Golden", "Olive"): 0.6,
    ("Rosy", "Olive"): 0.5,
    ("Golden", "Rosy"): 0.4,
}
HUE_UNCERTAIN_SCORE = 0.7

# --- Calibration quality modifier ------------------------------------------
# A small nudge, not a dominant signal (5% final weight). "calibrated" real
# physical measurements are trusted more than "estimated" digital swatches;
# missing calibration data entirely is treated like "estimated" rather than
# being penalized as though it were known-bad.
CALIBRATION_STATUS_SCORES = {
    "calibrated": 1.0,
    "estimated": 0.5,
    "uncalibrated": 0.25,
}
CALIBRATION_DEFAULT_SCORE = 0.5

# --- Low-confidence guardrails ---------------------------------------------
# If even the best available shade scores below this, the result set is
# flagged low_confidence rather than presented as a normal recommendation.
LOW_CONFIDENCE_SCORE_THRESHOLD = 50.0

# Below this client-profile confidence, results additionally carry
# profileConfidence: "low" so the frontend can warn the artist — this is
# entirely separate from the shade match score itself (see module docstring
# in matching_engine.py for why these are kept as two different concepts).
LOW_PROFILE_CONFIDENCE_THRESHOLD = 0.5
