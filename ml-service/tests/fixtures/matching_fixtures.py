"""Synthetic Part 5 client-profile and Part 6 shade fixtures for exercising
the Part 7 matching engine without a live photo or database.

IMPORTANT: these are unit-test fixtures only — hand-picked Lab values to
exercise specific scoring behavior. They do not represent, and should never
be described as representing, any real person or any real brand's measured
shade colors.
"""


def make_client_profile(depth, undertone, hue, lab, confidence_overall=0.87, usable=True, regional_consistency=0.86):
    return {
        "depth": depth,
        "undertone": undertone,
        "hue": hue,
        "representativeColor": {
            "rgb": {"r": 150, "g": 110, "b": 90},  # not read by the engine directly; Lab is
            "lab": {"l": lab[0], "a": lab[1], "b": lab[2]},
        },
        "confidence": {"overall": confidence_overall, "depth": 0.9, "undertone": 0.8, "hue": 0.8},
        "quality": {"usable": usable, "regionalConsistency": regional_consistency},
    }


def make_shade(
    shade_id,
    name,
    depth,
    undertone,
    hue,
    lab,
    calibration_status="estimated",
    calibration_confidence=0.5,
    brand="TestBrand",
    product="TestProduct",
    code=None,
):
    return {
        "_id": shade_id,
        "name": name,
        "code": code or name,
        "brandName": brand,
        "productName": product,
        "depth": depth,
        "undertone": undertone,
        "hue": hue,
        "color": {
            "rgb": {"r": 150, "g": 110, "b": 90},
            "lab": {"l": lab[0], "a": lab[1], "b": lab[2]},
        },
        "calibration": {"status": calibration_status, "confidence": calibration_confidence},
        "isActive": True,
    }


# --- Scenario A: clearly-compatible shades + one clearly-wrong shade ------
# Client matches spec's own worked example exactly (Part 7 INPUT section).
SCENARIO_A_CLIENT = make_client_profile("Medium Deep", "Warm", "Golden", (54.2, 14.7, 23.8))
SCENARIO_A_SHADES = [
    make_shade("nc40", "NC40", "Medium Deep", "Warm", "Golden", (53.8, 15.0, 24.2)),  # near-identical
    make_shade("nc42", "NC42", "Medium Deep", "Warm", "Golden", (50.5, 15.5, 24.0)),  # close
    make_shade("nc44", "NC44", "Deep", "Warm", "Golden", (45.0, 14.0, 22.0)),  # one depth step away
    make_shade("nc20", "NC20", "Light", "Warm", "Golden", (78.0, 10.0, 18.0)),  # clearly wrong depth
]

# --- Scenario B: closest measured color vs. compatible-but-different -----
SCENARIO_B_CLIENT = make_client_profile("Deep", "Neutral", "Neutral", (30.0, 9.0, 12.0))
SCENARIO_B_SHADES = [
    make_shade("deep-neutral", "Deep Neutral", "Deep", "Neutral", "Neutral", (29.5, 9.2, 12.3)),
    make_shade("deep-warm", "Deep Warm", "Deep", "Warm", "Golden", (30.5, 13.0, 19.0)),
    make_shade("medium-warm", "Medium Warm", "Medium", "Warm", "Golden", (56.0, 14.0, 22.0)),
    make_shade("light-cool", "Light Cool", "Light", "Cool", "Rosy", (78.0, 12.0, 8.0)),
]

# --- Scenario C: ambiguous client undertone -------------------------------
SCENARIO_C_CLIENT = make_client_profile("Medium", "Uncertain", "Uncertain", (56.0, 11.0, 15.0))
SCENARIO_C_SHADES = [
    make_shade("medium-warm-c", "Medium Warm", "Medium", "Warm", "Golden", (56.0, 14.0, 20.0)),
    make_shade("medium-cool-c", "Medium Cool", "Medium", "Cool", "Rosy", (56.0, 12.0, 8.0)),
    make_shade("medium-neutral-c", "Medium Neutral", "Medium", "Neutral", "Neutral", (55.5, 10.5, 10.5)),
]

# --- Scenario D: very poor profile quality --------------------------------
SCENARIO_D_CLIENT = make_client_profile(
    "Medium", "Uncertain", "Uncertain", (56.0, 11.0, 15.0), confidence_overall=0.2, usable=False, regional_consistency=0.2
)
SCENARIO_D_SHADES = [make_shade("any", "Any Shade", "Medium", "Warm", "Golden", (56.0, 14.0, 20.0))]
