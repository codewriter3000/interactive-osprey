import logging
import subprocess
import time
from logging.handlers import RotatingFileHandler
from pathlib import Path
from threading import Thread

LOG_DIR = Path(__file__).resolve().parent / "log"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "app.log"
BACKEND_DIR = Path(__file__).resolve().parent

logger = logging.getLogger("interactive_osprey.pluto")
if not logger.handlers:
    logger.setLevel(logging.INFO)
    handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False


FILES_TO_RESET = [
    "cache.json",
    "epg.xml",
    "playlist.m3u8",
]


def _stream_reader(pipe, level: int, stream_name: str) -> None:
    try:
        for raw_line in iter(pipe.readline, ""):
            line = raw_line.strip()
            if line:
                logger.log(level, "[pluto-iptv][%s] %s", stream_name, line)
    finally:
        pipe.close()


def run_once() -> int:
    command = ["npx", "pluto-iptv"]

    for filename in FILES_TO_RESET:
        file_path = BACKEND_DIR / filename
        if file_path.exists():
            try:
                file_path.unlink()
                logger.info("Deleted stale file before refresh: %s", file_path.name)
            except Exception:
                logger.exception("Failed deleting stale file before refresh: %s", file_path.name)

    logger.info("Starting command: %s", " ".join(command))

    process = subprocess.Popen(
        command,
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )

    stdout_thread = Thread(target=_stream_reader, args=(process.stdout, logging.INFO, "stdout"), daemon=True)
    stderr_thread = Thread(target=_stream_reader, args=(process.stderr, logging.ERROR, "stderr"), daemon=True)
    stdout_thread.start()
    stderr_thread.start()

    return_code = process.wait()
    stdout_thread.join(timeout=5)
    stderr_thread.join(timeout=5)

    if return_code == 0:
        logger.info("pluto-iptv exited successfully")
    else:
        logger.error("pluto-iptv exited with code %s", return_code)

    return return_code


if __name__ == "__main__":
    interval_seconds = 12 * 60 * 60
    while True:
        try:
            run_once()
        except Exception:
            logger.exception("Unexpected failure while running pluto-iptv")
        logger.info("Sleeping %s seconds before next pluto-iptv run", interval_seconds)
        time.sleep(interval_seconds)
