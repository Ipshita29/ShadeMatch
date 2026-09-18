# ShadeMatch architecture

## Overview

```
                              User
                               │
                               ▼
                      React Frontend (client)
                               │  Axios, JSON over HTTP
                               ▼
                      Express API (server)
                               │
        ┌──────────────┬───────┴────────┬──────────────────┐
        │              │                │                  │
        ▼              ▼                ▼                  ▼
    MongoDB       Cloudinary      FastAPI ML Service      OpenAI
  (client/brand/   (photo +         │                  (shade-chart
  product/shade/   shade-chart      ├── MediaPipe        label
  match records)   image storage)   │   (face detection)  extraction
                                     ├── OpenCV             only)
                                     │   (pixel sampling,
                                     │    swatch color
                                     │    extraction)
                                     └── Color science
                                         (CIE Lab, CIEDE2000,
                                          depth/undertone/hue
                                          classification,
                                          deterministic
                                          matching engine)
```

Three independently runnable services. The frontend only ever talks to the
Express API; it never calls the ML service or OpenAI directly, and no
secret key is ever sent to the browser.

## Who is responsible for what

### React frontend (`client/`)

- Renders the UI and holds no business logic of its own — every number or
  category it shows (Match Score, depth/undertone/hue, Delta E) comes from
  a backend response, never computed client-side.
- Talks to the Express API only, through `client/src/services/*.js`
  (one Axios-based module per API domain: clients, foundations).
- Enforces UI-language rules consistently: "Match Score" (never
  "accuracy"), "Closest match" (never "exact"/"perfect"/"guaranteed"),
  qualitative confidence bands (never a raw percentage).

### Express API (`server/`)

The orchestrator. It is the only service that talks to MongoDB, Cloudinary
or OpenAI, and the only one with any concept of "a client," "a match
history entry," or "an HTTP session."

- **Client records & photo upload** — `controllers/client.controller.js`.
  Receives an uploaded photo (Multer, in-memory only — nothing is ever
  written to local disk), forwards it to Cloudinary, and stores the
  resulting URL on a `Client` document.
- **Skin analysis orchestration** — forwards a client's photo URL to the ML
  service's `/analyze/skin-regions` and `/analyze/skin-profile` endpoints
  and stores the structured result. No classification logic lives here —
  Node only forwards the request and persists the response.
- **Foundation database** — `Brand` / `FoundationProduct` / `FoundationShade`
  Mongoose models and their REST API (`controllers/foundation.controller.js`).
- **Matching orchestration** — `controllers/client.controller.js`'s
  `matchClient`: fetches the client's stored profile and the selected
  product's active shades from MongoDB, forwards *only that data* to the
  ML service's `/match` endpoint (the ML service never queries MongoDB
  itself), and persists a `Match` history record. All scoring math lives
  in the ML service — Node's job here is strictly data assembly.
- **Shade-chart import** — `controllers/foundationImport.controller.js`.
  Uploads the chart image to Cloudinary (a separate folder from client
  photos), calls the AI extraction service and the ML service's CV
  extraction endpoint **concurrently** (they're independent — see
  [AI vs. CV vs. human vs. matching engine](#ai-vs-cv-vs-human-vs-matching-engine)
  below), merges the two results into a draft, and returns it. Nothing is
  written to MongoDB at this stage. A second, explicit endpoint
  (`/import-shades`) is the only thing that writes the artist-reviewed
  shades to the database.
- **The only OpenAI caller** — `services/aiExtractionService.js` is the
  single place in the entire codebase that calls OpenAI. The key
  (`OPENAI_API_KEY`) lives only in `server/.env` and is never read by
  `client/` or `ml-service/`.
- **Cross-cutting middleware** — Helmet (security headers), CORS (restricted
  to `CLIENT_URL`, never `*`), `express.json()`, a rate limiter scoped to
  the OpenAI-calling route, Multer (file type/size validation), and a
  single error-handling middleware that converts every thrown error —
  Mongoose errors, Multer errors, malformed-JSON parse errors, or a
  genuinely unexpected exception — into a clean `{ success: false, message
  }` response. Unexpected errors are logged server-side and return a
  generic message; nothing internal (stack trace, raw parser text, raw
  library error message) is ever sent to the client.

### FastAPI ML service (`ml-service/`)

Pure computation. It has no concept of "a client" or "a session" — every
endpoint is a stateless function of the request body it's given, and it
never queries MongoDB. This is a deliberate boundary: Node owns data,
ml-service owns computation, and either can be redeployed, scaled, or
replaced independently of the other.

- **`app/services/face_detector.py`** — MediaPipe Face Landmarker face
  detection. If multiple faces are found, the largest by bounding-box area
  is used (documented decision — see the module docstring).
- **`app/services/skin_region_extractor.py`** — derives forehead/cheek
  sampling regions geometrically from stable facial landmarks.
- **`app/services/pixel_sampler.py`** — vectorized pixel extraction and
  conservative outlier filtering, tuned for *skin* pixels specifically
  (shadow/highlight/background/makeup rejection).
- **`app/services/skin_profile.py`** — Part 5's classification engine:
  measured Lab color → depth/undertone/hue categories + confidence, via
  documented, configurable thresholds (`app/core/config.py`) — not a
  trained model.
- **`app/services/{color_matching,depth_matching,undertone_matching,
  hue_matching,scoring,matching_engine}.py`** — Part 7's deterministic
  matching engine. See [`matching-engine.md`](matching-engine.md) for the
  full algorithm.
- **`app/shade_chart/`** — Part 9's shade-chart *computer vision* pipeline
  (`swatch_detector.py`, `swatch_sampler.py`, `shade_color_extractor.py`,
  `chart_parser.py`): locates candidate swatch regions, samples their
  color robustly (a *differently*-tuned outlier filter than the skin
  sampler — a deep, saturated brown is a real foundation color, not an
  outlier, the way it would be for skin), and converts to Lab. Has no
  concept of shade names or brands.
- **`app/utils/{image_utils,color_utils}.py`** — shared image
  loading/validation/resizing and the one canonical RGB↔Lab↔LCh conversion
  used everywhere color math happens in Python.

### AI vs. CV vs. human vs. matching engine

The shade-chart import flow deliberately keeps four responsibilities
separate rather than collapsing them into one AI call:

| Responsibility | Owner | Never does |
|---|---|---|
| "What shade labels/codes are visible?" | OpenAI (text only) | Guess colors, undertone, depth, or hue |
| "What color does each visible swatch contain?" | OpenCV (`ml-service/app/shade_chart/`) | Read text, know what a "shade" is |
| "Is this data correct?" | The artist, in the review UI | — |
| "How close is this shade to the client's skin?" | The Part 7 matching engine | Use AI/LLM reasoning of any kind |

The AI extraction prompt explicitly forbids returning anything but `null`
for depth/undertone/hue/RGB, and — because a prompt is not a guarantee —
the backend re-validates and **unconditionally discards** those fields
from the AI response regardless of what it contains, even a
syntactically-valid value. The only legitimate source for those fields is
either the deterministic CV-based classifier (applied to an *actually
measured* swatch color, using the same thresholds Part 6's seed data
uses) or the artist's own edit.

## Data flow: a full match request

```
1. Client photo uploaded → Cloudinary → Client.photoUrl (MongoDB)
2. Node calls ml-service POST /analyze/skin-profile with that URL
3. ml-service downloads the image, detects the face, samples pixels,
   classifies depth/undertone/hue, returns the profile
4. Node stores the profile on the Client document
5. Artist selects a foundation product
6. Node fetches the client's stored profile + that product's active
   shades from MongoDB
7. Node calls ml-service POST /match with only that data
8. ml-service scores every shade (CIEDE2000 + depth/undertone/hue +
   data-quality), ranks them, and returns the top matches — deterministic,
   no AI involved
9. Node persists a Match history record and returns the result
10. Frontend renders Match Score, Delta E, and the deterministic reasons
    exactly as returned — no client-side re-interpretation
```

## Error handling convention

Every API response follows `{ "success": boolean, ... }`. On failure:

- **Server (Node)**: `{ "success": false, "message": "..." }`, with an HTTP
  status matching the failure (400 validation, 404 not found, 422
  unprocessable, 502/503 upstream service unavailable, 500 unexpected).
  Only errors explicitly thrown with a `.status` by application code
  expose their `message` to the client; anything else (an unhandled
  exception, a raw JSON-parse failure) returns a fixed generic message
  and is logged server-side only.
- **ML service (FastAPI)**: `{ "success": false, "error": "..." }`, same
  principle — every route wraps its logic in a broad exception handler
  that logs a full traceback server-side and returns a clean, generic
  message instead of letting it propagate.

## Deployment topology

| Component | Target | Notes |
|---|---|---|
| `client/` | Vercel | Static build (`npm run build` → `dist/`); set `VITE_API_URL` to the deployed backend's URL |
| `server/` | Render or Railway | Node process; set all `server/.env.example` variables as platform env vars |
| `ml-service/` | Render or Railway | Python process (or the included `Dockerfile`); set `CLIENT_URL` to the deployed frontend's URL |
| Database | MongoDB Atlas | `MONGO_URI` on the server only |
| Images | Cloudinary | Credentials on the server only |

See the root [README's deployment section](../README.md) and
`server/.env.example` / `ml-service/.env.example` / `client/.env.example`
for the exact variables each platform needs configured.
