#!/usr/bin/env python3
"""Make the Claude artifact version from index.html.

The artifact host wraps the main page in its own <html>/<head>/<body>, so build/page.html
holds index.html without that shell. about.html, the studio-*.html editor page and fuc/ are published unchanged next to it.
Run: python3 build.py   (prints the files to publish alongside build/page.html)

It also builds the site's scripts: the readable sources live in src/fuc/*.js (edit those); fuc/*.js are the same scripts
minified (comments and whitespace removed, names shortened), which is what the pages load. Needs Node (npx terser).
Run: python3 build.py js    (only the scripts)

Both also stamp the versions, so nothing has to be bumped by hand: every fuc/<name>.js reference in the pages gets ?v=<hash of the
built file> (liquid.js's hash covers liquid-panel.js too, which it loads with its own ?v=), and the hand-edited Framer chunks
(EDITED below) are renamed <base>.h<hash>.mjs with every reference updated, so browsers load a changed chunk at once.
Run: python3 build.py stamp (only the versions)
"""
import hashlib, os, re, subprocess, sys

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

PAGES = lambda: ["index.html", "about.html"] + sorted(f for f in os.listdir(ROOT) if f.startswith("studio-") and f.endswith(".html"))
SITES = os.path.join(ROOT, "fuc", "sites", "5APA5K3vmMIpJ2kZ6DqeNG")
# hand-edited chunks, in dependency order: a chunk is stamped before the chunks and pages that import it
EDITED = ["QHQXYhTjjHvyon0f_k6M-OfqjnUAbqgCLQVvwyxe1Ww", "script_main"]

def h8(*paths):
    d = hashlib.sha1()
    for p in paths:
        d.update(open(p, "rb").read())
    return d.hexdigest()[:8]

def rewrite(files, pat, rep):
    for f in files:
        t = open(f, encoding="utf8").read()
        n = re.sub(pat, rep, t)
        if n != t:
            open(f, "w", encoding="utf8").write(n)

def stamp():
    pages = [os.path.join(ROOT, p) for p in PAGES()]
    fuc = os.path.join(ROOT, "fuc")
    for n in sorted(os.listdir(fuc)):
        if not n.endswith(".js"):
            continue
        extra = [os.path.join(fuc, "liquid-panel.js")] if n == "liquid.js" else []
        v = h8(os.path.join(fuc, n), *extra)
        rewrite(pages, r"(fuc/%s\?v=)[0-9a-z]+" % re.escape(n), r"\g<1>" + v)
    for base in EDITED:
        old = [n for n in os.listdir(SITES) if re.fullmatch(r"%s\.(v\d+|h[0-9a-f]{8})\.mjs" % re.escape(base), n)]
        if len(old) != 1:
            sys.exit("expected one %s chunk, found %s" % (base, old))
        new = "%s.h%s.mjs" % (base, h8(os.path.join(SITES, old[0])))
        if new != old[0]:
            os.rename(os.path.join(SITES, old[0]), os.path.join(SITES, new))
            others = [os.path.join(SITES, n) for n in os.listdir(SITES) if n.endswith(".mjs")]
            rewrite(pages + others, re.escape(old[0]), new)
            print("chunk %s -> %s" % (old[0], new), file=sys.stderr)

def main():
    if sys.argv[1:] == ["stamp"]:
        return stamp()
    scripts()
    stamp()
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
