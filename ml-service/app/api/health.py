from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def get_health():
    return {"success": True, "message": "ShadeMatch ML service is running"}
