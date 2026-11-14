/* Liquid hover for the whole site (main page and About page), with a small control panel.
   - A soft liquid blob trails the cursor over the background.
   - Components near the cursor get a light blur that follows how close and how fast the cursor is.
   Nothing moves or resizes: only the blob and the blur. All settings live in the control panel
   (bottom right of the main page) and are remembered in this browser. */
(function () {
  if (window.__liquid) return;
  window.__liquid = 1;
  var ENABLED = !matchMedia("(prefers-reduced-motion: reduce)").matches && matchMedia("(pointer: fine)").matches;
  var ABOUT = !!document.getElementById("about-overrides");
  /* the main page owns the settings. The About page follows it when it is shown inside the main page; the main
     page may itself be embedded by a host (such as the artifact viewer), so "has a parent" is not enough */
  var TOP = !ABOUT;
  if (ABOUT) { try { TOP = !parent.__liquidCfg; } catch (e) { TOP = true; } }
  var DEF = { radius: 130, softness: 1, brightness: 0.02, trail: 0.7, blur: 0, distort: 30, reach: 120, on: 1, ldur: 900, ldist: 8, lblur: 1.5, lstag: 100, pliq: 95, twr: 40, twp: 160, twsc: 105, twg: 100, twn: 40, asp: 110, jel: 10, jpush: 150, jjolt: 100, jbnc: 25, jsq: 140, jtw: 160, jrng: 160, gmelt: 30, gdis: 40, gmsz: 100, gnz: 80, ggap: 16, gstag: 15, gpar: 20 };
  if (window.__introDef) Object.keys(window.__introDef).forEach(function (k) { DEF[k] = window.__introDef[k]; });   /* loading-sequence defaults live in intro.js */
  var KEY = "liquid-cfg-v1";
  function load() {
    try {
      var sv = JSON.parse(localStorage.getItem(KEY) || "{}");
      /* link hover defaults were retuned (slower, softer): drop link values saved by older versions once */
      /* defaults were retuned: drop values saved by older versions once */
      if (sv.lv !== 9) sv = sv.on === undefined ? { lv: 9 } : { on: sv.on, lv: 9 };
      if (sv.twg === 101) delete sv.twg;   /* the old default spacing (a 1% gap): the cards of the Twist now touch */
      return Object.assign({}, DEF, sv);
    }
    catch (e) { return Object.assign({}, DEF); }
  }
  var own = load();
  if (TOP) window.__liquidCfg = own;
  /* the About page lives in an iframe of the main page, so it follows the main page's panel */
  /* no component distortion while the About card is being dragged: the text under the cursor would shimmer as the card moves */
  function dragging() { try { return !!(TOP ? window : parent).__abDragging; } catch (e) { return false; } }
  /* while the card is open nothing behind it reacts: only the card's own pieces (name, copyright, Close) do */
  function behindCard(el) { return TOP && window.__abOpen && !(el.closest && el.closest(".ab-card")); }
  /* the About page is shown inside the card scaled by the card (window.__abK): every size here is divided by it, so the blob, its reach and the ripple look
     exactly as large and as strong on the card as on the main page */
  function KS() { return ABOUT ? (window.__abK || 1) : 1; }
  function C() { if (TOP) return own; try { return parent.__liquidCfg || own; } catch (e) { return own; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(own)); } catch (e) {} }

  var INK = ABOUT ? "11,11,11" : "242,242,242", BLEND = ABOUT ? "multiply" : "screen", GAIN = ABOUT ? 1.7 : 1;
  var SCALE = 4, N = 14;
  var mx = -9999, my = -9999, cvx = 0, cvy = 0, lastX = 0, lastY = 0, inside = false, run = false, idle = 0;

  /* ---------- background blob ---------- */
  var cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true });
  cv.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147482000;visibility:hidden;mix-blend-mode:" + BLEND;
  var chain = [], head = { x: -9999, y: -9999, vx: 0, vy: 0 };
  for (var i = 0; i < N; i++) chain.push({ x: -9999, y: -9999 });
  function size() { cv.width = Math.ceil(innerWidth / SCALE); cv.height = Math.ceil(innerHeight / SCALE); if (typeof drawn !== "undefined") drawn[N * 2 + 3] = -1; }
  size(); addEventListener("resize", size);

  /* The glow is only redrawn when it would look different: a resting cursor (the usual case) leaves it exactly as it is, so the frame skips the
     whole pixel pass (read back, per-pixel shading, upload). With nothing to show the canvas is hidden, so the browser does not blend an empty
     full-screen layer over the page on every frame either */
  var blank = true, drawn = new Float64Array(N * 2 + 4), LUT = new Float64Array(256), LUTd = new Uint8Array(256);
  function drawBlob(c) {
    var W = cv.width, H = cv.height, s = 1 / SCALE;
    if (!c.on || (TOP && window.__abOpen) || (!inside && Math.abs(head.vx) + Math.abs(head.vy) < .05 && idle > 40)) {
      if (!blank) { cx.clearRect(0, 0, W, H); blank = true; cv.style.visibility = "hidden"; }
      return;
    }
    var rad = c.radius * s / KS(), same = !blank && drawn[N * 2] === rad && drawn[N * 2 + 1] === c.softness && drawn[N * 2 + 2] === c.brightness && drawn[N * 2 + 3] === W;
    for (var j0 = 0; same && j0 < N; j0++) same = Math.abs(chain[j0].x * s - drawn[j0 * 2]) < .02 && Math.abs(chain[j0].y * s - drawn[j0 * 2 + 1]) < .02;
    if (same) return;
    for (j0 = 0; j0 < N; j0++) { drawn[j0 * 2] = chain[j0].x * s; drawn[j0 * 2 + 1] = chain[j0].y * s; }
    drawn[N * 2] = rad; drawn[N * 2 + 1] = c.softness; drawn[N * 2 + 2] = c.brightness; drawn[N * 2 + 3] = W;
    if (blank) { blank = false; cv.style.visibility = ""; }
    cx.clearRect(0, 0, W, H);
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, soft = c.softness, h = (1 - soft) * .6;
    for (var j = N - 1; j >= 0; j--) {
      var f = j / (N - 1), p = chain[j], r = rad * (.32 + .68 * Math.pow(1 - f, 1.1)), a = Math.pow(1 - f, 1.4);
      var x = p.x * s, y = p.y * s, g = cx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(0,0,0," + a + ")");
      g.addColorStop(h, "rgba(0,0,0," + a * .85 + ")");
      g.addColorStop(h + (1 - h) * .5, "rgba(0,0,0," + a * .38 + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r, 0, 6.2832); cx.fill();
      minX = Math.min(minX, x - r); minY = Math.min(minY, y - r); maxX = Math.max(maxX, x + r); maxY = Math.max(maxY, y + r);
    }
    var x0 = Math.max(0, Math.floor(minX)), y0 = Math.max(0, Math.floor(minY)), x1 = Math.min(W, Math.ceil(maxX)), y1 = Math.min(H, Math.ceil(maxY));
    if (x1 <= x0 || y1 <= y0) return;
    var img = cx.getImageData(x0, y0, x1 - x0, y1 - y0), d = img.data, rgb = INK.split(","),
        ew = .12 + soft * .55, lo = .3 - ew * .45, al = Math.min(1, c.brightness * GAIN);
    /* gooey edge: the wider the softness, the wider the smooth ramp, so the rim never looks jagged */
    /* The glow is only about 3% bright, i.e. 7 steps of an 8-bit channel over the whole disc: with a plain alpha that shows as visible rings (a faint
       hard-edged circle on the dark page). So the glow is written as opaque grey values (black = no effect under "screen", white = none under
       "multiply") with a random dither of the rounding, which turns the rings into smooth, grain-free gradation. */
    var gray = +rgb[0], mult = ABOUT, rs = (Math.random() * 4294967296) >>> 0;
    /* the shade depends only on the pixel's coverage (0..255), so it is worked out once for each of the 256 values and looked up per pixel */
    for (var a = 0; a < 256; a++) {
      var t = (a / 255 - lo) / ew; t = t < 0 ? 0 : t > 1 ? 1 : t; t = t * t * (3 - 2 * t);
      var v = t * al; LUT[a] = mult ? 255 - v * (255 - gray) : v * gray; LUTd[a] = t > 0 ? 1 : 0;
    }
    for (var k = 0; k < d.length; k += 4) {
      var a1 = d[k + 3], g = LUT[a1];
      if (LUTd[a1]) { rs = (rs * 1664525 + 1013904223) >>> 0; g += rs / 4294967296 - .5; }
      g = Math.round(g); g = g < 0 ? 0 : g > 255 ? 255 : g;
      d[k] = d[k + 1] = d[k + 2] = g; d[k + 3] = 255;
    }
    cx.putImageData(img, x0, y0);
  }

  /* ---------- components: blur only ---------- */
  var states = new Map(), els = [], galCards = [], lastScan = 0;
  var SEL = ABOUT ? "h1,p,a[href],.abx-top span,.abx-name span" : "nav a,nav span,[role=tab],#wk .wk-name span,#wk .wk-lede,#wk .wk-idx,#wk .wk-meta dt,#wk .wk-meta dd,#wk .wk-sec h3,#wk .wk-sec p,#wk .wk-visit,#wk .wk-bar button,#ls-list .ls-row";
  function scan(now) {
    if (now - lastScan < 800) return;
    lastScan = now;
    var list = [].slice.call(document.querySelectorAll(SEL)), tw = [];
    if (ABOUT) tw = list.filter(function (e) { return /^(H1|H2|P)$/.test(e.tagName) && !e.closest("#liquid-ui"); });   /* About: the text blocks sway under the cursor like the cards of the gallery do */
    if (!ABOUT) {
      /* the browser's own selector engine finds the gallery cards and the project caption (a loop over every div of the page, run twice a second, was far heavier).
         A Twister card is built from many 3D slices: a filter on it (or on one slice) flattens or tears the ribbon, so cards only wobble and never get a per-card filter */
      tw = [].slice.call(document.querySelectorAll(document.querySelector("#wk.on") ? "#wk .wk-it" : 'div[style*="position: absolute"][style*="top: 50%"][style*="left: 50%"][style*="z-index"]'));   /* a project page: its pictures are the cards */
      [].forEach.call(document.querySelectorAll('div[style*="z-index: 7000"]'), function (d) { [].forEach.call(d.children, function (c) { list.push(c); }); });   /* project caption */
    }
    /* forget components React has removed, together with their filters */
    states.forEach(function (st, el) { if (!el.isConnected) { if (st.warp) { var f = document.getElementById(st.warp.id); if (f) f.remove(); } states.delete(el); } });
    els = list.filter(function (e) { return !e.closest("#liquid-ui") && (!e.querySelector("p,h1,h2") || e.matches("a,span")); });
    /* one ripple per component: a piece inside another listed piece (the letters inside a navbar link) would stack a second and third filter
       on the same text and ripple much harder than a mode tab or the About text */
    var inList = new Set(els);
    els = els.filter(function (e) { for (var n = e.parentElement; n; n = n.parentElement) if (inList.has(n)) return false; return true; });
    /* pieces that just left the list drop their ripple */
    states.forEach(function (st, el) { if ((st.set || st.zs) && els.indexOf(el) < 0) { var t0 = el.__fxt || el; t0.style.filter = ""; t0.style.scale = t0.style.translate = ""; st.set = st.zs = 0; st.b = st.d = st.vb = st.vd = st.z = st.vz = 0; } });
    /* cards that left the list keep no wobble style behind */
    galCards.forEach(function (c0) { if (!c0.__wkAway && tw.indexOf(c0) < 0 && c0.__jl) { c0.style.translate = c0.style.scale = c0.style.rotate = ""; c0.__jl = null; } });
    galCards = tw;
  }
  /* The gallery's hover liquid: the cards near the cursor behave like blobs of wet paint. Dragging the cursor through them shoves them along and they
     slosh back and forth on a soft, springy rhythm; arriving on a card gives it a squashy jolt away from the cursor, and a card that is stretched one way
     is squeezed the other (it keeps its volume). It is pure motion of the card as a whole, so every edge stays perfectly smooth in every mode. */
  var galR = [], galBR = null, gzN = -1, gzSig = "", gzT = 0;
  function jellyFx(c, sp, on, now, dtf) {
    var k = Math.max(0, c.jel / 100), kp = c.jpush / 100, kj = c.jjolt / 100, ksq = c.jsq / 100, ktw = c.jtw / 100, any = 0, reach = (c.reach + 160) * c.jrng / 100 / KS(), aks = 1 / KS();
    var damp = .8 + (c.jbnc / 100) * .16;
    /* the same feel at 30, 60 or 144 frames per second */
    var ts = Math.min(2.5, Math.max(.4, dtf * 60)), d9 = Math.pow(damp, ts), d88 = Math.pow(damp - .02, ts);
    on = on && mx >= 0 && my >= 0 && mx <= innerWidth && my <= innerHeight;
    /* all measuring first, all style writing after: reading a rect right after writing a style forces the browser to lay the page out again for every card */
    var rects = [], n, card, cb;
    /* the cards are only measured when the hover can act on them: not while a mode change or a project page moves them (the hover is off then), and
       when none was on screen last time (List mode) only every 15th frame, or at once when the mode or the project page changes */
    var gsig = (window.__modeMove ? 1 : 0) + "" + (window.__wkOpen ? 1 : 0) + (window.__twGLon ? 1 : 0) + galCards.length;
    if (on && !(gzN === 0 && gsig === gzSig && ++gzT < 15)) {
      gzT = 0; gzSig = gsig; gzN = 0;
      for (n = 0; n < galCards.length; n++) {
        var r0 = galCards[n].isConnected ? galCards[n].getBoundingClientRect() : null; rects.push(r0);
        if (r0 && r0.width >= 40 && r0.bottom > 0 && r0.top < innerHeight && r0.right > 0 && r0.left < innerWidth && galCards[n].style.visibility !== "hidden") gzN++;
      }
    } else if (!on) gzSig = "";
    galR = rects; galBR = rects.length && galCards[0].parentElement ? galCards[0].parentElement.getBoundingClientRect() : null;   /* shared with the picture layer, which runs right after */
    /* a project page: the pictures of the endless scroll are one continuous column, so they do not wobble one by one (their seams would open and close); the melt alone carries the hover there */
    if (galCards.length && galCards[0].classList && galCards[0].classList.contains("wk-it")) return 0;
    /* Twist: the cards form one unbroken ribbon, edge to edge. A wobble of single cards would open thin gaps between neighbours, so the ribbon is left whole and the melt alone carries the hover */
    /* (the bouncy wobble of the cards is switched off in every mode of the gallery: the hover is the liquid melt alone) */
    if (!ABOUT) {
      /* Grid: no wobble, only depth: the card under the cursor rises a little (up to 2.5% larger) and settles back softly when the cursor leaves.
         Twist and the project page stay flat: their cards touch, and a card growing there would overlap its neighbours */
      var gridMode = !window.__twGLon && !window.__wkOpen, anyD = 0;
      for (n = 0; n < galCards.length; n++) {
        card = galCards[n]; cb = rects[n]; var dz = card.__dz || (card.__dz = { z: 0, v: 0 });
        var over = gridMode && on && cb && cb.width > 40 && mx > cb.left && mx < cb.right && my > cb.top && my < cb.bottom ? 1 : 0;
        dz.v = 0; dz.z += (over - dz.z) * (1 - Math.pow(1 - .11, Math.min(2.5, Math.max(.4, dtf * 60))));   /* plain ease, no bounce */
        /* no scale on hover: the card stays its size, the liquid melt alone carries the hover */
        if (card.style.scale) card.style.scale = ""; dz.z = dz.v = 0;
        if (card.__jl && card.__jl.set) { card.style.translate = card.style.rotate = ""; card.__jl = null; }
      }
      return anyD;
    }
    /* About: no jelly wobble either (it bounced). Its text blocks get the same hover as every other text: the liquid ripple plus the soft depth rise */
    for (n = 0; n < galCards.length; n++) { card = galCards[n]; if (card.__jl && card.__jl.set) { card.style.translate = card.style.scale = card.style.rotate = ""; } card.__jl = null; }
    return 0;
    for (n = 0; n < galCards.length; n++) {
      card = galCards[n]; cb = rects[n]; if (!cb) continue; if (card.__wkAway) continue;
      /* a card that has become tiny or hidden (another mode) must not keep a leftover wobble style */
      if (cb.width < 20) { if (card.__jl && card.__jl.set) { card.style.translate = card.style.scale = card.style.rotate = ""; card.__jl = null; } continue; }
      var cx = cb.left + cb.width / 2, cy = cb.top + cb.height / 2, dx = cx - mx, dy = cy - my, d = Math.hypot(dx, dy) || 1;
      var f = on ? Math.exp(-Math.pow(Math.max(0, d - Math.min(cb.width, 320) / 2) / reach, 2) * 1.5) : 0;
      var st = card.__jl || (card.__jl = { x: 0, vx: 0, y: 0, vy: 0, q: 0, vq: 0, r: 0, vr: 0, hot: 0, set: 0 });
      if (f < .003 && !st.set) continue;
      var size = Math.min(1.4, Math.max(.55, cb.width / 320));
      /* arriving: a jolt away from the cursor, with a little twist */
      if (f > .3 && !st.hot) { st.hot = 1; st.vx += (dx / d) * 9 * k * kj * size; st.vy += (dy / d) * 9 * k * kj * size; st.vr += (dx > 0 ? 1 : -1) * .5 * k * kj * ktw; st.vq += .006 * k * kj * ksq; } else if (f < .1) st.hot = 0;
      /* moving the cursor through the paint pushes it along with the cursor */
      if (f > .02) { st.vx += cvx * f * .09 * k * kp * size; st.vy += cvy * f * .09 * k * kp * size; st.vq += Math.min(.01, (Math.abs(cvx) + Math.abs(cvy)) * f * .0009) * k * kp * ksq; }
      /* springs: soft and bouncy (a few slow wobbles), pulled back to rest */
      st.vx = (st.vx - st.x * .085 * ts) * d9; st.x += st.vx * ts;
      st.vy = (st.vy - st.y * .085 * ts) * d9; st.y += st.vy * ts;
      st.vr = (st.vr - st.r * .09 * ts) * d9; st.r += st.vr * ts;
      st.vq = (st.vq - st.q * .11 * ts) * d88; st.q += st.vq * ts;
      var lim = 26 * size * Math.max(.2, k * Math.max(kp, kj)); st.x = Math.max(-lim, Math.min(lim, st.x)); st.y = Math.max(-lim, Math.min(lim, st.y));
      var live = Math.abs(st.x) > .05 || Math.abs(st.y) > .05 || Math.abs(st.q) > .0005 || Math.abs(st.r) > .01 || Math.abs(st.vx) > .02 || Math.abs(st.vy) > .02;
      if (live) {
        card.style.translate = (st.x * aks).toFixed(2) + "px " + (st.y * aks).toFixed(2) + "px";
        card.style.scale = (1 + st.q + Math.abs(st.vx) * .004).toFixed(4) + " " + (1 - st.q + Math.abs(st.vy) * .004).toFixed(4);
        card.style.rotate = st.r.toFixed(3) + "deg"; st.set = 1; any = 1;
      } else if (st.set) { card.style.translate = card.style.scale = card.style.rotate = ""; st.set = 0; st.x = st.y = st.q = st.r = st.vx = st.vy = st.vq = st.vr = 0; }
    }
    return any;
  }
  /* ---- the picture layer of the hover: the loading screen's "disappear" (melt + dissolve), laid over the wobble ---- */
  var gal = null, galBox = null, galS = 0, galV = 0, galPulse = 0, galHover = null;
  var MASK = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><defs><radialGradient id="g"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#999"/><stop offset="1" stop-color="#000"/></radialGradient></defs><rect width="256" height="256" fill="url(#g)"/></svg>');
  function galFilter() {
    if (gal) return gal;
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true"); svg.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
    var f = document.createElementNS(NS, "filter"); f.setAttribute("id", "lq-gal"); f.setAttribute("x", "0"); f.setAttribute("y", "0"); f.setAttribute("width", "100%"); f.setAttribute("height", "100%");
    f.setAttribute("color-interpolation-filters", "sRGB");
    /* the loading screen's melt, on the picture under the cursor: the pixels are pushed around by flowing noise, strongest right when the cursor
       arrives, calming down to a gentle ripple. (The dissolve stage that used to follow it, a second noise field plus five more steps over the whole
       layer, was switched off long ago and only produced the same picture again: removed, the output is pixel-identical and each frame costs ~40% less.) */
    f.innerHTML =
      '<feTurbulence type="fractalNoise" baseFrequency="0.0048 0.0072" numOctaves="1" seed="3" result="n"/>' +
      '<feOffset in="n" dx="0" dy="0" result="no"/>' +
      '<feColorMatrix in="no" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1" result="n1"/>' +
      '<feFlood flood-color="#000" flood-opacity="1" result="black"/>' +
      '<feImage href="' + MASK + '" x="-999" y="-999" width="256" height="256" preserveAspectRatio="none" result="spot"/>' +
      '<feComposite in="spot" in2="black" operator="over" result="m"/>' +
      '<feComposite in="n1" in2="m" operator="arithmetic" k1="1" k2="0" k3="-0.5" k4="0.5" result="map"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="dm"/>';
    svg.appendChild(f); document.body.appendChild(svg);
    var ch = f.children;
    gal = { turb: ch[0], off: ch[1], img: ch[4], map: ch[7] };
    return gal;
  }
  function galFx(c, sp, on, now, dtf) {
    var box = galCards.length && galCards[0].isConnected ? galCards[0].parentElement : null;
    /* Twister drawn on the GPU: its canvas sits next to the card boxes, so the melt goes on their common parent */
    if (box && window.__twGLon && !box.closest("#wk") && box.parentElement) box = box.parentElement;
    if (box && box.closest(".wk-rs")) box = box.closest(".wk-rs");   /* a project page: the oversized picture layer */
    if (galBox && galBox !== box) { galBox.style.filter = ""; galBox = null; galS = galV = 0; }
    if (!box) return 0;
    /* which card is under the cursor: arriving on a new one fires the opening burst */
    var hover = null, halo = false;
    on = on && mx >= 0 && my >= 0 && mx <= innerWidth && my <= innerHeight;
    if (on) for (var i = 0; i < galCards.length; i++) {
      var r = galR[i]; if (!r || r.width < 40) continue;   /* measured once per frame by jellyFx (nothing measured = no card on screen) */ if (galCards[i].style.visibility === "hidden") continue;
      if (mx > r.left && mx < r.right && my > r.top && my < r.bottom) hover = galCards[i];
      else if (mx > r.left - 90 && mx < r.right + 90 && my > r.top - 90 && my < r.bottom + 90) halo = true;
    }
    var wkBox = !!box.closest("#wk");
    /* in the scroll of a project page the pictures drift under a resting cursor: only a cursor that really moves onto a picture fires the opening burst */
    if (hover && hover !== galHover && !(wkBox && sp < .03)) galPulse = 1;
    galHover = hover; galPulse *= Math.exp(-dtf / 1.1);
    if (c.gmelt <= .5) { if (galBox) { galBox.style.filter = ""; galBox = null; galS = 0; } return 0; }
    /* Twist: the ribbon must stay calm under the cursor (a strong, flowing melt read as the whole ribbon trembling up and down), so the melt is gentler there and its noise barely drifts */
    /* one recipe everywhere (Twist, Grid, project page): the same strength, the same soft opening swell and the same slow drift, so the hover feels the same on every page */
    /* the after effect (the ripple that stays once the opening burst has passed) is 20% stronger; the burst itself is unchanged */
    var target = (hover || halo) ? c.gmelt * .72 * (1.2 * (1 + sp * .35) + 1.1 * galPulse) * (hover ? 1 : .35) : 0;
    /* plain exponential approach (a spring here wobbled below zero and back, which attached and removed the filter over and over) */
    galS += (target - galS) * (1 - Math.exp(-dtf * (target > galS ? 6.5 : 4)));   /* it swells in and settles slowly, like liquid, instead of snapping */
    if (galS < 1 && target === 0) { if (galBox) { galBox.style.filter = ""; galBox = null; } return 0; }
    var g = galFilter(), br = galBR || box.getBoundingClientRect(), R = c.reach * 1.7 * c.gmsz / 100;
    /* the gallery re-renders its own inline "filter: blur(0px)" now and then (hover blur), which would silently wipe ours: keep it on every frame */
    if (box.style.filter !== "url(#lq-gal)") box.style.filter = "url(#lq-gal)"; galBox = box;
    g.map.setAttribute("scale", galS.toFixed(2)); 
    g.turb.setAttribute("baseFrequency", (.0048 * c.gnz / 100 * (1 + .12 * Math.sin(now / 1300))).toFixed(5) + " " + (.0072 * c.gnz / 100 * (1 + .12 * Math.cos(now / 1700))).toFixed(5));
    var fl = 16, fs_ = 2.2; g.off.setAttribute("dx", (Math.sin(now / (900 * fs_)) * fl).toFixed(1)); g.off.setAttribute("dy", (Math.cos(now / (1100 * fs_)) * fl).toFixed(1));
    g.img.setAttribute("x", (mx - br.left - R).toFixed(1)); g.img.setAttribute("y", (my - br.top - R).toFixed(1)); g.img.setAttribute("width", (R * 2).toFixed(1)); g.img.setAttribute("height", (R * 2).toFixed(1));
    return 1;
  }
  var NS = "http://www.w3.org/2000/svg", defs = null, fid = 0;
  function makeWarp(el, b) {
    if (!defs) {
      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true");
      svg.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
      defs = document.createElementNS(NS, "defs"); svg.appendChild(defs); document.body.appendChild(svg);
    }
    var id = "lq-w" + (fid++), f = document.createElementNS(NS, "filter");
    f.setAttribute("id", id); f.setAttribute("x", "-30%"); f.setAttribute("y", "-60%"); f.setAttribute("width", "160%"); f.setAttribute("height", "220%");
    f.setAttribute("color-interpolation-filters", "sRGB");
    /* wavelength follows the size of the element, so small text ripples as clearly as a large card */
    var fq = Math.max(ABOUT ? .0025 : .004, Math.min(.05, (ABOUT ? 1.7 : 2.3) / Math.max(60, Math.max(b.width, b.height))));   /* About: longer, softer waves (big text on a flat card looked torn with the short ones) */
    f.innerHTML = '<feTurbulence type="fractalNoise" baseFrequency="' + fq.toFixed(4) + ' ' + (fq * 1.5).toFixed(4) + '" numOctaves="1" seed="' + (fid % 7 + 2) + '" result="n"/>' +
      '<feOffset in="n" dx="0" dy="0" result="o"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="o" scale="0" xChannelSelector="R" yChannelSelector="G" result="w"/>' +
      '<feGaussianBlur in="w" stdDeviation="0.45"/>';
    defs.appendChild(f);
    /* small text gets a fraction of the strength a large card gets, so every component distorts to the same degree visually */
    return { id: id, ph: fid * 1.7, fq: fq, turb: f.children[0], off: f.children[1], map: f.children[2], k: 1 };
  }
  /* no bounce anywhere: every value glides to its target on a plain exponential ease (no velocity, so it can never overshoot and swing back); time-based, the same softness at 20 or 144 fps */
  /* free space around an element's glyphs before the nearest clipping box (overflow other than visible, a clip-path, or the screen) */
  function roomOf(el, b) {
    var t = b; try { var rg = document.createRange(); rg.selectNodeContents(el); var q = rg.getBoundingClientRect(); if (q.width > 0) t = q; } catch (e) {}
    var L = 0, T = 0, R = innerWidth, B = innerHeight, cl = el.__clipA;
    /* which ancestors clip is a property of the page's styles, so it is looked up once per element; only their boxes are measured again */
    if (!cl) {
      cl = el.__clipA = [];
      for (var n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
        var cs = getComputedStyle(n); if (cs.display === "contents") continue;
        if (cs.overflowX !== "visible" || cs.overflowY !== "visible" || cs.clipPath !== "none") cl.push(n);
      }
    }
    for (var i = 0; i < cl.length; i++) { var r = cl[i].getBoundingClientRect(); if (r.width < innerWidth * 1.5 && r.height < innerHeight * 3) { L = Math.max(L, r.left); T = Math.max(T, r.top); R = Math.min(R, r.right); B = Math.min(B, r.bottom); } }
    return Math.min(t.left - L, R - t.right, t.top - T, B - t.bottom);
  }
  function spring(st, key, target, k, damp) { var t = spring.ts || 1; st["v" + key] = 0; st[key] += (target - st[key]) * (1 - Math.pow(1 - Math.min(.9, k * 1.6), t)); }

  function step(now) {
    var c = C();
    scan(now);
    var sp = Math.min(1, Math.hypot(cvx, cvy) / 40);
    cvx *= .88; cvy *= .88;
    var dtf = Math.min(.12, (now - (step.last || now)) / 1000); step.last = now; spring.ts = Math.min(3, Math.max(.4, dtf * 60));
    var active = 0, follow = Math.max(.12, Math.min(.5, .46 - c.trail * .24));
    var hk = 1 - Math.pow(1 - .2, spring.ts); head.vx = (mx - head.x) * hk; head.vy = (my - head.y) * hk; head.x += head.vx; head.y += head.vy;   /* the glow follows on a plain ease: no overshoot */
    chain[0].x = head.x; chain[0].y = head.y;
    for (var i = 1; i < N; i++) { chain[i].x += (chain[i - 1].x - chain[i].x) * follow; chain[i].y += (chain[i - 1].y - chain[i].y) * follow; }
    drawBlob(c);

    var ks = KS(), reach = c.reach / ks, near = [], drag_ = dragging();
    for (var n = 0; n < els.length; n++) {
      var el = els[n], b = el.getBoundingClientRect(), st = states.get(el);
      if (b.bottom < -reach || b.top > innerHeight + reach || b.right < -reach || b.left > innerWidth + reach || b.width === 0) { if (st && st.set) near.push({ el: el, b: b, vs: 1, f: 0, dx: 0, dy: 0 }); continue; }
      var dx = b.left + b.width / 2 - mx, dy = b.top + b.height / 2 - my, dist = Math.hypot(dx, dy);
      var edge = Math.max(0, dist - Math.min(b.width, 260) / 2), tg = el.__fxt || (el.__fxt = el.style.zIndex && el.firstElementChild && el.style.position === "absolute" && el.style.top === "50%" ? el.firstElementChild : el);
      near.push({ el: el, b: b, vs: tg === el ? 1 : Math.max(.3, Math.min(1.2, b.width / (tg.offsetWidth || b.width))), dx: dx, dy: dy, f: inside && c.on && !drag_ && !behindCard(el) && !(TOP && window.__abBusy && el.closest && el.closest(".ab-card")) ? Math.exp(-Math.pow(edge / reach, 2) * 1.8) : 0 });
    }
    /* filters are expensive: only the few components closest to the cursor get one, the rest relax back to normal */
    near.sort(function (a, z) { return z.f - a.f; });
    for (var q = 0; q < near.length; q++) {
      var it = near[q], el = it.el, b = it.b, dx = it.dx, dy = it.dy, f = q < (ABOUT ? 4 : 6) ? it.f : 0;
      var st = states.get(el);
      if (!st) { st = { b: 0, vb: 0, d: 0, vd: 0, z: 0, vz: 0, zs: 0, set: 0, warp: null }; states.set(el, st); }
      var tgt = el.__fxt || el, vs = it.vs; /* the filter works in the element's own pixels: far (small) cards get the matching boost, so every mode shows the panel's on-screen strength */
      /* the same recipe as the loading screen: an opening burst of ripple the moment the cursor arrives, which calms down to a steady
         ripple while the cursor stays near; the noise flows by itself with time (it does not follow the cursor) */
      if (f > .2 && !st.hot) { st.hot = 1; st.pulse = 1; } else if (f < .06) st.hot = 0;
      st.pulse = (st.pulse || 0) * Math.exp(-dtf / .75);
      spring(st, "b", f * c.blur * (.55 + sp * .9) / vs / ks, .09, .82);
      spring(st, "d", f * c.distort * 1.44 * (.6 + sp * .5 + 1.1 * st.pulse) / vs / ks, .08, .84);
      /* depth: the component under the cursor comes a little towards the viewer (it grows by up to 3.5% and lifts by a pixel or two), softly, like a
         surface rising out of liquid; the ones around it stay where they are */
      spring(st, "z", f, .07, .8);
      var zz = Math.max(0, Math.min(1, st.z)), dep = zz > .004;
      if (dep || st.zs) { if (dep) { var big_ = Math.max(b.width, b.height), amp = big_ > 160 ? .0216 : .042; tgt.style.scale = (1 + amp * zz).toFixed(4); if (!tgt.classList.contains("ls-row")) tgt.style.translate = "0 " + (-1.92 * zz).toFixed(2) + "px"; st.zs = 1; if (!tgt.style.transformOrigin) tgt.style.transformOrigin = "50% 60%"; active++; }
        else { tgt.style.scale = tgt.style.translate = ""; st.zs = 0; } }
      var warp = st.d > .15;
      if (warp || st.b > .03) {
        active++; st.set = 1;
        var fl = "";
        if (warp) {
          if (!st.warp) st.warp = makeWarp(el, b);
          /* never more than about a third of the element\'s own height: small text (14-20px) broke into overlapping, clipped glyphs when the arrival burst pushed it by 10+ px */
          if (!st.fs) st.fs = parseFloat(getComputedStyle(tgt).fontSize) || 16;
          /* ...and for text, never more than about 25% of the font size: lines of a paragraph (a few px apart) otherwise slide over each other and print twice */
          /* never cut off: the ripple (it pushes the glyphs by up to half its scale) and the depth growth must stay inside whatever clips this text
             (a scrolling box, a card, the screen edge). The room is measured on the glyphs themselves and re-measured twice a second */
          if (!st.roomT || now - st.roomT > 500) { st.roomT = now; st.room = roomOf(tgt, b); }
          st.warp.map.setAttribute("scale", Math.max(0, Math.min(st.d * st.warp.k, Math.max(2, b.height * .49), Math.max(2, st.fs * .36), (st.room - Math.max(b.width, b.height) * .0216 - 3) * 2)).toFixed(2));
          /* the noise flows on its own clock, like the loading screen. It flows by morphing (a slow change of its frequency) plus a small sway that stays
             inside the filter margin: sliding the whole noise field by hundreds of pixels left an empty strip in it, which showed up as a hard tear
             through the text (lines cut and printed twice) */
          var w_ = st.warp, mx_ = Math.min(60, b.width * .22), my_ = Math.min(40, b.height * .45);
          w_.turb.setAttribute("baseFrequency", (w_.fq * (1 + .16 * Math.sin(now / 1300 + w_.ph))).toFixed(5) + " " + (w_.fq * 1.5 * (1 + .16 * Math.cos(now / 1700 + w_.ph))).toFixed(5));
          w_.off.setAttribute("dx", (Math.sin(now / 900 + w_.ph) * mx_).toFixed(1)); w_.off.setAttribute("dy", (Math.cos(now / 1100 + w_.ph) * my_).toFixed(1));
          fl = "url(#" + st.warp.id + ") ";
        }
        if (st.b > .03) fl += "blur(" + st.b.toFixed(2) + "px)";
        tgt.style.filter = fl;
      } else if (st.set) { tgt.style.filter = ""; st.set = 0; }
    }
    var galOn = !ABOUT && inside && c.on && !drag_ && !(TOP && window.__abOpen) && !window.__wkMove && !window.__modeMove && !(window.__hoverLock && window.__hoverLock());
    var twAny = ABOUT ? (jellyFx(c, sp, inside && c.on && !drag_, now, dtf) ? 1 : 0) : ((jellyFx(c, sp, galOn, now, dtf) ? 1 : 0) | (galFx(c, sp, galOn, now, dtf) ? 1 : 0));
    idle = active || twAny || inside ? 0 : idle + 1;
    if (inside || active || idle < 40) requestAnimationFrame(step); else run = false;
  }
  function kick() { if (!run) { run = true; requestAnimationFrame(step); } }
  addEventListener("wk-render", function () { lastScan = 0; kick(); });

  function start() {
    if (!ENABLED) { if (TOP) lazyPanel(); return; }
    document.body.appendChild(cv);
    addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      if (e.target.closest && e.target.closest("#liquid-ui")) { inside = false; kick(); return; }
      if (!inside) { head.x = e.clientX; head.y = e.clientY; chain.forEach(function (p) { p.x = e.clientX; p.y = e.clientY; }); lastX = e.clientX; lastY = e.clientY; }
      cvx = Math.max(-60, Math.min(60, (e.clientX - lastX) * .8 + cvx * .2)); cvy = Math.max(-60, Math.min(60, (e.clientY - lastY) * .8 + cvy * .2));
      lastX = e.clientX; lastY = e.clientY; mx = e.clientX; my = e.clientY; inside = true; kick();
    }, { passive: true });
    document.addEventListener("pointerleave", function () { inside = false; kick(); });
    document.addEventListener("mouseleave", function () { inside = false; kick(); });
    if (TOP) lazyPanel();
  }

  /* ---------- control panel ---------- */
  /* the panel (a few hundred controls) is only built when someone asks for it: Shift+L, #liquid in the address, or left open last time */
  function lazyPanel() {
    var want = false;
    try { want = localStorage.getItem(KEY + "-ui3") === "1"; } catch (e) {}
    if (want || /liquid/.test(location.hash)) return panel();
    var onKey = function (e) {
      if (!(e.shiftKey && (e.key === "L" || e.key === "l")) || /INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) return;
      removeEventListener("keydown", onKey); window.__lqOpenNow = 1; panel();
    };
    addEventListener("keydown", onKey);
    addEventListener("hashchange", function h() { if (/liquid/.test(location.hash)) { removeEventListener("hashchange", h); removeEventListener("keydown", onKey); panel(); } });
  }
  /* the control panel lives in fuc/liquid-panel.js and is loaded only when it is opened */
  var SRC = (document.currentScript && document.currentScript.src) || "fuc/liquid.js";
  function panel() {
    var go = function () { window.__lqPanel({ own: own, save: save, kick: kick, DEF: DEF, KEY: KEY, ENABLED: ENABLED }); };
    if (window.__lqPanel) return go();
    var sc = document.createElement("script"); sc.src = SRC.replace(/liquid\.js/, "liquid-panel.js"); sc.onload = go; document.head.appendChild(sc);
  }

  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
})();
