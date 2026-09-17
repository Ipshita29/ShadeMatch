"""Undertone compatibility component of the Part 7 matching engine.

Uses the symmetric UNDERTONE_COMPATIBILITY matrix from core/config.py.
"Uncertain" is handled explicitly and separately: an uncertain reading is a
statement about measurement ambiguity, not evidence of a bad match, so it
resolves to a fixed moderate score against anything (including another
"Uncertain") rather than being looked up in the matrix or defaulting low.
"""

from app.core.config import UNDERTONE_COMPATIBILITY, UNDERTONE_UNCERTAIN_SCORE


def calculate_undertone_compatibility(client_undertone: str, shade_undertone: str) -> float:
    if client_undertone == "Uncertain" or shade_undertone == "Uncertain":
        return UNDERTONE_UNCERTAIN_SCORE

    if client_undertone == shade_undertone:
        return UNDERTONE_COMPATIBILITY.get((client_undertone, client_undertone), 1.0)

    pair = (client_undertone, shade_undertone)
    reversed_pair = (shade_undertone, client_undertone)
    if pair in UNDERTONE_COMPATIBILITY:
        return UNDERTONE_COMPATIBILITY[pair]
    if reversed_pair in UNDERTONE_COMPATIBILITY:
        return UNDERTONE_COMPATIBILITY[reversed_pair]

    return 0.0  # an unrecognized category pairing — treat as incompatible, not crash
