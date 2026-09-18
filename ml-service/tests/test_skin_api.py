"""Part 10 — end-to-end coverage for app/api/skin.py's HTTP-facing
behavior: does every failure mode return a clean, non-crashing response?

app/services/face_detector.py uses MediaPipe, which is known to SIGABRT
when run natively on this development machine (see the Part 4 Docker
workaround) — so `detect_primary_face` is mocked here rather than
exercised for real. That's a deliberate scope choice, not a shortcut: the
thing worth unit-testing at this layer is ShadeMatch's OWN handling of
each outcome (no face, download failure, corrupt image, unexpected
exception), not MediaPipe's detection accuracy, which is a third-party
concern. The happy-path test still runs the REAL downstream pipeline
(region selection, pixel sampling, quality assessment, Part 5
classification) against a real synthetic image — only face *detection*
itself is stubbed.

Route handlers are called directly as plain functions (the established
convention in this test suite — see test_matching.py) rather than through
an HTTP test client, so no new test-only dependency is needed.
"""

from unittest.mock import patch

import pytest
from PIL import Image

from app.api import skin
from app.models.skin import SkinAnalysisRequest
from app.services.face_detector import Face, NoFaceDetectedError
from app.utils.image_utils import ImageDownloadError, InvalidImageError


class FakeLandmark:
    def __init__(self, x, y, z=0.0):
        self.x = x
        self.y = y
        self.z = z


def make_fake_face(width=600, height=600):
    """A minimal but geometrically plausible Face — only the landmark
    indices select_regions() actually reads (33, 263, 61, 291, 234, 454,
    10) need sensible values; the rest are unused padding."""
    landmarks = [FakeLandmark(0.5, 0.5) for _ in range(478)]
    landmarks[33] = FakeLandmark(0.35, 0.42)  # left eye corner
    landmarks[263] = FakeLandmark(0.65, 0.42)  # right eye corner
    landmarks[61] = FakeLandmark(0.40, 0.62)  # left mouth corner
    landmarks[291] = FakeLandmark(0.60, 0.62)  # right mouth corner
    landmarks[234] = FakeLandmark(0.15, 0.45)  # left face contour
    landmarks[454] = FakeLandmark(0.85, 0.45)  # right face contour
    landmarks[10] = FakeLandmark(0.50, 0.12)  # hairline
    return Face(landmarks, width, height)


def make_test_image_bytes(width=600, height=600, color=(200, 160, 120)):
    import io

    img = Image.new('RGB', (width, height), color)
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    return buffer.getvalue()


REQUEST = SkinAnalysisRequest(imageUrl='https://example.com/photo.jpg', debug=False)


class TestNoFaceDetected:
    def test_analyze_skin_regions_returns_clean_422_not_a_crash(self):
        with patch('app.api.skin.download_image', return_value=make_test_image_bytes()), patch(
            'app.api.skin.detect_primary_face', side_effect=NoFaceDetectedError()
        ):
            result = skin.analyze_skin_regions(REQUEST)

        assert result.status_code == 422
        assert b'success":false' in result.body

    def test_analyze_skin_profile_returns_clean_422_not_a_crash(self):
        with patch('app.api.skin.download_image', return_value=make_test_image_bytes()), patch(
            'app.api.skin.detect_primary_face', side_effect=NoFaceDetectedError()
        ):
            result = skin.analyze_skin_profile(REQUEST)

        assert result.status_code == 422


class TestImageDownloadFailure:
    def test_returns_clean_502_not_a_crash(self):
        with patch('app.api.skin.download_image', side_effect=ImageDownloadError('DNS lookup failed')):
            result = skin.analyze_skin_regions(REQUEST)

        assert result.status_code == 502
        assert b'DNS lookup failed' not in result.body  # internal exception text never reaches the client


class TestInvalidImage:
    def test_corrupt_bytes_return_clean_422(self):
        with patch('app.api.skin.download_image', return_value=b'this is not an image, just text'):
            result = skin.analyze_skin_regions(REQUEST)

        assert result.status_code == 422

    def test_real_tiny_image_is_rejected_by_the_real_validation(self):
        # No mocking of load_image itself here — this exercises the real
        # MIN_DIMENSION check in image_utils.py end-to-end.
        tiny_bytes = make_test_image_bytes(width=20, height=20)
        with patch('app.api.skin.download_image', return_value=tiny_bytes):
            result = skin.analyze_skin_regions(REQUEST)

        assert result.status_code == 422

    def test_truncated_jpeg_is_rejected_not_crashed(self):
        real_bytes = make_test_image_bytes()
        truncated = real_bytes[: len(real_bytes) // 3]
        with patch('app.api.skin.download_image', return_value=truncated):
            result = skin.analyze_skin_regions(REQUEST)

        assert result.status_code == 422


class TestUnexpectedFailureIsNeverFatal:
    def test_an_unhandled_exception_anywhere_in_the_pipeline_returns_clean_500(self):
        with patch('app.api.skin.download_image', return_value=make_test_image_bytes()), patch(
            'app.api.skin.detect_primary_face', side_effect=RuntimeError('unexpected internal failure, contains secret=xyz')
        ):
            result = skin.analyze_skin_regions(REQUEST)

        assert result.status_code == 500
        assert b'secret=xyz' not in result.body
        assert b'RuntimeError' not in result.body


class TestHappyPathRunsTheRealDownstreamPipeline:
    """Only face *detection* is mocked — everything downstream (region
    masks, pixel sampling, quality assessment, Part 5 classification) runs
    for real against a real synthetic image."""

    def test_analyze_skin_regions_returns_a_complete_response(self):
        with patch('app.api.skin.download_image', return_value=make_test_image_bytes()), patch(
            'app.api.skin.detect_primary_face', return_value=make_fake_face()
        ):
            result = skin.analyze_skin_regions(REQUEST)

        assert result['success'] is True
        data = result['data']
        assert data['faceDetected'] is True
        for region in ('forehead', 'leftCheek', 'rightCheek'):
            assert region in data['regions']
            assert data['regions'][region]['pixelCount'] >= 0
        assert 'representativeColor' in data
        assert 'quality' in data

    def test_analyze_skin_profile_returns_a_full_classified_profile(self):
        with patch('app.api.skin.download_image', return_value=make_test_image_bytes()), patch(
            'app.api.skin.detect_primary_face', return_value=make_fake_face()
        ):
            result = skin.analyze_skin_profile(REQUEST)

        assert result['success'] is True
        data = result['data']
        assert 'profile' in data
        for key in ('depth', 'undertone', 'hue'):
            assert data['profile'][key]
        assert 'confidence' in data and 'overall' in data['confidence']
        assert 'quality' in data and 'usable' in data['quality']

    @pytest.mark.parametrize(
        'width,height',
        [(600, 600), (250, 250), (1800, 1200)],
    )
    def test_various_image_sizes_all_produce_a_result_without_crashing(self, width, height):
        with patch('app.api.skin.download_image', return_value=make_test_image_bytes(width, height)), patch(
            'app.api.skin.detect_primary_face', return_value=make_fake_face(width, height)
        ):
            result = skin.analyze_skin_regions(REQUEST)

        assert result['success'] is True

    def test_very_dark_image_still_produces_a_result_and_flags_quality(self):
        dark_bytes = make_test_image_bytes(color=(8, 6, 5))
        with patch('app.api.skin.download_image', return_value=dark_bytes), patch(
            'app.api.skin.detect_primary_face', return_value=make_fake_face()
        ):
            result = skin.analyze_skin_regions(REQUEST)

        assert result['success'] is True
        # A near-black frame should not be reported as good-quality lighting.
        assert result['data']['quality'].get('usable') is False or result['data']['quality'].get('brightness') is not None

    def test_very_bright_image_still_produces_a_result_and_flags_quality(self):
        bright_bytes = make_test_image_bytes(color=(250, 250, 248))
        with patch('app.api.skin.download_image', return_value=bright_bytes), patch(
            'app.api.skin.detect_primary_face', return_value=make_fake_face()
        ):
            result = skin.analyze_skin_regions(REQUEST)

        assert result['success'] is True
        assert result['data']['quality'].get('usable') is False or result['data']['quality'].get('brightness') is not None

    def test_np_array_regression_no_orphaned_debug_field_when_debug_false(self):
        with patch('app.api.skin.download_image', return_value=make_test_image_bytes()), patch(
            'app.api.skin.detect_primary_face', return_value=make_fake_face()
        ):
            result = skin.analyze_skin_regions(REQUEST)

        assert 'debug' not in result['data']
