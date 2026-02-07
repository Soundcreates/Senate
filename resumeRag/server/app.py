from fastapi import FastAPI
from server.computeDailyScore import compute_daily_score
from server.computeElo import update_ratings_after_completion
from server.models import (
    DailyScoreRequest,
    DailyScoreResponse,
    ELOUpdateRequest,
    ELOUpdateResponse
)

app = FastAPI(title="Employee Scoring Service")

# ---------------- Daily Score ----------------

@app.post("/score/daily", response_model=DailyScoreResponse)
def daily_score(req: DailyScoreRequest):
    score = compute_daily_score(
        req.commits_today,
        req.coding_minutes,
        req.copilot_score,
        req.tier,
        req.active_projects
    )
    return {"daily_score": score}


# ---------------- ELO Update ----------------

@app.post("/rating/update", response_model=list[ELOUpdateResponse])
def update_rating(req: ELOUpdateRequest):
    employees = [e.dict() for e in req.employees]
    return update_ratings_after_completion(
        employees,
        req.task_rating
    )
