import asyncio
import math
import shutil
import time
import unittest
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
    async def test_resume_download_keeps_event_loop_p95_below_30ms(self):
        loop = asyncio.get_running_loop()
        deadlines = [loop.time() + 0.005 * index for index in range(1, 21)]
        timer_lags = []
        timers_done = loop.create_future()

        def record_lag(deadline):
            timer_lags.append(loop.time() - deadline)
            if len(timer_lags) == len(deadlines) and not timers_done.done():
                timers_done.set_result(None)

        for deadline in deadlines:
            loop.call_at(deadline, record_lag, deadline)

        with patch("server.resume_service.requests.get", return_value=_SlowResponse()):
            resume_dir = await asyncio.wait_for(
                load_resume("https://storage.test/resume.pdf"),
                timeout=2,
            )
            await asyncio.wait_for(timers_done, timeout=2)

        try:
            p95 = sorted(timer_lags)[math.ceil(0.95 * len(timer_lags)) - 1]
            self.assertLess(p95, 0.030)
            self.assertEqual((resume_dir / "resume.pdf").read_bytes(), b"%PDF-test")
        finally:
            shutil.rmtree(resume_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
