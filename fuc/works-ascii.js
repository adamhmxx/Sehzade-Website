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
  /* the portrait is ONE object, 60vh tall (it follows the height of the screen), centred; its lines are drawn once into an off-screen canvas */
  var VH = .6;
  function size() {
    var r = box.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === cw && h === ch) return; cw = w; ch = h;
    cv.width = txt.width = mk.width = w; cv.height = txt.height = mk.height = h;
    var n = rows.length, cols = 0; rows.forEach(function (l) { cols = Math.max(cols, l.length); });
    var oh = innerHeight * VH, lh = oh / n, fs = lh * 1.02, cwid = fs * .6, pw = cols * cwid, ox = (w - pw) / 2, oy = (h - oh) / 2;
    tctx.clearRect(0, 0, w, h); tctx.fillStyle = "#fff"; tctx.font = fs.toFixed(2) + 'px "Courier New", ui-monospace, monospace'; tctx.textBaseline = "top";
    for (var i = 0; i < n; i++) { var l = rows[i]; if (/^\s*$/.test(l)) continue; tctx.fillText(l, ox, oy + i * lh); }
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
    addEventListener("resize", function () { if (box) { cw = 0; size(); } });
  }
  if (document.readyState === "complete") setTimeout(start, 300); else addEventListener("load", function () { setTimeout(start, 300); });
})();
