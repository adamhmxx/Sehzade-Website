#!/usr/bin/env python3
"""Make the Claude artifact version from index.html.

The artifact host wraps the main page in its own <html>/<head>/<body>, so build/page.html
holds index.html without that shell. about.html, the studio-*.html editor page and fuc/ are published unchanged next to it.
Run: python3 build.py   (prints the files to publish alongside build/page.html)

It also builds the site's scripts: the readable sources live in src/fuc/*.js (edit those); fuc/*.js are the same scripts
minified (comments and whitespace removed, names shortened), which is what the pages load. Needs Node (npx terser).
Run: python3 build.py js    (only the scripts)
"""
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

def scripts():
    src = os.path.join(ROOT, "src", "fuc")
    for n in sorted(os.listdir(src)):
        if not n.endswith(".js"):
            continue
        out = os.path.join(ROOT, "fuc", n)
        subprocess.run(["npx", "--yes", "terser@5", os.path.join(src, n), "-c", "passes=2", "-m", "--ecma", "2017",
                        "--preamble", "/* built from src/fuc/%s (edit that file, then run: python3 build.py js) */" % n,
                        "-o", out], check=True)
        print("built fuc/%s  %d -> %d bytes" % (n, os.path.getsize(os.path.join(src, n)), os.path.getsize(out)), file=sys.stderr)

def main():
    scripts()
    if sys.argv[1:] == ["js"]:
        return
    src = open(os.path.join(ROOT, "index.html"), encoding="utf8").read()
    head = re.search(r"<head>(.*)</head>", src, re.S).group(1)
    body = re.search(r"<body>(.*)</body>", src, re.S).group(1)
    head = re.sub(r'<meta (charset|name="viewport")[^>]*>\n?', "", head)
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    with open(os.path.join(ROOT, "build", "page.html"), "w", encoding="utf8") as f:
        f.write(head.strip() + "\n" + body)
    files = ["about.html"] + sorted(f for f in os.listdir(ROOT) if f.startswith("studio-") and f.endswith(".html")) + sorted(
        os.path.relpath(os.path.join(d, n), ROOT)
        for d, _, names in os.walk(os.path.join(ROOT, "fuc")) for n in names)
    print("\n".join(files))

if __name__ == "__main__":
    main()
