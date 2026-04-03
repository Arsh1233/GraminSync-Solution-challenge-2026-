"""
Volunteer-Task Matching Router
Exposes the i-VTM algorithm as a REST endpoint.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.optimizer import run_ivtm_matching

router = APIRouter()


class MatchRequest(BaseModel):
    need_id: str


class MatchResult(BaseModel):
    need_id: str
    volunteer_id: str
    similarity_score: float
    burnout_adjusted_score: float


class MatchResponse(BaseModel):
    matches: list[MatchResult]


@router.post("/match", response_model=MatchResponse)
async def match_volunteers(request: MatchRequest):
    """Run the i-VTM algorithm to find optimal volunteer matches."""
    try:
        matches = await run_ivtm_matching(request.need_id)
        return MatchResponse(matches=matches)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching failed: {e}")
