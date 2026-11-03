/* The About card: a sheet of paper that rises from the bottom centre, can be dragged anywhere, and sinks back on close.
   While it moves, the live page is swapped for a copy cut into horizontal strips that are hinged to each other, so the sheet
   really bends: it curls against its motion, a ripple runs down it, and it settles flat again. At rest the live page is shown.
   Press Shift+G (or add #grid to the address) to show the page grid. */
(function () {
  if (window.__aboutCard) return;
  window.__aboutCard = 1;
  var root = document.documentElement, reduce = matchMedia("(prefers-reduced-motion: reduce)");
  var sheet, card, frame, grip, nameEl, nameTxt, backdrop, bend, shadow, strips = [], sharedSheet = null, dirty = true, bending = false;
  var raf = 0, last = 0, drag = null, open_ = false, W = 0, H = 0, GRIP = 56, N = 24;
  var S = { x: 0, y: 0, r: 0, s: 1, rx: 0, ry: 0 }, V = { x: 0, y: 0, r: 0, s: 0, rx: 0, ry: 0 }, T = { x: 0, y: 0, r: 0, s: 1, rx: 0, ry: 0 };
  var hx = [], hy = [], dts = [], slow = false;
  var PROPS = ["x", "y", "r", "s", "rx", "ry"];
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mk(tag, cls, css) { var n = document.createElement(tag); if (cls) n.className = cls; if (css) n.style.cssText = css; return n; }

  var css = mk("style");
  css.textContent =
    '#about-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .9s cubic-bezier(.4,0,.2,1)}' +
    '.about-open #about-backdrop{opacity:1;pointer-events:auto}' +
    '#about-sheet{position:fixed;left:0;top:0;z-index:2147483001;visibility:hidden;pointer-events:none;transform-style:preserve-3d;will-change:transform}' +
    '.ab-shadow{position:absolute;inset:0;border-radius:2px;box-shadow:0 2px 6px rgba(0,0,0,.35),0 40px 90px rgba(0,0,0,.55)}' +
    '.ab-card,.ab-page{position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;border-radius:2px;background:#ff2d20;color:#0b0b0b}' +
    '.ab-card{pointer-events:auto;touch-action:none}' +
    '.ab-grip{flex:none;display:flex;align-items:center;height:56px;padding:0 16px;cursor:grab;user-select:none;-webkit-user-select:none}' +
    '.ab-card.dragging,.ab-card.dragging .ab-grip{cursor:grabbing}' +
    '.ab-card iframe{flex:1;min-height:0;width:100%;border:0;display:block;background:transparent}' +
    '.ab-card.dragging iframe{pointer-events:none}' +
    '.ab-close{padding:4px 0;border:0;background:none;color:#0b0b0b;font:400 16px/1.2 "Anton","Inter Display",sans-serif;text-transform:uppercase;letter-spacing:0;cursor:pointer}' +
    '.ab-name{flex:none;padding:8px 16px 16px;overflow:hidden;white-space:nowrap;font:400 100px/.82 "Anton",Impact,sans-serif;text-transform:uppercase;letter-spacing:0;user-select:none;-webkit-user-select:none}' +
    '.ab-bend{position:absolute;left:0;top:0;transform-style:preserve-3d;pointer-events:none;opacity:.01}' +
    '.ab-strip{position:absolute;left:0;transform-origin:50% 0;transform-style:preserve-3d;will-change:transform}' +
    '.ab-clip{position:absolute;left:0;top:0;overflow:hidden;backface-visibility:visible}' +
    '@media (prefers-reduced-motion:reduce){#about-backdrop{transition:none!important}}' +
    '#grid-overlay{position:fixed;inset:0;z-index:2147483640;pointer-events:none;display:none;margin:0 32px;grid-template-columns:repeat(12,1fr);gap:16px}' +
    '#grid-overlay i{background:rgba(255,45,32,.12);outline:1px solid rgba(255,45,32,.35)}' +
    '@media (max-width:1439.98px){#grid-overlay{margin:0 24px;grid-template-columns:repeat(8,1fr)}#grid-overlay i:nth-child(n+9){display:none}}' +
    '@media (max-width:809.98px){#grid-overlay{margin:0 16px}}' +
    'html.show-grid #grid-overlay{display:grid}';
  document.head.appendChild(css);

  /* card size = whole columns of the page grid (12 cols / 32px margin desktop, 8 / 24px tablet, 8 / 16px phone, 16px gutters) */
  function dims() {
    var vw = innerWidth, vh = innerHeight, m = vw >= 1440 ? 32 : vw >= 810 ? 24 : 16, cols = vw >= 1440 ? 12 : 8,
        col = (vw - 2 * m - (cols - 1) * 16) / cols, span = vw >= 1440 ? 5 : vw >= 810 ? (vw >= 1100 ? 4 : 5) : cols;
    W = span * col + (span - 1) * 16; H = vw < 810 ? vh - 2 * m : Math.min(vh - 2 * m, W * 1.4);
  }
  function hiddenPose() { return { x: 0, y: innerHeight / 2 + H / 2 + 70, r: -3, s: .9, rx: 42, ry: 0 }; }
  function clampT() {
    var cx = (innerWidth - W) / 2, cy = (innerHeight - H) / 2;
    T.x = clamp(T.x, -(W - 110) - cx, innerWidth - 110 - cx); T.y = clamp(T.y, -cy, innerHeight - 60 - cy);
  }
  function paint() {
    sheet.style.transform = "perspective(1500px) translate3d(" + ((innerWidth - W) / 2 + S.x).toFixed(2) + "px," + ((innerHeight - H) / 2 + S.y).toFixed(2) +
      "px,0) rotateX(" + S.rx.toFixed(2) + "deg) rotateY(" + S.ry.toFixed(2) + "deg) rotate(" + S.r.toFixed(3) + "deg) scale(" + S.s.toFixed(4) + ")";
  }

  /* ---------- the bendable copy ---------- */
  /* the live page's style rules, re-scoped so they can live in a shadow root: html/body become the host/wrapper, media
     queries are decided by the page's own viewport, and @font-face stays in the main document */
  function collectCSS(win) {
    var out = [];
    (function walk(rules) {
      [].forEach.call(rules, function (r) {
        if (r.type === 5 || r.type === 3) return;
        if (r.type === 4) { if (win.matchMedia(r.conditionText || r.media.mediaText).matches) walk(r.cssRules); return; }
        out.push(r.cssText);
      });
    })([].concat.apply([], [].map.call(win.document.styleSheets, function (s) { try { return [].slice.call(s.cssRules); } catch (e) { return []; } })));
    return vu(out.join("\n"), win).replace(/(^|[}\s,>])(html|body|:root)(?=[\s,{.:>\[])/g, function (m, a, b) { return a + (b === "body" ? ".sb" : ":host"); });
  }
  /* vh / vw inside the copy would measure the main window, not the page's own viewport, so they become pixels */
  function vu(str, win) {
    return str.replace(/(-?\d*\.?\d+)(vh|vw|dvh|svh|lvh)\b/g, function (m, n, u) { return (parseFloat(n) * (u === "vw" ? win.innerWidth : win.innerHeight) / 100).toFixed(2) + "px"; });
  }
  /* copy of the page with the nodes that are hidden in this layout already removed (they depend on the page's own viewport) */
  function template(win) {
    var live = win.document.getElementById("main"); if (!live) return null;
    var copy = live.cloneNode(true), a = [live], b = [copy];
    while (a.length) {
      var l = a.pop(), c = b.pop();
      for (var i = l.children.length - 1; i >= 0; i--) {
        var cs = win.getComputedStyle(l.children[i]), cc = c.children[i];
        if (cs.display === "none") { c.removeChild(cc); continue; }
        /* entrance animations run on the live page without touching its inline style: copy their current result */
        if (cc.style) {
          if (cs.opacity !== (cc.style.opacity || "1")) cc.style.opacity = cs.opacity;
          if (cs.transform !== "none" && cs.transform !== (cc.style.transform || "none")) cc.style.transform = cs.transform;
          if (cs.filter === "none" && cc.style.filter) cc.style.filter = "";
        }
        a.push(l.children[i]); b.push(cc);
      }
    }
    [].forEach.call(copy.querySelectorAll("script,nav"), function (n) { n.remove(); });
    [].forEach.call(copy.querySelectorAll('[style*="vh"],[style*="vw"]'), function (n) { n.setAttribute("style", vu(n.getAttribute("style"), win)); });
    [].forEach.call(copy.querySelectorAll("[id]"), function (n) { n.removeAttribute("id"); });
    copy.removeAttribute("id");
    return copy;
  }
  function makePage(tpl, k, avail, off) {
    var page = mk("div", "ab-page", "pointer-events:none;top:" + (-off) + "px;bottom:auto;height:" + H + "px");
    var g = grip.cloneNode(true); g.removeAttribute("id"); [].forEach.call(g.querySelectorAll("[id]"), function (n) { n.removeAttribute("id"); });
    g.style.cssText = "position:absolute;left:0;top:0;width:100%;box-sizing:border-box";
    var host = mk("div", "", "position:absolute;left:0;top:" + GRIP + "px;width:" + (k < 1 ? 390 : W) + "px;height:" + (k < 1 ? avail / k : avail) + "px;overflow:hidden;transform:scale(" + k + ");transform-origin:0 0");
    var sr = host.attachShadow({ mode: "open" }); sr.adoptedStyleSheets = [sharedSheet];
    var wrap = mk("div", "sb", "width:100%;height:100%;overflow:hidden;background:#ff2d20;position:relative");
    wrap.appendChild(tpl.cloneNode(true)); sr.appendChild(wrap);
    var n = nameEl.cloneNode(true); n.style.cssText = "position:absolute;left:0;bottom:0;width:100%;box-sizing:border-box";
    page.append(g, host, n);
    return page;
  }
  /* a cheap fingerprint of what the live page shows; when it changes (content appears, text is edited) the copy is rebuilt */
  var builtSig = "";
  function sig(win) {
    var d = win.document, m = d.getElementById("main"); if (!m) return "";
    return m.getElementsByTagName("*").length + ":" + (m.innerText || "").length + ":" + d.querySelectorAll('[style*="opacity: 0;"],[style*="opacity:0"]').length + ":" + d.querySelectorAll(".ab-type").length;
  }
  var watchTimer = 0;
  function watchFrame() {
    var win; try { win = frame.contentWindow; if (!win.document.body) return; } catch (e) { return; }
    new MutationObserver(function (list) {
      if (list.every(function (m) { return m.target.nodeType === 1 && m.target.classList && m.target.classList.contains("ascii-live"); })) return;
      clearTimeout(watchTimer);
      watchTimer = setTimeout(function () { var w; try { w = frame.contentWindow; } catch (e) { return; } if (sig(w) !== builtSig) { dirty = true; scheduleBuild(300); } }, 600);
    }).observe(win.document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["style", "class"] });
  }
  function buildStrips() {
    dirty = false; strips = []; bend.textContent = "";
    var win; try { win = frame.contentWindow; } catch (e) { return; }
    if (!win || !win.document || !win.document.getElementById("main")) { dirty = true; return; }
    builtSig = sig(win);
    var tpl = template(win); if (!tpl) { dirty = true; return; }
    try { sharedSheet = new CSSStyleSheet(); sharedSheet.replaceSync(collectCSS(win)); } catch (e) { return; }
    var k = Math.min(1, W / 390), avail = H - GRIP - nameEl.offsetHeight, h = Math.max(20, Math.round(H / N)), n = Math.ceil(H / h), parent = bend; /* whole-pixel strips: composited layers snap to the pixel grid */
    bend.style.width = W + "px"; bend.style.height = H + "px";
    for (var i = 0; i < n; i++) {
      var sh = i === n - 1 ? H - i * h : h, s = mk("div", "ab-strip", "top:" + (i ? h : 0) + "px;width:" + W + "px;height:" + sh + "px");
      var clip = mk("div", "ab-clip", "width:" + W + "px;height:" + (i === n - 1 ? sh : sh + 2) + "px;background:#ff2d20");
      clip.appendChild(makePage(tpl, k, avail, i * h));
      s.appendChild(clip); parent.appendChild(s); parent = s;
      strips.push({ s: s, a: 0, g: 0 });
    }
  }
  /* the copy is rebuilt while the card is idle, never in the middle of a motion */
  var buildTimer = 0, lw = 0, lh = 0;
  function scheduleBuild(delay) {
    clearTimeout(buildTimer);
    buildTimer = setTimeout(function () { if (raf || bending) return scheduleBuild(600); if (dirty) buildStrips(); }, delay || 350);
  }
  function strip() {
    if (dirty) { scheduleBuild(200); return false; }
    return strips.length > 0;
  }
  function syncScroll() {
    var st = 0; try { st = frame.contentWindow.scrollY || 0; } catch (e) {}
    [].forEach.call(bend.querySelectorAll(".sb"), function (w) { w.firstChild.style.transform = st ? "translateY(" + -st + "px)" : ""; });
  }
  function setBending(on) {
    if (on === bending) return;
    if (on) { if (!strip()) return; syncScroll(); }
    bending = on;
    bend.style.opacity = on ? "1" : ""; card.style.opacity = on ? "0" : "";
    if (!on) for (var i = 0; i < strips.length; i++) { strips[i].a = strips[i].g = 0; strips[i].s.style.transform = ""; }
  }
  /* every strip replays the motion of the one above it a little later, so the bend travels down the sheet like a wave */
  function bendFrame(now, amp) {
    var n = hx.length, wave = Math.min(1.1, Math.hypot(V.x, V.y) * .0006) * amp;
    for (var i = 0; i < strips.length; i++) {
      var j = n - 1 - Math.min(n - 1, Math.round(i * .9)), vy = hy[j], vx = hx[j],
          a = clamp(-vy * .00105, -2.1, 2.1) * amp + wave * Math.sin(now * .011 - i * .32), g = clamp(vx * .00085, -1.7, 1.7) * amp;
      var st = strips[i]; st.a += (a - st.a) * .35; st.g += (g - st.g) * .35;
      st.s.style.transform = "rotateX(" + st.a.toFixed(2) + "deg) rotateZ(" + st.g.toFixed(2) + "deg)";
    }
  }
  function ampNow() { var c = window.__liquidCfg; return (c && c.pliq != null ? +c.pliq : 60) / 60; }

  /* ---------- motion ---------- */
  function step(now) {
    var raw = (now - last) / 1000 || .016, dt = Math.min(.033, raw); last = now; var calm = true;
    PROPS.forEach(function (k) {
      var tilt = k === "rx" || k === "ry", K = k === "r" ? 90 : k === "s" ? 120 : tilt ? 55 : open_ ? 62 : 70, D = 2 * Math.sqrt(K) * (k === "r" ? .8 : tilt ? .5 : .92);
      if (drag && (k === "x" || k === "y")) return;
      V[k] += ((T[k] - S[k]) * K - V[k] * D) * dt; S[k] += V[k] * dt;
      var tiny = k === "x" || k === "y" ? .4 : .02;
      if (Math.abs(T[k] - S[k]) > tiny || Math.abs(V[k]) > tiny * 1.5) calm = false;
    });
    if (drag) { V.x *= .88; V.y *= .88; }
    if (open_) { T.rx = clamp(-V.y * .009, -12, 12); T.ry = clamp(V.x * .009, -12, 12); T.r = clamp(V.x * .004, -5, 5); T.s = drag ? 1.012 : 1; }
    var lx = hx.length ? hx[hx.length - 1] : 0, ly = hy.length ? hy[hy.length - 1] : 0; hx.push(lx + (V.x - lx) * .3); hy.push(ly + (V.y - ly) * .3); if (hx.length > 40) { hx.shift(); hy.shift(); }
    var energy = 0; for (var i = 0; i < hx.length; i++) energy = Math.max(energy, Math.abs(hx[i]), Math.abs(hy[i]));
    /* on a device that cannot keep up the bend is switched off, so the card still moves smoothly (tilt only) */
    if ((!calm || drag) && !slow) { dts.push(raw); if (dts.length >= 45) { var med = dts.slice().sort(function (a, b) { return a - b; })[22]; if (med > .036) slow = true; dts = []; } }
    var amp = slow ? 0 : ampNow(), moving = !calm || drag || energy > 8;
    if (moving && amp > 0 && !reduce.matches) { if (!bending) setBending(true); if (bending) bendFrame(now, amp); }
    else if (bending) setBending(false);
    paint();
    if (moving) raf = requestAnimationFrame(step);
    else {
      raf = 0;
      if (!open_) sheet.style.visibility = "hidden";
      else { S.x = T.x; S.y = T.y; S.r = 0; S.s = 1; S.rx = 0; S.ry = 0; paint(); }
    }
  }
  function run() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } }

  /* the name at the bottom is scaled so it exactly fills the card width */
  function fitName() {
    var cs = getComputedStyle(nameEl), inner = nameEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    nameTxt.style.fontSize = "100px"; var w = nameTxt.offsetWidth;
    if (w > 0) nameTxt.style.fontSize = Math.floor(100 * inner / w * 100) / 100 + "px";
  }
  /* the About phone layout is designed for 390px, so it is scaled down on narrower cards */
  function layout() {
    if (!sheet) return; dims();
    if (W !== lw || H !== lh) { lw = W; lh = H; dirty = true; scheduleBuild(); }
    sheet.style.width = W + "px"; sheet.style.height = H + "px";
    fitName();
    var k = Math.min(1, W / 390), avail = H - GRIP - nameEl.offsetHeight;
    frame.style.cssText = k < 1 ? "flex:none;width:390px;height:" + avail / k + "px;margin-bottom:" + (avail - avail / k) + "px;transform:scale(" + k + ");transform-origin:0 0" : "";
  }
  function cardName() { try { var d = JSON.parse(localStorage.getItem("site-cms-v1") || "null"); return (d && d.site && d.site.cardName) || "Adam Himawan"; } catch (e) { return "Adam Himawan"; } }
  function build() {
    if (sheet) return;
    backdrop = mk("div"); backdrop.id = "about-backdrop"; backdrop.onclick = close;
    sheet = mk("div"); sheet.id = "about-sheet";
    shadow = mk("div", "ab-shadow");
    card = mk("aside", "ab-card"); card.setAttribute("aria-label", "About"); card.setAttribute("role", "dialog");
    grip = mk("div", "ab-grip"); grip.title = "Drag to move";
    var btn = mk("button", "ab-close"); btn.id = "about-close"; btn.type = "button"; btn.textContent = "Close"; btn.onclick = close; grip.appendChild(btn);
    frame = mk("iframe"); frame.title = "About"; frame.src = "about.html";
    nameEl = mk("div", "ab-name"); nameEl.setAttribute("aria-hidden", "true");
    nameTxt = mk("span", "", "display:inline-block"); nameTxt.textContent = cardName(); nameEl.appendChild(nameTxt);
    card.append(grip, frame, nameEl);
    bend = mk("div", "ab-bend"); bend.setAttribute("aria-hidden", "true");
    sheet.append(shadow, bend, card); document.body.append(backdrop, sheet);
    layout(); S = hiddenPose(); paint();
    if (document.fonts) { document.fonts.load("100px Anton").then(layout, function () {}); document.fonts.ready.then(layout); }
    frame.addEventListener("load", function () { dirty = true; watchFrame(); scheduleBuild(1600); });
    addEventListener("resize", function () { layout(); clampT(); if (open_) run(); else { S = hiddenPose(); T = hiddenPose(); paint(); } });
    addEventListener("storage", function (e) { if (e.key === "site-cms-v1") { nameTxt.textContent = cardName(); layout(); dirty = true; scheduleBuild(500); } });
    grip.addEventListener("pointerdown", function (e) { if (e.button || e.target.closest("button")) return; e.preventDefault(); grip.setPointerCapture(e.pointerId); begin(e.clientX, e.clientY); });
    grip.addEventListener("pointermove", function (e) { if (drag) move(e.clientX, e.clientY); });
    grip.addEventListener("pointerup", end); grip.addEventListener("pointercancel", end);
  }

  /* dragging: from the title strip, or from anywhere on the page inside the card (it reports screen coordinates) */
  function begin(px, py) { drag = { px: px, py: py, x0: S.x, y0: S.y, t: performance.now(), vx: 0, vy: 0 }; card.classList.add("dragging"); V.x = V.y = 0; run(); }
  function move(px, py) {
    if (!drag) return; var now = performance.now(), dt = Math.max(8, now - drag.t), nx = drag.x0 + px - drag.px, ny = drag.y0 + py - drag.py;
    drag.vx = drag.vx * .6 + ((nx - S.x) / dt * 1000) * .4; drag.vy = drag.vy * .6 + ((ny - S.y) / dt * 1000) * .4;
    S.x = nx; S.y = ny; V.x = drag.vx; V.y = drag.vy; drag.t = now;
  }
  function end() {
    if (!drag) return; var v = drag; drag = null; card.classList.remove("dragging");
    T.x = S.x + v.vx * .2; T.y = S.y + v.vy * .2; clampT(); run();
  }
  function open() {
    build(); layout();
    if (open_) return; open_ = true;
    sheet.style.visibility = "visible";
    var h = hiddenPose(); S.x = h.x; S.y = h.y; S.r = h.r; S.s = h.s; S.rx = h.rx; S.ry = 0;
    V.x = V.y = V.r = V.s = V.rx = V.ry = 0; T = { x: 0, y: 0, r: 0, s: 1, rx: 0, ry: 0 }; hx = []; hy = [];
    if (reduce.matches) { S.x = 0; S.y = 0; S.r = 0; S.s = 1; S.rx = 0; }
    paint(); root.classList.add("about-open"); run();
  }
  function close() {
    if (!open_) return; open_ = false; drag = null; card.classList.remove("dragging");
    root.classList.remove("about-open");
    T = hiddenPose(); V.r = 0;
    if (reduce.matches) { S = hiddenPose(); paint(); sheet.style.visibility = "hidden"; return; }
    run();
  }
  addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
    if (e.shiftKey && (e.key === "G" || e.key === "g") && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) root.classList.toggle("show-grid");
  });
  addEventListener("message", function (e) {
    var d = e.data; if (d === "about-panel:close") return close();
    if (!d || d.about !== "drag" || !card || e.source !== frame.contentWindow) return;
    if (d.phase === "start") begin(d.sx, d.sy); else if (d.phase === "move") move(d.sx, d.sy); else end();
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (/^(\.?\/)?about(\.html)?\/?$/.test(a.getAttribute("href"))) { e.preventDefault(); e.stopImmediatePropagation(); open(); }
  }, true);
  var go = mk("div"); go.id = "grid-overlay"; for (var i = 0; i < 12; i++) go.appendChild(document.createElement("i"));
  function ready() { document.body.appendChild(go); if (/grid/.test(location.hash)) root.classList.add("show-grid"); setTimeout(build, 1200); }
  if (document.readyState === "complete") ready(); else addEventListener("load", ready);
})();
