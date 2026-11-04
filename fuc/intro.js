/* Loading sequence: red screen with a big liquid "SEHZADE" bottom left, a progress line through the middle, then the red turns
   black as a slow liquid wipe, the portfolio row slides from the right and sinks off the left, the Twister ribbon rises in
   twisting from below, and last the navbar and the mode menu appear. Add #nointro to the address to skip it. */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains("intro-on")) return;
  var intro = document.getElementById("intro"), row = document.getElementById("intro-row");
  if (!intro) { root.classList.remove("intro-on", "intro-ui"); return; }
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, T0 = performance.now(), W = innerWidth, H = innerHeight;
  var C = window.__introCfg || { min: 3000, lstag: 85, lrise: 1000, lstr: 22, ldecay: 2400, hold: 150, wdur: 2000, wstag: 200, rdur: 1700, rn: 9, rsz: 26, rov: 70, tdur: 2800, tstart: 1600, trise: 90, udel: 500 }; /* tuned from the Shift+I panel */
  function $(s, r) { return (r || document).querySelector(s); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function setA(el, k, v) { if (el) el.setAttribute(k, v); }
  var big = $(".in-big", intro), pct = $(".in-pct", intro), bar = $(".in-line i", intro),
      liqO = $("#in-liq-o"), liqD = $("#in-liq-d"), edgeO = $("#in-edge-o"), holes = $("#in-holes"), red = $("#in-red");
  "SEHZADE".split("").forEach(function (c, i) {
    var sp = document.createElement("span"); sp.textContent = c; big.appendChild(sp);
    sp.animate([{ transform: "translateY(105%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
      { duration: reduce ? 1 : C.lrise, delay: (reduce ? 0 : 250) + i * C.lstag, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
  });

  /* ---- progress: real signals, but never faster than the minimum show time ---- */
  var target = 8, p = 0, last = T0, finished = false, MIN = reduce ? 600 : C.min;
  function stage(v) { if (v > target) target = v; }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { stage(45); });
  if (document.readyState === "complete") stage(75); else addEventListener("load", function () { stage(75); });
  var seenGal = 0, poll = setInterval(function () {
    if (window.__galK && window.__galK.current) { if (!seenGal) seenGal = performance.now(); stage(92); if (performance.now() - seenGal > 500) stage(100); }
    if (performance.now() - T0 > 9000) stage(100); /* never hang */
  }, 120);

  var liqT0 = T0;
  function liquid(now) {
    var t = now - liqT0, pulse = reduce ? 0 : Math.max(0, 1 - t / C.ldecay);
    setA(liqD, "scale", (reduce ? 0 : 9 + C.lstr * pulse + 4 * Math.sin(t / 700)).toFixed(1));
    setA(liqO, "dx", (Math.sin(t / 900) * 90).toFixed(1)); setA(liqO, "dy", (t / 18 % 400).toFixed(1));
  }
  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    liquid(now);
    if (!finished) {
      var cap = Math.min(100, (now - T0) / MIN * 100);
      p = Math.min(target, cap, p + Math.max((target - p) * 2.4, 12) * dt);
      pct.textContent = Math.floor(p) + "%"; bar.style.transform = "scaleX(" + (p / 100).toFixed(4) + ")";
      if (p >= 99.9 && target >= 100) { finished = true; pct.textContent = "100%"; bar.style.transform = "scaleX(1)"; setTimeout(wipe, C.hold); }
    }
    if (!wiping || wipeActive) requestAnimationFrame(frame);
  }
  var wiping = false, wipeActive = false;
  requestAnimationFrame(frame);

  /* ---- red -> black as a slow liquid wipe (blobs with turbulent edges growing from several points) ---- */
  function wipe() {
    clearInterval(poll); wiping = true; wipeActive = true; intro.classList.add("out");
    var NS = "http://www.w3.org/2000/svg", R = Math.hypot(W, H), pts = [[0, H, 1.4, 0], [W * .72, H * .3, 1.15, C.wstag], [W * .18, H * .15, 1.0, C.wstag * 2]], els = [];
    pts.forEach(function (q) { var e = document.createElementNS(NS, "ellipse"); e.setAttribute("fill", "#000"); e.setAttribute("cx", q[0]); e.setAttribute("cy", q[1]); e.setAttribute("rx", 0); e.setAttribute("ry", 0); holes.appendChild(e); els.push(e); });
    var D = reduce ? 400 : C.wdur, s0 = performance.now();
    (function step(now) {
      var t = now - s0, all = true;
      els.forEach(function (e, i) {
        var k = Math.max(0, Math.min(1, (t - pts[i][3]) / D)), r = ease(k) * R * pts[i][2];
        e.setAttribute("rx", r.toFixed(1)); e.setAttribute("ry", (r * .92).toFixed(1)); if (k < 1) all = false;
      });
      setA(edgeO, "dx", (Math.sin(t / 600) * 120).toFixed(1)); setA(edgeO, "dy", (t / 8 % 600).toFixed(1));
      liquid(now);
      if (!all) return requestAnimationFrame(step);
      wipeActive = false; red.setAttribute("display", "none"); intro.style.display = "none"; row_start();
    })(performance.now());
  }

  /* ---- portfolio row: from the right, across, and sinks off the left ---- */
  function items() {
    var a = (window.__cmsItems && window.__cmsItems()) || window.__cmsDefaults || [];
    return [].filter.call(a, function (it) { return it && it.image && it.image.src; });
  }
  function row_start() {
    var list = items(), rw = $(".rw", row);
    if (!list.length || reduce) return reveal();
    var cw = Math.max(120, W * C.rsz / 100), ch = cw * .75, n = C.rn;
    rw.style.marginTop = (-ch / 2) + "px";
    for (var i = 0; i < n; i++) { var d = document.createElement("div"); d.style.cssText = "width:" + cw + "px;height:" + ch + "px;background-image:url(" + list[i % list.length].image.src + ")"; rw.appendChild(d); }
    row.style.display = "block";
    var total = n * (cw + 16), x0 = W + 40, x1 = -total - 40, D = C.rdur, s0 = performance.now();
    var shown = false;
    (function step(now) {
      var k = Math.min(1, (now - s0) / D), x = x0 + (x1 - x0) * ease(k);
      rw.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
      if (!shown && k >= C.rov / 100) { shown = true; reveal(); } /* the ribbon starts coming in while the row is still leaving */
      if (k < 1) return requestAnimationFrame(step);
      row.style.display = "none"; if (!shown) reveal();
    })(performance.now());
  }

  /* ---- the ribbon twists in from below, then the navbar and menu ---- */
  function reveal() {
    var gk = window.__galK && window.__galK.current, tl = $('[role="tablist"]'), cont = tl && tl.closest('div[style*="overflow"]');
    var START = C.tstart, D = C.tdur, s0 = performance.now();
    if (gk) { gk.ox = gk.tx = START; }
    root.classList.remove("intro-on");
    if (cont && cont.animate) cont.animate([{ transform: "translateY(" + C.trise + "vh)" }, { transform: "none" }], { duration: D, easing: "cubic-bezier(.22,1,.36,1)" });
    (function step(now) {
      var k = Math.min(1, (now - s0) / D), v = START * (1 - easeOut(k));
      if (gk) { gk.ox = v; gk.tx = v; }
      if (k < 1) return requestAnimationFrame(step);
      if (gk) { gk.ox = 0; gk.tx = 0; }
    })(performance.now());
    setTimeout(function () { root.classList.remove("intro-ui"); window.dispatchEvent(new Event("intro-done")); }, reduce ? 100 : C.udel);
  }
})();
