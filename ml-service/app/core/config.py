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
