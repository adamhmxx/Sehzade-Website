/* Loading entrance, stand-alone: red screen with the liquid "SEHZADE", a progress line, then the text melts away while black
   liquid wells up and the red sinks. It ends on the plain black background (the state the site continues from) and fires
   a "loading-done" event. Press R (or add #loop) to replay. Every number below can be edited. */
(function () {
  var CFG = {
    min: 3300,          /* shortest time the loading screen stays (ms) */
    line: 2,            /* loading line thickness (px) */
    letterDelay: 250, letterTime: 1100, letterStagger: 85,           /* SEHZADE letters rising (ms) */
    liquid: 9, liquidBurst: 22, liquidBurstTime: 2600,               /* ripple on the letters: steady, opening burst (px), how long the burst takes */
    exitTime: 1100, exitMelt: 70, exitStagger: 50,                   /* text leaving: time (ms), liquid melt (px), letter stagger (ms) */
    wipeTime: 3200, wipeStagger: 100, wipeSoft: 22, wipeWobble: 110  /* red to black: blob grow time (ms), start spacing (%), goo softness (px), edge wobble */
  };
  var intro = document.getElementById("intro"), big = intro.querySelector(".in-big"), pct = intro.querySelector(".in-pct"),
      bar = intro.querySelector(".in-line i"), line = intro.querySelector(".in-line"), liqO = document.getElementById("in-liq-o"),
      liqD = document.getElementById("in-liq-d"), edgeB = document.getElementById("in-edge-b"), holes = document.getElementById("in-holes"),
      red = document.getElementById("in-red"), hint = document.getElementById("hint");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, T0 = performance.now(), W = innerWidth, H = innerHeight;
  function setA(el, k, v) { if (el) el.setAttribute(k, v); }

  /* the word always spans the full screen width */
  function fit() {
    var m = parseFloat(getComputedStyle(big).left) || 24;
    big.style.fontSize = "100px";
    var w = big.getBoundingClientRect().width;
    if (w > 0) big.style.fontSize = (100 * (innerWidth - 2 * m) / w).toFixed(2) + "px";
  }
  line.style.height = CFG.line + "px"; setA(edgeB, "stdDeviation", CFG.wipeSoft);
  "SEHZADE".split("").forEach(function (c, i) {
    var sp = document.createElement("span"); sp.textContent = c; big.appendChild(sp);
    sp.animate([{ transform: "translateY(105%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
      { duration: reduce ? 1 : CFG.letterTime, delay: (reduce ? 0 : CFG.letterDelay) + i * CFG.letterStagger, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
  });
  fit(); addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  /* progress: real signals (fonts, page load), never faster than the minimum show time */
  var target = 8, p = 0, last = T0, finished = false, MIN = reduce ? 600 : CFG.min;
  function stage(v) { if (v > target) target = v; }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { stage(45); });
  function loaded() { stage(75); setTimeout(function () { stage(100); }, 400); }
  if (document.readyState === "complete") loaded(); else addEventListener("load", loaded);

  var exitT0 = 0, wiping = false, wipeActive = false;
  function liquid(now) {
    var t = now - T0, pulse = reduce ? 0 : Math.max(0, 1 - t / CFG.liquidBurstTime), ek = 0;
    if (exitT0) { ek = Math.max(0, Math.min(1, (now - exitT0) / CFG.exitTime)); ek *= ek; }
    setA(liqD, "scale", (reduce ? 0 : CFG.liquid + CFG.liquidBurst * pulse + 4 * Math.sin(t / 700) + CFG.exitMelt * ek).toFixed(1));
    setA(liqO, "dx", (Math.sin(t / 900) * 90).toFixed(1)); setA(liqO, "dy", (t / 18 % 400).toFixed(1));
  }
  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    liquid(now);
    if (!finished) {
      var cap = Math.min(100, (now - T0) / MIN * 100);
      p = Math.min(target, cap, p + Math.max((target - p) * 2.4, 12) * dt);
      pct.textContent = Math.floor(p) + "%"; bar.style.transform = "scaleX(" + (p / 100).toFixed(4) + ")";
      if (p >= 99.9 && target >= 100) { finished = true; pct.textContent = "100%"; bar.style.transform = "scaleX(1)"; setTimeout(wipe, 250); }
    }
    if (!wiping || wipeActive) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* red -> black: the text melts away while black blobs well up from the bottom and merge (gooey mask) */
  function wipe() {
    holes.setAttribute("filter", "url(#in-edge)"); wiping = true; wipeActive = true; intro.classList.add("out"); exitT0 = performance.now();
    [].forEach.call(big.children, function (sp, i) {
      sp.animate([{ transform: "translateY(0)", opacity: 1, filter: "blur(0px)" }, { transform: "translateY(60%)", opacity: 0, filter: "blur(6px)" }],
        { duration: reduce ? 1 : CFG.exitTime, delay: reduce ? 0 : i * CFG.exitStagger, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" });
    });
    var NS = "http://www.w3.org/2000/svg", R = Math.hypot(W, H), els = [], pts = [], N = 8, i, st = CFG.wipeStagger / 100;
    for (i = 0; i < N; i++) pts.push([W * (i + .5) / N + (i % 2 ? 1 : -1) * W * .02, H * (1.02 + (i % 3) * .03), 1.0 + (i % 3) * .12, (80 + Math.abs(i - N / 2 + .5) * 150 + (i % 2) * 90) * st]);
    pts.push([W * .3, H * .45, .85, 1100 * st], [W * .75, H * .35, .9, 1400 * st]);
    pts.forEach(function (q) { var e = document.createElementNS(NS, "ellipse"); e.setAttribute("fill", "#000"); e.setAttribute("cx", q[0]); e.setAttribute("cy", q[1]); e.setAttribute("rx", 0); e.setAttribute("ry", 0); holes.appendChild(e); els.push(e); });
    var D = reduce ? 400 : CFG.wipeTime, s0 = performance.now(), wob = CFG.wipeWobble / 1000;
    function sm(t) { return .5 - .5 * Math.cos(Math.PI * t); }
    (function step(now) {
      var t = now - s0, all = true;
      els.forEach(function (e, i) {
        var k = Math.max(0, Math.min(1, (t - pts[i][3]) / D)), r = sm(sm(k) * .35 + k * .65) * R * pts[i][2] * .62, tw = (t - pts[i][3]) / 1000;
        e.setAttribute("rx", (r * (1 + wob * Math.sin(tw * 1.6 + i * 1.7))).toFixed(1)); e.setAttribute("ry", (r * 1.05 * (1 + wob * Math.sin(tw * 1.2 + i * 2.3 + 1))).toFixed(1)); if (k < 1) all = false;
      });
      liquid(now);
      if (!all) return requestAnimationFrame(step);
      wipeActive = false; red.setAttribute("display", "none"); intro.style.display = "none";
      hint.classList.add("on"); window.dispatchEvent(new Event("loading-done"));
      if (/loop/.test(location.hash)) setTimeout(function () { location.reload(); }, 1500);
    })(performance.now());
  }
  addEventListener("keydown", function (e) { if (e.key === "r" || e.key === "R") location.reload(); });
})();
