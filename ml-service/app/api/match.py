import traceback

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.matching import MatchRequest
from app.services.matching_engine import run_matching

router = APIRouter()


@router.post("/match")
def match_shades(payload: MatchRequest):
    """Part 7: scores payload.shades against payload.skinProfile and returns
    a ranked Top 3. Never queries MongoDB itself — Node retrieves the client
    profile and shade list and sends only what's needed, keeping the two
    services decoupled (per the Part 7 spec)."""
    try:
        if not payload.skinProfile.get("representativeColor", {}).get("lab"):
            return JSONResponse(
                status_code=422,
                content={"success": False, "error": "skinProfile is missing a representative Lab color."},
            )

        data = run_matching(payload.skinProfile, payload.shades)
        return {"success": True, "data": data}
    except Exception:
        print("[matching] unexpected error:\n" + traceback.format_exc())
        return JSONResponse(status_code=500, content={"success": False, "error": "Unable to calculate matches."})
