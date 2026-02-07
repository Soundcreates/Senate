from datetime import datetime
from typing import List
import os

from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# =========================
# ENV
# =========================
load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
EMAIL_FROM = os.getenv("AGENT_EMAIL_FROM")

if not all([GOOGLE_API_KEY, SENDGRID_API_KEY, EMAIL_FROM]):
    raise RuntimeError("Missing required environment variables")

# =========================
# CLIENTS
# =========================
genai_client = genai.Client(api_key=GOOGLE_API_KEY)

app = FastAPI(
    title="Autonomous Project Agent",
    version="1.0.0"
)

# =========================
# EMAIL (SENDGRID)
# =========================
def send_email(to_email: str, subject: str, body: str):
    message = Mail(
        from_email=EMAIL_FROM,
        to_emails=to_email,
        subject=subject,
        plain_text_content=body
    )
    sg = SendGridAPIClient(SENDGRID_API_KEY)
    sg.send(message)

# =========================
# GEMINI EMAIL GENERATION
# =========================
def generate_email(prompt: str) -> str:
    response = genai_client.models.generate_content(
        model="models/gemini-flash-latest",
        contents=prompt,
        config={"temperature": 0.3}
    )
    return response.text.strip()

# =========================
# INPUT SCHEMAS
# =========================
class DeveloperMetrics(BaseModel):
    user_id: str
    user_email: str
    commits: int
    avg_loc_per_commit: float
    coding_minutes: int


class AgentTickRequest(BaseModel):
    milestone_name: str
    deadline_hours: int
    developers: List[str]
    metrics: List[DeveloperMetrics]

# =========================
# AGENT LOGIC
# =========================
def detect_anomalies(m: DeveloperMetrics):
    anomalies = []

    # Commit spam detection
    if m.commits >= 40 and m.avg_loc_per_commit <= 5:
        anomalies.append({
            "type": "commit_spam",
            "reason": "High commit count with very low average lines per commit"
        })

    # Low-effort signal
    if m.coding_minutes <= 30 and m.commits >= 10:
        anomalies.append({
            "type": "low_effort_activity",
            "reason": "Multiple commits with very limited coding time"
        })

    return anomalies

# =========================
# AGENT ENDPOINT
# =========================
@app.post("/agent/tick")
def agent_tick(payload: AgentTickRequest):
    now = datetime.utcnow()

    response = {
        "timestamp": now.isoformat(),
        "milestone": payload.milestone_name,
        "events": []
    }

    # -------------------------
    # DEADLINE WARNING (ALL USERS)
    # -------------------------
    if payload.deadline_hours <= 24:
        prompt = f"""
You are an autonomous project monitoring assistant.

Write a professional deadline reminder email.

Milestone: {payload.milestone_name}
Time remaining: {payload.deadline_hours} hours
Developers: {", ".join(payload.developers)}

Rules:
- This is an automated, no-reply message
- Encourage coordination and final review
- Keep tone neutral and professional

Sign as "Autonomous Project Agent".
"""
        email_body = generate_email(prompt)

        for dev in payload.metrics:
            send_email(
                to_email=dev.user_email,
                subject=f"[AI Agent Reminder] {payload.milestone_name} deadline in {payload.deadline_hours} hours",
                body=email_body
            )

        response["events"].append({
            "event": "deadline_warning",
            "hours_left": payload.deadline_hours
        })

    # -------------------------
    # PER-DEVELOPER ANALYSIS
    # -------------------------
    for m in payload.metrics:
        anomalies = detect_anomalies(m)

        # ---- Anomaly email (PRIVATE) ----
        if anomalies:
            anomaly_text = "\n".join(
                f"- {a['type']}: {a['reason']}" for a in anomalies
            )

            prompt = f"""
You are an autonomous project monitoring assistant.

Write a neutral and professional activity review email.

Milestone: {payload.milestone_name}
Developer: {m.user_id}
Time remaining: {payload.deadline_hours} hours

Observed signals:
{anomaly_text}

Guidelines:
- Do not accuse
- Do not apply penalties
- Aim to prevent disputes

Sign as "Autonomous Project Agent".
"""
            email_body = generate_email(prompt)

            send_email(
                to_email=m.user_email,
                subject=f"[AI Agent Alert] Activity Pattern Review – {payload.milestone_name}",
                body=email_body
            )

        response["events"].append({
            "user": m.user_id,
            "metrics": m.dict(),
            "anomalies": anomalies
        })

    return response
