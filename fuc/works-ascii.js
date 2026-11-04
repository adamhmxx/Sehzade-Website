/* Works page: the ASCII portrait of the About card is hidden behind the portfolio and revealed by a soft liquid spotlight under
   the cursor, in white at 10% opacity. Only for devices with a mouse, and never while the About card is open. */
(function () {
  if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.__asciiRows || !window.__asciiRows.length) return;
  var rows = window.__asciiRows, cv, ctx, txt, tctx, mk, mctx, box, cw = 0, ch = 0, run = false, idle = 0, mx = -1e4, my = -1e4, lx = null, ly = null, inside = false, ready = false;
  var OPACITY = .1; /* white, 10% */

  function find() {
    var tl = document.querySelector('[role="tablist"]'); return tl && tl.closest('div[style*="overflow"]');
  }
  function build() {
    box = find(); if (!box) return false;
    cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;opacity:" + OPACITY + ";z-index:0";
    box.insertBefore(cv, box.firstChild); ctx = cv.getContext("2d");
    txt = document.createElement("canvas"); tctx = txt.getContext("2d"); mk = document.createElement("canvas"); mctx = mk.getContext("2d");
    size(); return true;
  }
  /* the portrait is one object, 50% of the screen height and flush with the bottom edge; its lines are drawn once into an off-screen canvas */
  function size() {
    var r = box.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === cw && h === ch) return; cw = w; ch = h;
    cv.width = txt.width = mk.width = w; cv.height = txt.height = mk.height = h;
    /* only the drawn part of the portrait counts: its bounding box is scaled to the full height of the screen and set flush with the bottom edge, centred sideways */
    /* the art holds two separate figures (a blank band between them): only the densest one is used, so there is exactly one object */
    var n = rows.length, r0 = n, r1 = -1, c0 = 1e9, c1 = -1, best = -1, cur = null, groups = [];
    rows.forEach(function (l, i) {
      var k = l.replace(/\s/g, "").length;
      if (!k) { if (cur && i - cur.last > 2) { groups.push(cur); cur = null; } return; }
      if (cur && i - cur.last > 2) { groups.push(cur); cur = null; }
      if (!cur) cur = { a: i, last: i, ink: 0 }; cur.last = i; cur.ink += k;
    });
    if (cur) groups.push(cur);
    groups.forEach(function (g) { if (g.ink > best) { best = g.ink; r0 = g.a; r1 = g.last; } });
    for (var ri = r0; ri <= r1 && r1 >= 0; ri++) { var l2 = rows[ri], a2 = l2.search(/\S/); if (a2 < 0) continue; c0 = Math.min(c0, a2); c1 = Math.max(c1, l2.replace(/\s+$/, "").length); }
    if (r1 < 0) return;
    var HF = .5, lh = h * HF / (r1 - r0 + 1), fs = lh * 1.02, cwid = fs * .6, ox = (w - (c1 - c0) * cwid) / 2 - c0 * cwid, oy = h * (1 - HF) - r0 * lh; /* HF: height as a share of the screen (50%), bottom-flush */
    tctx.clearRect(0, 0, w, h); tctx.fillStyle = "#fff"; tctx.font = fs.toFixed(2) + 'px "Courier New", ui-monospace, monospace'; tctx.textBaseline = "top";
    for (var i = r0; i <= r1; i++) { var l = rows[i]; if (/^\s*$/.test(l)) continue; tctx.fillText(l, ox, oy + i * lh); }
    mctx.clearRect(0, 0, w, h);
  }
  function dab(x, y, rad, a) {
    var g = mctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, "rgba(255,255,255," + a + ")"); g.addColorStop(.5, "rgba(255,255,255," + (a * .75) + ")"); g.addColorStop(1, "rgba(255,255,255,0)");
    mctx.fillStyle = g; mctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  function step() {
    if (!box || !box.isConnected) { run = false; return; }
    size();
    var r = box.getBoundingClientRect(), x = mx - r.left, y = my - r.top, active = inside && !window.__abOpen;
    /* the spotlight fades out slowly behind the cursor, so it leaves a soft liquid trail */
    mctx.globalCompositeOperation = "destination-out"; mctx.fillStyle = "rgba(0,0,0,.045)"; mctx.fillRect(0, 0, cw, ch);
    mctx.globalCompositeOperation = "source-over";
    if (active) {
      if (lx === null) { lx = x; ly = y; }
      var d = Math.hypot(x - lx, y - ly), n = Math.max(1, Math.ceil(d / 18));
      for (var i = 1; i <= n; i++) dab(lx + (x - lx) * i / n, ly + (y - ly) * i / n, 150, .55);
      lx = x; ly = y; idle = 0;
    } else { lx = null; idle++; }
    ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, cw, ch); ctx.drawImage(txt, 0, 0);
    ctx.globalCompositeOperation = "destination-in"; ctx.drawImage(mk, 0, 0); ctx.globalCompositeOperation = "source-over";
    if (active || idle < 160) requestAnimationFrame(step); else { run = false; ctx.clearRect(0, 0, cw, ch); }
  }
  function kick() { if (!run) { run = true; requestAnimationFrame(step); } }
  function start() {
    if (ready) return; if (!build()) return setTimeout(start, 400); ready = true;
    addEventListener("pointermove", function (e) { if (e.pointerType === "touch") return; mx = e.clientX; my = e.clientY; inside = true; kick(); }, { passive: true });
    document.addEventListener("pointerleave", function () { inside = false; });
    addEventListener("resize", function () { if (box) size(); });
  }
  if (document.readyState === "complete") setTimeout(start, 300); else addEventListener("load", function () { setTimeout(start, 300); });
})();
