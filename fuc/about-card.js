/* The About card: a sheet of paper that rises from the bottom centre, can be dragged anywhere, and sinks back on close.
   The live page is always the one shown; the card sways and settles on springs while it moves.
   Press Shift+G (or add #grid to the address) to show the page grid. */
(function () {
  if (window.__aboutCard) return;
  window.__aboutCard = 1;
  var root = document.documentElement, reduce = matchMedia("(prefers-reduced-motion: reduce)");
  var touchy = matchMedia("(pointer: coarse)").matches || (navigator.maxTouchPoints > 0 && Math.min(innerWidth, innerHeight) < 820);
  var sheet, card, frame, nameEl, nameTxt, backdrop, shadow;
  var FK = 1, FW = 0, raf = 0, last = 0, drag = null, open_ = false, W = 0, H = 0, GRIP = 56;
  var S = { x: 0, y: 0, r: 0, s: 1, rx: 0, ry: 0 }, V = { x: 0, y: 0, r: 0, s: 0, rx: 0, ry: 0 }, T = { x: 0, y: 0, r: 0, s: 1, rx: 0, ry: 0 };
  var hx = [], hy = [], glide = false, sv = { x: 0, y: 0 };
  var PROPS = ["x", "y", "r", "s", "rx", "ry"];
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mk(tag, cls, css) { var n = document.createElement(tag); if (cls) n.className = cls; if (css) n.style.cssText = css; return n; }

  var css = mk("style");
  css.textContent =
    '#about-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .9s cubic-bezier(.4,0,.2,1)}' +
    '.about-open #about-backdrop{opacity:1;pointer-events:auto}' +
    '#about-sheet{position:fixed;left:0;top:0;transform-origin:50% 0;z-index:2147483001;visibility:hidden;pointer-events:none;transform-style:preserve-3d;will-change:transform}' +
    '.ab-shadow{position:absolute;inset:0;border-radius:2px;box-shadow:0 2px 6px rgba(0,0,0,.35),0 40px 90px rgba(0,0,0,.55)}' +
    '.ab-card,.ab-page{position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;border-radius:2px;background:#ff2d20;color:#0b0b0b}' +
    '.ab-card{pointer-events:auto;touch-action:none}' +
    '.ab-grip{flex:none;display:flex;align-items:center;justify-content:space-between;height:56px;padding:0 16px;cursor:grab;user-select:none;-webkit-user-select:none}' +
    '.ab-card.dragging,.ab-card.dragging .ab-grip{cursor:grabbing}' +
    '.ab-card iframe{flex:1;min-height:0;width:100%;border:0;display:block;background:transparent}' +
    '.ab-card.grip-drag iframe{pointer-events:none}' +
    '.ab-copy{font:400 16px/1.2 "Anton","Inter Display",sans-serif;text-transform:uppercase;letter-spacing:0;white-space:nowrap}' +
    '.ab-close{padding:4px 0;border:0;background:none;color:#0b0b0b;font:400 16px/1.2 "Anton","Inter Display",sans-serif;text-transform:uppercase;letter-spacing:0;cursor:pointer}' +
    '.ab-name{flex:none;padding:8px 16px 16px;overflow:hidden;white-space:nowrap;font:400 100px/.82 "Anton",Impact,sans-serif;text-transform:uppercase;letter-spacing:0;user-select:none;-webkit-user-select:none}' +
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
    var x = ((innerWidth - W) / 2 + S.x).toFixed(2), y = ((innerHeight - H) / 2 + S.y).toFixed(2);
    /* at rest the card is a plain 2D layer: links and taps inside the page (an iframe) are hit-tested reliably on every phone, which they are not under 3D transforms */
    var flat = Math.abs(S.rx) < .01 && Math.abs(S.ry) < .01 && Math.abs(S.r) < .01 && Math.abs(S.s - 1) < .0005;
    sheet.style.transformStyle = flat ? "flat" : "";
    sheet.style.transform = flat ? "translate(" + x + "px," + y + "px)" :
      "perspective(1500px) translate3d(" + x + "px," + y + "px,0) rotateX(" + S.rx.toFixed(2) + "deg) rotateY(" + S.ry.toFixed(2) + "deg) rotate(" + S.r.toFixed(3) + "deg) scale(" + S.s.toFixed(4) + ")";
  }

  /* the page is re-fitted to the card while it is idle, never in the middle of a motion */
  var fitTimer = 0, lw = 0, lh = 0, contentVer = 0; /* contentVer bumps only when the page itself is (re)loaded or edited, never because of the fit (a scaled page may switch layout variant, which would re-trigger the fit and flicker) */
  function scheduleFit(delay) {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(function () { if (raf) return scheduleFit(600); frameFit(); }, delay || 350);
  }
  /* the portrait's wobble loop inside the page is paused whenever the card is hidden or moving */
  var paused = null;
  function pauseFrame(v) { if (v === paused) return; paused = v; try { frame.contentWindow.__abPaused = v; } catch (e) {} }
  /* ---------- motion ---------- */
  function step(now) {
    var raw = (now - last) / 1000 || .016, dt = Math.min(.033, raw); last = now; var calm = true;
    /* velocity as the sway sees it: smoothed in time, so jittery pointer events never make the sheet shake */
    var fs = 1 - Math.exp(-dt * 9); sv.x += (V.x - sv.x) * fs; sv.y += (V.y - sv.y) * fs;
    if (drag && now - drag.t > 40) { var dk = Math.exp(-dt * 18); V.x *= dk; V.y *= dk; }
    if (glide) {
      /* after a throw the sheet coasts and slows down with friction; it never bounces or springs back */
      var fr = Math.exp(-dt * 4.6), cx = (innerWidth - W) / 2, cy = (innerHeight - H) / 2;
      V.x *= fr; V.y *= fr; S.x += V.x * dt; S.y += V.y * dt;
      var minX = -(W - 110) - cx, maxX = innerWidth - 110 - cx, minY = -cy, maxY = innerHeight - 60 - cy;
      if (S.x < minX) { S.x = minX; V.x = 0; } else if (S.x > maxX) { S.x = maxX; V.x = 0; }
      if (S.y < minY) { S.y = minY; V.y = 0; } else if (S.y > maxY) { S.y = maxY; V.y = 0; }
      if (Math.hypot(V.x, V.y) < 14) { glide = false; V.x = V.y = 0; T.x = S.x; T.y = S.y; }
    }
    PROPS.forEach(function (k) {
      var tilt = k === "rx" || k === "ry", K = k === "r" ? 80 : k === "s" ? 120 : tilt ? 70 : open_ ? 62 : 70, D = 2 * Math.sqrt(K) * (k === "r" || tilt ? 1 : .95);
      if ((drag || glide) && (k === "x" || k === "y")) { if (glide) calm = false; return; }
      V[k] += ((T[k] - S[k]) * K - V[k] * D) * dt; S[k] += V[k] * dt;
      var tiny = k === "x" || k === "y" ? .4 : .02;
      if (Math.abs(T[k] - S[k]) > tiny || Math.abs(V[k]) > tiny * 1.5) calm = false;
    });
    /* the last fraction of a degree of the settling spring is invisible but keeps the card under a 3D transform, where taps on the page inside miss: snap flat as soon as it is close */
    if (open_ && !drag && !glide && Math.abs(S.rx) < .4 && Math.abs(S.ry) < .4 && Math.abs(S.r) < .25 && Math.abs(S.s - 1) < .006 && Math.abs(T.rx) < .01) { S.rx = S.ry = S.r = 0; S.s = 1; V.rx = V.ry = V.r = V.s = 0; }
    if (open_) { var tl = touchy ? 0 : 1; /* the card only sways (rotates in its own plane): no perspective tilt and no scale pulse, so the text never changes size while it is dragged */ T.rx = 0; T.ry = 0; T.r = clamp(sv.x * .0012, -1.5, 1.5) * tl; T.s = 1; }
    hx.push(sv.x); hy.push(sv.y); if (hx.length > 40) { hx.shift(); hy.shift(); }
    var energy = 0; for (var i = 0; i < hx.length; i++) energy = Math.max(energy, Math.abs(hx[i]), Math.abs(hy[i]));
    var moving = !calm || drag || energy > 8;
    pauseFrame(moving || !open_);
    window.__abBusy = moving; /* the card text takes no liquid effect while the card itself is moving */
    paint();
    if (moving) raf = requestAnimationFrame(step);
    else {
      raf = 0; window.__abBusy = false;
      if (!open_) { sheet.style.visibility = "hidden"; pauseFrame(true); window.__abOpen = false; }
      else { S.x = T.x; S.y = T.y; S.r = 0; S.s = 1; S.rx = 0; S.ry = 0; paint(); pauseFrame(false); }
    }
  }
  function run() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } }

  /* the name at the bottom is scaled so it exactly fills the card width */
  /* hands the page what it needs to draw its own copyright line and name: scale, sizes, texts */
  function pushPage(k) {
    k = k || FK || 1;
    try {
      var w = frame.contentWindow; if (!w || !w.__abxSet || !nameTxt) return;
      w.__abxSet({ k: k, top: GRIP, avail: H - GRIP - nameEl.offsetHeight, fs: parseFloat(nameTxt.style.fontSize) || 100, copy: siteText("copyright", "\u00a9 Sehzade 2026"), name: cardName() });
    } catch (e) {}
  }
  function fitName() {
    var cs = getComputedStyle(nameEl), inner = nameEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    nameTxt.style.fontSize = "100px"; var w = nameTxt.offsetWidth;
    if (w > 0) nameTxt.style.fontSize = Math.floor(100 * inner / w * 100) / 100 + "px";
    pushPage();
  }
  /* the About phone layout is designed for 390px, so it is scaled down on narrower cards */
  /* the page inside the card is laid out for a phone (390px wide). On narrower or shorter cards it is scaled down so that
     everything fits: width first, then height if the content is still taller than the space (nothing is ever cut off) */
  function needH() {
    try {
      var d = frame.contentDocument, m = 0; if (!d || !d.body) return 0;
      [].forEach.call(d.querySelectorAll("h1,p,a[href]"), function (e) {
        if (e.closest("nav") || !e.offsetHeight) return;
        var y = e.offsetHeight; for (var n = e; n; n = n.offsetParent) y += n.offsetTop; /* layout position: unaffected by entrance animations */
        m = Math.max(m, y);
      });
      /* the page is shifted below the copyright line; that shift is not content */
      var ab = d.querySelector('[data-framer-name="About"]'); if (ab && m) m -= parseFloat(ab.style.top) || 0;
      return m ? m + 16 : 0;
    } catch (e) { return 0; }
  }
  var needKey = "", needVal = 0, needBusy = false;
  function frameFit() {
    /* desktop: the page is always laid out at one fixed width (DW) and the whole page is scaled to the card, so on any screen size the text, line breaks and alignment are the same (a real-width iframe switched Framer breakpoints and re-flowed) */
    var desk = !touchy && innerWidth >= 810, DW = desk ? 564 : 390, base = desk ? W / DW : Math.min(1, W / 390), avail = H - GRIP - nameEl.offsetHeight, key = W.toFixed(1) + ":" + H.toFixed(1) + ":" + contentVer;
    var k = base;
    if (key === needKey) { if (needVal > avail / base + 1) k = Math.max(.55, avail / needVal); }
    else if (!needBusy) {
      /* measure the content at the plain phone geometry first (two frames, so the page has really been resized), then fit */
      needBusy = true;
      frame.style.cssText = base !== 1 ? "flex:none;width:" + DW + "px;height:" + H / base + "px;transform:scale(" + base + ");transform-origin:0 0" : "";
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        needBusy = false; var v = needH(); if (!v) { setTimeout(layout, 800); return; }
        needVal = v; needKey = key; layout();
      }); });
    }
    var fw = W / k, sig_ = k.toFixed(3) + ":" + fw.toFixed(1);
    frame.style.cssText = k !== 1 || base !== 1 ? "flex:none;width:" + fw + "px;height:" + H / k + "px;transform:scale(" + k + ");transform-origin:0 0" : "";
    pushPage(k);
    /* the page is measured at the phone width, but shown at the card's own width, where wrapped rows can break differently: check once at the
       final width and shrink a little more if the content would run under the name */
    if (key === needKey && frameFit.chk !== key) {
      frameFit.chk = key;
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        var v2 = needH(); if (v2 && v2 > avail / k + 1 && v2 > needVal) { needVal = v2; layout(); }
      }); });
    }
    if (sig_ !== frameFit.key) { frameFit.key = sig_; scheduleFit(400); }
    FK = k; FW = fw;
  }
  function layout() {
    if (!sheet) return; dims();
    if (W !== lw || H !== lh) { lw = W; lh = H; scheduleFit(); }
    sheet.style.width = W + "px"; sheet.style.height = H + "px";
    fitName();
    frameFit();
  }
  function siteText(k, d) { try { var o = JSON.parse(localStorage.getItem("site-cms-v1") || "null"); return (o && o.site && o.site[k]) || d; } catch (e) { return d; } }
  function cardName() { try { var d = JSON.parse(localStorage.getItem("site-cms-v1") || "null"); return (d && d.site && d.site.cardName) || "Adam Himawan"; } catch (e) { return "Adam Himawan"; } }
  function build() {
    if (sheet) return;
    backdrop = mk("div"); backdrop.id = "about-backdrop"; backdrop.onclick = close;
    sheet = mk("div"); sheet.id = "about-sheet";
    shadow = mk("div", "ab-shadow");
    card = mk("aside", "ab-card"); card.setAttribute("aria-label", "About"); card.setAttribute("role", "dialog");
    frame = mk("iframe"); frame.title = "About"; frame.src = "about.html";
    /* the copyright line and the name live inside the page itself (one document, so one liquid effect covers the whole card); this box only measures the name */
    nameEl = mk("div", "ab-name", "position:absolute;left:0;bottom:0;width:100%;visibility:hidden;pointer-events:none"); nameEl.setAttribute("aria-hidden", "true");
    nameTxt = mk("span", "", "display:inline-block"); nameTxt.textContent = cardName(); nameEl.appendChild(nameTxt);
    card.append(frame);
    sheet.append(shadow, card, nameEl); document.body.append(backdrop, sheet);
    layout(); S = hiddenPose(); paint();
    if (document.fonts) { document.fonts.load("100px Anton").then(layout, function () {}); document.fonts.ready.then(layout); }
    frame.addEventListener("load", function () { contentVer++; pushPage(); setTimeout(pushPage, 600); setTimeout(function () { contentVer++; layout(); }, 1800); paused = null; pauseFrame(!open_); scheduleFit(1600); });
    addEventListener("resize", function () { layout(); clampT(); if (open_) run(); else { S = hiddenPose(); T = hiddenPose(); paint(); } });
    addEventListener("storage", function (e) { if (e.key === "site-cms-v1") { contentVer++; nameTxt.textContent = cardName(); layout(); scheduleFit(500); } });
  }

  /* dragging: from the title strip, or from anywhere on the page inside the card (it reports its own coordinates) */
  function begin(px, py, grab) { window.__abDragging = true; glide = false; drag = { px: px, py: py, x0: S.x, y0: S.y, t: performance.now(), vx: 0, vy: 0 }; card.classList.add("dragging"); if (grab) card.classList.add("grip-drag"); V.x = V.y = 0; run(); }
  function move(px, py) {
    if (!drag) return; var now = performance.now(), dt = Math.max(8, now - drag.t), nx = drag.x0 + px - drag.px, ny = drag.y0 + py - drag.py;
    drag.vx = drag.vx * .55 + ((nx - S.x) / dt * 1000) * .45; drag.vy = drag.vy * .55 + ((ny - S.y) / dt * 1000) * .45;
    S.x = nx; S.y = ny; V.x = drag.vx; V.y = drag.vy; drag.t = now;
  }
  /* relative movement: what the page reports when the pointer moves inside it. The page itself moves, tilts and scales with the card,
     so absolute coordinates measured inside it would feed back into the motion and shake it; movement deltas cannot */
  function moveBy(dx, dy) {
    if (!drag || (!dx && !dy)) return; var now = performance.now(), dt = Math.max(8, now - drag.t);
    S.x += dx; S.y += dy; drag.vx = drag.vx * .55 + (dx / dt * 1000) * .45; drag.vy = drag.vy * .55 + (dy / dt * 1000) * .45; V.x = drag.vx; V.y = drag.vy; drag.t = now;
  }
  function end() {
    window.__abDragging = false;
    if (!drag) return; var v = drag, idle = performance.now() - v.t; drag = null; card.classList.remove("dragging", "grip-drag");
    /* released while still moving: coast; released after a pause: just stay where it is */
    var live = Math.exp(-idle / 1000 * 9);
    if (idle < 140 && Math.hypot(v.vx, v.vy) * live > 120) { glide = true; V.x = clamp(v.vx * live, -4000, 4000); V.y = clamp(v.vy * live, -4000, 4000); } else { V.x = V.y = 0; T.x = S.x; T.y = S.y; }
    run();
  }
  function open() {
    build(); layout();
    if (open_) return; open_ = true; window.__abOpen = true;
    sheet.style.visibility = "visible";
    glide = false; var h = hiddenPose(); S.x = h.x; S.y = h.y; S.r = h.r; S.s = h.s; S.rx = h.rx; S.ry = 0;
    V.x = V.y = V.r = V.s = V.rx = V.ry = 0; T = { x: 0, y: 0, r: 0, s: 1, rx: 0, ry: 0 }; hx = []; hy = [];
    if (reduce.matches) { S.x = 0; S.y = 0; S.r = 0; S.s = 1; S.rx = 0; }
    paint(); root.classList.add("about-open"); run();
  }
  function close() {
    if (!open_) return; open_ = false; drag = null; /* window.__abOpen stays true until the card has left the screen: the gallery behind starts moving again only then, so the two never compete for the GPU while the card flies out (that made the close stutter on phones) */ glide = false; card.classList.remove("dragging", "grip-drag");
    root.classList.remove("about-open");
    T = hiddenPose(); V.r = 0;
    if (reduce.matches) { S = hiddenPose(); paint(); sheet.style.visibility = "hidden"; window.__abOpen = false; return; }
    run();
  }
  /* a button released outside the window, or a lost window focus, must never leave the card stuck to the pointer */
  addEventListener("pointerup", function () { end(); }); addEventListener("blur", function () { end(); });
  addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
    if (e.shiftKey && (e.key === "G" || e.key === "g") && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) root.classList.toggle("show-grid");
  });
  addEventListener("message", function (e) {
    var d = e.data; if (d === "about-panel:close") return close();
    if (!d || d.about !== "drag" || !card || e.source !== frame.contentWindow) return;
    var r = frame.getBoundingClientRect(), k = r.width / (frame.offsetWidth || r.width) || 1, px = r.left + d.cx * k, py = r.top + d.cy * k; /* the page reports its own coordinates; screenX is unreliable on phones */
    if (d.phase === "start") begin(px, py); else if (d.phase === "move") { if (d.up) end(); else if (d.dx != null) moveBy(d.dx * k, d.dy * k); else move(px, py); } else end();
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (/^(\.?\/)?about(\.html)?\/?$/.test(a.getAttribute("href"))) { e.preventDefault(); e.stopImmediatePropagation(); open(); }
  }, true);
  var go = mk("div"); go.id = "grid-overlay"; for (var i = 0; i < 12; i++) go.appendChild(document.createElement("i"));
  function ready() { document.body.appendChild(go); if (/grid/.test(location.hash)) root.classList.add("show-grid"); /* warm up the card when the browser is idle, so it never competes with the first paint */ var quietT = 0, warmed = false, warm = function () {
      /* booting the About page is one long task: it waits for a moment when the visitor is not touching, scrolling or dragging, so it never lands in the middle of an interaction */
      if (warmed) return; clearTimeout(quietT);
      quietT = setTimeout(function () { (window.requestIdleCallback || function (f) { setTimeout(f, 50); })(function () { if (!warmed) { warmed = true; build(); } }, { timeout: 1000 }); }, 2500);
    };
    ["pointerdown", "pointermove", "touchmove", "wheel", "keydown"].forEach(function (t) { addEventListener(t, function () { if (!warmed && quietT) warm(); }, { passive: true }); });
    /* the About page is a second full page (its own copy of the site runtime): it is loaded only after the entrance has finished, never during it */
    if (root.classList.contains("intro-on") || root.classList.contains("intro-ui")) addEventListener("intro-done", function () { setTimeout(warm, 1500); }, { once: true }); else warm(); }
  if (document.readyState === "complete") ready(); else addEventListener("load", ready);
})();
