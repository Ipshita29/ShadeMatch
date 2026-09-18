# Deployment

This project has not been deployed from this environment — no hosting
credentials (Vercel, Render/Railway, MongoDB Atlas, Cloudinary, OpenAI) are
available here. What follows is the prepared configuration and the exact
manual steps to deploy it. **No deployment URLs exist yet; do not treat any
URL in this document as live.**

## What's already prepared in this repo

| File | Purpose |
|---|---|
| `client/vercel.json` | SPA rewrite rule — without this, refreshing on any route other than `/` (e.g. `/foundations`) 404s on Vercel's static file server, even though it works fine in local dev (Vite's dev/preview server has its own SPA fallback). |
| `render.yaml` | Render Blueprint deploying `server/` (Node) and `ml-service/` (Docker) together. |
| `ml-service/Dockerfile` | Already required for local MediaPipe reliability on macOS (see the main README) — the same image is what should run in production. |
| `server/.env.example`, `ml-service/.env.example`, `client/.env.example` | Every environment variable each service needs, documented, with no real values. |
| `GET /api/health` (server), `GET /health` (ml-service) | Fast, dependency-light health checks — `/api/health` additionally reports MongoDB connectivity. Point each platform's health check at these. |

## 1. MongoDB Atlas

1. Create a free/shared cluster.
2. Create a database user with a strong, generated password.
3. Network access: allow the IP ranges your Render/Railway services will
   deploy from (or `0.0.0.0/0` for MVP simplicity, understanding the
   tradeoff — tighten this before handling real client data).
4. Copy the connection string → this becomes `MONGO_URI` on the server
   deployment only. Nothing else needs it.
5. After the server is deployed and `MONGO_URI` is set, run the seed
   script once against the production database:
   ```bash
   MONGO_URI="<atlas connection string>" node server/src/seed/seedFoundations.js
   ```
   (Run this from a machine with the repo checked out and `server/`
   dependencies installed — it's not something the deployed service runs
   automatically on boot.)

## 2. Cloudinary

1. Create a (free-tier is fine for a demo) Cloudinary account.
2. Copy `Cloud name`, `API Key`, `API Secret` from the dashboard → these
   become `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` /
   `CLOUDINARY_API_SECRET` on the server deployment only.

## 3. OpenAI (optional)

Only needed for shade-chart import. Everything else in the app works
without it.

1. Create an API key with a reasonable spending limit set.
2. Set `OPENAI_API_KEY` on the server deployment only. Leave it unset to
   ship without that one feature — `services/aiExtractionService.js`
   returns a clean "not available" error rather than crashing if it's
   missing.

## 4. ML service → Render or Railway

Render (using the included `render.yaml`):

1. New Blueprint → point at this repo → Render reads `render.yaml` and
   proposes both services.
2. For `shadematch-ml-service`, set `CLIENT_URL` to the frontend's
   deployed URL (step 6) once you have it — CORS will reject the frontend
   otherwise.
3. Deploy. `GET /health` should return `{"success": true, ...}` once live.

Railway: create a new service from this repo with `ml-service/` as the
root directory — Railway auto-detects the `Dockerfile` and builds it
directly. Set `CLIENT_URL` and `PORT` (Railway sets `PORT` itself; make
sure the app reads it — it already does via `os.getenv("PORT", 8000)` in
`app/core/config.py` combined with however `uvicorn` is invoked in the
Dockerfile's `CMD`).

Either way, note the resulting service URL — it's `ML_SERVICE_URL` for
step 5.

## 5. Backend → Render or Railway

Using `render.yaml`'s `shadematch-server` service, or manually:

- Root directory: `server/`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`
- Environment variables: every entry in `server/.env.example` — `PORT`
  (most platforms set this for you; the app reads `process.env.PORT`),
  `MONGO_URI` (step 1), `JWT_SECRET` (any long random value — auth isn't
  wired to any route yet, but set it anyway), `CLIENT_URL` (step 6, once
  known — CORS will reject the frontend otherwise), `ML_SERVICE_URL` (step
  4's result), `OPENAI_API_KEY` (step 3, optional), Cloudinary credentials
  (step 2).

Note the resulting service URL — it's `VITE_API_URL` (with `/api`
appended) for step 6.

## 6. Frontend → Vercel

1. New Project → import this repo → set the project root to `client/`.
2. Framework preset: Vite (auto-detected). Build command `npm run build`,
   output directory `dist` (Vercel's Vite defaults — no override needed).
3. Environment variable: `VITE_API_URL` = the backend URL from step 5,
   with `/api` appended (e.g. `https://shadematch-server.onrender.com/api`).
4. Deploy. `client/vercel.json` is already in the repo, so nested routes
   won't 404 on refresh.

## 7. Close the loop

Once the frontend has a real URL, go back and set `CLIENT_URL` on **both**
the server and ml-service deployments to that exact URL (no trailing
slash), then redeploy/restart both — otherwise CORS blocks every request
from the deployed frontend even though everything else is correctly
configured. This is the most common "it deploys but nothing works" mistake
with this architecture.

## What still needs manual configuration

Everything above requires an account and credentials this environment
doesn't have:

- A Vercel account/project
- A Render or Railway account/project (both services)
- A MongoDB Atlas cluster + connection string
- A Cloudinary account + API credentials
- An OpenAI API key (optional — only for shade-chart import)
- Running the seed script once against whichever MongoDB instance
  production uses
- Setting `CLIENT_URL` / `ML_SERVICE_URL` / `VITE_API_URL` to each
  other's *actual* deployed URLs, which only exist after the first
  deploy of each service (steps 4–6 above have to happen in that rough
  order, with a final pass to fix up `CLIENT_URL` on both backends once
  the frontend URL is known)

## Production CORS

`server/src/app.js` already restricts CORS to a single configured origin
(`process.env.CLIENT_URL`, no `*` wildcard) — this doesn't need code
changes for production, only the correct environment variable value (step
7 above). Same for `ml-service/app/main.py`.
