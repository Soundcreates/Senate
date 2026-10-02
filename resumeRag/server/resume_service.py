import asyncio
import requests
import shutil
import tempfile
import urllib.parse
from pathlib import Path


def _download_resume(url: str) -> Path:
    response = requests.get(url, stream=True, timeout=30)
    temp_dir: Path | None = None
    try:
        response.raise_for_status()

        # Detect extension from URL or content-type.
        parsed_url = urllib.parse.urlparse(url)
        url_path = Path(parsed_url.path)
        ext = url_path.suffix.lower()

        if not ext:
            query_params = urllib.parse.parse_qs(parsed_url.query)
            public_ids = query_params.get("public_id", [])
            if public_ids:
                ext = Path(public_ids[0]).suffix.lower()

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
                ext = ".pdf"

        temp_dir = Path(tempfile.mkdtemp(prefix="resume_ingest_"))
        resume_path = temp_dir / f"resume{ext}"
        with open(resume_path, "wb") as file_handle:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file_handle.write(chunk)
        return temp_dir
    except Exception:
        if temp_dir is not None:
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    finally:
        response.close()


async def load_resume(url: str) -> Path:
    # requests is blocking; keep slow storage I/O off FastAPI's event loop.
    return await asyncio.to_thread(_download_resume, url)