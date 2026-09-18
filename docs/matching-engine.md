# The matching engine

This documents the Part 7 algorithm implemented in `ml-service/app/services/
{color_matching,depth_matching,undertone_matching,hue_matching,scoring,
matching_engine}.py`, with the exact current configuration values from
`ml-service/app/core/config.py`.

**Every weight and threshold below is an initial MVP calibration value** —
a reasonable, documented starting point, not a scientifically validated
universal constant. They're centralized in one config file specifically so
they can be tuned after testing with real makeup artists without touching
any algorithm code.

**Match Score is not an accuracy percentage, not a probability, and not a
claim of scientific certainty.** It is a deterministic 0–100 ranking score
computed from measured color distance and categorical compatibility. Two
concepts that must never be conflated with it or with each other:

- **Match Score ≠ Accuracy/Probability** — it doesn't mean "94% likely to
  be correct." It means "this shade scored 94 out of 100 on our fixed
  scoring formula."
- **Profile confidence ≠ Match Score** — profile confidence describes how
  reliable the *client's skin reading* was (region agreement, image
  quality). Match Score describes how close a *specific shade* is to
  whatever that reading turned out to be. A low-confidence profile can
  still produce a high Match Score against a shade that happens to sit
  close to the (uncertain) reading — the UI shows both numbers separately
  and never merges them.

## 1. Input: skin profile

```json
{
  "depth": "Medium Deep",
  "undertone": "Warm",
  "hue": "Golden",
  "representativeColor": { "lab": { "l": 55.2, "a": 14.8, "b": 24.1 } },
  "confidence": { "overall": 0.86 },
  "quality": { "usable": true }
}
```

Before any scoring happens, `matching_engine.run_matching` checks
`quality.usable`. If `false`, the request is short-circuited with
`status: "blocked"` and a message asking for a clearer photo — no shade is
scored, because scoring an unreliable reading would misrepresent it as a
normal recommendation.

## 2. Candidate shades

Node fetches the selected product's active `FoundationShade` documents from
MongoDB and forwards them as plain data — the ML service never queries the
database itself. Each shade needs `color.rgb`/`color.lab`, `depth`,
`undertone`, `hue`, and optionally `calibration`.

## 3. Color distance

CIEDE2000 Delta E between the client's and shade's Lab color
(`color_matching.calculate_color_difference`, via `scikit-image`'s
`deltaE_ciede2000` rather than a hand-rolled implementation — verified
against the canonical Sharma et al. 2005 reference dataset). Converted to a
0–1 similarity score via piecewise-linear bands:

| Delta E | Similarity |
|---|---|
| ≤ 2.0 (`excellent`) | saturates near 1.0 |
| ≤ 5.0 (`good`) | high |
| ≤ 10.0 (`fair`) | moderate |
| ≥ 20.0 (`poor`) | floors near 0.0 |

These bands are the commonly-cited rule-of-thumb interpretation of
CIEDE2000 (≈1 is a just-noticeable difference under ideal conditions; ≈2–3
is noticeable to a trained eye; beyond ~10 colors read as clearly
different), adapted for foundation matching — not a claim specific to
skin/cosmetics science. The raw Delta E number (not just the derived
similarity) is always shown alongside Match Score in the UI, with the
explanation "lower Delta E means the measured colors are closer."

## 4. Depth compatibility

Depth is compared on an **ordered** scale — not alphabetically, and not as
a simple equal/not-equal:

```
Light → Light Medium → Medium → Medium Deep → Deep → Very Deep
```

Score by step distance on that scale:

| Step distance | Score |
|---|---|
| 0 (exact) | 1.0 |
| 1 | 0.7 |
| 2 | 0.35 |
| 3 | 0.15 |
| 4+ | 0.05 |

A same-category depth still gets full credit even with a different color;
a two-step gap is penalized heavily even if the raw color distance happens
to be small, because a visibly-wrong depth reads as a wrong shade to a
person regardless of the numbers.

## 5. Undertone compatibility

An explicit, symmetric compatibility matrix (not a distance formula):

| Pair | Score |
|---|---|
| Same (Warm/Warm, Cool/Cool, Neutral/Neutral, Olive/Olive) | 1.0 |
| Warm↔Neutral, Cool↔Neutral | 0.6 |
| Neutral↔Olive | 0.55 |
| Warm↔Olive | 0.5 |
| Cool↔Olive | 0.35 |
| Warm↔Cool | 0.2 |

**"Uncertain" is never penalized.** If either side's undertone is
"Uncertain," the pair gets a fixed moderate score (0.65) instead of a
matrix lookup — an ambiguous measurement is not evidence of a bad match,
only of an ambiguous measurement.

## 6. Hue compatibility

Same structure as undertone, deliberately gentler (hue is a secondary,
more cosmetic signal): same-hue pairs score 1.0, cross-hue pairs range
0.4–0.7, and an "Uncertain" reading on either side scores a fixed 0.7
rather than being penalized.

## 7. Calibration / shade data quality

A small modifier reflecting how trustworthy the shade's *color values*
are (independent of whether its name/code are real) — never how good the
match itself is:

| `calibration.status` | Score |
|---|---|
| `calibrated` (real physical measurement) | 1.0 |
| `estimated` (digital approximation) | 0.5 |
| `uncalibrated` | 0.25 |
| missing | 0.5 (treated as `estimated`, not penalized as known-bad) |

## 8. Weighted score

```
score = 0.60 × color_similarity
      + 0.20 × depth_score
      + 0.10 × undertone_score
      + 0.05 × hue_score
      + 0.05 × calibration_score
```

×100, rounded to one decimal. Color dominates deliberately: it's the only
component derived directly from measured pixels on *both* sides of the
comparison. Depth/undertone/hue are themselves derived from color, so
weighting them heavily too would double-count the same underlying signal
— they exist to catch cases where a small numeric Delta E still crosses a
category boundary that reads as visibly wrong to a person. Calibration
gets the smallest weight on purpose: it should nudge a score, never flip a
ranking.

Every score ships with its full breakdown (`breakdown.color`,
`.depth`, `.undertone`, `.hue`, `.calibration`, each 0–100) and a list of
deterministic reasons generated **only** from those breakdown numbers —
never from an LLM, never inventing a claim the numbers don't support. If a
shade's `reasons` array is ever empty (an edge case), the frontend derives
minimal reasons from the same breakdown thresholds rather than showing
nothing — still zero free-text generation.

## 9. Ranking and tie-breaking

Candidates are sorted by score descending, with a fully deterministic
tie-break: `(-score, deltaE, -depth_score, -undertone_score,
-calibration_score)`. Lower Delta E wins a tie first, then better depth
compatibility, then undertone, then calibration. Running the same client
profile against the same shade list always produces the same order.

## 10. Top 3 selection and guardrails

The ranked list is sliced to the top 3. Two guardrails prevent
overclaiming:

- **`low_confidence` status** — if even the *best* available score is
  below 50, the response is flagged `low_confidence` instead of a normal
  `ok` result. The frontend shows "No strong match found" / "Closest
  available shades" — never presenting a poor option as a confident
  recommendation.
- **`profileConfidence: "low"`** — set independently whenever the client's
  own profile confidence was below 0.5, regardless of how well any shade
  scored. This is a completely separate signal from the match status
  above (see the note at the top of this document).

A malformed or incomplete shade record is skipped rather than allowed to
crash the whole request — one bad document in the database doesn't take
down matching for every other shade in the product.
