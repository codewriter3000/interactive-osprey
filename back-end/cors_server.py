import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, HTTPServer

LOG_DIR = Path(__file__).resolve().parent / "log"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "app.log"

app_logger = logging.getLogger("interactive_osprey")
if not app_logger.handlers:
    app_logger.setLevel(logging.INFO)
    file_handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    file_handler.setFormatter(formatter)
    app_logger.addHandler(file_handler)
    app_logger.propagate = False


def _coerce_level(level: str) -> int:
    level_name = (level or "info").upper()
    return {
        "DEBUG": logging.DEBUG,
        "INFO": logging.INFO,
        "WARN": logging.WARNING,
        "WARNING": logging.WARNING,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL,
    }.get(level_name, logging.INFO)

class CORSHandler(SimpleHTTPRequestHandler):
    allowed_origins = {
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    }

    def _get_allowed_origin(self) -> str | None:
        origin = self.headers.get('Origin', '')
        return origin if origin in self.allowed_origins else None

    @staticmethod
    def _should_disable_cache(path: str) -> bool:
        lowered = path.lower()
        if lowered.startswith('/api/logs'):
            return True
        return lowered.endswith(('.m3u', '.m3u8', '.xml', '.json'))

    def end_headers(self):
        allowed_origin = self._get_allowed_origin()
        if allowed_origin:
            self.send_header('Access-Control-Allow-Origin', allowed_origin)
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.send_header('Vary', 'Origin')

        request_headers = self.headers.get('Access-Control-Request-Headers', '')
        allow_headers = request_headers if request_headers else 'Content-Type, Range'

        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', allow_headers)
        self.send_header('Access-Control-Max-Age', '600')
        if self._should_disable_cache(self.path):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path != '/api/logs':
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get('Content-Length', '0'))
        if content_length <= 0 or content_length > 64 * 1024:
            self.send_response(400)
            self.end_headers()
            return

        try:
            payload_raw = self.rfile.read(content_length)
            payload = json.loads(payload_raw.decode('utf-8'))

            level = _coerce_level(payload.get('level', 'info'))
            source = payload.get('logger', 'frontend')
            message = str(payload.get('message', ''))[:2000]
            context = payload.get('context')
            context_json = json.dumps(context, ensure_ascii=False)[:4000] if context is not None else ''

            if context_json:
                app_logger.log(level, '[%s] %s | context=%s', source, message, context_json)
            else:
                app_logger.log(level, '[%s] %s', source, message)

            self.send_response(204)
            self.end_headers()
        except Exception as exc:
            app_logger.exception('Failed to process client log payload: %s', exc)
            self.send_response(400)
            self.end_headers()

    def log_request(self, code='-', size='-'):
        app_logger.info('HTTP %s %s status=%s size=%s', self.command, self.path, code, size)

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 8000), CORSHandler)
    app_logger.info('Serving on http://127.0.0.1:8000 with CORS for localhost/127.0.0.1:5173')
    server.serve_forever()
