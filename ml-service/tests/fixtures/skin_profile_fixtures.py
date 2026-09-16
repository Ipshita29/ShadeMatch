"""Synthetic Part 4-shaped inputs for exercising the Part 5 skin profile
engine without repeatedly uploading real photos.

IMPORTANT: these are unit-test fixtures only. The Lab/RGB values are
hand-picked to land in specific regions of color space for testing the
classification boundaries — they do NOT represent, and should never be
described as representing, any real person's skin.
"""

from app.utils.color_utils import lab_to_rgb

DEFAULT_QUALITY = {"usable": True, "brightness": "acceptable", "faceSize": "acceptable"}


def _region(lab, pixel_count=500):
    rgb = lab_to_rgb(lab)
    return {
        "pixelCount": pixel_count,
        "rgb": {"mean": rgb.tolist(), "median": rgb.tolist()},
        "lab": {"mean": list(lab), "median": list(lab)},
    }


def _profile_input(forehead_lab, left_cheek_lab, right_cheek_lab, quality=None, pixel_count=500):
    quality = quality or DEFAULT_QUALITY
    return {
        "faceDetected": True,
        "image": {"width": 1024, "height": 1280},
        "quality": quality,
        "regions": {
            "forehead": _region(forehead_lab, pixel_count),
            "leftCheek": _region(left_cheek_lab, pixel_count),
            "rightCheek": _region(right_cheek_lab, pixel_count),
        },
        "representativeColor": {
            "rgb": {"mean": lab_to_rgb(left_cheek_lab).tolist(), "median": lab_to_rgb(left_cheek_lab).tolist()},
            "lab": {"mean": list(left_cheek_lab), "median": list(left_cheek_lab)},
        },
    }


# --- Named single Lab points for granular classifier unit tests -----------

LAB_LIGHT_WARM = (70.0, 12.0, 20.0)          # high L*, b*/a* well above 1.15
LAB_LIGHT_COOL = (70.0, 12.0, 8.0)           # high L*, b*/a* well below 0.85
LAB_MEDIUM_NEUTRAL = (56.0, 10.0, 10.0)      # mid L*, b*/a* == 1.0
LAB_MEDIUM_DEEP_WARM = (45.0, 14.0, 22.0)
LAB_DEEP_WARM = (30.0, 12.0, 18.0)
LAB_DEEP_COOL = (30.0, 12.0, 8.0)
LAB_OLIVE = (50.0, 5.0, 16.0)                # low a*, retained b*
LAB_AMBIGUOUS = (56.0, 10.0, 11.4)           # just inside Neutral, close to the Warm boundary

# Exact threshold boundaries (see app/core/config.py)
LAB_DEPTH_BOUNDARY_VERY_DEEP_DEEP = (20.0, 10.0, 10.0)   # L*==20.0 -> falls into "Deep" (< is strict)
LAB_DEPTH_JUST_BELOW_BOUNDARY = (19.9, 10.0, 10.0)       # -> "Very Deep"
LAB_UNDERTONE_WARM_BOUNDARY = (56.0, 10.0, 11.5)         # ratio == 1.15 exactly -> "Warm"
LAB_UNDERTONE_COOL_BOUNDARY = (56.0, 10.0, 8.5)          # ratio == 0.85 exactly -> "Cool"


# --- Full Part 4-shaped payloads for generate_skin_profile() tests --------

def light_warm_profile_input():
    return _profile_input(LAB_LIGHT_WARM, LAB_LIGHT_WARM, LAB_LIGHT_WARM)


def light_cool_profile_input():
    return _profile_input(LAB_LIGHT_COOL, LAB_LIGHT_COOL, LAB_LIGHT_COOL)


def medium_neutral_profile_input():
    return _profile_input(LAB_MEDIUM_NEUTRAL, LAB_MEDIUM_NEUTRAL, LAB_MEDIUM_NEUTRAL)


def medium_deep_warm_profile_input():
    return _profile_input(LAB_MEDIUM_DEEP_WARM, LAB_MEDIUM_DEEP_WARM, LAB_MEDIUM_DEEP_WARM)


def deep_warm_profile_input():
    return _profile_input(LAB_DEEP_WARM, LAB_DEEP_WARM, LAB_DEEP_WARM)


def deep_cool_profile_input():
    return _profile_input(LAB_DEEP_COOL, LAB_DEEP_COOL, LAB_DEEP_COOL)


def ambiguous_undertone_profile_input():
    return _profile_input(LAB_AMBIGUOUS, LAB_AMBIGUOUS, LAB_AMBIGUOUS)


def inconsistent_regions_profile_input():
    """Forehead reads warm, left cheek reads cool, right cheek reads
    neutral — a photo where lighting/shadow makes regions disagree."""
    return _profile_input(
        forehead_lab=(55.0, 15.0, 22.0),   # warm
        left_cheek_lab=(55.0, 15.0, 5.0),  # cool
        right_cheek_lab=(55.0, 2.0, 2.0),  # neutral, low chroma
    )


def low_pixel_count_profile_input():
    """All three regions have too few surviving pixels to trust."""
    return _profile_input(LAB_MEDIUM_NEUTRAL, LAB_MEDIUM_NEUTRAL, LAB_MEDIUM_NEUTRAL, pixel_count=5)


def poor_quality_profile_input():
    return _profile_input(
        LAB_MEDIUM_NEUTRAL,
        LAB_MEDIUM_NEUTRAL,
        LAB_MEDIUM_NEUTRAL,
        quality={"usable": False, "brightness": "too_dark", "faceSize": "acceptable"},
    )
