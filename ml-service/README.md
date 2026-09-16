# ShadeMatch ML Service

The computer-vision / machine-learning service for ShadeMatch, built with FastAPI.
It runs independently from the Node.js backend and will eventually handle skin
detection, skin profile generation, and foundation shade matching logic.

## Status

Part 5 — skin profile engine. Given a client photo URL, the service detects
the face (Part 4), samples/filters pixels from the forehead and both cheeks,
and now also converts those measurements into a structured skin profile:
depth, undertone, hue, a representative Lab/RGB color, and heuristic
confidence/quality indicators (Part 5). This is a transparent CIE Lab
color-science heuristic, documented and configurable — **not** a trained ML
model (see "Scientific limitations" below) — and it does **not** yet touch
foundation shades or matching, which are Part 6/7.

## Setup

```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

The first request to `/analyze/skin-regions` downloads MediaPipe's Face
Landmarker model (~3.6 MB) into a local `.cache/` folder — it isn't bundled
in the pip package, and isn't committed to the repo. This requires network
access on first use only; the model is then reused from disk.

## Run

```bash
uvicorn app.main:app --reload
```

The service starts on `http://localhost:8000` by default.

### Running in Docker

A `Dockerfile` is included and is the **recommended way to run this
service**, independent of host OS quirks:

```bash
cd ml-service
docker build -t shadematch-ml-service .
docker run --rm -p 8000:8000 -e CLIENT_URL=http://localhost:5173 shadematch-ml-service
```

> **Known issue:** on some macOS setups, MediaPipe's Tasks API (used for
> face detection) crashes with a native `SIGABRT` from a Metal/GPU helper
> (`DrishtiMetalHelper`), even when explicitly configured to use the CPU
> delegate — this reproduces with the simplest possible MediaPipe call, so
> it isn't specific to this service's code. It was not reproducible in a
> Linux container. If `uvicorn app.main:app --reload` crashes on face
> detection on your Mac, use the Docker command above instead.

## Endpoints

- `GET /health` — service health check
- `POST /analyze/skin-regions` — Part 4: face detection + skin-region pixel
  extraction (see below)
- `POST /analyze/skin-profile` — Part 5: the same extraction, converted into
  a structured skin profile (see below)

### `POST /analyze/skin-regions`

**Request body:**

```json
{ "imageUrl": "https://res.cloudinary.com/.../client-photo.jpg", "debug": false }
```

`debug: true` additionally returns a base64 JPEG with the detected face box
and sampled regions drawn on it — useful for verifying region placement
during development. It is not required by (or depended on by) the core
response and costs a small amount of extra processing time.

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "faceDetected": true,
    "image": { "width": 1024, "height": 1280 },
    "quality": { "usable": true, "brightness": "acceptable", "faceSize": "acceptable" },
    "regions": {
      "forehead": { "pixelCount": 800, "rgb": { "mean": [145, 102, 82], "median": [146, 103, 83] }, "lab": { "mean": [47.8, 18.2, 21.4], "median": [48.1, 18.0, 21.1] } },
      "leftCheek": { "...": "..." },
      "rightCheek": { "...": "..." }
    },
    "representativeColor": { "rgb": { "...": "..." }, "lab": { "...": "..." } }
  }
}
```

**Error responses** — always `{ "success": false, "error": "..." }`, never a
raw Python traceback:

| Status | When |
| --- | --- |
| 400 | Missing/malformed request body |
| 422 | Image can't be decoded, too small, or no face detected |
| 502 | The image URL couldn't be downloaded |
| 500 | Unexpected internal error (logged server-side, not shown to the client) |

### `POST /analyze/skin-profile`

Same request body as `/analyze/skin-regions` (`imageUrl`, optional `debug`).
Runs the identical Part 4 extraction internally, then classifies it.

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "profile": { "depth": "Medium Deep", "undertone": "Warm", "hue": "Golden" },
    "representativeColor": {
      "rgb": { "r": 146, "g": 105, "b": 84 },
      "lab": { "l": 54.2, "a": 14.7, "b": 23.8 }
    },
    "confidence": { "overall": 0.87, "depth": 0.93, "undertone": 0.81, "hue": 0.84 },
    "quality": { "usable": true, "regionalConsistency": 0.86 }
  }
}
```

When `quality.usable` is `false`, a `quality.reason` string explains why
(e.g. `"Image lighting may affect color estimation."`) — the frontend shows
this instead of a profile and asks for a better photo. Same error status
codes as `/analyze/skin-regions` apply (this endpoint fails the same way
Part 4 does if the face/image itself is the problem).

## How it works

1. **Download & validate** (`app/utils/image_utils.py`) — fetches the image,
   verifies it decodes as JPEG/PNG/WEBP, checks minimum dimensions, and
   resizes it so the longest side is at most **1024px** before any CV
   processing runs. This keeps MediaPipe fast (sub-second on CPU) while
   preserving enough detail for reliable region sampling — full-resolution
   phone photos (4000px+) would otherwise dominate processing time for no
   accuracy benefit.
2. **Face detection** (`app/services/face_detector.py`) — MediaPipe Face
   Landmarker (Tasks API) returns up to 5 faces with 478 landmarks each. If
   multiple faces are detected, **the largest one by bounding-box area is
   used** (documented decision: a makeup artist photographs one client at a
   time, so the most prominent face in frame is assumed to be the client —
   rejecting the whole photo over a background bystander would be more
   disruptive than just ignoring them).
3. **Region selection** (`app/services/skin_region_extractor.py`) — cheek
   and forehead sampling regions are computed *geometrically* from ten
   well-documented, stable landmarks (eye corners, mouth corners, face-oval
   edges, hairline point) rather than trusting a single less-certain
   "cheek center" landmark index. Region size scales with the person's
   interocular distance, so it adapts to face size/image resolution
   automatically. See the module docstring for the exact formula.
4. **Pixel sampling & filtering** (`app/services/pixel_sampler.py`) — pixels
   are extracted per region with vectorized NumPy indexing (no per-pixel
   Python loops), then conservatively filtered: near-black shadow pixels,
   near-white highlights, low-saturation/high-value background pixels, and
   over-saturated pixels (heavy makeup, fabric, jewelry) are dropped, followed
   by a robust median-absolute-deviation outlier pass. Up to 1000 pixels per
   region are kept. This is deliberately conservative cleanup, not skin
   classification — it never uses ethnic/demographic labels or assumptions.
5. **Color stats** (`app/utils/color_utils.py`) — RGB and CIE Lab mean/median
   per region, plus a pooled "representative color sample" across all valid
   regions. HSV is used internally for filtering only.
6. **Quality flags** (`app/services/image_quality.py`) — basic `brightness`
   / `faceSize` / `usable` flags from whole-image luminance, face size
   relative to the image, and how many pixels actually survived filtering
   per region (a locally over/under-exposed region can look fine on a
   whole-image average but still yield almost no usable samples).
7. **Skin profile** (`app/services/skin_profile.py`, Part 5) — takes the
   Part 4 output above and:
   - Aggregates the three regions' Lab **medians** into one representative
     color, weighted by `REGION_WEIGHTS` in `app/core/config.py` (cheeks
     weighted slightly higher — most relevant to foundation application —
     but renormalized across whichever regions actually had enough pixels).
   - Classifies **depth** from L* against `DEPTH_THRESHOLDS`, **undertone**
     from the b*/a* ratio against `UNDERTONE_WARM_RATIO`/`UNDERTONE_COOL_RATIO`,
     and **hue** (a more cosmetic Rosy/Golden/Olive/Neutral label) from the
     same axes plus an explicit desaturated-olive check. Every threshold is
     an **initial MVP calibration value** — see the "Scientific limitations"
     note in `skin_profile.py` and the comment block in `config.py`.
   - Computes **regional consistency**: how much the three regions agree
     with each other in the a*/b* chroma plane — not classification
     accuracy, just measurement agreement. Below a threshold, undertone/hue
     fall back to an explicit uncertain state rather than guessing.
   - Computes heuristic **confidence** per classification (distance from the
     nearest decision boundary) and an overall score that also factors in
     regional consistency, Part 4's image-quality flags, and how many
     regions were usable. These are reliability scores, not validated model
     probabilities — the frontend maps them to "High"/"Moderate"/"Low"
     bands, never a raw percentage.
   - Each classifier (`estimate_depth`, `estimate_undertone`, `estimate_hue`)
     is a small pure function — `Lab in, (label, confidence) out` — so any
     one of them can later be swapped for a trained model without touching
     the API response shape or the frontend.

## Testing

```bash
source venv/bin/activate
pytest tests/ -v
```

`tests/fixtures/skin_profile_fixtures.py` has synthetic (not real-person)
Lab/RGB inputs for depth/undertone/hue boundaries, ambiguous cases,
inconsistent regions, low pixel counts and poor-quality photos, so the
classification logic in `skin_profile.py` can be exercised without
repeatedly uploading real photos.

## Scientific limitations

Photographic skin-color estimation is affected by ambient lighting, camera
white balance, exposure, shadows, highlights, makeup, skincare products,
filters and image compression. **This system is an assistive estimation
tool** — it is not exact skin-tone detection, not 100% accurate, and not an
objective measurement of anyone's "true" skin color. Depth/undertone/hue
categories are internal organizational buckets for foundation shade ranges,
derived only from this image's measured pixel colors — never from ethnicity,
nationality, race or any other demographic assumption. Physical shade
testing in person, under suitable lighting, should always precede a final
foundation decision.

## Folder structure

```
ml-service/
├── app/
│   ├── api/
│   │   ├── health.py
│   │   └── skin.py            # POST /analyze/skin-regions, /analyze/skin-profile
│   ├── core/
│   │   └── config.py          # all Part 4 + Part 5 calibration constants
│   ├── models/
│   │   ├── skin.py            # request schema
│   │   └── skin_profile.py    # Part 5 response schema
│   ├── services/
│   │   ├── face_detector.py
│   │   ├── skin_region_extractor.py
│   │   ├── pixel_sampler.py
│   │   ├── image_quality.py
│   │   └── skin_profile.py    # Part 5 classification engine
│   ├── utils/
│   │   ├── image_utils.py
│   │   └── color_utils.py
│   └── main.py
├── tests/
│   ├── fixtures/skin_profile_fixtures.py
│   └── test_skin_profile.py
├── Dockerfile
├── requirements.txt
└── .env.example
```
