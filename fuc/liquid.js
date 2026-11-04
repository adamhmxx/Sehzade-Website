/* Liquid hover for the whole site (main page and About page), 
   - A soft liquid blob trails the cursor over the background.
   - Components near the cursor get a light blur that follows how close and how fast the cursor is.
   Nothing moves or resizes: only the blob and the blur. The values are fixed in DEF below. */
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
  var KEY = "liquid-cfg-v1";
  function load() { return Object.assign({}, DEF); } /* the values above are final; there is no control panel any more */
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
        if (st.position === "absolute" && st.top === "50%" && st.left === "50%" && st.zIndex) list.push(d);   /* gallery cards */
        else if (st.zIndex === "7000") [].forEach.call(d.children, function (c) { list.push(c); });           /* project caption */
      });
    }
    /* forget components React has removed, together with their filters */
    states.forEach(function (st, el) { if (!el.isConnected) { if (st.warp) { var f = document.getElementById(st.warp.id); if (f) f.remove(); } states.delete(el); } });
    els = list.filter(function (e) { return !e.closest("#liquid-ui") && (!e.querySelector("p,h1,h2") || e.matches("a,span")); });
  }
  var NS = "http://www.w3.org/2000/svg", defs = null, fid = 0;
  function makeWarp(el, b, vOnly) {
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
      '<feOffset in="n" dx="0" dy="0" result="o0"/>' + (vOnly ? '<feComponentTransfer in="o0" result="o"><feFuncR type="linear" slope="0" intercept=".5"/></feComponentTransfer>' : '<feOffset in="o0" dx="0" dy="0" result="o"/>') +
      '<feDisplacementMap in="SourceGraphic" in2="o" scale="0" xChannelSelector="R" yChannelSelector="G" result="w"/>' +
      '<feGaussianBlur in="w" stdDeviation="0.45"/>';
    defs.appendChild(f);
    /* small text gets a fraction of the strength a large card gets, so every component distorts to the same degree visually */
    return { id: id, off: f.children[1], map: f.querySelector("feDisplacementMap"), k: ABOUT || (el.__fxt && el.__fxt !== el) || (el.closest && el.closest(".ab-card")) ? 1 : Math.max(.25, Math.min(1, Math.min(b.width, b.height) / 300)) };
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
      var edge = Math.max(0, dist - Math.min(b.width, 260) / 2), tg = el.children.length > 2 ? el : el.__fxt || (el.__fxt = el.style.zIndex && el.firstElementChild && el.style.position === "absolute" && el.style.top === "50%" ? el.firstElementChild : el);
      near.push({ el: el, b: b, vs: tg === el ? 1 : Math.max(.3, Math.min(1.2, b.width / (tg.offsetWidth || b.width))), dx: dx, dy: dy, f: inside && c.on && !drag_ && !behindCard(el) && !(TOP && window.__abBusy && el.closest && el.closest(".ab-card")) ? Math.exp(-Math.pow(edge / reach, 2) * 1.8) : 0 });
    }
    /* filters are expensive: only the few components closest to the cursor get one, the rest relax back to normal */
    near.sort(function (a, z) { return z.f - a.f; });
    for (var q = 0; q < near.length; q++) {
      var it = near[q], el = it.el, b = it.b, dx = it.dx, dy = it.dy, multi = el.children.length > 2, f = q < (multi ? 2 : 6) ? it.f : 0; /* multi: a card made of slices (Twister), the filter goes on every slice, only for the two nearest cards */
      var st = states.get(el);
      if (!st) { st = { b: 0, vb: 0, d: 0, vd: 0, set: 0, warp: null }; states.set(el, st); }
      var tgt = multi ? el : el.__fxt || el, vs = it.vs; /* the filter works in the element's own pixels: far (small) cards get the matching boost, so every mode shows the panel's on-screen strength */
      spring(st, "b", f * c.blur * (.55 + sp * .9) / vs, .09, .82);
      spring(st, "d", f * c.distort * (.7 + sp * .6) / vs, .08, .84);
      var warp = st.d > .15;
      if (warp || st.b > .03) {
        active++; st.set = 1;
        var fl = "";
        if (warp) {
          if (multi) {
            /* a card made of slices (Twister): an SVG filter would cut and soften every slice edge and open seams, so the liquid is a travelling wave:
               each slice is nudged vertically by a smooth sine, driven by the cursor (transform only, no filter, no seams) */
            var kids = el.children, ph = now * .004 + (-dx) * .012, A = st.d * .3;
            for (var wi = 0; wi < kids.length; wi++) kids[wi].style.translate = "0 " + (A * (.7 * Math.sin(wi * .14 + ph) + .3 * Math.sin(wi * .31 - ph * 1.4))).toFixed(2) + "px";
            continue;
          }
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
        if (!multi) tgt.style.filter = fl;
      } else if (st.set) { if (multi) { for (var cj = 0; cj < el.children.length; cj++) { el.children[cj].style.filter = ""; el.children[cj].style.translate = ""; } } else tgt.style.filter = ""; st.set = 0; }
    }
    idle = active || inside ? 0 : idle + 1;
    if (inside || active || idle < 40) requestAnimationFrame(step); else run = false;
  }
  function kick() { if (!run) { run = true; requestAnimationFrame(step); } }

  function start() {
    if (!ENABLED) return;
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
  }


  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
})();
