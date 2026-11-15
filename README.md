# Adam Himawan portfolio — local copy

Run:  python3 server.py   ->  http://localhost:8000   (CMS: http://localhost:8000/cms, local shortcut)

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

## Interaction scripts (src/fuc/ -> fuc/)
- The readable sources are in src/fuc/*.js: edit those. The pages load fuc/*.js, the same scripts minified; rebuild them with `python3 build.py js` (needs Node), then bump the `?v=` of every changed script in index.html / about.html / studio-*.html (the scripts are cached by browsers for a year: a new ?v= is what makes visitors load the new copy). liquid-panel.js is loaded with liquid.js's ?v=, so a change to the panel needs a new ?v= on liquid.js.
- Framer chunks in fuc/sites/ are cached for a day: rename a chunk you edit (as the gallery chunk QHQX….vNN.mjs) and update its references.
- liquid.js   liquid hover: a soft blob, the text ripple with its soft depth rise, and the melt of the gallery picture under the cursor (no wobble, no bounce, no scale on the cards). Shared by index.html and about.html. Its control panel (Shift+L; settings kept in localStorage) is liquid-panel.js, loaded only when it is opened.
- linkfx.js   one hover effect for every text link, tab and button: letters slide in from both edges with a motion blur.
- cms.js   small, loaded on every page: reads the saved content (content.json, cached in localStorage) and applies it (gallery items, navbar texts, About text, social links).
- cms-editor.js + studio-*.html   the CMS editor, loaded by the studio page only (not by visitors). The editor page is the studio-….html file in the repo root: its file name is its web address (kept unguessable; nothing on the public site links to it, /cms does not exist on the live site). Locally http://localhost:8000/cms opens it. projects (add, edit, reorder, delete, drop images to add), About text, social links (any number), navbar/page texts, JSON backup. With server.py it signs in with a password and publishes to content.json + uploads/, which visitors load. Without the server it falls back to this browser's localStorage.
- about-card.js   the About card: a sheet that rises from the bottom, can be dragged and thrown, and sinks back on close (springs without overshoot). The page inside (about.html) is shown once it has loaded and been fitted, and is never re-fitted visibly while open. Phones: at most 80% of the screen height; a phone on its side gets an upright card that slides up and down. Grid overlay: Shift+G

## Loading entrance, stand-alone (loading/)
- loading/index.html   the loading entrance on its own, from the red screen until the background is plain black, with its control panel (Hide/Show with C, Replay with R). Every setting has a slider and a description; values are kept in localStorage, "Copy values" gives the numbers as JSON. Open it through `python3 server.py` -> http://localhost:8000/loading/
- The same sequence runs in the site from fuc/intro.js (red seeps into black; as it drains the Twister builds itself, its pictures appearing from the bottom of the screen to the top while the ribbon turns into place). Its numbers live in `DEF` at the top of intro.js and in the Liquid panel (Shift+L, tab "Intro"). Keep the two in step: loading/index.html is the sandbox, fuc/intro.js is what ships.

## Phones
- Mode switches morph the cards exactly like on desktop. Phones load 720px copies of the pictures (fuc/images/sm/), the Twister uses a steeper climb (window.__gcPh in index.html).
- The Twister is drawn on the GPU (WebGL2, code at the top of the gallery chunk): one canvas, every card a single mesh bent along the spiral in the vertex shader, so the curve is smooth and a frame costs a handful of draw calls. The card boxes in the page are empty and transparent, they only take hover and click. Without WebGL2 (or after a lost context) the gallery falls back to the old DOM slices (window.__twEff / twn). Link hover is off on touch.
- fuc/detail.js   Project detail page: a full-screen page per work (address #/work/<name>, Back button closes it; every way back — to the Twist, the Grid, the List, or from a page opened by its address — takes about 1.8 s: the text leaves block by block, the page clears, the picture flies home). Desktop: split 50/50, info on the left with the project's huge name at the bottom, pictures on the right as an endless vertical scroll. Phone: pictures on top as an endless horizontal scroll, the details below and the name set big at the bottom. The navbar stays; Back (with Prev / Next) takes the place of the mode menu; the liquid hover works on the page's text and pictures. Opened by clicking a card (Twister, Grid) or a name (List). Content from the CMS: description, client, year, services, challenge, approach, link and a picture gallery per project (empty fields are left out).
- fuc/hover-info.js   Twister: name, short description and year of the picture under the mouse, top left.
- fuc/perf-probe.js   add #perf to the address for a live frame-rate readout.

## Twister and hover liquid
- Twister: the cards ride along one spiral. Scrolling, dragging and auto scroll move every card ALONG the spiral (it turns and rises, and cards wrap from the top back to the bottom off screen). Never fewer than 24 slices per card on desktop.
- Gallery hover (liquid.js): the picture under the cursor melts (the loading screen's disappear), the cards themselves do not move or grow. Tuned in the Liquid panel (Shift+L, tab "Hover"). Text keeps the flowing-noise ripple.

## CMS: how it publishes
- Live site (Vercel, static): open the studio-….html address (file name without .html), connect GitHub once with a fine-grained token (this repo only, Contents: Read and write; kept in that browser only). Edits are batched and published as one commit (after 20 s of quiet, when the tab is hidden, or with "Publish now"; content.json, images to uploads/). Visitors read content.json from the site and from the repository on GitHub, whichever is newer, so an edit shows within about 5 minutes even when Vercel is not deploying (the free plan limits deploys per day). Visitors only read content.json.
- Local: python3 server.py makes a password on first start (printed once, saved in .cms-password, git-ignored; or set CMS_PASSWORD), then /cms publishes straight to content.json and uploads/ on disk. Commit them to ship.
- Neither: the editor still works but only in that browser (localStorage).
- server.py hides dotfiles, server.py and build.py from visitors; run it behind HTTPS if you ever host it.


## Weight and caching
- vercel.json: fonts (fuc/assets), project pictures (fuc/images) and CMS uploads (uploads/) are cached for a year (their file names never change when the content does). Scripts keep the default revalidation; bump the ?v= number in index.html / about.html when you edit one.
- .vercelignore: the original Framer exports, the loading sandbox, build.py, server.py and README.md are not deployed.
- fuc/perf-probe.js is only requested when the address ends in #perf. mode-ui.js reacts to the About card through the "ab-toggle" event (about-card.js), no polling.
