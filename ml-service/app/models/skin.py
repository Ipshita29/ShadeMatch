from pydantic import BaseModel, Field


class SkinAnalysisRequest(BaseModel):
    imageUrl: str = Field(..., description="Publicly accessible URL of the client photo to analyze.")
    debug: bool = Field(False, description="If true, include an annotated debug image in the response.")
