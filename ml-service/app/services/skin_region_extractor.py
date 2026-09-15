"""Defines the left-cheek, right-cheek and forehead sampling regions from
MediaPipe Face Landmarker output, and builds pixel masks for them.

LANDMARK INDICES USED (MediaPipe Face Landmarker, 478-point face mesh):
    33  - outer corner of one eye
    263 - outer corner of the other eye
    61  - one mouth corner
    291 - the other mouth corner
    234 - face-oval edge, same side as landmark 33 (cheek/jaw contour)
    454 - face-oval edge, same side as landmark 263
    10  - top of the forehead, near the hairline

These ten points are the most consistently documented, stable landmarks
across MediaPipe's face mesh topology. Rather than trusting our memory of
which single landmark index sits in the middle of the cheek (topology docs
for that specific point are less consistent across MediaPipe versions), each
region is instead derived GEOMETRICALLY from these anchor points:

- cheek center  = weighted blend of the eye corner, mouth corner and face-
  oval edge on that side (roughly the fleshy area below the eye, above the
  mouth, toward the outer edge of the face) — sits well clear of the eyes,
  nose and mouth for any normal face proportions.
- forehead center = blend of the midpoint-between-the-eyes and the hairline
  point, biased toward the hairline so the sample sits above the eyebrows.

Region size is scaled by the interocular distance (distance between the two
eye corners), so regions scale correctly with face size and image
resolution instead of using fixed pixel radii.

"Left"/"right" are assigned by comparing each side's on-image x-coordinate
at run time (smaller x = image-left), so this is correct regardless of which
numeric landmark index MediaPipe treats as anatomical left vs. right.
"""

import cv2
import numpy as np

_CHEEK_RADIUS_RATIO = 0.15  # relative to interocular distance
_FOREHEAD_RX_RATIO = 0.28
_FOREHEAD_RY_RATIO = 0.10
_FOREHEAD_HAIRLINE_BLEND = 0.35  # how much the forehead center leans toward the hairline point


class Region:
    def __init__(self, name: str, mask: np.ndarray, center, shape: str, size):
        self.name = name
        self.mask = mask  # boolean (H, W) array
        self.center = center  # (x, y) in pixels, for debug drawing
        self.shape = shape  # "circle" | "ellipse"
        self.size = size  # radius, or (rx, ry) for ellipses


def _side(face, corner_idx: int, mouth_idx: int, contour_idx: int, interocular: float) -> np.ndarray:
    eye_corner = face.point(corner_idx)
    mouth_corner = face.point(mouth_idx)
    contour = face.point(contour_idx)
    return eye_corner * 0.25 + mouth_corner * 0.40 + contour * 0.35


def select_regions(face, image_width: int, image_height: int) -> dict:
    left_eye = face.point(33)
    right_eye = face.point(263)
    interocular = float(np.linalg.norm(left_eye - right_eye))

    side_a_center = _side(face, 33, 61, 234, interocular)
    side_b_center = _side(face, 263, 291, 454, interocular)

    # Assign image-left / image-right by actual on-image x position.
    if side_a_center[0] <= side_b_center[0]:
        left_cheek_center, right_cheek_center = side_a_center, side_b_center
    else:
        left_cheek_center, right_cheek_center = side_b_center, side_a_center

    eyes_mid = (left_eye + right_eye) / 2
    hairline_top = face.point(10)
    forehead_center = eyes_mid * (1 - _FOREHEAD_HAIRLINE_BLEND) + hairline_top * _FOREHEAD_HAIRLINE_BLEND

    cheek_radius = interocular * _CHEEK_RADIUS_RATIO
    forehead_rx = interocular * _FOREHEAD_RX_RATIO
    forehead_ry = interocular * _FOREHEAD_RY_RATIO

    regions = {
        "leftCheek": Region(
            "leftCheek", _circle_mask(image_width, image_height, left_cheek_center, cheek_radius),
            left_cheek_center, "circle", cheek_radius,
        ),
        "rightCheek": Region(
            "rightCheek", _circle_mask(image_width, image_height, right_cheek_center, cheek_radius),
            right_cheek_center, "circle", cheek_radius,
        ),
        "forehead": Region(
            "forehead",
            _ellipse_mask(image_width, image_height, forehead_center, forehead_rx, forehead_ry),
            forehead_center, "ellipse", (forehead_rx, forehead_ry),
        ),
    }
    return regions


def _circle_mask(width: int, height: int, center, radius: float) -> np.ndarray:
    mask = np.zeros((height, width), dtype=np.uint8)
    cv2.circle(mask, (int(round(center[0])), int(round(center[1]))), max(1, int(round(radius))), 255, thickness=-1)
    return mask.astype(bool)


def _ellipse_mask(width: int, height: int, center, rx: float, ry: float) -> np.ndarray:
    mask = np.zeros((height, width), dtype=np.uint8)
    cv2.ellipse(
        mask,
        (int(round(center[0])), int(round(center[1]))),
        (max(1, int(round(rx))), max(1, int(round(ry)))),
        0, 0, 360, 255, thickness=-1,
    )
    return mask.astype(bool)


# High-contrast, non-brand colors on purpose — this overlay is a development
# aid meant to stay legible against any skin tone or lighting, not a piece
# of polished product UI.
_DEBUG_FACE_BOX_COLOR = (255, 0, 0)      # red
_DEBUG_CHEEK_COLOR = (0, 255, 0)         # green
_DEBUG_FOREHEAD_COLOR = (0, 200, 255)    # cyan/yellow


def draw_debug_overlay(image_rgb: np.ndarray, face, regions: dict) -> np.ndarray:
    """Returns a copy of the image annotated with the detected face box and
    sampling regions, for development/debugging only — never required by
    the production analysis flow."""
    overlay = image_rgb.copy()

    box = face.bounding_box()
    top_left = (int(box["x"]), int(box["y"]))
    bottom_right = (int(box["x"] + box["width"]), int(box["y"] + box["height"]))
    cv2.rectangle(overlay, top_left, bottom_right, _DEBUG_FACE_BOX_COLOR, 2)

    for name in ("leftCheek", "rightCheek"):
        region = regions[name]
        center = (int(round(region.center[0])), int(round(region.center[1])))
        cv2.circle(overlay, center, int(round(region.size)), _DEBUG_CHEEK_COLOR, 2)

    forehead = regions["forehead"]
    center = (int(round(forehead.center[0])), int(round(forehead.center[1])))
    rx, ry = forehead.size
    cv2.ellipse(overlay, center, (int(round(rx)), int(round(ry))), 0, 0, 360, _DEBUG_FOREHEAD_COLOR, 2)

    return overlay
