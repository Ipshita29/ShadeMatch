from typing import Any

from pydantic import BaseModel


class MatchRequest(BaseModel):
    # Deliberately loose (plain dicts) rather than a fully-typed nested
    # schema: skinProfile/shades come straight from Part 5/6's own response
    # shapes, which already validate their own data on the way in. Strict
    # re-validation here would just create a second place to keep in sync.
    # Per-shade defensive handling lives in scoring.rank_shades() instead —
    # see the Part 7 test requirement that malformed shade data must not
    # crash the whole request.
    skinProfile: dict[str, Any]
    shades: list[dict[str, Any]]
