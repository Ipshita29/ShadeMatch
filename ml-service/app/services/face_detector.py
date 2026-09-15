"""Face detection + landmark extraction using MediaPipe's Face Landmarker.

DECISION — multiple faces: the largest detected face (by landmark bounding
box area) is used, on the assumption that a makeup artist photographs one
client at a time and the client is the most prominent person in frame.
Smaller/background faces are ignored rather than rejecting the whole photo,
since the frontend can't easily guide an artist to "remove other people"
from a photo they've already taken.
"""

import os
import urllib.request

import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.core.base_options import BaseOptions

# The Tasks API does not bundle its model weights in the pip package, so the
# ~3.6 MB Face Landmarker model is downloaded once and cached on disk rather
# than committed to the repo as a binary asset.
_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/latest/face_landmarker.task"
)
_MODEL_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".cache"
)
_MODEL_PATH = os.path.join(_MODEL_DIR, "face_landmarker.task")

_MAX_FACES = 5
_MIN_DETECTION_CONFIDENCE = 0.5

_landmarker = None  # created lazily, reused across requests


class NoFaceDetectedError(Exception):
    pass


class Face:
    """A single detected face's landmarks in both normalized and pixel space."""

    def __init__(self, landmarks_normalized, image_width: int, image_height: int):
        self.landmarks_normalized = landmarks_normalized  # list of (x, y, z) in [0, 1]
        self.image_width = image_width
        self.image_height = image_height
        # (N, 2) pixel-space coordinates, computed once for reuse.
        self.points_px = np.array(
            [(lm.x * image_width, lm.y * image_height) for lm in landmarks_normalized],
            dtype=np.float64,
        )

    def point(self, index: int) -> np.ndarray:
        return self.points_px[index]

    def bounding_box_area(self) -> float:
        xs, ys = self.points_px[:, 0], self.points_px[:, 1]
        return float((xs.max() - xs.min()) * (ys.max() - ys.min()))

    def bounding_box(self) -> dict:
        xs, ys = self.points_px[:, 0], self.points_px[:, 1]
        return {
            "x": float(xs.min()),
            "y": float(ys.min()),
            "width": float(xs.max() - xs.min()),
            "height": float(ys.max() - ys.min()),
        }


def _ensure_model_downloaded() -> str:
    if not os.path.exists(_MODEL_PATH):
        os.makedirs(_MODEL_DIR, exist_ok=True)
        print(f"[face_detector] Downloading Face Landmarker model to {_MODEL_PATH} ...")
        urllib.request.urlretrieve(_MODEL_URL, _MODEL_PATH)
        print("[face_detector] Model download complete.")
    return _MODEL_PATH


def _get_landmarker():
    global _landmarker
    if _landmarker is None:
        model_path = _ensure_model_downloaded()
        base_options = BaseOptions(model_asset_path=model_path, delegate=BaseOptions.Delegate.CPU)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_faces=_MAX_FACES,
            min_face_detection_confidence=_MIN_DETECTION_CONFIDENCE,
        )
        _landmarker = vision.FaceLandmarker.create_from_options(options)
    return _landmarker


def detect_primary_face(image_rgb: np.ndarray) -> Face:
    """Runs face landmark detection and returns the largest detected face.

    Raises NoFaceDetectedError if no face meets the confidence threshold.
    """
    height, width = image_rgb.shape[:2]
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(image_rgb))

    result = _get_landmarker().detect(mp_image)

    if not result.face_landmarks:
        raise NoFaceDetectedError("No face detected in image.")

    faces = [Face(landmarks, width, height) for landmarks in result.face_landmarks]
    return max(faces, key=lambda face: face.bounding_box_area())
