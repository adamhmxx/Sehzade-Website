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
  var DEF = { radius: 140, softness: 1, brightness: 0.03, trail: 0.66, blur: 0.6, distort: 10, reach: 130, on: 1, ldur: 900, ldist: 8, lblur: 1.5, lstag: 100, pliq: 95, pq: 2, cfa: 42, cdx: 6.5, cdy: 4, cdz: 0, cscl: 90, clift: 10, clz: 30, cspr: 60, cstep: 10, twr: 40, twp: 160, twsc: 105, twg: 101, twn: 40, cbl: 1, gsz: 100, fstep: 40, fnear: 400, fbl: 16, fsc: 80, fx: 44, fy: 50, grad: 30, gbl: 6, ggap: 16, gstag: 15, gpar: 20 };
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
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, rad = c.radius * s, soft = c.softness, h = (1 - soft) * .6;
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
    for (var k = 0; k < d.length; k += 4) {
      var t = (d[k + 3] / 255 - lo) / ew; t = t < 0 ? 0 : t > 1 ? 1 : t; t = t * t * (3 - 2 * t);
      d[k] = +rgb[0]; d[k + 1] = +rgb[1]; d[k + 2] = +rgb[2]; d[k + 3] = Math.round(t * al * 255);
    }
    cx.putImageData(img, x0, y0);
  }

  /* ---------- components: blur only ---------- */
  var states = new Map(), els = [], lastScan = 0;
  var SEL = ABOUT ? "h1,p,a[href],.abx-top span,.abx-name span" : "nav a,nav span,[role=tab]";
  function scan(now) {
    if (now - lastScan < 600) return;
    lastScan = now;
    var list = [].slice.call(document.querySelectorAll(SEL));
    if (!ABOUT) {
      [].forEach.call(document.querySelectorAll("div"), function (d) {
        var st = d.style;
        /* gallery cards. A Twister card is built from many 3D slices: a filter on it (or on one slice) flattens or tears the ribbon, so those cards take no distortion or blur, only the cursor blob */
        if (st.position === "absolute" && st.top === "50%" && st.left === "50%" && st.zIndex) { if (d.childElementCount <= 1) list.push(d); }
        else if (st.zIndex === "7000") [].forEach.call(d.children, function (c) { list.push(c); });           /* project caption */
      });
    }
    /* forget components React has removed, together with their filters */
    states.forEach(function (st, el) { if (!el.isConnected) { if (st.warp) { var f = document.getElementById(st.warp.id); if (f) f.remove(); } states.delete(el); } });
    els = list.filter(function (e) { return !e.closest("#liquid-ui") && (!e.querySelector("p,h1,h2") || e.matches("a,span")); });
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
    return { id: id, off: f.children[1], map: f.children[2], k: ABOUT || (el.__fxt && el.__fxt !== el) || (el.closest && el.closest(".ab-card")) ? 1 : Math.max(.25, Math.min(1, Math.min(b.width, b.height) / 300)) };
  }
  function spring(st, key, target, k, damp) { st["v" + key] = (st["v" + key] + (target - st[key]) * k) * damp; st[key] += st["v" + key]; }

  function step(now) {
    var c = C();
    scan(now);
    var sp = Math.min(1, Math.hypot(cvx, cvy) / 40);
    cvx *= .88; cvy *= .88;
    var active = 0, follow = Math.max(.12, Math.min(.5, .46 - c.trail * .24));
    head.vx = (head.vx + (mx - head.x) * .08) * .8; head.vy = (head.vy + (my - head.y) * .08) * .8; head.x += head.vx; head.y += head.vy;
    chain[0].x = head.x; chain[0].y = head.y;
    for (var i = 1; i < N; i++) { chain[i].x += (chain[i - 1].x - chain[i].x) * follow; chain[i].y += (chain[i - 1].y - chain[i].y) * follow; }
    drawBlob(c);

    var reach = c.reach, near = [], drag_ = dragging();
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
      var it = near[q], el = it.el, b = it.b, dx = it.dx, dy = it.dy, f = q < 6 ? it.f : 0;
      var st = states.get(el);
      if (!st) { st = { b: 0, vb: 0, d: 0, vd: 0, set: 0, warp: null }; states.set(el, st); }
      var tgt = el.__fxt || el, vs = it.vs; /* the filter works in the element's own pixels: far (small) cards get the matching boost, so every mode shows the panel's on-screen strength */
      spring(st, "b", f * c.blur * (.55 + sp * .9) / vs, .09, .82);
      spring(st, "d", f * c.distort * (.7 + sp * .6) / vs, .08, .84);
      var warp = st.d > .15;
      if (warp || st.b > .03) {
        active++; st.set = 1;
        var fl = "";
        if (warp) {
          if (!st.warp) st.warp = makeWarp(el, b);
          /* the noise field slides with the cursor, so the distortion flows like liquid instead of pulsing */
          st.warp.map.setAttribute("scale", (st.d * st.warp.k).toFixed(2));
          /* the noise field follows the cursor through a low-pass filter: raw pointer jumps made large text shimmer */
          if (st.ox === undefined) { st.ox = -dx * .35; st.oy = -dy * .35; }
          st.ox += (-dx * .35 - st.ox) * .12; st.oy += (-dy * .35 - st.oy) * .12;
          st.warp.off.setAttribute("dx", st.ox.toFixed(1)); st.warp.off.setAttribute("dy", st.oy.toFixed(1));
          fl = "url(#" + st.warp.id + ") ";
        }
        if (st.b > .03) fl += "blur(" + st.b.toFixed(2) + "px)";
        tgt.style.filter = fl;
      } else if (st.set) { tgt.style.filter = ""; st.set = 0; }
    }
    idle = active || inside ? 0 : idle + 1;
    if (inside || active || idle < 40) requestAnimationFrame(step); else run = false;
  }
  function kick() { if (!run) { run = true; requestAnimationFrame(step); } }

  function start() {
    if (!ENABLED) { if (TOP) panel(); return; }
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
    if (TOP) panel();
  }

  /* ---------- control panel ---------- */
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
      ["ircard", "Portfolio row: card size", 12, 50, 1, "% of width"],
      ["irgap", "Portfolio row: gap", 0, 80, 1, "px"],
      ["irn", "Portfolio row: cards", 3, 14, 1, ""],
      ["irdur", "Portfolio row: travel time", 1200, 8000, 100, "ms"],
      ["irgo", "Portfolio row starts at", 20, 100, 1, "% of seep"],
      ["itdelay", "Pause before the Twister (row gone)", 0, 6000, 100, "ms"],
      ["itdur", "Twister: rise time", 1200, 8000, 100, "ms"],
      ["itdist", "Twister: start distance below screen", 20, 200, 5, "vh"],
      ["itstart", "Twister: ribbon turn while rising", 0, 3000, 50, "px"],
      ["itui", "Navbar & menu appear after", 0, 6000, 100, "ms"],
      ["#", "Link hover"],
      ["ldur", "Duration", 300, 2000, 10, "ms"],
      ["ldist", "Slide distance", 0, 60, 1, "px"],
      ["lblur", "Link blur", 0, 10, .5, "px"],
      ["lstag", "Stagger", 0, 300, 5, "ms"],
      ["#", "About popup"],
      ["pliq", "Liquid appear", 0, 120, 1, "px"],
      ["pq", "Paper bend: 0 off, 1 light, 2 full", 0, 2, 1, ""],
      ["#", "Space"],
      ["fstep", "Depth spacing", 40, 220, 5, "%"],
      ["fnear", "Near distance", 200, 1000, 10, "px"],
      ["fsc", "Card size", 30, 110, 1, "%"],
      ["fx", "Spread across", 10, 80, 1, "%"],
      ["fy", "Spread up", 10, 80, 1, "%"],
      ["fbl", "Depth blur", 0, 30, 1, "px"],
      ["#", "Cross"],
      ["cfa", "Facing (0 = front)", 0, 80, 1, "\u00b0"],
      ["cdx", "Spacing across", 2, 16, .5, "%"],
      ["cdy", "Spacing up", 0, 20, .5, "%"],
      ["cdz", "Depth step", 0, 16, .5, "%"],
      ["cscl", "Card size", 40, 120, 1, "%"],
      ["cstep", "Scroll step", 10, 40, 1, "%"],
      ["clift", "Hover lift", 0, 30, .5, "%"],
      ["clz", "Hover forward", 0, 120, 1, "px"],
      ["cspr", "Hover spread", 0, 200, 5, "%"],
      ["cbl", "Depth blur", 0, 12, .5, "px"],
      ["#", "Globe"],
      ["grad", "Radius", 15, 60, 1, "%"],
      ["gsz", "Card size", 50, 150, 1, "%"],
      ["gbl", "Depth blur", 0, 20, 1, "px"],
      ["#", "Grid"],
      ["ggap", "Gap", 0, 64, 1, "px"],
      ["gstag", "Column stagger", 0, 300, 5, "px"],
      ["gpar", "Column parallax", 0, 60, 1, "%"],
      ["#", "Twister"],
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
      ircard: "Size of each portfolio card in the row, as a share of the screen width.", irgap: "Space between the portfolio cards.", irn: "How many portfolio cards pass by.",
      irdur: "Time the portfolio row takes to cross the screen.", irgo: "When the portfolio row starts, as a share of the red being absorbed. Lower starts it earlier.",
      itdelay: "How long the screen stays empty and black after the portfolio row has sunk off the left, before the Twister comes up.", itdur: "How long the whole ribbon takes to rise from below into place.",
      itdist: "How far below the screen the ribbon starts, in screen heights. 100 starts fully out of sight.", itstart: "How far the ribbon turns while it rises. 0 keeps it still, higher turns it more.",
      itui: "When the navbar and the mode menu fade in after the Twister starts rising.",
      radius: "Size of the liquid blob that follows the cursor.", softness: "How soft the blob's edge is. Lower is sharper.", brightness: "How bright the blob glows over the background.",
      trail: "Length of the blob's tail behind the cursor.", distort: "How strongly text and cards ripple when the cursor is near.", blur: "Soft blur added to components close to the cursor.",
      reach: "How far from the cursor components still react.",
      ldur: "How long the letter slide on links takes.", ldist: "How far letters travel while sliding in.", lblur: "Blur on the letters during the slide.", lstag: "Delay between one letter and the next.",
      pliq: "Ripple strength on the About card text while it moves.", pq: "Paper-bend effect on the About card while it is dragged. 0 off, 1 light, 2 full (heavier).",
      fstep: "Distance between items along the depth of Space. Higher spreads them further apart in depth.", fnear: "How close to the screen items get before they pass you.",
      fsc: "Size of every card in Space.", fx: "How far items spread left and right.", fy: "How far items spread up and down.", fbl: "Blur on items that are far away.",
      cfa: "How much the cards turn sideways. 0 faces you, higher turns them toward the left.", cdx: "Horizontal gap between neighbouring cards along the diagonal.",
      cdy: "Vertical gap between neighbouring cards along the diagonal.", cdz: "How quickly cards shrink toward the back. Higher makes the deck feel deeper.",
      cscl: "Size of every card in Cross.", cstep: "How far the deck moves for each scroll.", clift: "How high a hovered card rises.", clz: "How far a hovered card comes toward you.",
      cspr: "How far the neighbours of a hovered card move away.", cbl: "Blur on cards far at the back. 0 keeps them sharp.",
      grad: "Size of the globe relative to the screen.", gsz: "Size of every card on the globe.", gbl: "Blur on cards on the far side of the globe.",
      ggap: "Space between cards in the grid.", gstag: "Shifts every second column down to make the grid uneven.", gpar: "How much columns move at different speeds when you scroll.",
      twr: "Radius of the spiral. Smaller is a tighter, rounder curve.", twn: "How many slices each card is cut into. More is smoother but heavier.",
      twg: "Gap between neighbouring cards. 100 means they touch, higher opens gaps.", twp: "How steeply the ribbon climbs each turn. Lower packs the turns closer together.", twsc: "Size of every card in Twister."
    };
    var GALLERY = /^(c(fa|dx|dy|dz|scl|step|lift|lz|spr)|tw(r|p|sc|g|n)|f(step|near|bl|sc|x|y)|cbl|gsz|grad|gbl|ggap|gstag|gpar)$/;
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
    var UIKEY = KEY + "-ui2"; /* new key: the panel starts hidden again for everyone */
    function showUI(v) { ui.style.display = v ? "" : "none"; try { localStorage.setItem(UIKEY, v ? "1" : "0"); } catch (e) {} if (!v) ui.classList.remove("open"); }
    var shown = false;
    try { shown = localStorage.getItem(UIKEY) === "1"; } catch (e) {}
    if (/liquid/.test(location.hash)) shown = true;
    ui.style.display = shown ? "" : "none";
    addEventListener("keydown", function (e) {
      if (e.shiftKey && (e.key === "L" || e.key === "l") && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) { showUI(ui.style.display === "none"); if (ui.style.display !== "none") ui.classList.add("open"); }
    });
    var card = document.createElement("div"); card.className = "lq-card"; card.setAttribute("role", "group"); card.setAttribute("aria-label", "Liquid hover settings");
    card.innerHTML = '<div class="lq-title"><span>Liquid hover</span></div>';
    var inputs = {}, pages = {}, tabs = document.createElement("div"), cur = null;
    tabs.className = "lq-tabs";
    [["Cursor", "Cursor"], ["Link hover", "Links"], ["About popup", "Popup"], ["Intro", "Intro"], ["Space", "Space"], ["Cross", "Cross"], ["Globe", "Globe"], ["Grid", "Grid"], ["Twister", "Twist"]].forEach(function (t) {
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
    var cmsBtn = document.createElement("button"); cmsBtn.type = "button"; cmsBtn.textContent = "Open CMS"; cmsBtn.onclick = function () { location.href = "cms.html"; };
    actions.append(reset, toggle, copy, hide, cmsBtn); card.appendChild(actions);
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "lq-btn"; btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="lq-dot"></span><span>Liquid</span>';
    btn.onclick = function () { var o = ui.classList.toggle("open"); btn.setAttribute("aria-expanded", o); };
    addEventListener("keydown", function (e) { if (e.key === "Escape" && ui.classList.contains("open")) { ui.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } });
    if (!ENABLED) { var note = document.createElement("div"); note.style.cssText = "margin-top:8px;font-size:10px;color:rgba(242,242,242,.55);line-height:1.3"; note.textContent = "Hover effects need a mouse and motion enabled on this device."; card.appendChild(note); }
    ui.append(card, btn); document.body.appendChild(ui);
  }

  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
})();
