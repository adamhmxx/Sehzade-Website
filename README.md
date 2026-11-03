# Adam Himawan portfolio — local copy

Run:  python3 server.py   ->  http://localhost:8000

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
- cms.js + cms.html   the CMS as its own page (Shift+C on the site, or open cms.html): projects, About text, links, JSON export/import. Saved in the browser's localStorage.
- about-card.js   the About card: draggable paper sheet that bends while it moves (strip copy of the page), grid overlay (Shift+G)
