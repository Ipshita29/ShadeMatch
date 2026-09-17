import traceback

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.shade_chart import ChartColorExtractionRequest
from app.shade_chart.chart_parser import parse_chart_from_url
from app.utils.image_utils import ImageDownloadError, InvalidImageError

router = APIRouter()


@router.post("/shade-chart/extract-colors")
def extract_chart_colors(payload: ChartColorExtractionRequest):
    """Part 9 — pure computer-vision half of shade-chart import: estimates
    each visible swatch's color from pixels, in reading order. Has no
    opinion about shade names/codes/brand (that's the AI extraction call,
    made separately by Node — see Part 9 spec section 8) and never touches
    MongoDB, matching the Part 7 service-decoupling convention."""
    try:
        data = parse_chart_from_url(payload.imageUrl)
        return {"success": True, "data": data}
    except (ImageDownloadError, InvalidImageError) as error:
        return JSONResponse(status_code=422, content={"success": False, "error": str(error)})
    except Exception:
        print("[shade_chart] unexpected error:\n" + traceback.format_exc())
        return JSONResponse(
            status_code=500, content={"success": False, "error": "Unable to analyze the shade chart image."}
        )
