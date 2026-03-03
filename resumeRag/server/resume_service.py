import requests
import tempfile
from pathlib import Path

async def load_resume(url: str)-> Path:
    response = requests.get(url, stream=True, timeout=30)
    response.raise_for_status()
    print(response)

    temp_dir = Path(tempfile.mkdtemp(prefix="resume_ingest_"))
    resume_path = temp_dir / "resume.pdf"

    with open(resume_path, "wb") as file_handle:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                file_handle.write(chunk)

    print("Resume downloaded to:", resume_path)
    return temp_dir