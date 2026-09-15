# ShadeMatch ML Service

The computer-vision / machine-learning service for ShadeMatch, built with FastAPI.
It runs independently from the Node.js backend and will eventually handle skin
detection, skin profile generation, and foundation shade matching logic.

## Status

Part 1 (project setup) only — this service currently exposes a single health
check endpoint. No ML/CV logic has been implemented yet.

## Setup

```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
uvicorn app.main:app --reload
```

The service starts on `http://localhost:8000` by default.

## Endpoints

- `GET /health` — service health check

## Folder structure

```
ml-service/
├── app/
│   ├── api/        # route definitions
│   ├── core/        # configuration
│   ├── models/       # pydantic / data models
│   ├── services/      # business logic (CV/ML, added in later parts)
│   ├── utils/        # helper functions
│   └── main.py        # FastAPI app entrypoint
├── requirements.txt
└── .env.example
```
