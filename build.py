#!/usr/bin/env python3
"""Make the Claude artifact version from index.html.

The artifact host wraps the main page in its own <html>/<head>/<body>, so build/page.html
holds index.html without that shell. about.html and fuc/ are published unchanged next to it.
Run: python3 build.py   (prints the files to publish alongside build/page.html)
"""
import os, re

ROOT = os.path.dirname(os.path.abspath(__file__))

def main():
    src = open(os.path.join(ROOT, "index.html"), encoding="utf8").read()
    head = re.search(r"<head>(.*)</head>", src, re.S).group(1)
    body = re.search(r"<body>(.*)</body>", src, re.S).group(1)
    head = re.sub(r'<meta (charset|name="viewport")[^>]*>\n?', "", head)
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    with open(os.path.join(ROOT, "build", "page.html"), "w", encoding="utf8") as f:
        f.write(head.strip() + "\n" + body)
    files = ["about.html"] + sorted(
        os.path.relpath(os.path.join(d, n), ROOT)
        for d, _, names in os.walk(os.path.join(ROOT, "fuc")) for n in names)
    print("\n".join(files))

if __name__ == "__main__":
    main()
