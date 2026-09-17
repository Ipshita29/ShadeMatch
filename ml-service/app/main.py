from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, match, skin
from app.core.config import CLIENT_URL

app = FastAPI(title="ShadeMatch ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CLIENT_URL],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(skin.router)
app.include_router(match.router)
