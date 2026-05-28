import requests
import tempfile
import urllib.parse
from pathlib import Path

async def load_resume(url: str) -> Path:
    response = requests.get(url, stream=True, timeout=30)
    response.raise_for_status()
    print(response)

    # Detect extension from URL or content-type
    parsed_url = urllib.parse.urlparse(url)
    url_path = Path(parsed_url.path)
    ext = url_path.suffix.lower()

    if not ext:
        content_type = response.headers.get("Content-Type", "").lower()
        if "application/pdf" in content_type:
            ext = ".pdf"
        elif "wordprocessingml" in content_type:
            ext = ".docx"
        elif "msword" in content_type:
            ext = ".doc"
        elif "text/plain" in content_type:
            ext = ".txt"
        elif "rtf" in content_type:
            ext = ".rtf"
        else:
            ext = ".pdf" # Default fallback

    temp_dir = Path(tempfile.mkdtemp(prefix="resume_ingest_"))
    resume_path = temp_dir / f"resume{ext}"

    with open(resume_path, "wb") as file_handle:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                file_handle.write(chunk)

    print("Resume downloaded to:", resume_path)
    return temp_dir