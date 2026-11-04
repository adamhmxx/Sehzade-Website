/* Loading sequence: red screen with a big liquid "SEHZADE" bottom left, a progress line through the middle, then the red turns
   black as a slow liquid wipe, the portfolio row slides from the right and sinks off the left, the Twister ribbon rises in
   twisting from below, and last the navbar and the mode menu appear. Add #nointro to the address to skip it. */
(function () {
  /* every value of the loading sequence; the Liquid panel (Shift+L, tab "Intro") edits them and "Replay intro" runs it again */
  var DEF = { imin: 2400, iline: 2, iltr: 1100, ildl: 600, ilst: 50, iliq: 10, iliqp: 10, iliqd: 3100, ioutd: 1000, ioutl: 80, ioutst: 50,
    iwdur: 3300, iwst: 130, iwsoft: 50, iwedge: 300, ircard: 26, irdur: 3600, irgap: 16, irn: 9, irgo: 62, itstag: 150, itcdur: 1800, itdist: 100, itstart: 500, itgo: 80, itui: 2200 };
  window.__introDef = DEF;
  function cfg(k) { try { var sv = JSON.parse(localStorage.getItem("liquid-cfg-v1") || "{}"); if (sv[k] !== undefined) return +sv[k]; } catch (e) {} return DEF[k]; }
  var root = document.documentElement;
  if (!root.classList.contains("intro-on")) return;
  var intro = document.getElementById("intro"), row = document.getElementById("intro-row");
  if (!intro) { root.classList.remove("intro-on", "intro-ui"); return; }
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, T0 = performance.now(), W = innerWidth, H = innerHeight;
  function $(s, r) { return (r || document).querySelector(s); }
  function twist(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; } /* gentle start, long soft landing */
  function setA(el, k, v) { if (el) el.setAttribute(k, v); }
  var big = $(".in-big", intro), pct = $(".in-pct", intro), bar = $(".in-line i", intro),
      edgeB = $("#in-edge-b"), line = $(".in-line", intro), liqO = $("#in-liq-o"), liqD = $("#in-liq-d"), holes = $("#in-holes"), red = $("#in-red");
  line.style.height = cfg("iline") + "px";
  setA(edgeB, "stdDeviation", cfg("iwsoft"));
  "SEHZADE".split("").forEach(function (c, i) {
    var sp = document.createElement("span"); sp.textContent = c; big.appendChild(sp);
    sp.animate([{ transform: "translateY(105%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
      { duration: reduce ? 1 : cfg("iltr"), delay: (reduce ? 0 : cfg("ildl")) + i * cfg("ilst"), easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
  });

  /* the word always spans the full screen width: measure it at a known size, then scale the font to fill the space between the side margins */
  function fit() {
    var m = parseFloat(getComputedStyle(big).left) || 24;
    big.style.fontSize = "100px";
    var w = big.getBoundingClientRect().width;
    if (w > 0) big.style.fontSize = (100 * (innerWidth - 2 * m) / w).toFixed(2) + "px";
  }
  fit(); addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  /* ---- progress: real signals, but never faster than the minimum show time ---- */
  var target = 8, p = 0, last = T0, finished = false, MIN = reduce ? 600 : cfg("imin");
  function stage(v) { if (v > target) target = v; }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { stage(45); });
  if (document.readyState === "complete") stage(75); else addEventListener("load", function () { stage(75); });
  var seenGal = 0, poll = setInterval(function () {
    if (window.__galK && window.__galK.current) { if (!seenGal) seenGal = performance.now(); stage(92); if (performance.now() - seenGal > 500) stage(100); }
    if (performance.now() - T0 > 9000) stage(100); /* never hang */
  }, 120);

  var liqT0 = T0, exitT0 = 0;
  function liquid(now) {
    var t = now - liqT0, pulse = reduce ? 0 : Math.max(0, 1 - t / cfg("iliqd")), ek = 0;
    /* while the text leaves, the liquid distortion keeps growing so the letters melt away instead of just fading */
    if (exitT0) { ek = Math.max(0, Math.min(1, (now - exitT0) / cfg("ioutd"))); ek = ek * ek; }
    setA(liqD, "scale", (reduce ? 0 : cfg("iliq") + cfg("iliqp") * pulse + 4 * Math.sin(t / 700) + cfg("ioutl") * ek).toFixed(1));
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
  var wiping = false, wipeActive = false;
  requestAnimationFrame(frame);

  /* ---- red -> black: the red sinks as black liquid wells up from the bottom and the blobs melt into each other (gooey mask) ---- */
  function wipe() {
    clearInterval(poll); holes.setAttribute("filter", "url(#in-edge)"); wiping = true; wipeActive = true; intro.classList.add("out"); exitT0 = performance.now();
    [].forEach.call(big.children, function (sp, i) {
      sp.animate([{ transform: "translateY(0)", opacity: 1, filter: "blur(0px)" }, { transform: "translateY(60%)", opacity: 0, filter: "blur(6px)" }],
        { duration: reduce ? 1 : cfg("ioutd"), delay: reduce ? 0 : i * cfg("ioutst"), easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" });
    });
    var NS = "http://www.w3.org/2000/svg", R = Math.hypot(W, H), els = [], pts = [], N = 8, i;
    /* a row of blobs along the bottom edge, rising one after another, plus two that come in higher up to close the gaps */
    for (i = 0; i < N; i++) pts.push([W * (i + .5) / N + (i % 2 ? 1 : -1) * W * .02, H * (1.02 + (i % 3) * .03), 1.0 + (i % 3) * .12, (80 + Math.abs(i - N / 2 + .5) * 150 + (i % 2) * 90) * cfg("iwst") / 100]);
    pts.push([W * .3, H * .45, .85, 1100 * cfg("iwst") / 100], [W * .75, H * .35, .9, 1400 * cfg("iwst") / 100]);
    pts.forEach(function (q) { var e = document.createElementNS(NS, "ellipse"); e.setAttribute("fill", "#000"); e.setAttribute("cx", q[0]); e.setAttribute("cy", q[1]); e.setAttribute("rx", 0); e.setAttribute("ry", 0); holes.appendChild(e); els.push(e); });
    var D = reduce ? 400 : cfg("iwdur"), s0 = performance.now(), rowGo = false, END = Math.max.apply(null, pts.map(function (q) { return q[3]; })) + D;
    function sm(t) { return .5 - .5 * Math.cos(Math.PI * t); } /* sine in-out: no hard start, no hard stop */
    (function step(now) {
      var t = now - s0, all = true;
      els.forEach(function (e, i) {
        var k = Math.max(0, Math.min(1, (t - pts[i][3]) / D)), r = sm(sm(k) * .35 + k * .65) * R * pts[i][2] * .62;
        /* each blob breathes a little, so the melting edge keeps flowing without any costly noise filter */
        var wob = cfg("iwedge") / 1000, tw = (t - pts[i][3]) / 1000;
        e.setAttribute("rx", (r * (1 + wob * Math.sin(tw * 1.6 + i * 1.7))).toFixed(1)); e.setAttribute("ry", (r * 1.05 * (1 + wob * Math.sin(tw * 1.2 + i * 2.3 + 1))).toFixed(1)); if (k < 1) all = false;
      });
      liquid(now);
      /* the portfolio row starts while the last of the red is still draining, so there is no dead pause */
      if (!rowGo && t > END * cfg("irgo") / 100) { rowGo = true; row_start(); }
      if (!all) return requestAnimationFrame(step);
      wipeActive = false; red.setAttribute("display", "none"); intro.style.display = "none"; if (!rowGo) { rowGo = true; row_start(); }
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
    var cw = Math.max(160, Math.min(520, W * cfg("ircard") / 100)), ch = cw * .75, n = Math.min(list.length, cfg("irn")), gap = cfg("irgap");
    rw.style.gap = gap + "px";
    rw.style.marginTop = (-ch / 2) + "px";
    for (var i = 0; i < n; i++) { var d = document.createElement("div"); d.style.cssText = "width:" + cw + "px;height:" + ch + "px;background-image:url(" + list[i].image.src + ")"; rw.appendChild(d); }
    row.style.display = "block";
    var total = n * (cw + gap), x0 = W + 40, x1 = -total - 40, D = cfg("irdur"), s0 = performance.now(), go = false;
    (function step(now) {
      var k = Math.min(1, (now - s0) / D), x = x0 + (x1 - x0) * (.5 - .5 * Math.cos(Math.PI * k));
      if (!go && k > cfg("itgo") / 100) { go = true; reveal(); }
      rw.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
      if (k < 1) return requestAnimationFrame(step);
      row.style.display = "none"; if (!go) reveal();
    })(performance.now());
  }

  /* ---- the ribbon builds itself: every card rises from below, one after another, while the ribbon turns; then the page is live and scrolls forever ---- */
  function reveal() {
    var gk = window.__galK && window.__galK.current, START = cfg("itstart"), cdur = cfg("itcdur"), stag = cfg("itstag");
    var cards = [].filter.call(document.querySelectorAll("#main div"), function (d) {
      var st = d.style; return st.position === "absolute" && st.top === "50%" && st.left === "50%" && st.zIndex && d.getBoundingClientRect().width > 0;
    });
    /* lowest card on screen goes first, so the ribbon grows upward */
    cards.forEach(function (c) { var r = c.getBoundingClientRect(); c.__ry = r.top + r.height / 2; });
    cards.sort(function (a, z) { return z.__ry - a.__ry; });
    var D = Math.max(1, (cards.length - 1) * stag + cdur), s0 = performance.now();
    if (gk) { gk.ox = gk.tx = START; }
    root.classList.remove("intro-on");
    if (!reduce) cards.forEach(function (c, i) {
      if (!c.animate) return;
      var an = c.animate([{ translate: "0 " + cfg("itdist") + "vh" }, { translate: "0 0" }], { duration: cdur, delay: i * stag, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" });
      an.onfinish = function () { an.cancel(); };
    });
    (function step(now) {
      var k = Math.min(1, (now - s0) / D), v = START * (1 - twist(k));
      if (gk) { gk.ox = v; gk.tx = v; }
      if (k < 1) return requestAnimationFrame(step);
      if (gk) { gk.ox = 0; gk.tx = 0; }
    })(performance.now());
    setTimeout(function () { root.classList.remove("intro-ui"); window.dispatchEvent(new Event("intro-done")); }, reduce ? 100 : cfg("itui"));
  }
})();
