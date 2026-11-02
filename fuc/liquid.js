/* Liquid hover for the whole site, shared by the main page and the About page.
   1) A gooey blob trails the cursor over the background.
   2) Every nearby component (text, links, tabs, project cards) is dragged along with the cursor on springs,
      swells slightly and wobbles back, like objects floating in water. Only the individual CSS transform
      properties (translate / scale) and a light blur are used, so the components' own transforms are left alone. */
(function () {
  if (window.__liquid) return;
  window.__liquid = 1;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;

  var ABOUT = !!document.getElementById("about-overrides");
  var INK = ABOUT ? "11,11,11" : "242,242,242", ALPHA = ABOUT ? 0.12 : 0.08, BLEND = ABOUT ? "multiply" : "screen";
  var R = 230, SCALE = 5;                       /* influence radius (px) and canvas downscale */
  var mx = -9999, my = -9999, cvx = 0, cvy = 0, lastX = 0, lastY = 0, inside = false, run = false, idle = 0;

  /* ---------- background blob ---------- */
  var cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true });
  cv.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147482000;mix-blend-mode:" + BLEND;
  var N = 16, chain = [], head = { x: -9999, y: -9999, vx: 0, vy: 0 };
  for (var i = 0; i < N; i++) chain.push({ x: -9999, y: -9999 });
  function size() { cv.width = Math.ceil(innerWidth / SCALE); cv.height = Math.ceil(innerHeight / SCALE); }
  size(); addEventListener("resize", size);

  function drawBlob() {
    var W = cv.width, H = cv.height, s = 1 / SCALE;
    cx.clearRect(0, 0, W, H);
    if (!inside && Math.abs(head.vx) + Math.abs(head.vy) < .05 && idle > 40) return;
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, rad = 56 * s;
    for (var j = N - 1; j >= 0; j--) {
      var f = j / (N - 1), p = chain[j], r = rad * (.3 + .7 * Math.pow(1 - f, 1.2)), a = Math.pow(1 - f, 1.3);
      var x = p.x * s, y = p.y * s;
      var g = cx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(0,0,0," + a + ")"); g.addColorStop(.55, "rgba(0,0,0," + a * .6 + ")"); g.addColorStop(1, "rgba(0,0,0,0)");
      cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r, 0, 6.2832); cx.fill();
      minX = Math.min(minX, x - r); minY = Math.min(minY, y - r); maxX = Math.max(maxX, x + r); maxY = Math.max(maxY, y + r);
    }
    var x0 = Math.max(0, Math.floor(minX)), y0 = Math.max(0, Math.floor(minY)), x1 = Math.min(W, Math.ceil(maxX)), y1 = Math.min(H, Math.ceil(maxY));
    if (x1 <= x0 || y1 <= y0) return;
    var img = cx.getImageData(x0, y0, x1 - x0, y1 - y0), d = img.data, rgb = INK.split(",");
    /* threshold the soft alpha into a gooey edge */
    for (var k = 0; k < d.length; k += 4) {
      var t = (d[k + 3] / 255 - .3) / .3; t = t < 0 ? 0 : t > 1 ? 1 : t; t = t * t * (3 - 2 * t);
      d[k] = +rgb[0]; d[k + 1] = +rgb[1]; d[k + 2] = +rgb[2]; d[k + 3] = Math.round(t * ALPHA * 255);
    }
    cx.putImageData(img, x0, y0);
  }

  /* ---------- components ---------- */
  var states = new Map(), els = [], lastScan = 0;
  var SEL = ABOUT ? "h1,p,a[href],#about-close" : "nav a,nav span,[role=tab],#about-close";
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
    els = list.filter(function (e) { return !e.querySelector("p,h1,h2") || e.matches("a,span"); });
  }

  function spring(st, key, target, k, damp) {
    st["v" + key] = (st["v" + key] + (target - st[key]) * k) * damp;
    st[key] += st["v" + key];
  }

  function step(now) {
    scan(now);
    var vmag = Math.hypot(cvx, cvy);
    /* cursor velocity decays when the mouse is still */
    cvx *= .85; cvy *= .85;
    var active = 0;
    head.vx = (head.vx + (mx - head.x) * .09) * .78; head.vy = (head.vy + (my - head.y) * .09) * .78; head.x += head.vx; head.y += head.vy;
    chain[0].x = head.x; chain[0].y = head.y;
    for (var i = 1; i < N; i++) { chain[i].x += (chain[i - 1].x - chain[i].x) * .3; chain[i].y += (chain[i - 1].y - chain[i].y) * .3; }
    drawBlob();

    for (var n = 0; n < els.length; n++) {
      var el = els[n], b = el.getBoundingClientRect();
      if (b.bottom < -R || b.top > innerHeight + R || b.right < -R || b.left > innerWidth + R || b.width === 0) continue;
      var st = states.get(el);
      if (!st) { st = { x: 0, y: 0, s: 1, b: 0, sx: 0, sy: 0, vx: 0, vy: 0, vs: 0, vb: 0, vsx: 0, vsy: 0 }; states.set(el, st); }
      var ox = st.x, oy = st.y;
      /* distance from the cursor to the element's un-displaced centre */
      var ccx = b.left + b.width / 2 - ox, ccy = b.top + b.height / 2 - oy;
      var dx = ccx - mx, dy = ccy - my, dist = Math.hypot(dx, dy) || 1;
      var reach = R + Math.min(b.width, 320) / 2, f = inside ? Math.exp(-Math.pow(dist / reach, 2) * 1.6) : 0;
      /* subtle on purpose: a gentle drift away from the cursor, a hair of swelling, and a light blur that
         grows with how close and how fast the cursor is. The stretch follows the motion like a droplet. */
      var push = f * 2.2 / dist;
      spring(st, "x", dx * push + cvx * f * .1, .08, .82);
      spring(st, "y", dy * push + cvy * f * .1, .08, .82);
      spring(st, "s", 1 + f * .012, .08, .84);
      var sp = Math.min(1, Math.hypot(cvx, cvy) / 40);
      spring(st, "b", f * (.5 + sp * 1.1), .1, .8);
      spring(st, "sx", Math.min(.03, Math.abs(cvx) * f * .0007), .08, .84);
      spring(st, "sy", Math.min(.03, Math.abs(cvy) * f * .0007), .08, .84);
      var moving = Math.abs(st.vx) + Math.abs(st.vy) + Math.abs(st.vs) * 50 + Math.abs(st.x) + Math.abs(st.y) + Math.abs(st.s - 1) * 50 + st.b;
      var tgt = el.__fxt || (el.__fxt = el.style.zIndex && el.firstElementChild && el.style.position === "absolute" && el.style.top === "50%" ? el.firstElementChild : el);
      if (moving > .02) {
        active++;
        el.style.translate = st.x.toFixed(2) + "px " + st.y.toFixed(2) + "px";
        el.style.scale = (st.s + st.sx).toFixed(4) + " " + (st.s + st.sy).toFixed(4);
        tgt.style.filter = st.b > .04 ? "blur(" + st.b.toFixed(2) + "px)" : "";
      } else if (st.set) { el.style.translate = el.style.scale = ""; tgt.style.filter = ""; st.set = 0; continue; }
      st.set = 1;
    }
    idle = active || inside ? 0 : idle + 1;
    if (inside || active || idle < 40) requestAnimationFrame(step); else run = false;
  }
  function kick() { if (!run) { run = true; requestAnimationFrame(step); } }

  function start() {
    document.body.appendChild(cv);
    addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      if (!inside) { head.x = e.clientX; head.y = e.clientY; chain.forEach(function (p) { p.x = e.clientX; p.y = e.clientY; }); lastX = e.clientX; lastY = e.clientY; }
      cvx = Math.max(-60, Math.min(60, (e.clientX - lastX) * .8 + cvx * .2)); cvy = Math.max(-60, Math.min(60, (e.clientY - lastY) * .8 + cvy * .2));
      lastX = e.clientX; lastY = e.clientY; mx = e.clientX; my = e.clientY; inside = true; kick();
    }, { passive: true });
    document.addEventListener("pointerleave", function () { inside = false; kick(); });
    document.addEventListener("mouseleave", function () { inside = false; kick(); });
  }
  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
})();
