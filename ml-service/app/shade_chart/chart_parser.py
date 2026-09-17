"""Top-level entry point for the shade-chart CV pipeline: takes a chart
image URL and returns estimated swatch colors in reading order. This is
the only function the API route (app/api/shade_chart.py) calls directly —
everything else in this package is an implementation detail of how that
answer gets produced.

Reuses the same image download/decode/resize helpers Part 4's skin-region
pipeline uses (app/utils/image_utils.py) rather than re-implementing image
loading a second time.
"""

from app.shade_chart.shade_color_extractor import extract_swatch_colors
from app.utils.image_utils import download_image, load_image, resize_for_processing

# Charts are typically flat marketing graphics, not photos — a moderate cap
# keeps swatch detection fast without losing meaningful color detail.
MAX_PROCESSING_DIMENSION = 1400


def parse_chart_from_url(image_url: str) -> dict:
    """Downloads and analyzes a shade chart image, returning:
    {"imageWidth", "imageHeight", "swatches": [...]}
    (see shade_color_extractor.extract_swatch_colors for the swatch shape).
    Raises image_utils.ImageDownloadError / InvalidImageError on bad input —
    the API route is responsible for turning those into clean HTTP errors.
    """
    image_bytes = download_image(image_url)
    image_rgb = load_image(image_bytes)
    image_rgb = resize_for_processing(image_rgb, max_dimension=MAX_PROCESSING_DIMENSION)

    height, width = image_rgb.shape[:2]
    swatches = extract_swatch_colors(image_rgb)

    return {"imageWidth": int(width), "imageHeight": int(height), "swatches": swatches}
