/* Project detail page.
   A full-screen page for every work, reached by clicking a card (Twister, Grid) or a name (List). Its address is #/work/<name>, so it can be shared and the
   browser's Back button closes it. Desktop: the text on the left (description, client, year, services, challenge, approach, "Visit website") with the
   project's name set huge at the bottom, and the project's pictures on the right as one endless vertical scroll. Phone: the pictures on top as an endless
   horizontal scroll, everything else below, the name first.
   The content comes from the CMS: description, client, year, services, challenge, approach, link and a gallery of pictures per project. Empty fields are left out. */
(function () {
  var root = document.documentElement, ov = null, shown = false, cur = -1, strip = null, closing = 0, ownPush = false, lastFocus = null, resizeT = 0;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ID = "wk";

  function data() { var a = (window.__cmsItems && window.__cmsItems()) || window.__cmsDefaults || []; return [].filter.call(a, function (it) { return it && it.name; }); }
  function slugOf(s) { return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "work"; }
  function slugs(list) { var seen = {}; return list.map(function (it) { var s = slugOf(it.name), n = seen[s] = (seen[s] || 0) + 1; return n > 1 ? s + "-" + n : s; }); }
  function sm(u) { return window.__sms ? window.__sms(u) : u; }
  function fname(u) { var m = /([^\/?#]+\.(?:webp|png|jpe?g|avif|gif))/i.exec(u || ""); return m ? m[1].toLowerCase() : (u || "").slice(0, 80); }
  function phone() { return innerWidth < 810; }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function live() { return !root.classList.contains("intro-on") && !root.classList.contains("intro-ui"); }

  function css() {
    var s = document.createElement("style");
    s.textContent =
      /* the page sits under the navbar (the navbar stays exactly as it is) and replaces the mode menu with its own Back button */
      '#wk{position:fixed;inset:0;z-index:4;background:#0b0b0b;color:#f2f2f2;font-family:"Inter Display",Inter,-apple-system,BlinkMacSystemFont,sans-serif;visibility:hidden;display:grid;grid-template-columns:1fr 1fr;-webkit-font-smoothing:antialiased;overscroll-behavior:contain}' +
      '#wk.on{visibility:visible}' +
      'html.wk-open [role="tablist"],html.wk-air [role="tablist"]{opacity:0!important;pointer-events:none!important;transition:none!important}html.wk-nt [role="tablist"]{transition:none!important}' +
      /* while the picture travels (in or out) the page is only a transparent layer: no fade, no wipe. It becomes the page the moment the picture has landed */
      '#wk.air{background:transparent}#wk.air .wk-in{opacity:0!important;transition:none!important}#wk.air .wk-bar{visibility:hidden}.wk-hide{visibility:hidden!important}' +
      /* the text rises in, one piece after the other */
      /* the text arrives the way everything on this site does: it dissolves in out of a liquid ripple that calms down (see liquidIn), one block after the other */
      'html.lr-in #ls-root{opacity:1!important;visibility:visible!important}html.lr-in #ls-root .ls-row{clip-path:none!important;translate:0 0!important;opacity:1!important;transition:translate 1.2s cubic-bezier(.22,1,.36,1),opacity .8s ease!important}html.lr-in #ls-pv,html.lr-in #ls-mpv{opacity:0!important}' +
      '#wk.lout .wk-in:not(.wk-r):not(.wk-name){opacity:0!important;transition:none!important}#wk.lout .wk-bar{visibility:hidden}' +
      '#wk .wk-in{opacity:0;transform:translateY(18px);transition:opacity .9s ease,transform 1.1s cubic-bezier(.22,1,.36,1)}' +
      /* ...and so are the pictures of the scroll: each one rises into its frame, in turn */
      '#wk .wk-it img{transition:transform 1.1s cubic-bezier(.22,1,.36,1);transition-delay:calc(var(--j,0) * .1s)}#wk.rv .wk-it img{transform:translateY(102%);transition:none}#wk.rv.fl .wk-first img{transform:none}' +
      '#wk .wk-in.wk-now{transition:none!important}html.wk-open #ls-root,html.wk-air #ls-root{transition:none!important}html.wk-open #hv-info,html.wk-air #hv-info{opacity:0!important;transition:none!important}' +
      '#wk.on .wk-in{opacity:1;transform:none;transition-delay:calc(var(--i,0) * .09s)}' +
      '#wk .wk-r.wk-in{transition:none!important;transform:none!important;clip-path:none!important}' +
      '#wk.sw .wk-in{opacity:0;transform:translateY(10px);transition-delay:0s;transition-duration:.18s}' +
      '#wk .wk-l{position:relative;display:flex;flex-direction:column;min-height:0;padding:104px 8px 28px var(--gm);box-sizing:border-box}' +
      '#wk button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '#wk{outline:none}#wk button:focus{outline:none}#wk button:focus-visible{outline:1px solid #fff;outline-offset:3px}' +
      /* Back (with Prev / Next beside it), exactly where the mode menu is */
      '#wk .wk-bar{position:absolute;z-index:5;display:flex;align-items:center;justify-content:center;gap:var(--g,16px);font-size:var(--f,16px);line-height:1;color:#fff;mix-blend-mode:difference;white-space:nowrap}' +
      '#wk .wk-bar button{min-height:40px;padding:0 4px;opacity:.45;transition:opacity .24s ease}' +
      '#wk .wk-bar .wk-back{opacity:1}' +
      '#wk .wk-bar button:hover{opacity:1}' +
      '#wk .wk-body{flex:1;min-height:0;overflow:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin-bottom:22px}' +
      '#wk .wk-body::-webkit-scrollbar{display:none}' +
      '#wk .wk-idx{margin:0 0 18px;font-size:16px;line-height:1.3;color:#fff;font-variant-numeric:tabular-nums}' +
      '#wk .wk-lede{margin:0 0 24px;font-size:16px;line-height:1.4;font-weight:400;max-width:60ch;color:#fff}' +
      '#wk .wk-meta{margin:0 0 22px;padding:0;border:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px}' +
      '#wk .wk-meta div{padding:0}' +
      '#wk .wk-meta dt,#wk .wk-sec h3{margin:0 0 6px;font-size:16px;line-height:1.3;font-weight:400;color:rgba(255,255,255,.6)}' +
      '#wk .wk-meta dd{margin:0;font-size:16px;line-height:1.3;color:#fff}' +
      '#wk .wk-sec{margin:0 0 22px;padding:0;border:0}' +
      '#wk{--gm:24px;--gc:4}@media (min-width:1440px){#wk{--gm:32px;--gc:6}}@media (max-width:809.98px){#wk{--gm:16px;--gc:8}}' +
      '#wk .wk-grid{display:grid;grid-template-columns:repeat(var(--gc),minmax(0,1fr));column-gap:16px;align-items:start}' +
      '#wk .wk-year{grid-column:1 / span 2}#wk .wk-col{grid-column:3 / -1;min-width:0}' +
      '@media (min-width:810px) and (max-width:1439.98px){#wk .wk-year{grid-column:1 / span 1}#wk .wk-col{grid-column:2 / -1}}' +
      '#wk .wk-sec p{margin:0;font-size:16px;line-height:1.4;color:#fff;max-width:60ch;white-space:pre-line}' +
      '#wk .wk-visit{display:inline-block;align-self:flex-start;margin:0 0 14px;padding:0;border:0;background:none;color:#fff;text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:1px;font-size:16px;line-height:1.3;transition:color .25s ease}' +
      '#wk .wk-visit:hover{color:rgba(255,255,255,.6)}#wk .wk-visit i{font-style:normal}' +
      '#wk .wk-name{flex:none;margin:0;font:400 var(--nm,140px)/.92 "Anton","Inter Display",Impact,sans-serif;text-transform:uppercase;letter-spacing:0;padding-bottom:.04em;overflow-wrap:anywhere}' +
      '#wk .wk-name span{display:block;white-space:normal}' +
      '@media (min-width:1440px){#wk{--nm:160px}}@media (min-width:810px) and (max-width:1439.98px){#wk{--nm:120px}}@media (max-width:809.98px){#wk{--nm:48px}}' +
      '#wk .wk-r{position:relative;overflow:hidden;background:#0b0b0b;touch-action:none;cursor:grab}' +
      '#wk .wk-r.drag{cursor:grabbing}' +
      '#wk .wk-rs{position:absolute;inset:-90px;pointer-events:none}#wk .wk-ro{position:absolute;left:90px;top:90px;width:0;height:0}' +
      '#wk .wk-it{position:absolute;left:0;top:0;overflow:hidden;background:#0b0b0b;will-change:transform}' +
      '#wk .wk-it img{display:block;width:100%;height:100%;object-fit:cover;pointer-events:none;-webkit-user-drag:none;user-select:none}' +
      /* phone: the pictures on top (endless horizontal), then the details, and the name set big at the bottom, above the Back button */
      /* phone, on the 8-column grid: the short facts in one row on top, the endless picture scroll in the middle, the long texts below it, then the link and the name; Back sits bottom right */
      '@media (max-width:809.98px){#wk{grid-template-columns:repeat(8,minmax(0,1fr));column-gap:16px;grid-template-rows:auto auto 30dvh minmax(0,1fr) auto;padding:var(--top,104px) 16px calc(20px + env(safe-area-inset-bottom,0px));box-sizing:border-box}' +
      /* phone: Back sits top right, just under the navbar; the texts are 14px */
      '#wk .wk-sec h3,#wk .wk-sec p,#wk .wk-visit{font-size:14px}' +
      '#wk .wk-l,#wk .wk-body,#wk .wk-grid,#wk .wk-col{display:contents}' +
      '#wk .wk-year{grid-row:2;grid-column:1 / span 2}' +
      '#wk .wk-short{grid-row:2;grid-column:3 / -1;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);column-gap:16px;align-items:start}' +
      '#wk .wk-sec{margin-bottom:14px}' +
      '#wk .wk-r{grid-row:3;grid-column:1 / -1;margin:0 -16px;touch-action:pan-y}' +
      '#wk .wk-long{grid-row:4;grid-column:1 / -1;min-height:0;overflow:auto;scrollbar-width:none;padding-top:14px}#wk .wk-long::-webkit-scrollbar{display:none}' +
      '#wk .wk-visit{grid-row:5;grid-column:1 / -1;justify-self:start;margin:6px 0 8px}' +
      '#wk .wk-name{grid-row:1;grid-column:1 / -1;margin-bottom:18px}}' +   /* phone order: the project name first, then the short facts, the pictures, the long texts and the link */
      '@media (prefers-reduced-motion:reduce){#wk,#wk.on{transition:none}#wk .wk-in,#wk.on .wk-in{transition:none;opacity:1;transform:none}}';
    document.head.appendChild(s);
  }

  /* ---------- the endless scroll of pictures ---------- */
  function Strip(box, urls, vertical, held, onFirst) {
    var org = null, GAP = 12, PAD = 12, slots = [], C = 0, maxS = 0, view = 0, pos = 0, tgt = 0, vel = 0, drag = null, raf = 0, last = 0, idle = 0, alive = true, metrics = [];
    var imgs = urls.map(function (u) { var im = new Image(); im.decoding = "async"; im.src = u; return im; });
    var ready = Promise.all(imgs.map(function (im) { return im.decode ? im.decode().catch(function () {}) : new Promise(function (r) { im.onload = im.onerror = r; }); }));
    function wrapv(v, t) { return ((v % t) + t) % t; }
    function layout() {
      if (!alive) return;
      var W = box.clientWidth, H = box.clientHeight; if (!W || !H) return;
      view = vertical ? H : W;
      metrics = imgs.map(function (im) { var r = (im.naturalWidth && im.naturalHeight) ? im.naturalWidth / im.naturalHeight : 4 / 3; return vertical ? Math.round((W - PAD * 2) / r) : Math.round((H - PAD * 2) * r); });
      var L = 0; maxS = 0; metrics.forEach(function (s) { L += s + GAP; maxS = Math.max(maxS, s); });
      var copies = Math.max(1, Math.ceil((view + maxS * 2 + GAP) / L)); C = copies * L;
      /* the pictures live in a layer that reaches 90px beyond the pane on every side (the pane clips it): the hover's melt works on that layer, so its own edges are out of sight and nothing tears along the pane's border */
      if (!org) { var wrap = document.createElement("div"); wrap.className = "wk-rs"; org = document.createElement("div"); org.className = "wk-ro"; wrap.appendChild(org); box.appendChild(wrap); }
      org.textContent = ""; slots = [];
      for (var c = 0; c < copies; c++) { var o = c * L; for (var i = 0; i < imgs.length; i++) {
        var d = document.createElement("div"); d.className = "wk-it" + (c === 0 && i === 0 ? " wk-first" : ""); d.style.setProperty("--j", Math.min(6, c * imgs.length + i)); var im = new Image(); im.decoding = "async"; im.alt = ""; im.draggable = false; im.src = imgs[i].src; d.appendChild(im);
        if (vertical) { d.style.left = PAD + "px"; d.style.width = (W - PAD * 2) + "px"; d.style.height = metrics[i] + "px"; }
        else { d.style.top = PAD + "px"; d.style.height = (H - PAD * 2) + "px"; d.style.width = metrics[i] + "px"; }
        org.appendChild(d); slots.push({ el: d, off: o, size: metrics[i] }); o += metrics[i] + GAP; } }
      place(); kick();
      try { window.dispatchEvent(new Event("wk-render")); } catch (e) {}   /* the hover effect learns the new pictures at once */
      if (onFirst) { var of = onFirst; onFirst = null; of(); }
    }
    function place() {
      for (var s = 0; s < slots.length; s++) {
        var k = slots[s], p = wrapv(k.off - pos + maxS, C) - maxS + (vertical ? PAD : PAD);
        var vis = p < view && p + k.size > 0;
        if (vis !== k.vis) { k.vis = vis; k.el.style.visibility = vis ? "" : "hidden"; }
        if (vis) k.el.style.transform = vertical ? "translate3d(0," + p.toFixed(1) + "px,0)" : "translate3d(" + p.toFixed(1) + "px,0,0)";
      }
    }
    function tick(now) {
      raf = 0; if (!alive) return;
      var dt = Math.min(40, now - last); last = now;
      if (!drag) {
        if (Math.abs(vel) > .02) { tgt += vel * dt; vel *= Math.exp(-dt / 320); } else vel = 0;
        idle += dt; if (!held && !reduce && idle > 1400 && Math.abs(vel) < .02) tgt += (vertical ? 22 : 30) * dt / 1000;
      }
      pos += (tgt - pos) * (1 - Math.exp(-dt / (drag ? 45 : 120)));
      place(); raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf && alive) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    function onWheel(e) {
      if (!vertical) return; e.preventDefault();
      var m = e.deltaMode === 1 ? 16 : 1, d = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * m;
      tgt += d; idle = 0; vel = 0; kick();
    }
    function down(e) {
      if (e.button != null && e.button > 0) return;
      try { box.setPointerCapture(e.pointerId); } catch (x) {}
      drag = { id: e.pointerId, p: vertical ? e.clientY : e.clientX, s: [[e.timeStamp, vertical ? e.clientY : e.clientX]] }; vel = 0; idle = 0; box.classList.add("drag"); kick();
    }
    function move(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var p = vertical ? e.clientY : e.clientX; tgt -= p - drag.p; drag.p = p; idle = 0;
      drag.s.push([e.timeStamp, p]); while (drag.s.length > 2 && e.timeStamp - drag.s[0][0] > 90) drag.s.shift();
    }
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var a = drag.s[0], z = drag.s[drag.s.length - 1], dt = Math.max(16, z[0] - a[0]); vel = e.timeStamp - z[0] > 120 ? 0 : Math.max(-3.5, Math.min(3.5, -(z[1] - a[1]) / dt));
      drag = null; box.classList.remove("drag"); try { box.releasePointerCapture(e.pointerId); } catch (x) {}
    }
    box.addEventListener("wheel", onWheel, { passive: false });
    box.addEventListener("pointerdown", down); box.addEventListener("pointermove", move); box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    ready.then(layout);
    return { release: function () { held = false; idle = 0; }, relayout: layout, destroy: function () { alive = false; cancelAnimationFrame(raf); box.removeEventListener("wheel", onWheel); box.removeEventListener("pointerdown", down); box.removeEventListener("pointermove", move); box.removeEventListener("pointerup", up); box.removeEventListener("pointercancel", up); box.textContent = ""; } };
  }

  /* ---------- the name, as big as the column allows ---------- */
  /* the name: one fixed size per breakpoint (160px desktop, 120px laptop/tablet, 64px phone); a long name simply wraps onto more lines */
  function fitName(h1, name) { h1.textContent = ""; h1.appendChild(el("span", "", String(name).toUpperCase())); }

  /* ---------- building the page ---------- */
  function build() {
    if (ov) return; css();
    ov = el("div"); ov.id = ID; ov.tabIndex = -1; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Project");
    document.body.appendChild(ov);
    addEventListener("keydown", function (e) {
      if (!shown) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1);
    });
    addEventListener("resize", function () { if (!shown) return; clearTimeout(resizeT); resizeT = setTimeout(function () { render(cur, true); }, 160); });
  }
  /* the Back button takes the place of the mode menu (same spot, same type size, same gap) */
  function placeBar(bar) {
    var tl = document.querySelector('[role="tablist"]'), tab = tl && tl.querySelector('[role="tab"]'), r;
    /* the gallery melts with a scale and a turn: measure the menu as if it did not (it sits inside the melting layer), or Back would land lower than the menu */
    if (tl && meltEl && meltEl.contains(tl)) {
      var ps = meltEl.style.scale, pr = meltEl.style.rotate, pt = meltEl.style.transition;
      meltEl.style.transition = "none"; meltEl.style.scale = "1"; meltEl.style.rotate = "0deg";
      var sv = root.classList.contains("wk-open"); if (sv) root.classList.remove("wk-open");
      r = tl.getBoundingClientRect();
      if (sv) root.classList.add("wk-open");
      meltEl.style.scale = ps; meltEl.style.rotate = pr; meltEl.style.transition = pt;
    } else r = tl && tl.getBoundingClientRect();
    if (!r || !r.width) { bar.style.left = "50%"; bar.style.top = (innerHeight - 56) + "px"; bar.style.transform = "translate(-50%,-50%)"; return; }
    if (phone()) {   /* phone: Back in the top left corner, right under the logo */
      var nv = document.querySelector("nav"), nb = nv ? nv.getBoundingClientRect() : null, top = nb && nb.height ? nb.bottom + 8 : 64;
      bar.style.right = "auto"; bar.style.left = "12px"; bar.style.top = top + "px"; bar.style.transform = "none";
      if (ov) ov.style.setProperty("--top", Math.round(top + 64) + "px");
    }
    else { bar.style.right = ""; bar.style.left = (r.left + r.width / 2) + "px"; bar.style.top = (r.top + r.height / 2) + "px"; bar.style.transform = "translate(-50%,-50%)"; }
    var cs = tab ? getComputedStyle(tab) : null; bar.style.setProperty("--f", (cs ? parseFloat(cs.fontSize) || 16 : 16) + "px");
    var g = parseFloat(getComputedStyle(tl).columnGap || getComputedStyle(tl).gap); bar.style.setProperty("--g", (isNaN(g) ? 16 : g) + "px");
    if (ov) ov.style.setProperty("--bar", Math.max(80, innerHeight - r.top + 14) + "px");
  }
  function render(i, keepScroll, hold) {
    var list = data(), it = list[i]; if (!it) return;
    ov.textContent = ""; if (strip) { strip.destroy(); strip = null; }
    var bar = el("div", "wk-bar"), back = el("button", "wk-back", "Back");
    back.type = "button"; back.setAttribute("aria-label", "Back to the works");
    back.addEventListener("click", function () { close(); });
    bar.append(back);
    var l = el("div", "wk-l"), body = el("div", "wk-body"), idx = 0;
    function put(node) { node.classList.add("wk-in"); node.style.setProperty("--i", idx++); return node; }
    var h1 = put(el("h1", "wk-name")); h1.setAttribute("aria-label", it.name);
    /* on the page grid (12 columns, 8 below 1440px, 16px gutters): Year is one horizontal row (title, value) in the first columns; right of it one
       vertical frame holds Description, Client, Challenge and Approach. Titles white 60%, texts white 100%, all 16px */
    var grid = el("div", "wk-grid");
    if (it.year) { var yr = el("section", "wk-sec wk-year"); yr.append(el("h3", "", "Year"), el("p", "", it.year)); grid.appendChild(put(yr)); }
    var col = el("div", "wk-col");
    /* two groups: the short facts and the long texts (a phone shows the short ones in a row above the pictures and the long ones below them) */
    var gShort = el("div", "wk-short"), gLong = el("div", "wk-long");
    [["Description", it.description, gShort], ["Partner", it.client, gShort], ["Challenge", it.challenge, gLong], ["Approach", it.approach, gLong]].forEach(function (x) {
      if (!x[1]) return; var sec = el("section", "wk-sec"); sec.append(el("h3", "", x[0]), el("p", "", x[1])); x[2].appendChild(put(sec));
    });
    col.append(gShort, gLong);
    grid.appendChild(col); body.appendChild(grid);
    var visit = null;
    if (it.link) { visit = el("a", "wk-visit"); visit.href = it.link; visit.target = "_blank"; visit.rel = "noopener noreferrer"; visit.textContent = "Visit website"; }
    var r = el("div", "wk-r"); r.classList.add("wk-in"); r.style.setProperty("--i", 1);
    if (visit) put(visit);
    l.append(body); if (visit) l.append(visit); l.append(h1);
    ov.append(l, r, bar);
    placeBar(bar);
    var urls = [it.image && it.image.src].concat(it.gallery || []).filter(Boolean).map(sm);
    if (!urls.length) urls = [];
    strip = urls.length ? Strip(r, urls, !phone(), !!hold, function () { rvLay = true; rvTry(); }) : null;
    var fit = function () { placeBar(bar); fitName(h1, it.name); };
    fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    try { window.dispatchEvent(new Event("wk-render")); } catch (e) {}
  }
  /* ---------- works <-> project: no fade and no wipe, only movement ----------
     In: the cards that were not chosen turn and leave (up or down, by where they are), the chosen picture straightens out and travels to the first
     slot of the picture scroll; the moment it lands it IS that slot, and the text comes in. Out: the same film, played backwards. */
  var origin = null, flyMode = "twist", flyCard = null, meltEl = null, inFlight = null, flTok = 0;
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function seg(t, a, b) { return ease(Math.max(0, Math.min(1, (t - a) / (b - a)))); }
  function airOff() { root.classList.add("wk-nt"); root.classList.remove("wk-air"); requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove("wk-nt"); }); }); }
  /* where the first picture of the scroll rests */
  function target(src, cb) {
    var r = ov && ov.querySelector(".wk-r"); if (!r) { cb(null); return; }
    var im = new Image(), done = 0, run = function () {
      if (done) return; done = 1;
      var b = r.getBoundingClientRect(), pad = 12, ar = (im.naturalWidth && im.naturalHeight) ? im.naturalWidth / im.naturalHeight : 4 / 3, tw, th;
      if (phone()) { th = b.height - pad * 2; tw = Math.round(th * ar); } else { tw = b.width - pad * 2; th = Math.round(tw / ar); }
      cb({ left: b.left + pad, top: b.top + pad, width: tw, height: th });
    };
    im.onload = im.onerror = run; im.src = src; if (im.complete) run(); setTimeout(run, 1200);
  }
  /* the slot that shows the project's first picture right now (the scroll may have moved) */
  function slotRect(src) {
    var r = ov.querySelector(".wk-r"), hit = null, any = null, f = fname(src);
    [].forEach.call(r ? r.querySelectorAll(".wk-it") : [], function (n) {
      var b = n.getBoundingClientRect(); if (!(b.width > 20 && b.right > 40 && b.left < innerWidth - 40 && b.bottom > 40 && b.top < innerHeight - 40)) return;
      var im = n.querySelector("img"); if (!any) any = b; if (!hit && im && fname(im.currentSrc || im.src) === f) hit = b;
    });
    return hit || any;
  }
  /* Twist (drawn on the GPU): the gallery itself plays the move */
  function twFlight(card, rect, back, done) {
    var tok = ++flTok, t0 = 0, D = window.__twD || 1700;
    var X = window.__twX = { live: true, hold: !back, sel: card, a: back ? 1 : 0, f: back ? 1 : 0, m: back ? 1 : 0, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w: rect.width, h: rect.height };
    window.__twFreeze = false;
    requestAnimationFrame(function f(now) {
      if (tok !== flTok) return;
      if (!t0) t0 = now;
      var k = Math.min(1, (now - t0) / D), t = back ? 1 - k : k;
      X.a = seg(t, 0, .55); X.f = seg(t, .12, .55); X.m = seg(t, .45, 1);
      if (k < 1) requestAnimationFrame(f); else { requestAnimationFrame(function () { requestAnimationFrame(function () { if (tok === flTok) X.live = false; }); }); done && done(); }
    });
  }
  /* Grid: one moving picture (transform + a clip that follows the card's shape, so nothing is stretched) */
  function flyBox(big, small, src, back, delay, dur, done) {
    var d = el("div"), pic = new Image(); pic.src = src; pic.decoding = "async";
    /* same layer as the project page (below the navbar) for the whole flight, so the navbar is over the picture from the start and nothing changes when it lands */
    d.style.cssText = "position:fixed;z-index:4;left:" + big.left + "px;top:" + big.top + "px;width:" + big.width + "px;height:" + big.height + "px;overflow:hidden;background:#0b0b0b;pointer-events:none;will-change:transform,clip-path;transform-origin:50% 50%;backface-visibility:hidden";
    pic.style.cssText = "width:100%;height:100%;object-fit:cover;display:block"; d.appendChild(pic); document.body.appendChild(d);
    var cx = big.left + big.width / 2, cy = big.top + big.height / 2, sc = Math.max(small.width / big.width, small.height / big.height);
    var from = { transform: "translate3d(" + (small.left + small.width / 2 - cx) + "px," + (small.top + small.height / 2 - cy) + "px,0) scale(" + sc + ")",
                 clipPath: "inset(" + ((big.height - small.height / sc) / 2) + "px " + ((big.width - small.width / sc) / 2) + "px)" },
        to = { transform: "translate3d(0,0,0) scale(1)", clipPath: "inset(0px 0px)" };
    var a = d.animate(back ? [to, from] : [from, to], { duration: dur, delay: delay || 0, easing: "cubic-bezier(.65,0,.35,1)", fill: "both" });
    var fin = 0, end = function () { if (fin) return; fin = 1; done && done(); d.remove(); };
    a.onfinish = end; var tm = setTimeout(end, dur + (delay || 0) + 1500);
    return function () { fin = 1; clearTimeout(tm); try { a.cancel(); } catch (e) {} d.remove(); };
  }
  /* Grid: the cards that were not chosen turn and leave, up or down by where they are (and come back the same way) */
  var gridOut = [];
  function isCard(d) { return d.style && d.style.position === "absolute" && d.style.top === "50%" && d.style.left === "50%" && d.style.zIndex && d.querySelector("img"); }
  function gridAway(card) {
    var H = innerHeight, e = "cubic-bezier(.65,0,.35,1)"; gridOut = [];
    [].forEach.call(document.querySelectorAll("#main div"), function (d) {
      if (d === card || !isCard(d)) return;
      var r = d.getBoundingClientRect(); if (r.width < 20) return;
      var up = (r.top + r.height / 2) < H / 2;
      d.__wkAway = true; d.__jl = null;
      d.style.transition = "translate 1s " + e + ",rotate 1s " + e;
      d.style.translate = "0px " + (up ? -H * 1.15 : H * 1.15).toFixed(0) + "px"; d.style.rotate = (up ? -16 : 16) + "deg"; d.style.scale = ""; gridOut.push(d);
    });
  }
  function gridBack(now) {
    var g = gridOut, e = "cubic-bezier(.65,0,.35,1)"; gridOut = [];
    g.forEach(function (d) { d.style.transition = now ? "none" : "translate 1.1s " + e + ",rotate 1.1s " + e; d.style.translate = ""; d.style.rotate = ""; });
    setTimeout(function () { g.forEach(function (d) { d.style.transition = ""; d.__wkAway = false; }); }, now ? 0 : 1200);
  }
  /* where the chosen card sits in the gallery (measured with the other cards at home) */
  function homeRect(o) {
    if (o.card && o.card.isConnected) { var r0 = o.card.getBoundingClientRect(); if (r0.width > 20) return r0; }
    var saved = gridOut.map(function (d) { var v = [d.style.transition, d.style.translate, d.style.rotate]; d.style.transition = "none"; d.style.translate = ""; d.style.rotate = ""; return v; });
    var best = null, bd = 1e18, cx = o.rect.left + o.rect.width / 2, cy = o.rect.top + o.rect.height / 2;
    [].forEach.call(document.querySelectorAll("#main div"), function (d) {
      if (!isCard(d)) return; var im = d.querySelector("img"); if (fname(d.dataset.src || im.currentSrc || im.src || "") !== fname(o.src)) return;
      var r = d.getBoundingClientRect(); if (r.width < 20) return;
      var dd = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy); if (dd < bd) { bd = dd; best = r; }
    });
    gridOut.forEach(function (d, k) { d.style.translate = saved[k][1]; d.style.rotate = saved[k][2]; void d.offsetWidth; d.style.transition = saved[k][0]; });
    return best;
  }
  /* the gallery stands still from the click until the picture is back home (on a phone the Twist turns by itself, and the card must return to the very spot it left) */
  var pin = null;
  function pinOn() {
    var K = window.__galK && window.__galK.current; if (!K) return;
    var me = pin = { ox: K.ox, oy: K.oy, tx: K.tx, ty: K.ty };
    requestAnimationFrame(function f() { if (pin !== me) return; var k = window.__galK && window.__galK.current; if (k) { k.ox = me.ox; k.oy = me.oy; k.tx = me.tx; k.ty = me.ty; k.vx = k.vy = 0; } requestAnimationFrame(f); });
  }
  /* the liquid part of the text's arrival: one ripple filter over the text column, strong at first and gone after a moment */
  var liq = null, liqTok = 0;
  function liquidIn() {
    var col = ov && ov.querySelector(".wk-l"); if (!col || reduce) return;
    if (!liq) {
      var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg"); svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true"); svg.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
      svg.innerHTML = '<filter id="wk-liq" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.009 0.016" numOctaves="2" seed="5" result="n"/><feOffset in="n" dx="0" dy="0" result="o"/><feDisplacementMap in="SourceGraphic" in2="o" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
      document.body.appendChild(svg); var f = svg.firstChild; liq = { off: f.children[1], map: f.children[2] };
    }
    var tok = ++liqTok, t0 = 0, D = 1700, A = phone() ? 46 : 80;
    col.style.filter = "url(#wk-liq)";
    requestAnimationFrame(function fr(now) {
      if (tok !== liqTok) return; if (!t0) t0 = now;
      var k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
      liq.map.setAttribute("scale", (A * (1 - e)).toFixed(2)); liq.off.setAttribute("dy", (-60 * e).toFixed(1)); liq.off.setAttribute("dx", (24 * Math.sin(k * 3)).toFixed(1));
      if (k < 1) requestAnimationFrame(fr); else col.style.filter = "";
    });
  }
  var rvLand = false, rvLay = false;
  function rvTry() { if (rvLand && rvLay && ov) requestAnimationFrame(function () { requestAnimationFrame(function () { if (ov) ov.classList.remove("rv", "fl"); }); }); }
  /* project -> List: the picture scroll slides away to the right, then the project's name flies back to its line in the list */
  function listBack(gone) {
    var h1 = ov.querySelector(".wk-name"), sp = h1 && h1.querySelector("span"), r = ov.querySelector(".wk-r"), name = sp ? sp.textContent.trim().toLowerCase() : "", dead = false, clone = null, row = null;
    ov.classList.add("lout"); if (window.__lsLock) window.__lsLock(3200); root.classList.add("lr-out");
    inFlight = function () { dead = true; if (clone) clone.remove(); if (row) row.style.visibility = ""; root.classList.remove("lr-in", "lr-out"); };
    if (r) r.animate([{ transform: "translateX(0)" }, { transform: "translateX(106%)" }], { duration: 650, easing: "cubic-bezier(.6,0,.85,.35)", fill: "forwards" });
    setTimeout(function () {
      if (dead || shown) return;
      var best = 1e18, cy = listName ? listName.r.top + listName.r.height / 2 : innerHeight / 2;
      [].forEach.call(document.querySelectorAll("#ls-root .ls-row"), function (n) {
        if (n.textContent.trim().toLowerCase() !== name) return; var b = n.getBoundingClientRect(); if (!b.height || b.bottom < 0 || b.top > innerHeight) return;
        var dd = Math.abs(b.top + b.height / 2 - cy); if (dd < best) { best = dd; row = n; }
      });
      if (!row || !sp) { gone(); return; }
      var sb = sp.getBoundingClientRect(), fs2 = parseFloat(getComputedStyle(h1).fontSize) || 120, rg = document.createRange(); rg.selectNodeContents(row);
      var tr0 = rg.getBoundingClientRect(), tx0 = parseFloat(getComputedStyle(row).translate) || 0, tr = { left: tr0.left - tx0, top: tr0.top, height: tr0.height };
      root.classList.add("lr-in"); root.classList.remove("lr-out");   /* the other names come back in from the sides while the title travels home */
      var k2 = (parseFloat(getComputedStyle(row).fontSize) || 40) / fs2;
      clone = el("div", "", sp.textContent);
      clone.style.cssText = "position:fixed;z-index:4;left:" + sb.left + "px;top:" + sb.top + "px;width:" + (sb.width + 1) + "px;font:400 " + fs2 + 'px/.92 "Anton","Inter Display",Impact,sans-serif;text-transform:uppercase;letter-spacing:0;color:#f2f2f2;overflow-wrap:anywhere;pointer-events:none;transform-origin:0 0;will-change:transform';
      document.body.appendChild(clone); h1.style.visibility = "hidden"; row.style.visibility = "hidden"; ov.classList.add("air");
      var a = clone.animate([{ transform: "translate3d(0,0,0) scale(1)" }, { transform: "translate3d(" + (tr.left - sb.left) + "px," + (tr.top + tr.height / 2 - clone.offsetHeight * k2 / 2 - sb.top) + "px,0) scale(" + k2 + ")" }], { duration: 1150, easing: "cubic-bezier(.65,0,.35,1)", fill: "both" });
      var fin = 0, end = function () { if (fin || dead) return; fin = 1; row.style.visibility = ""; clone.remove(); clone = null; gone(); setTimeout(function () { root.classList.remove("lr-in"); }, 400); };
      a.onfinish = end; setTimeout(end, 1900);
    }, 650);
  }
  function onScreen(r) { return r && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; }
  function show(i) {
    build(); var list = data(); if (i < 0 || i >= list.length) return;
    var was = shown; cur = i; shown = true; closing = 0;
    if (!was) { lastFocus = document.activeElement; window.__wkOpen = true; root.classList.add("wk-open"); window.dispatchEvent(new Event("ab-toggle")); }
    var ff = flyFrom, fs = flySrc, card = flyCard, mode = flyMode; flyFrom = null;
    var flyOk = !was && ff && fs && !reduce && card && ov.animate;
    if (!was) { rvLand = rvLay = false; ov.classList.add("rv"); ov.classList.toggle("fl", !!flyOk); setTimeout(function () { if (ov) ov.classList.remove("rv", "fl"); }, 4000); }
    render(i, false, flyOk);
    if (was) { ov.classList.add("on"); return; }
    ov.classList.remove("sw");
    if (!flyOk) { origin = null; window.__twFreeze = true; ov.classList.remove("air"); ov.classList.add("on"); rvLand = true; rvTry(); liquidIn(); }
    else {
      var o = origin = { rect: ff, src: fs, mode: mode, card: card, tw: mode === "twist" && !!window.__twGLon };
      ov.classList.add("air", "on"); root.classList.add("wk-air"); window.__wkMove = true; pinOn();
      var land = function () {
        inFlight = null; window.__wkMove = false; if (!shown || origin !== o) return;
        ov.classList.remove("air"); airOff(); if (strip) strip.release(); rvLand = true; rvTry(); liquidIn();
        requestAnimationFrame(function () { requestAnimationFrame(function () { if (shown && origin === o) window.__twFreeze = true; }); });
      };
      inFlight = function () { flTok++; };
      target(fs, function (big) {
        if (!shown || origin !== o) return;
        if (!big) { land(); return; }
        if (o.tw) { twFlight(card, big, false, land); inFlight = function () { flTok++; window.__twX = null; }; }
        else if (mode === "list") {
          /* the name goes to its place first, then the picture rises into the scroll, then the text comes */
          /* the other names drift away to the left and the right while the chosen one travels */
          if (window.__lsLock) window.__lsLock(2600);
          if (listRow) listRow.style.visibility = "hidden";
          root.classList.add("lr-hold"); void document.body.offsetWidth; root.classList.add("lr-out"); root.classList.remove("lr-hold");
          setTimeout(function () { root.classList.remove("lr-out"); if (listRow) listRow.style.visibility = ""; }, 1000);
          var h1 = ov.querySelector(".wk-name"), nm = listName, rmName = nameFly(nm, h1, 1150);
          var fin = function () { if (h1 && nm) { h1.classList.add("wk-now"); setTimeout(function () { h1.classList.remove("wk-now"); }, 400); } land(); rmName(); };
          var killL = fs ? flyBox(big, ff, fs, false, 500, 1350, fin) : (setTimeout(fin, 1250), function () {});
          inFlight = function () { killL(); rmName(); };
        }
        else {
          card.classList.add("wk-hide"); if (mode === "grid") gridAway(card);
          var kill = flyBox(big, ff, fs, false, 350, 1250, land);
          inFlight = function () { kill(); card.classList.remove("wk-hide"); gridBack(true); };
        }
      });
    }
    setTimeout(function () { if (shown) ov.focus({ preventScroll: true }); }, 60);
  }
  function hide() {
    if (!shown) return; shown = false; cur = -1;
    var o = origin; origin = null;
    window.__wkOpen = false; root.classList.remove("wk-open");
    var gone = function () {
      inFlight = null; window.__wkMove = false; pin = null; if (shown) return;
      ov.classList.remove("on", "air", "lout"); root.classList.remove("lr-hold", "lr-out"); airOff(); if (strip) { strip.destroy(); strip = null; }
    };
    if (inFlight) { inFlight(); o = null; window.__twX = null; }   /* Back while the picture was still on its way in: everything snaps home */
    var lb = o && o.mode === "list" && !reduce && !!ov.animate;
    if (lb) listBack(gone);
    if (o && o.mode === "list") o = null;
    var slot = o ? slotRect(o.src) : null;
    if (!o || !slot) { if (o && !o.tw) { o.card.classList.remove("wk-hide"); gridBack(true); } window.__twX = null; window.__twFreeze = false; if (!lb) gone(); }
    else {
      ov.classList.add("air"); root.classList.add("wk-air"); window.__wkMove = true;
      if (o.tw && window.__twGLon && o.card.isConnected) {
        twFlight(o.card, slot, true, function () { window.__twX = null; gone(); });
        inFlight = function () { flTok++; window.__twX = null; };
      } else {
        window.__twX = null; window.__twFreeze = false;
        var to = homeRect(o);
        if (!onScreen(to)) { o.card.classList.remove("wk-hide"); gridBack(true); gone(); }
        else {
          if (o.mode === "grid") setTimeout(function () { gridBack(); }, 450);
          var kill = flyBox({ left: slot.left, top: slot.top, width: slot.width, height: slot.height }, to, o.src, true, 0, 1250, function () { o.card.classList.remove("wk-hide"); gone(); });
          inFlight = function () { kill(); o.card.classList.remove("wk-hide"); gridBack(true); };
        }
      }
    }
    window.dispatchEvent(new Event("ab-toggle"));
    if (lastFocus && lastFocus.focus && !(lastFocus.closest && lastFocus.closest('[role="tablist"]'))) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  function hashFor(i) { return "#/work/" + slugs(data())[i]; }
  function step(d) {
    var list = data(); if (!shown || !list.length) return;
    var n = (cur + d + list.length) % list.length;
    ov.classList.add("sw");
    setTimeout(function () { history.replaceState(null, "", location.pathname + location.search + hashFor(n)); ov.classList.remove("sw"); show(n); }, 190);
  }
  function close() {
    if (!shown) return;
    if (ownPush) { ownPush = false; history.back(); }
    else { history.replaceState(null, "", location.pathname + location.search); hide(); }
  }
  /* address -> page */
  function route() {
    var m = /^#\/work\/([^\/?#]+)/.exec(location.hash);
    if (!m) { hide(); return; }
    if (!live()) return;
    var i = slugs(data()).indexOf(decodeURIComponent(m[1]));
    if (i >= 0) show(i); else { hide(); history.replaceState(null, "", location.pathname + location.search); }
  }
  /* page -> address */
  var flyFrom = null, flySrc = "";
  function go(it) {
    var list = data(), i = list.findIndex(function (x) { return x.name === it.name && ((x.image && x.image.src) || "") === ((it.image && it.image.src) || ""); });
    if (i < 0) i = list.findIndex(function (x) { return x.name === it.name; }); if (i < 0) return;
    listFrom(list[i]);
    ownPush = true; location.hash = hashFor(i);
  }
  window.__wkGo = go;
  /* List: remember where the clicked name and the picture are, before the list goes away */
  var lastP = [innerWidth / 2, innerHeight / 2], listName = null, listRow = null;
  addEventListener("pointerdown", function (e) { lastP = [e.clientX, e.clientY]; }, true);
  function listFrom(it) {
    listName = null; listRow = null;
    var lr = document.getElementById("ls-root"); if (!lr || getComputedStyle(lr).visibility === "hidden" || flyFrom) return;
    var pic = null; ["ls-pv", "ls-mpv"].forEach(function (id) { var n = document.getElementById(id); if (!n || pic) return; var r = n.getBoundingClientRect(); if (r.width > 40 && r.height > 40 && +getComputedStyle(n).opacity > .2 && r.bottom > 0 && r.top < innerHeight) pic = { el: n, r: r }; });
    var row = null, bd = 1e18, nm = String(it.name).trim().toLowerCase();
    [].forEach.call(lr.querySelectorAll(".ls-row"), function (n) {
      if (n.textContent.trim().toLowerCase() !== nm) return; var r = n.getBoundingClientRect(); if (!r.height || r.bottom < 0 || r.top > innerHeight) return;
      var dd = Math.abs(r.top + r.height / 2 - lastP[1]); if (dd < bd) { bd = dd; row = n; }
    });
    listRow = row;
    if (row) { var rg = document.createRange(); rg.selectNodeContents(row); var tr = rg.getBoundingClientRect(); listName = { text: row.textContent.trim(), r: tr, fs: parseFloat(getComputedStyle(row).fontSize) || 40 }; }
    if (pic && it.image && it.image.src) { flyFrom = pic.r; flyCard = pic.el; flyMode = "list"; flySrc = sm(it.image.src); }
    else if (row) { var c = listName.r; flyFrom = { left: c.left + c.width / 2 - 2, top: c.top + c.height / 2 - 1.5, width: 4, height: 3 }; flyCard = row; flyMode = "list"; flySrc = sm((it.image && it.image.src) || ""); }
  }
  /* List: the clicked name travels to where the project's name stands */
  function nameFly(nm, h1, dur) {
    var sp = h1.querySelector("span"); if (!sp || !nm) return function () {};
    var rg = document.createRange(); rg.selectNodeContents(sp); var rs = rg.getClientRects(), t = rs[0]; if (!t) return function () {};
    var fs2 = parseFloat(getComputedStyle(h1).fontSize) || 120, k = fs2 / nm.fs, tops = {}, c = el("div", "", nm.text);
    [].forEach.call(rs, function (r) { tops[Math.round(r.top)] = 1; });
    var base = "position:fixed;z-index:4;font-family:\"Anton\",\"Inter Display\",Impact,sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:0;color:#f2f2f2;pointer-events:none;will-change:transform;";
    if (Object.keys(tops).length > 1) {
      /* a name that takes two lines on the project page first breaks into those lines where it stands, and only then travels */
      var sb = sp.getBoundingClientRect();
      c.style.cssText = base + "left:" + nm.r.left + "px;top:0;width:" + (sb.width / k + 1) + "px;font-size:" + nm.fs + "px;line-height:.92;white-space:normal;overflow-wrap:anywhere;transform-origin:0 0";
      document.body.appendChild(c);
      var top = nm.r.top + nm.r.height / 2 - c.offsetHeight / 2; c.style.top = top + "px";
      c.animate([{ transform: "translate3d(0,0,0) scale(1)" }, { transform: "translate3d(" + (sb.left - nm.r.left) + "px," + (sb.top - top) + "px,0) scale(" + k + ")" }], { duration: dur, delay: 320, easing: "cubic-bezier(.65,0,.35,1)", fill: "both" });
    } else {
      c.style.cssText = base + "left:" + nm.r.left + "px;top:" + nm.r.top + "px;height:" + nm.r.height + "px;font-size:" + nm.fs + "px;line-height:" + nm.r.height + "px;white-space:nowrap;transform-origin:0 50%";
      document.body.appendChild(c);
      c.animate([{ transform: "translate3d(0,0,0) scale(1)" }, { transform: "translate3d(" + (t.left - nm.r.left) + "px," + (t.top + t.height / 2 - (nm.r.top + nm.r.height / 2)) + "px,0) scale(" + k + ")" }], { duration: dur, easing: "cubic-bezier(.65,0,.35,1)", fill: "both" });
    }
    return function () { c.remove(); };
  }

  /* a click on a card in Twister or Grid opens the page (a drag does not); in Grid the highlighted (lifted) project opens */
  function cardOf(t) {
    for (var n = t; n && n !== document.body; n = n.parentElement) {
      if (n.tagName === "DIV" && n.style && n.style.position === "absolute" && n.style.top === "50%" && n.style.left === "50%" && n.style.zIndex && n.closest("#main")) return n;
    }
    return null;
  }
  document.addEventListener("click", function (e) {
    if (shown || !e.target || !e.target.closest) return;
    if (e.target.closest("#ls-root,[role='tablist'],nav,#wk")) return;
    var c = cardOf(e.target);
    if (!c) {   /* any card under the pointer, by its box (Grid / Twister layers can sit above the card) */
      var hit = null, hz = -1; [].forEach.call(document.querySelectorAll("#main div"), function (d) {
        if (!(d.style && d.style.position === "absolute" && d.style.top === "50%" && d.style.left === "50%" && d.style.zIndex && d.querySelector("img"))) return;
        var r = d.getBoundingClientRect(), z = parseFloat(d.style.zIndex) || 0;
        if (r.width > 20 && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom && z >= hz) { hit = d; hz = z; } });
      c = hit;
    }
    if (!c) {   /* Grid: the card lifted to the centre is drawn by the gallery above the others, so the click lands on its layer, not on the card box */
      var all = document.querySelectorAll("#main div");
      for (var k = 0; k < all.length && !c; k++) { var d = all[k], z = d.style && parseFloat(d.style.zIndex);
        if (z >= 8000 && z < 10000 && d.style.position === "absolute" && d.style.top === "50%" && d.querySelector("img")) c = d; }   /* the highlighted project opens, wherever on the grid the click is */
    }
    if (!c) return;
    var g = window.__galK && window.__galK.current; if (g && g.moved > 6) { e.preventDefault(); return; }
    var im = c.querySelector("img"), f = fname(c.dataset.src || (im && (im.currentSrc || im.src)) || ""), list = data(), it = null;
    for (var i = 0; i < list.length; i++) if (list[i].image && fname(list[i].image.src) === f) { it = list[i]; break; }
    if (!it) return;
    flyFrom = c.getBoundingClientRect(); flyCard = c; flyMode = window.__twGLon ? "twist" : "grid"; flySrc = (im && (im.currentSrc || im.src)) || c.dataset.src || "";
    e.preventDefault(); e.stopPropagation(); go(it);
  }, true);

  function start() {
    addEventListener("hashchange", route);
    addEventListener("intro-done", function () { if (!shown) route(); });   /* a project address opened directly: show it the moment the loader leaves */
    /* the site's own router must not see our Back / Forward steps: it re-renders the gallery on them, which reshuffles the Grid under the returning picture */
    addEventListener("popstate", function (e) { if (shown || /^#\/work\//.test(location.hash)) e.stopImmediatePropagation(); route(); }, true);
    addEventListener("cms-change", function () { if (shown) { var list = data(); if (cur >= list.length) hide(); else render(cur); } });
    /* a shared address opens its page as soon as the loader is gone */
    var t = setInterval(function () { if (live() && window.__cmsItems) { clearInterval(t); route(); } }, 250);
    setTimeout(function () { clearInterval(t); }, 30000);
  }
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
})();
