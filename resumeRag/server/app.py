from uuid import uuid4
from fastapi import FastAPI, HTTPException

from ingest import run_ingestion
from server.computeDailyScore import compute_daily_score
from server.computeElo import update_ratings_after_completion
from server.models import (
    DailyScoreRequest,
    DailyScoreResponse,
    ELOUpdateRequest,
    ELOUpdateResponse,
    ResumeIngestRequest,
    GetRecommendationsRequest
)
from server.recommendation_service import fetch_recommendations
from server.resume_service import load_resume

app = FastAPI(title="Employee Scoring Service")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "resume-rag"}

@app.post("/ingest-resume")
async def ingest_resume(req: ResumeIngestRequest):
    print("User id: ", req.userId)
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

@app.post("/get-recommendations")
async def get_recommendations(req: GetRecommendationsRequest):
    print("Getting recommendations from our vector database")
    try:
        recommendations = fetch_recommendations(
            query=req.query,
            context=req.context,
            user_id=req.userId,
            limit=5,
        )

        return {
            "success": True,
            "data": {
                "recommendations": recommendations,
                "count": len(recommendations),
            },
            "timestamp": req.timestamp,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Recommendation pipeline failed: {exc}") from exc


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
