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
  var DEF = { radius: 130, softness: 1, brightness: 0.02, trail: 0.7, blur: 0, distort: 30, reach: 120, on: 1, ldur: 900, ldist: 8, lblur: 1.5, lstag: 100, pliq: 95, twr: 40, twp: 160, twsc: 105, twg: 101, twn: 40, asp: 110, jel: 10, jpush: 150, jjolt: 100, jbnc: 25, jsq: 140, jtw: 160, jrng: 160, gmelt: 30, gdis: 40, gmsz: 100, gnz: 80, ggap: 16, gstag: 15, gpar: 20 };
  if (window.__introDef) Object.keys(window.__introDef).forEach(function (k) { DEF[k] = window.__introDef[k]; });   /* loading-sequence defaults live in intro.js */
  var KEY = "liquid-cfg-v1";
  function load() {
    try {
      var sv = JSON.parse(localStorage.getItem(KEY) || "{}");
      /* link hover defaults were retuned (slower, softer): drop link values saved by older versions once */
      /* defaults were retuned: drop values saved by older versions once */
      if (sv.lv !== 9) sv = sv.on === undefined ? { lv: 9 } : { on: sv.on, lv: 9 };
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
  var SCALE = 3, N = 14;
  var mx = -9999, my = -9999, cvx = 0, cvy = 0, lastX = 0, lastY = 0, inside = false, run = false, idle = 0;

  /* ---------- background blob ---------- */
  var cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true });
  cv.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147482000;mix-blend-mode:" + BLEND;
  var chain = [], head = { x: -9999, y: -9999, vx: 0, vy: 0 };
  for (var i = 0; i < N; i++) chain.push({ x: -9999, y: -9999 });
  function size() { cv.width = Math.ceil(innerWidth / SCALE); cv.height = Math.ceil(innerHeight / SCALE); }
  size(); addEventListener("resize", size);

  function drawBlob(c) {
    var W = cv.width, H = cv.height, s = 1 / SCALE;
    cx.clearRect(0, 0, W, H);
    if (!c.on || (TOP && window.__abOpen) || (!inside && Math.abs(head.vx) + Math.abs(head.vy) < .05 && idle > 40)) return;
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, rad = c.radius * s / KS(), soft = c.softness, h = (1 - soft) * .6;
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
    var gray = +rgb[0], mult = ABOUT;
    for (var k = 0; k < d.length; k += 4) {
      var t = (d[k + 3] / 255 - lo) / ew; t = t < 0 ? 0 : t > 1 ? 1 : t; t = t * t * (3 - 2 * t);
      var v = t * al, g = mult ? 255 - v * (255 - gray) : v * gray;
      if (t > 0) g += Math.random() - .5;
      g = Math.round(g); g = g < 0 ? 0 : g > 255 ? 255 : g;
      d[k] = d[k + 1] = d[k + 2] = g; d[k + 3] = 255;
    }
    cx.putImageData(img, x0, y0);
  }

  /* ---------- components: blur only ---------- */
  var states = new Map(), els = [], galCards = [], lastScan = 0;
  var SEL = ABOUT ? "h1,p,a[href],.abx-top span,.abx-name span" : "nav a,nav span,[role=tab],#wk .wk-name span,#wk .wk-lede,#wk .wk-idx,#wk .wk-meta dt,#wk .wk-meta dd,#wk .wk-sec h3,#wk .wk-sec p,#wk .wk-visit,#wk .wk-bar button";
  function scan(now) {
    if (now - lastScan < 800) return;
    lastScan = now;
    var list = [].slice.call(document.querySelectorAll(SEL)), tw = [];
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
    states.forEach(function (st, el) { if (st.set && els.indexOf(el) < 0) { (el.__fxt || el).style.filter = ""; st.set = 0; st.b = st.d = st.vb = st.vd = 0; } });
    /* cards that left the list keep no wobble style behind */
    galCards.forEach(function (c0) { if (tw.indexOf(c0) < 0 && c0.__jl) { c0.style.translate = c0.style.scale = c0.style.rotate = ""; c0.__jl = null; } });
    galCards = tw;
  }
  /* The gallery's hover liquid: the cards near the cursor behave like blobs of wet paint. Dragging the cursor through them shoves them along and they
     slosh back and forth on a soft, springy rhythm; arriving on a card gives it a squashy jolt away from the cursor, and a card that is stretched one way
     is squeezed the other (it keeps its volume). It is pure motion of the card as a whole, so every edge stays perfectly smooth in every mode. */
  var galR = [], galBR = null;
  function jellyFx(c, sp, on, now, dtf) {
    var k = Math.max(0, c.jel / 100), kp = c.jpush / 100, kj = c.jjolt / 100, ksq = c.jsq / 100, ktw = c.jtw / 100, any = 0, reach = (c.reach + 160) * c.jrng / 100;
    var damp = .8 + (c.jbnc / 100) * .16;
    /* the same feel at 30, 60 or 144 frames per second */
    var ts = Math.min(2.5, Math.max(.4, dtf * 60)), d9 = Math.pow(damp, ts), d88 = Math.pow(damp - .02, ts);
    on = on && mx >= 0 && my >= 0 && mx <= innerWidth && my <= innerHeight;
    /* all measuring first, all style writing after: reading a rect right after writing a style forces the browser to lay the page out again for every card */
    var rects = [], n, card, cb;
    for (n = 0; n < galCards.length; n++) rects.push(galCards[n].isConnected ? galCards[n].getBoundingClientRect() : null);
    galR = rects; galBR = galCards.length && galCards[0].parentElement ? galCards[0].parentElement.getBoundingClientRect() : null;   /* shared with the picture layer, which runs right after */
    for (n = 0; n < galCards.length; n++) {
      card = galCards[n]; cb = rects[n]; if (!cb) continue;
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
        card.style.translate = st.x.toFixed(2) + "px " + st.y.toFixed(2) + "px";
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
    /* the loading screen's "disappear", on the picture under the cursor: (1) a melt, the pixels are pushed around by flowing noise, (2) a dissolve, the
       picture is eaten away in patches of a second, slower noise, so it breaks up and sinks into the dark background. Both are strongest right when the
       cursor arrives and calm down to a gentle ripple. */
    f.innerHTML =
      '<feTurbulence type="fractalNoise" baseFrequency="0.0075 0.012" numOctaves="2" seed="3" result="n"/>' +
      '<feOffset in="n" dx="0" dy="0" result="no"/>' +
      '<feColorMatrix in="no" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1" result="n1"/>' +
      '<feFlood flood-color="#000" flood-opacity="1" result="black"/>' +
      '<feImage href="' + MASK + '" x="-999" y="-999" width="256" height="256" preserveAspectRatio="none" result="spot"/>' +
      '<feComposite in="spot" in2="black" operator="over" result="m"/>' +
      '<feComposite in="n1" in2="m" operator="arithmetic" k1="1" k2="0" k3="-0.5" k4="0.5" result="map"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" result="dm"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.0055 0.009" numOctaves="2" seed="9" result="nb"/>' +
      '<feOffset in="nb" dx="0" dy="0" result="nbo"/>' +
      '<feColorMatrix in="nbo" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1" result="nb1"/>' +
      '<feComponentTransfer in="m" result="sl"><feFuncR type="linear" slope="0" intercept="0"/><feFuncG type="linear" slope="0" intercept="0"/><feFuncB type="linear" slope="0" intercept="0"/></feComponentTransfer>' +
      '<feComposite in="sl" in2="nb1" operator="arithmetic" k1="0" k2="-1" k3="1" k4="1" result="df"/>' +
      '<feComponentTransfer in="df" result="kp"><feFuncR type="linear" slope="7" intercept="-5.6"/></feComponentTransfer>' +
      '<feColorMatrix in="kp" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="ka"/>' +
      '<feComposite in="dm" in2="ka" operator="in"/>';
    svg.appendChild(f); document.body.appendChild(svg);
    var ch = f.children;
    gal = { turb: ch[0], off: ch[1], img: ch[4], map: ch[7], turb2: ch[8], off2: ch[9], sl: ch[11].children[0] };
    return gal;
  }
  function galFx(c, sp, on, now, dtf) {
    var box = galCards.length && galCards[0].isConnected ? galCards[0].parentElement : null;
    /* Twister drawn on the GPU: its canvas sits next to the card boxes, so the melt goes on their common parent */
    if (box && window.__twGLon && !box.closest("#wk") && box.parentElement) box = box.parentElement;
    if (galBox && galBox !== box) { galBox.style.filter = ""; galBox = null; galS = galV = 0; }
    if (!box) return 0;
    /* which card is under the cursor: arriving on a new one fires the opening burst */
    var hover = null, halo = false;
    on = on && mx >= 0 && my >= 0 && mx <= innerWidth && my <= innerHeight;
    if (on) for (var i = 0; i < galCards.length; i++) {
      var r = galR[i] || galCards[i].getBoundingClientRect(); if (r.width < 40) continue;
      if (mx > r.left && mx < r.right && my > r.top && my < r.bottom) hover = galCards[i];
      else if (mx > r.left - 90 && mx < r.right + 90 && my > r.top - 90 && my < r.bottom + 90) halo = true;
    }
    if (hover && hover !== galHover) galPulse = 1;
    galHover = hover; galPulse *= Math.exp(-dtf / .75);
    if (c.gmelt <= .5 && c.gdis <= 1) { if (galBox) { galBox.style.filter = ""; galBox = null; galS = 0; } return 0; }
    var target = (hover || halo) ? c.gmelt * (1 + 2.2 * galPulse + sp * .6) * (hover ? 1 : .35) : 0;
    /* plain exponential approach (a spring here wobbled below zero and back, which attached and removed the filter over and over) */
    galS += (target - galS) * (1 - Math.exp(-dtf * (target > galS ? 14 : 9)));
    if (galS < 1 && target === 0 && !(c.gdis > 1 && galPulse > .02)) { if (galBox) { galBox.style.filter = ""; galBox = null; } return 0; }
    var g = galFilter(), br = galBR || box.getBoundingClientRect(), R = c.reach * 1.7 * c.gmsz / 100;
    /* the gallery re-renders its own inline "filter: blur(0px)" now and then (hover blur), which would silently wipe ours: keep it on every frame */
    if (box.style.filter !== "url(#lq-gal)") box.style.filter = "url(#lq-gal)"; galBox = box;
    g.map.setAttribute("scale", galS.toFixed(2));
    /* how much of the picture dissolves: a lot at the arrival burst, a light veil while the cursor rests */
    var lvl = ((c.gdis / 100) * Math.min(1, galPulse + (hover ? .2 : .05))).toFixed(3);
    [0, 1, 2].forEach(function (i) { g.sl.parentNode.children[i].setAttribute("slope", lvl); });
    g.turb.setAttribute("baseFrequency", (.0075 * c.gnz / 100 * (1 + .12 * Math.sin(now / 1300))).toFixed(5) + " " + (.012 * c.gnz / 100 * (1 + .12 * Math.cos(now / 1700))).toFixed(5));
    g.off.setAttribute("dx", (Math.sin(now / 900) * 40).toFixed(1)); g.off.setAttribute("dy", (Math.cos(now / 1100) * 40).toFixed(1));
    g.turb2.setAttribute("baseFrequency", (.0055 * c.gnz / 100 * (1 + .1 * Math.cos(now / 1900))).toFixed(5) + " " + (.009 * c.gnz / 100 * (1 + .1 * Math.sin(now / 2300))).toFixed(5));
    g.off2.setAttribute("dx", (Math.cos(now / 1200) * 45).toFixed(1)); g.off2.setAttribute("dy", (Math.sin(now / 1500) * 45).toFixed(1));
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
    var fq = Math.max(.004, Math.min(.05, 3.2 / Math.max(60, Math.max(b.width, b.height))));
    f.innerHTML = '<feTurbulence type="fractalNoise" baseFrequency="' + fq.toFixed(4) + ' ' + (fq * 1.5).toFixed(4) + '" numOctaves="1" seed="' + (fid % 7 + 2) + '" result="n"/>' +
      '<feOffset in="n" dx="0" dy="0" result="o"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="o" scale="0" xChannelSelector="R" yChannelSelector="G" result="w"/>' +
      '<feGaussianBlur in="w" stdDeviation="0.45"/>';
    defs.appendChild(f);
    /* small text gets a fraction of the strength a large card gets, so every component distorts to the same degree visually */
    return { id: id, ph: fid * 1.7, fq: fq, turb: f.children[0], off: f.children[1], map: f.children[2], k: 1 };
  }
  function spring(st, key, target, k, damp) { var t = spring.ts || 1; st["v" + key] = (st["v" + key] + (target - st[key]) * k * t) * Math.pow(damp, t); st[key] += st["v" + key] * t; }   /* time-based: the same softness at 20 or 144 fps (the About card runs slowly inside its scaled iframe and felt stiff) */

  function step(now) {
    var c = C();
    scan(now);
    var sp = Math.min(1, Math.hypot(cvx, cvy) / 40);
    cvx *= .88; cvy *= .88;
    var dtf = Math.min(.12, (now - (step.last || now)) / 1000); step.last = now; spring.ts = Math.min(3, Math.max(.4, dtf * 60));
    var active = 0, follow = Math.max(.12, Math.min(.5, .46 - c.trail * .24));
    head.vx = (head.vx + (mx - head.x) * .08) * .8; head.vy = (head.vy + (my - head.y) * .08) * .8; head.x += head.vx; head.y += head.vy;
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
      var it = near[q], el = it.el, b = it.b, dx = it.dx, dy = it.dy, f = q < (ABOUT ? 2 : 6) ? it.f : 0;
      var st = states.get(el);
      if (!st) { st = { b: 0, vb: 0, d: 0, vd: 0, set: 0, warp: null }; states.set(el, st); }
      var tgt = el.__fxt || el, vs = it.vs; /* the filter works in the element's own pixels: far (small) cards get the matching boost, so every mode shows the panel's on-screen strength */
      /* the same recipe as the loading screen: an opening burst of ripple the moment the cursor arrives, which calms down to a steady
         ripple while the cursor stays near; the noise flows by itself with time (it does not follow the cursor) */
      if (f > .2 && !st.hot) { st.hot = 1; st.pulse = 1; } else if (f < .06) st.hot = 0;
      st.pulse = (st.pulse || 0) * Math.exp(-dtf / .75);
      spring(st, "b", f * c.blur * (.55 + sp * .9) / vs / ks, .09, .82);
      spring(st, "d", f * c.distort * (.6 + sp * .5 + 1.1 * st.pulse) / vs / ks, .08, .84);
      var warp = st.d > .15;
      if (warp || st.b > .03) {
        active++; st.set = 1;
        var fl = "";
        if (warp) {
          if (!st.warp) st.warp = makeWarp(el, b);
          /* never more than about a third of the element\'s own height: small text (14-20px) broke into overlapping, clipped glyphs when the arrival burst pushed it by 10+ px */
          if (!st.fs) st.fs = parseFloat(getComputedStyle(tgt).fontSize) || 16;
          /* ...and for text, never more than about 25% of the font size: lines of a paragraph (a few px apart) otherwise slide over each other and print twice */
          st.warp.map.setAttribute("scale", Math.min(st.d * st.warp.k, Math.max(2, b.height * .34), Math.max(2, st.fs * .25)).toFixed(2));
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
    var galOn = !ABOUT && inside && c.on && !drag_ && !(TOP && window.__abOpen) && !(window.__hoverLock && window.__hoverLock());
    var twAny = !ABOUT && ((jellyFx(c, sp, galOn, now, dtf) ? 1 : 0) | (galFx(c, sp, galOn, now, dtf) ? 1 : 0));
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
  function panel() {
    var ROWS = [
      ["radius", "Radius", 16, 140, 1, "px"],
      ["softness", "Edge softness", 0, 1, .01, ""],
      ["brightness", "Brightness", 0, .3, .005, ""],
      ["trail", "Trail", 0, 1.4, .02, ""],
      ["distort", "Distortion", 0, 30, .5, "px"],
      ["blur", "Component blur", 0, 4, .1, "px"],
      ["reach", "Blur reach", 60, 420, 5, "px"],
      ["#", "Intro"],
      ["imin", "Minimum loading time", 1000, 10000, 100, "ms"],
      ["iline", "Loading line thickness", 1, 16, 1, "px"],
      ["ildl", "SEHZADE start delay", 0, 1500, 25, "ms"],
      ["iltr", "SEHZADE letter rise time", 300, 3000, 50, "ms"],
      ["ilst", "SEHZADE letter stagger", 0, 300, 5, "ms"],
      ["iliq", "SEHZADE liquid (steady)", 0, 40, 1, "px"],
      ["iliqp", "SEHZADE liquid (opening burst)", 0, 80, 1, "px"],
      ["iliqd", "Opening burst fades over", 300, 6000, 100, "ms"],
      ["ioutd", "Text melt build-up time", 200, 3000, 50, "ms"],
      ["ioutl", "Text liquid melt", 0, 400, 5, "px"],
      ["iseept", "Red seeps into black: time", 1500, 10000, 100, "ms"],
      ["iseeps", "Red seeps: edge softness", 3, 50, 1, "%"],
      ["iseepl", "Red seeps: depth layers spread", 0, 60, 1, "%"],
      ["iseepd", "Red seeps: patch detail", 5, 120, 1, ""],
      ["iseepf", "Red seeps: flow", 0, 300, 5, "%"],
      ["iseepb", "Red seeps: direction (100 = from bottom)", 0, 100, 1, "%"],
      ["iseepr", "Red seeps: hot edge glow", 0, 100, 1, "%"],
      ["iseepg", "Red seeps: grain", 0, 10, 1, "%"],
      ["itdur", "Twister: entrance time", 1200, 8000, 100, "ms"],
      ["itstart", "Twister: ribbon turn while rising", 0, 3000, 50, "px"],
      ["itui", "Navbar & menu appear after", 0, 6000, 100, "ms"],
      ["#", "Link hover"],
      ["ldur", "Duration", 300, 2000, 10, "ms"],
      ["ldist", "Slide distance", 0, 60, 1, "px"],
      ["lblur", "Link blur", 0, 10, .5, "px"],
      ["lstag", "Stagger", 0, 300, 5, "ms"],
      ["#", "About popup"],
      ["pliq", "Liquid appear", 0, 120, 1, "px"],
      ["#", "Grid"],
      ["ggap", "Gap", 0, 64, 1, "px"],
      ["gstag", "Column stagger", 0, 300, 5, "px"],
      ["gpar", "Column parallax", 0, 60, 1, "%"],
      ["#", "Gallery hover"],
      ["jel", "Wet-paint wobble (master)", 0, 250, 5, "%", ""],
      ["jpush", "Cursor push", 0, 250, 5, "%", ""],
      ["jjolt", "Arrival jolt", 0, 250, 5, "%", ""],
      ["jbnc", "Bounciness", 0, 100, 1, "", ""],
      ["jsq", "Squash & stretch", 0, 250, 5, "%", ""],
      ["jtw", "Twist", 0, 250, 5, "%", ""],
      ["jrng", "Reach", 40, 250, 5, "%", ""],
      ["gmelt", "Picture melt (0 = off)", 0, 60, 1, "px", ""],
      ["gdis", "Picture dissolve (0 = off)", 0, 100, 1, "%", ""],
      ["gmsz", "Melt / dissolve spot size", 40, 250, 5, "%", ""],
      ["gnz", "Melt / dissolve noise size", 30, 300, 5, "%", ""],
      ["#", "Twister"],
      ["asp", "Auto scroll speed (0 = off)", 0, 300, 5, "px/s"],
      ["twr", "Curve radius (small = tighter)", 20, 70, 1, "%"],
      ["twn", "Curve smoothness (slices)", 8, 40, 1, ""],
      ["twg", "Item spacing (100 = touching)", 80, 160, 1, "%"],
      ["twp", "Rise per turn", 50, 200, 5, "%"],
      ["twsc", "Card size", 60, 120, 1, "%"]
    ];
    var DESC = {
      imin: "Shortest time the loading screen stays, even if the site is ready sooner.", iline: "Thickness of the black loading line (it always spans the full screen width).",
      ildl: "Wait before the first SEHZADE letter rises.", iltr: "How long each letter takes to rise into place.", ilst: "Delay between one SEHZADE letter and the next.",
      iliq: "Constant liquid ripple on the SEHZADE letters.", iliqp: "Extra liquid ripple right when the loading starts.", iliqd: "How long the opening ripple takes to calm down.",
      ioutd: "How long the melting of the text builds up once loading is done.", ioutl: "How strongly the letters, the percentage, Designer and the line warp and melt while they go.",
      iseept: "How long the red takes to be soaked up by the black. Higher is slower and calmer.", iseeps: "Width of the blurry front between red and black. Low is a sharper stain, high is a diffuse fade.",
      iseepl: "How far the deeper layers of red (dark red, then smoky ember) trail behind the surface. 0 is a single flat layer.", iseepd: "Size of the patches the red breaks into. Low is a few big areas, high is many fine ones.",
      iseepf: "How fast the patches drift while they dissolve. 0 keeps them still.", iseepb: "0 soaks in at random places, 100 soaks in from the bottom of the screen upward.",
      iseepr: "Warm glow along the edge of the red as it is absorbed.", iseepg: "Fine film grain that keeps the gradients from banding.",
      itdur: "How long the Twister takes to build itself, from the first picture to the last.",
      itstart: "How far the ribbon turns while it builds itself. 0 keeps it still, higher turns it more.",
      itui: "When the navbar and the mode menu fade in after the Twister starts rising.",
      radius: "Size of the liquid blob that follows the cursor.", softness: "How soft the blob's edge is. Lower is sharper.", brightness: "How bright the blob glows over the background.",
      trail: "Length of the blob's tail behind the cursor.", distort: "How strongly text and cards ripple when the cursor is near.", blur: "Soft blur added to components close to the cursor.",
      reach: "How far from the cursor components still react.",
      ldur: "How long the letter slide on links takes.", ldist: "How far letters travel while sliding in.", lblur: "Blur on the letters during the slide.", lstag: "Delay between one letter and the next.",
      pliq: "Ripple strength on the About card text while it moves.",
      ggap: "Space between cards in the grid.", gstag: "Shifts every second column down to make the grid uneven.", gpar: "How much columns move at different speeds when you scroll.",
      jel: "Master strength of the wet-paint wobble of the cards under the cursor. 0 turns the whole wobble off.", jpush: "How strongly moving the cursor shoves the cards along with it, as if dragging a finger through paint.",
      jjolt: "The squashy jolt a card gets, away from the cursor, the moment the cursor arrives on it.", jbnc: "How long the wobble keeps swinging. Low settles at once, high keeps sloshing for a while.",
      jsq: "How much a card stretches one way and squeezes the other while it wobbles.", jtw: "How much a card twists a little as it jolts and wobbles.", jrng: "How far from the cursor the cards still react.",
      gmelt: "The loading screen's melt on the picture under the cursor: how hard flowing noise pushes its pixels around. Higher looks more liquid but gets rougher on slanted edges. 0 turns the melt off.",
      gdis: "The loading screen's dissolve: how much of the picture under the cursor is eaten away in patches when the cursor arrives. 0 turns the dissolve off.",
      gmsz: "Size of the area around the cursor where the melt and the dissolve happen.", gnz: "Size of the waves and patches of the melt and the dissolve. Low is a few big waves, high is many small ones.",
      asp: "How fast the gallery keeps moving by itself. It pauses while the cursor is over it or while it is dragged. 0 turns it off.", twr: "Radius of the spiral. Smaller is a tighter, rounder curve.", twn: "How many slices each card is cut into. More is smoother but heavier.",
      twg: "Gap between neighbouring cards. 100 means they touch, higher opens gaps.", twp: "How steeply the ribbon climbs each turn. Lower packs the turns closer together.", twsc: "Size of every card in Twister."
    };
    var GALLERY = /^(asp|tw(r|p|sc|g|n)|ggap|gstag|gpar)$/;
    var css = document.createElement("style");
    css.textContent =
      '#liquid-ui{position:fixed;right:var(--lm,32px);bottom:88px;z-index:2147483600;font-family:"Anton","Inter Display",Impact,sans-serif;text-transform:uppercase;color:#f2f2f2;letter-spacing:.04em;-webkit-font-smoothing:antialiased}' +
      '#liquid-ui *{box-sizing:border-box;font-family:inherit;text-transform:inherit;letter-spacing:inherit}' +
      '#liquid-ui .lq-btn{display:flex;align-items:center;gap:8px;margin-left:auto;padding:8px 13px;border:1px solid rgba(242,242,242,.16);border-radius:999px;background:rgba(14,14,14,.62);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:inherit;font-size:12px;cursor:pointer;transition:border-color .5s,background .5s}' +
      '#liquid-ui .lq-btn:hover{border-color:rgba(242,242,242,.4);background:rgba(14,14,14,.8)}' +
      '#liquid-ui .lq-dot{width:8px;height:8px;border-radius:50%;background:#f2f2f2;box-shadow:0 0 10px rgba(242,242,242,.55);opacity:.9;transition:opacity .5s}' +
      '#liquid-ui.off .lq-dot{opacity:.25;box-shadow:none}' +
      '#liquid-ui .lq-card{width:calc(3 * (100vw - 2 * var(--lm,32px) - 176px) / 12 + 32px);max-height:calc(100vh - 168px);overflow:auto;margin-bottom:10px;padding:16px 16px 12px;border:1px solid rgba(242,242,242,.14);border-radius:16px;background:rgba(14,14,14,.7);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 18px 50px rgba(0,0,0,.45);opacity:0;transform:translateY(10px);visibility:hidden;pointer-events:none;transition:opacity .55s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1),visibility 0s .7s}' +
      '#liquid-ui.open .lq-card{opacity:1;transform:none;visibility:visible;pointer-events:auto;transition:opacity .55s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1)}' +
      '#liquid-ui .lq-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-bottom:14px;padding:3px;border:1px solid rgba(242,242,242,.14);border-radius:20px}' +
      '#liquid-ui .lq-tabs button{padding:6px 0;font-size:10px;border:0;border-radius:999px;background:none;color:rgba(242,242,242,.7);font-size:11px;cursor:pointer;transition:background .4s,color .4s}' +
      '#liquid-ui .lq-tabs button.on{background:#f2f2f2;color:#0b0b0b}' +
      '#liquid-ui .lq-sec{margin:16px 0 10px;padding-top:12px;border-top:1px solid rgba(242,242,242,.12);font-size:11px;color:rgba(242,242,242,.5)}' +
      '#liquid-ui .lq-demo{display:inline-block;margin:0 0 12px;font-size:16px;color:#f2f2f2;text-decoration:none;cursor:pointer}' +
      '#liquid-ui .lq-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px}' +
      '#liquid-ui .lq-row{display:grid;grid-template-columns:1fr auto;gap:2px 8px;margin-bottom:11px;font-size:11px;color:rgba(242,242,242,.72)}' +
      '#liquid-ui .lq-desc{grid-column:1/-1;font-size:10px;line-height:1.35;color:rgba(242,242,242,.45);text-transform:none!important;letter-spacing:.01em!important;font-family:Inter,-apple-system,sans-serif!important}' +
      '#liquid-ui .lq-row b{font-weight:400;color:#f2f2f2;font-variant-numeric:tabular-nums}' +
      '#liquid-ui input[type=range]{grid-column:1/-1;width:100%;height:16px;margin:0;background:none;-webkit-appearance:none;appearance:none;cursor:pointer}' +
      '#liquid-ui input[type=range]::-webkit-slider-runnable-track{height:2px;border-radius:2px;background:rgba(242,242,242,.22)}' +
      '#liquid-ui input[type=range]::-moz-range-track{height:2px;border-radius:2px;background:rgba(242,242,242,.22)}' +
      '#liquid-ui input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;margin-top:-5px;border-radius:50%;border:0;background:#f2f2f2;transition:transform .3s}' +
      '#liquid-ui input[type=range]::-moz-range-thumb{width:12px;height:12px;border-radius:50%;border:0;background:#f2f2f2}' +
      '#liquid-ui input[type=range]:hover::-webkit-slider-thumb{transform:scale(1.25)}' +
      '#liquid-ui .lq-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}' +
      '#liquid-ui .lq-actions button{padding:7px 0;border:1px solid rgba(242,242,242,.18);border-radius:999px;background:transparent;color:inherit;font-size:11px;cursor:pointer;transition:border-color .4s,background .4s}' +
      '#liquid-ui .lq-actions button:hover{border-color:rgba(242,242,242,.5);background:rgba(242,242,242,.08)}' +
      '#liquid-ui :focus-visible{outline:1px solid rgba(242,242,242,.7);outline-offset:3px}' +
      '@media (max-width:1439.98px){#liquid-ui{--lm:24px}#liquid-ui .lq-card{width:calc(4 * (100vw - 2 * var(--lm) - 112px) / 8 + 48px)}}@media (max-width:809.98px){#liquid-ui{--lm:16px}#liquid-ui .lq-card{width:calc(100vw - 32px)}}#liquid-ui .lq-actions button:last-child:nth-child(odd){grid-column:1/-1}';
    document.head.appendChild(css);

    var ui = document.createElement("div"); ui.id = "liquid-ui";
    /* hidden by default. Shift+L (or adding #liquid to the address) shows it again; the settings are kept either way */
    var UIKEY = KEY + "-ui3"; /* new key: the panel starts hidden again for everyone */
    function showUI(v) { ui.style.display = v ? "" : "none"; try { localStorage.setItem(UIKEY, v ? "1" : "0"); } catch (e) {} if (!v) ui.classList.remove("open"); }
    var shown = false;
    try { shown = localStorage.getItem(UIKEY) === "1"; } catch (e) {}
    if (/liquid/.test(location.hash)) shown = true;
    if (window.__lqOpenNow) { shown = true; window.__lqOpenNow = 0; setTimeout(function () { showUI(true); ui.classList.add("open"); }, 30); }
    ui.style.display = shown ? "" : "none";
    addEventListener("keydown", function (e) {
      if (e.shiftKey && (e.key === "L" || e.key === "l") && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) { showUI(ui.style.display === "none"); if (ui.style.display !== "none") ui.classList.add("open"); }
    });
    var card = document.createElement("div"); card.className = "lq-card"; card.setAttribute("role", "group"); card.setAttribute("aria-label", "Liquid hover settings");
    card.innerHTML = '<div class="lq-title"><span>Liquid hover</span></div>';
    var inputs = {}, pages = {}, tabs = document.createElement("div"), cur = null;
    tabs.className = "lq-tabs";
    [["Cursor", "Cursor"], ["Link hover", "Links"], ["About popup", "Popup"], ["Intro", "Intro"], ["Grid", "Grid"], ["Gallery hover", "Hover"], ["Twister", "Twist"]].forEach(function (t) {
      var pg = document.createElement("div"); pg.className = "lq-page"; pages[t[0]] = pg;
      var tb = document.createElement("button"); tb.type = "button"; tb.textContent = t[1]; tb.dataset.page = t[0];
      tb.onclick = function () { setPage(t[0]); try { localStorage.setItem(KEY + "-tab", t[0]); } catch (e) {} };
      tabs.appendChild(tb);
    });
    function setPage(n) { cur = n; [].forEach.call(tabs.children, function (b) { b.classList.toggle("on", b.dataset.page === n); }); Object.keys(pages).forEach(function (k) { pages[k].style.display = k === n ? "" : "none"; }); }
    card.appendChild(tabs); Object.keys(pages).forEach(function (k) { card.appendChild(pages[k]); });
    var host = pages["Cursor"];
    ROWS.forEach(function (r) {
      if (r[0] === "#") {
        host = pages[r[1]];
        if (r[1] === "Intro") {
          var rp = document.createElement("button"); rp.type = "button"; rp.textContent = "Replay intro"; rp.className = "lq-demo";
          rp.style.cssText = "border:1px solid rgba(242,242,242,.4);border-radius:999px;background:none;padding:7px 14px;font-size:12px";
          rp.onclick = function () { save(); if (/nointro/.test(location.hash)) location.hash = "liquid"; location.reload(); };
          host.appendChild(rp);
        }
        if (r[1] === "Link hover") {
          var demo = document.createElement("a"); demo.href = "#"; demo.className = "lq-demo";
          "Hover to preview".split("").forEach(function (ch) { var sp = document.createElement("span"); sp.style.cssText = "display:inline-block;white-space:pre"; sp.textContent = ch; demo.appendChild(sp); });
          demo.onclick = function (e) { e.preventDefault(); if (window.__linkfxPlay) window.__linkfxPlay(demo); };
          host.appendChild(demo);
        }
        return;
      }
      var row = document.createElement("label"); row.className = "lq-row";
      var name = document.createElement("span"); name.textContent = r[1];
      var val = document.createElement("b");
      var inp = document.createElement("input"); inp.type = "range"; inp.min = r[2]; inp.max = r[3]; inp.step = r[4]; inp.id = "lq-" + r[0];
      function show() { var v = +own[r[0]]; val.textContent = (r[4] < 1 ? v.toFixed(r[4] < .01 ? 3 : 2) : Math.round(v)) + r[5]; }
      inp.value = own[r[0]]; show();
      inp.addEventListener("input", function () { own[r[0]] = +inp.value; show(); save(); kick(); if (GALLERY.test(r[0])) { window.__gcfgV = (window.__gcfgV || 0) + 1; if (r[0][0] !== "c") dispatchEvent(new Event("cms-change")); } });
      inputs[r[0]] = [inp, show];
      row.append(name, val, inp);
      if (DESC[r[0]]) { var dsc = document.createElement("small"); dsc.className = "lq-desc"; dsc.textContent = DESC[r[0]]; row.appendChild(dsc); }
      host.appendChild(row);
    });
    var savedTab = "Cursor"; try { savedTab = localStorage.getItem(KEY + "-tab") || "Cursor"; } catch (e) {}
    setPage(pages[savedTab] ? savedTab : "Cursor");
    var actions = document.createElement("div"); actions.className = "lq-actions";
    var reset = document.createElement("button"); reset.type = "button"; reset.textContent = "Reset";
    reset.onclick = function () { Object.keys(DEF).forEach(function (k) { own[k] = DEF[k]; if (inputs[k]) { inputs[k][0].value = DEF[k]; inputs[k][1](); } }); ui.classList.remove("off"); save(); kick(); window.__gcfgV = (window.__gcfgV || 0) + 1; dispatchEvent(new Event("cms-change")); };
    var toggle = document.createElement("button"); toggle.type = "button"; toggle.textContent = own.on ? "Turn off" : "Turn on";
    toggle.onclick = function () { own.on = own.on ? 0 : 1; toggle.textContent = own.on ? "Turn off" : "Turn on"; ui.classList.toggle("off", !own.on); save(); kick(); };
    ui.classList.toggle("off", !own.on);
    var copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Copy values";
    copy.onclick = function () {
      var o = {}; Object.keys(DEF).forEach(function (k) { o[k] = own[k]; }); var txt = JSON.stringify(o);
      var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy values"; }, 1400); };
      try { navigator.clipboard.writeText(txt).then(done, function () { copy.textContent = txt.slice(0, 18) + "…"; }); } catch (e) { copy.textContent = "Not allowed"; }
    };
    var hide = document.createElement("button"); hide.type = "button"; hide.textContent = "Save & hide";
    hide.onclick = function () { save(); showUI(false); };
    var cmsBtn = document.createElement("button"); cmsBtn.type = "button"; cmsBtn.textContent = "Open CMS"; cmsBtn.onclick = function () { location.href = "/cms"; };
    actions.append(reset, toggle, copy, hide); if (/^(localhost|127\.)/.test(location.hostname)) actions.append(cmsBtn); card.appendChild(actions);
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "lq-btn"; btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="lq-dot"></span><span>Liquid</span>';
    btn.onclick = function () { var o = ui.classList.toggle("open"); btn.setAttribute("aria-expanded", o); };
    addEventListener("keydown", function (e) { if (e.key === "Escape" && ui.classList.contains("open")) { ui.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } });
    if (!ENABLED) { var note = document.createElement("div"); note.style.cssText = "margin-top:8px;font-size:10px;color:rgba(242,242,242,.55);line-height:1.3"; note.textContent = "Hover effects need a mouse and motion enabled on this device."; card.appendChild(note); }
    ui.append(card, btn); document.body.appendChild(ui);
  }

  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
})();
