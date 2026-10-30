#!/usr/bin/env python3
"""Local server for the downloaded Framer site. Run: python3 server.py  ->  http://localhost:8000"""
import http.server, socketserver, os, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
PAGES = {"/": "index.html", "/about": "about.html", "/about/": "about.html"}
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def translate_path(self, path):
        p = path.split("?")[0].split("#")[0]
        return super().translate_path("/" + PAGES[p] if p in PAGES else p)
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
H.extensions_map.update({".mjs": "text/javascript", ".woff2": "font/woff2", ".webp": "image/webp"})
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", port), H) as s:
    print(f"http://localhost:{port}"); s.serve_forever()
