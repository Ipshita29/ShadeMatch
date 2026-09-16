# ShadeMatch

AI-assisted foundation shade matching for makeup artists.

## The problem

Makeup artists often struggle to select foundation shades and undertones that
suit clients with diverse skin tones. Shade selection tends to be one-size-fits-all,
guided mostly by trial and error rather than a consistent, data-driven process.

## The MVP goal

Let an artist upload a natural-light photo of a client, generate a structured
skin profile from it, and compare that profile against a chosen foundation
brand's shade range to return the top 3 closest matches with an explanation
of why each shade was recommended.

```
Client uploads a natural-light photograph
        ↓
ShadeMatch analyzes the client's skin
        ↓
Generates a structured skin profile
        ↓
Artist selects a foundation brand/product
        ↓
ShadeMatch compares the skin profile against foundation shades
        ↓
Returns the top 3 closest foundation matches
        ↓
Explains why each shade was recommended
```

## Architecture

Three independent services that talk to each other over HTTP:

```
┌─────────────┐        ┌─────────────┐        ┌──────────────┐
│   client     │  HTTP  │   server     │  HTTP  │  ml-service   │
│  React/Vite  │──────▶│ Node/Express │──────▶│   FastAPI     │
│  (port 5173)  │◀──────│ (port 5000)   │◀──────│ (port 8000)    │
└─────────────┘        └──────┬──────┘        └──────────────┘
                              │
                              ▼
                        ┌──────────┐
                        │ MongoDB   │
                        └──────────┘
```

- **client** — the UI artists use to manage clients and view matches.
- **server** — Node/Express API: auth, client records, foundation data, and
  orchestration between the frontend and the ML service.
- **ml-service** — Python/FastAPI service that will eventually run computer
  vision (skin detection, undertone/depth extraction) and matching logic.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React, Vite, JavaScript, React Router, Axios, CSS Modules |
| Backend | Node.js, Express, MongoDB, Mongoose, JWT, bcrypt, Multer |
| ML service | Python, FastAPI, Uvicorn, OpenCV, MediaPipe, NumPy, Pillow, scikit-learn |

## Folder structure

```
shadematch/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level pages
│   │   ├── layouts/         # Shared page layouts (nav, shell)
│   │   ├── services/        # API clients (axios instance, etc.)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── context/         # React context providers
│   │   ├── utils/           # Helper functions
│   │   ├── assets/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── public/
├── server/                  # Node/Express backend
│   ├── src/
│   │   ├── config/          # DB connection, env-driven config
│   │   ├── controllers/     # Route handler logic
│   │   ├── middleware/      # Error handling, auth (later)
│   │   ├── models/          # Mongoose models (added in later parts)
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helper functions
│   │   ├── app.js           # Express app (middleware + routes)
│   │   └── server.js        # Entrypoint (loads env, starts server)
│   └── .env.example
├── ml-service/               # Python/FastAPI CV & ML service
│   ├── app/
│   │   ├── api/              # Route definitions
│   │   ├── core/              # Configuration
│   │   ├── models/             # Pydantic / data models
│   │   ├── services/            # CV/ML logic (added in later parts)
│   │   ├── utils/               # Helper functions
│   │   └── main.py               # FastAPI app entrypoint
│   ├── requirements.txt
│   └── .env.example
├── README.md
├── .gitignore
└── package.json              # Root convenience scripts (concurrently)
```

## Install dependencies

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

## Configure environment variables

Copy each `.env.example` to `.env` and fill in values as needed. No real
secrets are committed to this repo.

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
cp ml-service/.env.example ml-service/.env
```

- `client/.env` — `VITE_API_URL` (the Node backend's base URL)
- `server/.env` — port, MongoDB URI, JWT secret, client URL, ML service URL,
  OpenAI key, Cloudinary credentials (all optional at this stage)
- `ml-service/.env` — host, port, and the URLs of the other two services

## Run the frontend

```bash
cd client
npm run dev
```

Runs on `http://localhost:5173`.

## Run the backend

```bash
cd server
npm run dev
```

Runs on `http://localhost:5000`. Health check: `GET /api/health`.
The server starts and serves requests even without a MongoDB connection —
it just logs a warning if `MONGO_URI` isn't set or unreachable.

## Run the ML service

```bash
cd ml-service
source venv/bin/activate
uvicorn app.main:app --reload
```

Runs on `http://localhost:8000`. Health check: `GET /health`.

## Run everything at once (optional)

From the repo root, after `npm install`:

```bash
npm run dev
```

This starts the client and server together via `concurrently`. The ML
service is a separate Python runtime and is run independently with the
`uvicorn` command above.

## Current development status

**Parts 1–5 complete.**

- **Part 1 — Project Setup & Architecture.** The three services exist, are
  independently runnable, and expose working health checks.
- **Part 2 — UI/UX.** The full client-facing flow (landing, auth, dashboard,
  client/foundation/match pages) is built against mock data with the final
  dark editorial design system.
- **Part 3 — Client Photo Upload.** Real photo upload (Multer → Cloudinary)
  and a minimal `Client` record in MongoDB, wired to the "New Client" page.
- **Part 4 — Skin Detection & Region Extraction.** The ML service detects a
  face (MediaPipe) in an uploaded photo and samples forehead/cheek pixels
  into RGB/Lab color statistics.
- **Part 5 — Skin Profile Engine.** The Part 4 measurements are converted
  into a structured, documented color-science heuristic profile — depth,
  undertone, hue, a representative Lab/RGB color, and heuristic confidence
  — with no foundation matching yet. See `ml-service/README.md` for the
  classification logic and its documented scientific limitations.

### Upcoming parts

- **Part 6** — Foundation Shade Database
- **Part 7** — Matching Engine
- **Part 8** — Results & Comparison
- **Part 9** — AI + Shade Chart Upload
- **Part 10** — Testing & Deployment
