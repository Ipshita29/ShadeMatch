from typing import Optional

from pydantic import BaseModel


class RgbColor(BaseModel):
    r: int
    g: int
    b: int


class LabColor(BaseModel):
    l: float
    a: float
    b: float


class SkinProfileLabels(BaseModel):
    depth: str
    undertone: str
    hue: str


class SkinProfileConfidence(BaseModel):
    overall: float
    depth: float
    undertone: float
    hue: float


class SkinProfileQuality(BaseModel):
    usable: bool
    regionalConsistency: float
    reason: Optional[str] = None


class RepresentativeColor(BaseModel):
    rgb: RgbColor
    lab: LabColor


class SkinProfileData(BaseModel):
    profile: SkinProfileLabels
    representativeColor: RepresentativeColor
    confidence: SkinProfileConfidence
    quality: SkinProfileQuality


class SkinProfileResponse(BaseModel):
    success: bool
    data: SkinProfileData
