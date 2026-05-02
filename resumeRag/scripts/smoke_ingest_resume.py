import os
import sys

import requests


def main() -> int:
    base_url = os.getenv("PYTHON_URL", "http://localhost:8000").rstrip("/")
    resume_url = os.getenv("RESUME_URL")
    user_id = os.getenv("USER_ID", "smoke-user")

    if not resume_url:
        print("Missing RESUME_URL env var (must be a public PDF URL).", file=sys.stderr)
        return 2

    resp = requests.post(
        f"{base_url}/ingest-resume",
        json={"resumeUrl": resume_url, "userId": user_id},
        timeout=120,
    )
    print("status:", resp.status_code)
    print(resp.text)
    return 0 if resp.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

