from pydantic import BaseModel


class ChartColorExtractionRequest(BaseModel):
    imageUrl: str
