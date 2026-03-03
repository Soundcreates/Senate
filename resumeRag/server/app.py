from fastapi import FastAPI
from uuid import uuid4
from server.computeDailyScore import compute_daily_score
from server.computeElo import update_ratings_after_completion
from server.models import (
    DailyScoreRequest,
    DailyScoreResponse,
    ELOUpdateRequest,
    ELOUpdateResponse,
    ResumeIngestRequest
)
from tempfile import TemporaryFile
from  ingest import (
    run_ingestion
)


from server.resume_service import load_resume
app = FastAPI(title="Employee Scoring Service")

#creating a chroma collection only once

@app.post("/ingest-resume")
async def ingest_resume(req: ResumeIngestRequest):
    effective_user_id = req.userId or "anonymous"
    resume_dir = await load_resume(req.resumeUrl)
    run_ingestion(
        resume_dir,
        user_id=effective_user_id,
        resume_url=req.resumeUrl,
        source_id=f"{effective_user_id}_{uuid4().hex}"
    )
    print("Ingestion completed for resume at:", resume_dir)
    return {"status": "ok", "message": "Resume ingested successfully"}

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
