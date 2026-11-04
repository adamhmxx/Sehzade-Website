# Adam Himawan portfolio — local copy

Run:  python3 server.py   ->  http://localhost:8000   (CMS: http://localhost:8000/cms)

- index.html      main page (works gallery). Site overrides live in one block: <style id="site-overrides"> + the About-panel script
- about.html      About content, shown inside the right-side panel. Overrides: <style id="about-overrides"> + one script (nav handling, ASCII animation)
- fuc/sites/...   Framer runtime and page chunks (.mjs, minified). Edited chunks:
    QHQX…mjs        gallery component (modes, Forward mode, Paper motion, 3D tilt, edge fades)
    shared-lib…mjs  navbar (clock format, clock + Book a call grouping)
    3rk2…mjs        About page content
- fuc/assets/     Inter / Inter Display fonts, Latin subset only
- fuc/images/     project images
- _original/      the two pages exactly as first downloaded from Framer
- build.py        makes build/page.html for the Claude artifact and lists the files to publish with it

## Interaction scripts (fuc/)
- liquid.js   liquid hover: a soft blob, distortion and blur near the cursor, plus a control panel for it, link hover and the About popup (Shift+L; settings kept in localStorage). Shared by index.html and about.html.
- linkfx.js   one hover effect for every text link, tab and button: letters slide in from both edges with a motion blur.
- cms.js + cms.html   the CMS (Shift+C on the site, or open /cms): projects (add, edit, reorder, delete, drop images to add), About text, social links (any number), navbar/page texts, JSON backup. With server.py it signs in with a password and publishes to content.json + uploads/, which visitors load. Without the server it falls back to this browser's localStorage.
- about-card.js   the About card: draggable paper sheet that bends while it moves (strip copy of the page), grid overlay (Shift+G)

## CMS password and publishing
- server.py makes a password on first start (printed once, kept in .cms-password, which is git-ignored). Or set CMS_PASSWORD in the environment.
- Content is content.json, images are uploads/. Commit/deploy both to ship edits; back them up like any other file.
- The server hides dotfiles, server.py and build.py from visitors. Run it behind HTTPS in production (the login cookie is HttpOnly, SameSite=Strict).
