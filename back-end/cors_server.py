from http.server import SimpleHTTPRequestHandler, HTTPServer

class CORSHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:5173')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Range')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def log_request(self, code='-', size='-'):
        print(f"Received {self.command} request for {self.path}")

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 8000), CORSHandler)
    print("Serving on http://127.0.0.1:8000 with CORS for http://localhost:5173")
    server.serve_forever()