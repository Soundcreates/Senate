from pydantic import BaseModel
from typing import List

# -------- Daily Score --------

class DailyScoreRequest(BaseModel):
    commits_today: int
    coding_minutes: int      # from WakaTime
    copilot_score: float     # 0–1
    tier: str                # junior/mid/senior
    active_projects: int


class DailyScoreResponse(BaseModel):
    daily_score: float


# -------- ELO Update --------

class EmployeeELOInput(BaseModel):
    id: str
    rating: float
    tier: str
    avg_task_score: float    # 0–100
    weight: float            # contribution share


class ELOUpdateRequest(BaseModel):
    task_rating: int
    employees: List[EmployeeELOInput]


class ELOUpdateResponse(BaseModel):
    employee_id: str
    old_rating: float
    rating_change: float
    new_rating: float
