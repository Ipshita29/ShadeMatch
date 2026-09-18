# ShadeMatch

AI-assisted foundation shade matching for makeup artists.

## Problem

Foundation shade selection is still mostly trial and error. Artists eyeball a
client's skin against a handful of testers under whatever light is
available, brands describe their ranges inconsistently (a "warm" in one
line doesn't mean the same thing in another), and there's no structured way
to compare a specific client against a specific product's full shade range
before physically testing anything.

## Solution

ShadeMatch turns that into a repeatable pipeline:

```
Client photo (natural light)
        ↓
Skin-region detection (face + forehead/cheek sampling)
        ↓
Structured skin profile (depth, undertone, hue, measured color)
        ↓
Artist selects a foundation product
        ↓
Deterministic color-science matching against that product's shades
        ↓
Top 3 ranked matches, each with a Match Score, Delta E, and plain-language reasons
        ↓
Side-by-side comparison
```

Foundation shade *data* is the other half of the problem — most brands
don't publish machine-readable shade charts. So ShadeMatch also lets an
artist upload a photo of a shade chart, uses AI to read the printed shade
names/codes and computer vision to estimate each swatch's color, and puts
the result in front of the artist for review and correction before anything
is saved. Once confirmed, those shades are ordinary rows in the same
database the matching engine already reads from — no separate "AI shades"
system.

**Every number ShadeMatch shows is a Match Score, not a promise.** See
[Matching Method](#matching-method) below and
[`docs/matching-engine.md`](docs/matching-engine.md) for exactly what that
means and doesn't mean.

## Features

- **Client photo analysis** — face detection (MediaPipe) and forehead/cheek
  pixel sampling with outlier filtering, from an uploaded photo.
- **Skin profile** — depth, undertone, hue, a representative Lab/RGB color,
  and a qualitative (never raw-percentage) confidence band, derived
  transparently from measured pixels — not a black-box model.
- **Foundation database** — a real `Brand → Product → Shade` dataset with
  documented, honestly-labeled color-data provenance.
- **Deterministic shade matching** — CIEDE2000 color distance plus
  depth/undertone/hue compatibility and a small shade-data-quality modifier,
  combined with fixed, documented weights. No LLM is involved in scoring.
- **Top 3 recommendations** with a full score breakdown and reasons derived
  only from that breakdown — never invented.
- **Shade comparison** — client color vs. matched shade, and a side-by-side
  table of the top 3.
- **AI-assisted shade-chart import** — OpenAI reads visible labels only
  (never colors or categories); OpenCV independently estimates swatch
  colors; the two are merged into a draft the artist reviews, edits, and
  explicitly confirms before anything reaches the database.
- **Human verification throughout** — every AI/CV-derived value is editable
  before it's trusted, and the system is explicit about which values are
  measured vs. estimated vs. artist-confirmed.

## Architecture

Three independent services:

```
React (client)
      │  Axios, JSON over HTTP
      ▼
Express (server) ── MongoDB (client/brand/product/shade/match records)
      │        │
      │        └── Cloudinary (photo + shade-chart image storage)
      │
      ├── FastAPI (ml-service) — face detection, pixel sampling, color
      │       science classification, deterministic matching, shade-chart
      │       computer-vision color extraction
      │
      └── OpenAI — shade-chart LABEL extraction only (never colors, never
              category judgments, never the final skin-to-shade match)
```

The Node server is the only thing MongoDB, Cloudinary and OpenAI ever talk
to; the frontend never calls the ML service or OpenAI directly, and no
secret key is ever sent to the browser. The ML service never queries
MongoDB itself — Node fetches whatever records are needed and forwards
only that data, so the two services stay independently testable and
replaceable. See [`docs/architecture.md`](docs/architecture.md) for the
full breakdown of what each service is (and isn't) responsible for.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React, Vite, JavaScript, React Router, Axios, CSS Modules |
| Backend | Node.js, Express, MongoDB, Mongoose, Multer, Cloudinary SDK, Helmet, express-rate-limit |
| ML service | Python, FastAPI, Uvicorn, OpenCV, MediaPipe, NumPy, Pillow, scikit-image, scikit-learn |
| AI | OpenAI API (shade-chart label extraction only) |

## Project structure

```
shadematch/
├── client/                     # React + Vite frontend
│   └── src/
│       ├── components/         # Reusable UI, grouped by domain (common/, matching/, foundations/, ...)
│       ├── pages/               # Route-level pages
│       ├── services/            # Axios API clients — the only place components talk to the backend
│       └── utils/                # Pure helpers (validation, color/enum constants, ...)
├── server/                     # Node/Express API
│   └── src/
│       ├── config/               # DB + Cloudinary configuration
│       ├── constants/             # Shared controlled vocabularies (depth/undertone/hue/...)
│       ├── controllers/            # Route handler logic
│       ├── middleware/              # Upload validation, rate limiting, error handling
│       ├── models/                   # Mongoose schemas
│       ├── routes/                    # Express routers
│       ├── services/                   # External calls (ml-service, Cloudinary, OpenAI) + business logic
│       ├── seed/                        # Demo/seed dataset loader
│       └── utils/                        # Color conversion, pagination, regex-escaping, classification
├── ml-service/                  # Python/FastAPI CV, color-science and matching service
│   └── app/
│       ├── api/                    # Route definitions
│       ├── core/                    # Centralized, documented calibration constants
│       ├── models/                   # Pydantic request schemas
│       ├── services/                  # Face detection, sampling, classification, matching
│       ├── shade_chart/                # Shade-chart-specific CV pipeline (swatch detection/sampling/color extraction)
│       └── utils/                       # Image loading/validation, color conversion
├── docs/
│   ├── architecture.md
│   └── matching-engine.md
├── README.md
└── package.json                # Root convenience script (runs client + server together)
```

## Environment variables

No real secrets are committed to this repo — every `.env` is git-ignored,
and each service has a `.env.example` documenting what it needs.

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
cp ml-service/.env.example ml-service/.env
```

**`server/.env`**

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGO_URI` | MongoDB connection string (local mongod or Atlas) |
| `JWT_SECRET` | Reserved for authentication — see [Known limitations](#known-limitations) |
| `CLIENT_URL` | Frontend origin, used for CORS |
| `ML_SERVICE_URL` | Base URL of the FastAPI service |
| `OPENAI_API_KEY` | Used only for shade-chart label extraction; leave blank to disable that one feature — everything else works without it |
| `OPENAI_VISION_MODEL` | Optional override of the default vision model |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Image storage |

**`ml-service/.env`**: `HOST`, `PORT`, `CLIENT_URL` (CORS).

**`client/.env`**: `VITE_API_URL` — the Node API's base URL, including the
`/api` prefix.

None of `OPENAI_API_KEY`, `MONGO_URI`, `JWT_SECRET` or
`CLOUDINARY_API_SECRET` are ever read by the frontend or sent to the
browser — only `server/` and (for MongoDB, `ml-service/` doesn't touch it
at all) read them.

## Local setup

```bash
# Frontend
cd client && npm install

# Backend
cd server && npm install

# ML service
cd ml-service
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Root (optional, for the combined `npm run dev`)
cd .. && npm install
```

## Database setup

MongoDB (local `mongod` or an Atlas cluster) is required by the server —
set `MONGO_URI` accordingly. Then seed the demo dataset:

```bash
cd server
npm run seed
```

This clears and reloads the `Brand`, `FoundationProduct` and
`FoundationShade` collections from `server/src/data/foundations/` — 5
brands, 5 products, 41 shades spanning the full depth range, multiple
undertones and hues. It does **not** touch `Client` or `Match` records.
See [Demo data](#demo-data) below for what's in it and how it's labeled.

## Running the project

Three services, three terminals (or the root `npm run dev` for the first
two):

```bash
# Backend — http://localhost:5000, health check GET /api/health
cd server && npm run dev

# ML service — http://localhost:8000, health check GET /health
cd ml-service && source venv/bin/activate && uvicorn app.main:app --reload

# Frontend — http://localhost:5173
cd client && npm run dev
```

```bash
# Or, from the repo root, after `npm install`:
npm run dev   # starts client + server together via concurrently
```

The ML service is a separate Python runtime and always runs independently.

### Running the ML service in Docker

MediaPipe's face detector is known to crash natively (`SIGABRT` from a
Metal/GPU helper) on some macOS setups — not specific to this codebase,
reproducible with the simplest possible MediaPipe call. If face detection
crashes locally on macOS, use the included `Dockerfile` instead:

```bash
cd ml-service
docker build -t shadematch-ml-service .
docker run --rm -p 8000:8000 -e CLIENT_URL=http://localhost:5173 shadematch-ml-service
```

## API overview

**Server** (`http://localhost:5000/api`)

| Method & path | Purpose |
|---|---|
| `GET /health` | Liveness + DB connectivity |
| `POST /clients/upload-photo` | Upload a client photo to Cloudinary |
| `POST /clients` | Create a client record |
| `POST /clients/:clientId/analyze-skin-regions` | Run Part 4 face/region detection |
| `POST /clients/:clientId/analyze-skin` | Run the full skin profile pipeline |
| `POST /clients/:clientId/match` | Score a product's shades against the client's profile |
| `GET /foundations` | Browse products with brand populated |
| `GET /foundations/brands` / `GET /foundations/brands/:brandId` | List / fetch a brand |
| `GET /foundations/products/:productId` | Fetch a product |
| `GET /foundations/shades` / `GET /foundations/shades/:shadeId` | Filterable, paginated shade listing / detail |
| `GET /foundations/search?q=` | Search brands/products/shades |
| `POST /foundations/import-chart` | Upload a shade-chart image → AI + CV draft (nothing saved yet) |
| `POST /foundations/import-shades` | Save the artist-reviewed shades |

**ML service** (`http://localhost:8000`, no `/api` prefix)

| Method & path | Purpose |
|---|---|
| `GET /health` | Liveness |
| `POST /analyze/skin-regions` | Face detection + region pixel sampling |
| `POST /analyze/skin-profile` | The above, classified into depth/undertone/hue |
| `POST /match` | Deterministic shade scoring (never queries MongoDB) |
| `POST /shade-chart/extract-colors` | Computer-vision swatch color estimation (no AI, no MongoDB) |

Every response follows `{ "success": true/false, ... }`; errors never
include a raw stack trace or internal exception text (see
[`docs/architecture.md`](docs/architecture.md) for the error-handling
convention).

## Matching method

Given a client's skin profile and a product's shades, each shade is scored
as a weighted combination of:

1. **Color distance** — CIEDE2000 Delta E between the client's and shade's
   Lab color (the dominant signal).
2. **Depth compatibility** — how close the two depth categories are on an
   ordered scale (Light → Very Deep), not just equal-or-not.
3. **Undertone compatibility** — an explicit compatibility matrix; an
   "Uncertain" reading on either side is never penalized.
4. **Hue compatibility** — a gentler secondary signal, same treatment for
   "Uncertain".
5. **Shade data quality** — a small modifier based on whether the shade's
   color came from a calibrated source or a digital estimate. Never
   dominant.

The weights (`MATCH_WEIGHTS` in `ml-service/app/core/config.py`) are
**initial MVP calibration values** — reasonable starting points chosen by
design, not derived from a validated study, and not presented as
universal constants. **Match Score is not an accuracy percentage or a
probability, and profile confidence (how reliable the skin *reading* was)
is a completely separate number from Match Score (how close a *shade* is
to that reading).** The UI never conflates the two. Full detail, including
the exact reason-generation logic and the low-confidence/no-good-match
guardrail, is in [`docs/matching-engine.md`](docs/matching-engine.md).

## Demo data

`server/src/data/foundations/` seeds 5 brands, 5 products and 41 shades
spanning the full depth range and multiple undertones/hues. Shade *names
and codes* are real, publicly documented shades from each brand's actual
range. Shade *RGB values* are ShadeMatch's own visual approximations —
**not** lab measurements or scraped brand color data — and every seeded
shade is explicitly marked `calibration.status: "estimated"` and
`source.type: "official_shade_chart"` for exactly that reason (see the
comment block at the top of `server/src/data/foundations/shades.js`).
Shades added through the AI/CV chart-import flow are marked
`source.type: "shade_chart"` and `calibration.colorSource:
"estimated_from_chart"` — distinct provenance, same honesty principle.

## Demo mode

There is no separate "demo account." Authentication (`JWT_SECRET`,
`jsonwebtoken`, `bcryptjs`) is scaffolded in `server/package.json` but not
wired into any route — the Login page navigates straight to the dashboard
without calling the backend. This is not a bypass of real security: no
route currently requires authentication to bypass. It's an intentional MVP
scope boundary that should be resolved (see
[Known limitations](#known-limitations)) before any real client photos or
multi-user data are involved. Because nothing is gated, the app is
demo-ready as-is: seed the database and every real feature (photo upload,
skin analysis, matching, comparison, shade-chart import) is reachable
immediately.

## Privacy note

Client photos are uploaded to Cloudinary (via the server, never directly
from the browser) and the photo URL is stored on the client's MongoDB
record; the underlying pixel data used for skin-region analysis is not
separately stored — only the resulting measurements (region colors, the
classified profile) are saved. Shade-chart images are stored the same way
but in a separate Cloudinary folder, since they're product reference
material rather than a client's personal photo. **Only upload a client's
photo with their permission.** This project does not currently implement
automatic photo deletion or a retention policy — a photo persists in
Cloudinary and its URL persists in MongoDB until manually removed. Do not
claim otherwise in front of a client; treat this as a real limitation to
address before any production use with real clients.

## Known limitations

- **No authentication is enforced.** See [Demo mode](#demo-mode) — this
  must be addressed before handling real client data in production.
- **Digital color estimates, not physical measurements.** Skin-profile
  colors come from a photo under whatever lighting it was taken in, and
  most seeded shade colors are visual approximations, not lab-measured or
  brand-published data. Camera color science, white balance, and display
  calibration all introduce error that this system cannot correct for.
- **Screen/display differences.** The RGB values shown are only as
  accurate as the screen displaying them; two monitors can render the
  "same" color noticeably differently.
- **Shade-chart limitations.** AI label extraction can misread blurry,
  stylized, or non-English text; the CV color-extraction step assumes
  reasonably flat, solid swatch blocks and won't handle heavily
  gradiented or photographed (non-flat-lay) charts well. Both failure
  modes surface as missing/null data for the artist to fill in, not
  invented values — but the artist's review step is not optional, it's
  load-bearing.
- **MVP calibration values, not validated science.** Every threshold and
  weight in the matching and classification logic is a documented,
  reasonable starting point — not derived from a labeled dataset or
  clinical study.
- **No duplicate-prevention constraint at the database level.** Shade
  import duplicate detection happens in application code (tested), not as
  a MongoDB unique index — a race between two concurrent imports for the
  same product is a theoretical (untested) edge case.
- Artist verification is required before trusting any AI/CV-derived value
  — this system is an assistive tool, not a scientific measurement device
  or a guarantee of physical foundation match.

## Future improvements

- Physical/calibrated shade color data to replace digital estimates
- Better lighting/white-balance normalization for client photos
- A larger, brand-verified shade dataset
- Real authentication and per-artist client data isolation
- Personalized application/finish recommendations
- More brands and a broader shade-chart layout support (gradients, photographed swatches)
- Improved CV segmentation for irregular chart layouts
- A database-level uniqueness constraint for shade identity
