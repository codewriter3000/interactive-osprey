from http.server import SimpleHTTPRequestHandler, HTTPServer

class CORSHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # allow only your dev origin for security; change to '*' if you must
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:5173')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Range')
        # allow range requests if it's a media playlist/stream
        super().end_headers()

    # respond to preflight OPTIONS
    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 8000), CORSHandler)
    print("Serving on http://127.0.0.1:8000 with CORS for http://localhost:5173")
    server.serve_forever()