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
- liquid.js   liquid hover: a soft blob, distortion and blur near the cursor, plus a control panel for it, the Intro settings and the About popup (Shift+L; settings kept in localStorage). Shared by index.html and about.html.
- linkfx.js   one hover effect for every text link, tab and button: letters slide in from both edges with a motion blur.
- cms.js + cms.html   the CMS as its own page (Shift+C on the site, or open cms.html): projects, About text, links, JSON export/import. Saved in the browser's localStorage.
- about-card.js   the About card: draggable paper sheet that bends while it moves (strip copy of the page), grid overlay (Shift+G)

## Loading entrance, stand-alone (loading/)
- loading/index.html   the loading entrance on its own, from the red screen until the background is plain black, with its control panel (Hide/Show with C, Replay with R). Every setting has a slider and a description; values are kept in localStorage, "Copy values" gives the numbers as JSON. Open it through `python3 server.py` -> http://localhost:8000/loading/
- The same sequence runs in the site from fuc/intro.js (red seeps into black; as it drains the Twister builds itself, its pictures appearing from the bottom of the screen to the top while the ribbon turns into place). Its numbers live in `DEF` at the top of intro.js and in the Liquid panel (Shift+L, tab "Intro"). Keep the two in step: loading/index.html is the sandbox, fuc/intro.js is what ships.

## Phones
- Mode switches morph the cards exactly like on desktop. Phones load 720px copies of the pictures (fuc/images/sm/), Space is a little smaller (window.__gcPh in index.html).
- The Twister uses 10 slices per card on touch devices and its items are 30% smaller (see index.html and the gallery chunk). Link hover is off on touch.
- fuc/hover-info.js   Twister: name, short description and year of the picture under the mouse, top left.
- fuc/perf-probe.js   add #perf to the address for a live frame-rate readout.

## Twister and hover liquid
- Twister: the cards ride along one spiral. Scrolling, dragging and auto scroll move every card ALONG the spiral (it turns and rises, and cards wrap from the top back to the bottom off screen). Never fewer than 24 slices per card on desktop.
- Gallery hover (liquid.js, jellyFx): wet-paint wobble. Cards near the cursor are shoved along by the cursor, jolt away on arrival and slosh back on springs (translate, scale, rotate of the whole card, so edges stay smooth). Over it sits the picture layer of the loading screen's disappear (melt + dissolve of the picture under the cursor). Both are tuned in the Liquid panel (Shift+L, tab "Hover"); melt and dissolve can be set to 0. Text keeps the flowing-noise ripple.
