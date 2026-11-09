#!/usr/bin/env python3
"""Local server + CMS backend. Run: python3 server.py [port]  ->  http://localhost:8000  (editor: /cms)

Content lives in content.json, uploaded images in uploads/. Visitors only ever read those two (plain static files).
Saving from the editor goes through /api/* and needs the CMS password:
  - set CMS_PASSWORD in the environment, or
  - let the server make one the first time it starts (kept in .cms-password, printed once).
"""
import base64, hashlib, hmac, http.server, json, os, re, secrets, socketserver, sys, tempfile, threading, time

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(ROOT, "content.json")
UPLOADS = os.path.join(ROOT, "uploads")
PAGES = {"/": "index.html", "/about": "about.html", "/about/": "about.html", "/cms": "cms.html"}
HIDDEN = {"server.py", "build.py", "readme.md"}          # never served
IMG_EXT = {"image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/avif": "avif"}
MAX_BODY = 40 * 1024 * 1024
SESSION_DAYS = 30
os.makedirs(UPLOADS, exist_ok=True)


def get_password():
    pw = os.environ.get("CMS_PASSWORD")
    if pw:
        return pw
    path = os.path.join(ROOT, ".cms-password")
    if os.path.exists(path):
        return open(path, encoding="utf8").read().strip()
    pw = secrets.token_urlsafe(9)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf8") as f:
        f.write(pw + "\n")
    print(f"\n  CMS password (saved in .cms-password): {pw}\n")
    return pw


PASSWORD = get_password()
lock = threading.Lock()
fails = {}  # ip -> (count, first_time)


def sign(exp):
    return f"{exp}.{hmac.new(PASSWORD.encode(), f'cms|{exp}'.encode(), hashlib.sha256).hexdigest()}"


def valid_token(tok):
    try:
        exp, mac = tok.split(".", 1)
        return int(exp) > time.time() and hmac.compare_digest(sign(exp), f"{exp}.{mac}")
    except Exception:
        return False


def atomic_write(path, data: bytes):
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path))
    with os.fdopen(fd, "wb") as f:
        f.write(data)
    os.replace(tmp, path)


def save_data_url(url):
    """data:image/...;base64,... -> uploads/<random>.<ext>; returns the public path (or the input if it is not an image)."""
    m = re.match(r"data:(image/[a-z+.-]+);base64,(.*)$", url, re.S)
    if not m or m.group(1) not in IMG_EXT:
        return ""
    name = f"{secrets.token_hex(8)}.{IMG_EXT[m.group(1)]}"
    atomic_write(os.path.join(UPLOADS, name), base64.b64decode(m.group(2)))
    return "uploads/" + name


def clean_str(v, n=4000):
    return v[:n] if isinstance(v, str) else ""


def clean_content(j):
    """Keep only the shape the site understands."""
    if not isinstance(j, dict):
        raise ValueError("bad content")
    out = {}
    if isinstance(j.get("items"), list):
        items = []
        for it in j["items"][:300]:
            if not isinstance(it, dict):
                continue
            row = {k: clean_str(it.get(k), 2000) for k in ("id", "name", "description", "services", "year", "link", "srcSet")}
            src = clean_str(it.get("src"), 60_000_000)
            row["src"] = save_data_url(src) if src.startswith("data:") else src
            items.append(row)
        out["items"] = items
    else:
        out["items"] = None
    for key in ("about", "site"):
        src = j.get(key) if isinstance(j.get(key), dict) else {}
        d = {}
        for k, v in src.items():
            k = clean_str(k, 60)
            if isinstance(v, str):
                d[k] = clean_str(v)
            elif isinstance(v, list):
                if k == "socials":
                    d[k] = [{"label": clean_str(s.get("label"), 60), "url": clean_str(s.get("url"), 500)} for s in v[:30] if isinstance(s, dict)]
                else:
                    d[k] = [clean_str(s, 200) for s in v[:20]]
        out[key] = d
    return out


class H(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, fmt, *args):
        if "/api/" in (self.path or "") or "--verbose" in sys.argv:
            super().log_message(fmt, *args)

    # ---------- static ----------
    def translate_path(self, path):
        p = path.split("?")[0].split("#")[0]
        return super().translate_path("/" + PAGES[p] if p in PAGES else p)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if self.path.split("?")[0] in ("/cms", "/cms.html"):
            self.send_header("X-Robots-Tag", "noindex, nofollow")
        super().end_headers()

    def blocked(self):
        parts = [x for x in self.path.split("?")[0].split("/") if x]
        return any(x.startswith(".") or x.lower() in HIDDEN for x in parts)

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self.api("GET")
        if self.blocked():
            return self.send_error(404)
        super().do_GET()

    def do_HEAD(self):
        if self.blocked():
            return self.send_error(404)
        super().do_HEAD()

    # ---------- api ----------
    def do_POST(self): self.api("POST")
    def do_PUT(self): self.api("PUT")

    def json(self, obj, code=200, headers=None):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(b)

    def authed(self):
        for c in (self.headers.get("Cookie") or "").split(";"):
            k, _, v = c.strip().partition("=")
            if k == "cms_token" and valid_token(v):
                return True
        return False

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            raise ValueError("too large")
        return self.rfile.read(n)

    def cookie(self, value, max_age):
        secure = "; Secure" if self.headers.get("X-Forwarded-Proto") == "https" else ""
        return {"Set-Cookie": f"cms_token={value}; Path=/; HttpOnly; SameSite=Strict; Max-Age={max_age}{secure}"}

    def api(self, method):
        route = self.path.split("?")[0]
        try:
            if route == "/api/session" and method == "GET":
                return self.json({"api": True, "authed": self.authed()})
            if route == "/api/login" and method == "POST":
                ip = self.client_address[0]
                cnt, t0 = fails.get(ip, (0, time.time()))
                if time.time() - t0 > 600:
                    cnt, t0 = 0, time.time()
                if cnt >= 8:
                    return self.json({"error": "Too many attempts. Wait a few minutes."}, 429)
                try:
                    pw = json.loads(self.body() or b"{}").get("password", "")
                except Exception:
                    pw = ""
                if isinstance(pw, str) and hmac.compare_digest(pw.encode(), PASSWORD.encode()):
                    fails.pop(ip, None)
                    exp = int(time.time()) + SESSION_DAYS * 86400
                    return self.json({"ok": True}, 200, self.cookie(sign(exp), SESSION_DAYS * 86400))
                fails[ip] = (cnt + 1, t0)
                time.sleep(0.6)
                return self.json({"error": "Wrong password"}, 401)
            if route == "/api/logout" and method == "POST":
                return self.json({"ok": True}, 200, self.cookie("", 0))
            if not self.authed():
                return self.json({"error": "Not signed in"}, 401)
            if route == "/api/content" and method == "PUT":
                content = clean_content(json.loads(self.body()))
                with lock:
                    atomic_write(CONTENT, json.dumps(content, ensure_ascii=False, indent=1).encode())
                return self.json(content)
            if route == "/api/upload" and method == "POST":
                ext = IMG_EXT.get((self.headers.get("Content-Type") or "").split(";")[0].strip())
                if not ext:
                    return self.json({"error": "Only webp, jpeg, png, gif or avif images"}, 415)
                data = self.body()
                if not data:
                    return self.json({"error": "Empty file"}, 400)
                name = f"{secrets.token_hex(8)}.{ext}"
                atomic_write(os.path.join(UPLOADS, name), data)
                return self.json({"url": "uploads/" + name})
            return self.json({"error": "Not found"}, 404)
        except ValueError as e:
            self.json({"error": str(e)}, 400)
        except Exception as e:  # keep the server alive
            self.json({"error": "Server error: " + e.__class__.__name__}, 500)


H.extensions_map.update({".mjs": "text/javascript", ".woff2": "font/woff2", ".webp": "image/webp", ".avif": "image/avif", ".json": "application/json"})


class Srv(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    port = int(next((a for a in sys.argv[1:] if a.isdigit()), 8000))
    with Srv(("", port), H) as s:
        print(f"Site:   http://localhost:{port}\nEditor: http://localhost:{port}/cms")
        s.serve_forever()
