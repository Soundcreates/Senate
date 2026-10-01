import asyncio
import shutil
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from server.resume_service import load_resume


class _SlowResponse:
    headers = {"Content-Type": "application/pdf"}

    def raise_for_status(self):
        return None

    def iter_content(self, chunk_size):
        time.sleep(0.15)
        yield b"%PDF-test"

    def close(self):
        return None


class ResumeDownloadTests(unittest.IsolatedAsyncioTestCase):
    async def test_slow_download_does_not_block_async_event_loop(self):
        ticks = 0
        downloading = True

        async def heartbeat():
            nonlocal ticks
            while downloading:
                ticks += 1
                await asyncio.sleep(0.005)

        with patch("server.resume_service.requests.get", return_value=_SlowResponse()):
            download = asyncio.create_task(load_resume("https://storage.test/resume.pdf"))
            beat = asyncio.create_task(heartbeat())
            resume_dir = await asyncio.wait_for(download, timeout=2)
            downloading = False
            await beat

        try:
            self.assertGreater(ticks, 5)
            self.assertEqual((resume_dir / "resume.pdf").read_bytes(), b"%PDF-test")
        finally:
            shutil.rmtree(resume_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
