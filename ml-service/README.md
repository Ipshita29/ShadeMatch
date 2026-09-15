# ShadeMatch ML Service

The computer-vision / machine-learning service for ShadeMatch, built with FastAPI.
It runs independently from the Node.js backend and will eventually handle skin
detection, skin profile generation, and foundation shade matching logic.

## Status

Part 4 — face detection and skin-region extraction. Given a client photo URL,
the service detects the face, samples pixels from the forehead and both
cheeks, filters out obvious non-skin outliers, and returns RGB/Lab color
statistics per region. It does **not** yet classify undertone, depth, hue or
produce a final skin profile — that's Part 5.

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
- `POST /analyze/skin-regions` — face detection + skin-region pixel
  extraction (see below)

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

## Folder structure

```
ml-service/
├── app/
│   ├── api/
│   │   ├── health.py
│   │   └── skin.py            # POST /analyze/skin-regions
│   ├── core/
│   │   └── config.py
│   ├── models/
│   │   └── skin.py            # request schema
│   ├── services/
│   │   ├── face_detector.py
│   │   ├── skin_region_extractor.py
│   │   ├── pixel_sampler.py
│   │   └── image_quality.py
│   ├── utils/
│   │   ├── image_utils.py
│   │   └── color_utils.py
│   └── main.py
├── Dockerfile
├── requirements.txt
└── .env.example
```
