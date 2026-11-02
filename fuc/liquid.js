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
  var DEF = { radius: 44, softness: 0.85, brightness: 0.05, trail: 0.7, blur: 1.2, distort: 9, reach: 200, on: 1 };
  var KEY = "liquid-cfg-v1";
  function load() {
    try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch (e) { return Object.assign({}, DEF); }
  }
  var own = load();
  if (TOP) window.__liquidCfg = own;
  /* the About page lives in an iframe of the main page, so it follows the main page's panel */
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
    if (!c.on || (!inside && Math.abs(head.vx) + Math.abs(head.vy) < .05 && idle > 40)) return;
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
    return { id: id, off: f.children[1], map: f.children[2], k: Math.max(.25, Math.min(1, Math.min(b.width, b.height) / 300)) };
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

    var reach = c.reach;
    for (var n = 0; n < els.length; n++) {
      var el = els[n], b = el.getBoundingClientRect();
      if (b.bottom < -reach || b.top > innerHeight + reach || b.right < -reach || b.left > innerWidth + reach || b.width === 0) continue;
      var st = states.get(el);
      if (!st) { st = { b: 0, vb: 0, d: 0, vd: 0, set: 0, warp: null }; states.set(el, st); }
      var dx = b.left + b.width / 2 - mx, dy = b.top + b.height / 2 - my, dist = Math.hypot(dx, dy);
      var edge = Math.max(0, dist - Math.min(b.width, 260) / 2), f = inside && c.on ? Math.exp(-Math.pow(edge / reach, 2) * 1.8) : 0;
      spring(st, "b", f * c.blur * (.55 + sp * .9), .09, .82);
      spring(st, "d", f * c.distort * (.7 + sp * .6), .08, .84);
      var tgt = el.__fxt || (el.__fxt = el.style.zIndex && el.firstElementChild && el.style.position === "absolute" && el.style.top === "50%" ? el.firstElementChild : el);
      var warp = st.d > .15;
      if (warp || st.b > .03) {
        active++; st.set = 1;
        var fl = "";
        if (warp) {
          if (!st.warp) st.warp = makeWarp(el, b);
          /* the noise field slides with the cursor, so the distortion flows like liquid instead of pulsing */
          st.warp.map.setAttribute("scale", (st.d * st.warp.k).toFixed(2));
          st.warp.off.setAttribute("dx", (-dx * .35).toFixed(1)); st.warp.off.setAttribute("dy", (-dy * .35).toFixed(1));
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
      ["reach", "Blur reach", 60, 420, 5, "px"]
    ];
    var css = document.createElement("style");
    css.textContent =
      '#liquid-ui{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:max(16px,env(safe-area-inset-bottom,0px));z-index:2147483600;font-family:"Anton","Inter Display",Impact,sans-serif;text-transform:uppercase;color:#f2f2f2;letter-spacing:.04em;-webkit-font-smoothing:antialiased}' +
      '#liquid-ui *{box-sizing:border-box;font-family:inherit;text-transform:inherit;letter-spacing:inherit}' +
      '#liquid-ui .lq-btn{display:flex;align-items:center;gap:8px;margin-left:auto;padding:8px 13px;border:1px solid rgba(242,242,242,.16);border-radius:999px;background:rgba(14,14,14,.62);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:inherit;font-size:12px;cursor:pointer;transition:border-color .5s,background .5s}' +
      '#liquid-ui .lq-btn:hover{border-color:rgba(242,242,242,.4);background:rgba(14,14,14,.8)}' +
      '#liquid-ui .lq-dot{width:8px;height:8px;border-radius:50%;background:#f2f2f2;box-shadow:0 0 10px rgba(242,242,242,.55);opacity:.9;transition:opacity .5s}' +
      '#liquid-ui.off .lq-dot{opacity:.25;box-shadow:none}' +
      '#liquid-ui .lq-card{width:250px;margin-bottom:10px;padding:16px 16px 12px;border:1px solid rgba(242,242,242,.14);border-radius:16px;background:rgba(14,14,14,.7);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 18px 50px rgba(0,0,0,.45);opacity:0;transform:translateY(10px);visibility:hidden;pointer-events:none;transition:opacity .55s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1),visibility 0s .7s}' +
      '#liquid-ui.open .lq-card{opacity:1;transform:none;visibility:visible;pointer-events:auto;transition:opacity .55s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1)}' +
      '#liquid-ui .lq-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px}' +
      '#liquid-ui .lq-row{display:grid;grid-template-columns:1fr auto;gap:2px 8px;margin-bottom:11px;font-size:11px;color:rgba(242,242,242,.72)}' +
      '#liquid-ui .lq-row b{font-weight:400;color:#f2f2f2;font-variant-numeric:tabular-nums}' +
      '#liquid-ui input[type=range]{grid-column:1/-1;width:100%;height:16px;margin:0;background:none;-webkit-appearance:none;appearance:none;cursor:pointer}' +
      '#liquid-ui input[type=range]::-webkit-slider-runnable-track{height:2px;border-radius:2px;background:rgba(242,242,242,.22)}' +
      '#liquid-ui input[type=range]::-moz-range-track{height:2px;border-radius:2px;background:rgba(242,242,242,.22)}' +
      '#liquid-ui input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;margin-top:-5px;border-radius:50%;border:0;background:#f2f2f2;transition:transform .3s}' +
      '#liquid-ui input[type=range]::-moz-range-thumb{width:12px;height:12px;border-radius:50%;border:0;background:#f2f2f2}' +
      '#liquid-ui input[type=range]:hover::-webkit-slider-thumb{transform:scale(1.25)}' +
      '#liquid-ui .lq-actions{display:flex;gap:8px;margin-top:4px}' +
      '#liquid-ui .lq-actions button{flex:1;padding:7px 0;border:1px solid rgba(242,242,242,.18);border-radius:999px;background:transparent;color:inherit;font-size:11px;cursor:pointer;transition:border-color .4s,background .4s}' +
      '#liquid-ui .lq-actions button:hover{border-color:rgba(242,242,242,.5);background:rgba(242,242,242,.08)}' +
      '#liquid-ui :focus-visible{outline:1px solid rgba(242,242,242,.7);outline-offset:3px}' +
      '@media (max-width:600px){#liquid-ui .lq-card{width:min(250px,calc(100vw - 32px))}}';
    document.head.appendChild(css);

    var ui = document.createElement("div"); ui.id = "liquid-ui";
    var card = document.createElement("div"); card.className = "lq-card"; card.setAttribute("role", "group"); card.setAttribute("aria-label", "Liquid hover settings");
    card.innerHTML = '<div class="lq-title"><span>Liquid hover</span></div>';
    var inputs = {};
    ROWS.forEach(function (r) {
      var row = document.createElement("label"); row.className = "lq-row";
      var name = document.createElement("span"); name.textContent = r[1];
      var val = document.createElement("b");
      var inp = document.createElement("input"); inp.type = "range"; inp.min = r[2]; inp.max = r[3]; inp.step = r[4]; inp.id = "lq-" + r[0];
      function show() { var v = +own[r[0]]; val.textContent = (r[4] < 1 ? v.toFixed(r[4] < .01 ? 3 : 2) : Math.round(v)) + r[5]; }
      inp.value = own[r[0]]; show();
      inp.addEventListener("input", function () { own[r[0]] = +inp.value; show(); save(); kick(); });
      inputs[r[0]] = [inp, show];
      row.append(name, val, inp); card.appendChild(row);
    });
    var actions = document.createElement("div"); actions.className = "lq-actions";
    var reset = document.createElement("button"); reset.type = "button"; reset.textContent = "Reset";
    reset.onclick = function () { Object.keys(DEF).forEach(function (k) { own[k] = DEF[k]; if (inputs[k]) { inputs[k][0].value = DEF[k]; inputs[k][1](); } }); ui.classList.remove("off"); save(); kick(); };
    var toggle = document.createElement("button"); toggle.type = "button"; toggle.textContent = own.on ? "Turn off" : "Turn on";
    toggle.onclick = function () { own.on = own.on ? 0 : 1; toggle.textContent = own.on ? "Turn off" : "Turn on"; ui.classList.toggle("off", !own.on); save(); kick(); };
    ui.classList.toggle("off", !own.on);
    actions.append(reset, toggle); card.appendChild(actions);
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "lq-btn"; btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="lq-dot"></span><span>Liquid</span>';
    btn.onclick = function () { var o = ui.classList.toggle("open"); btn.setAttribute("aria-expanded", o); };
    addEventListener("keydown", function (e) { if (e.key === "Escape" && ui.classList.contains("open")) { ui.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } });
    if (!ENABLED) { var note = document.createElement("div"); note.style.cssText = "margin-top:8px;font-size:10px;color:rgba(242,242,242,.55);line-height:1.3"; note.textContent = "Hover effects need a mouse and motion enabled on this device."; card.appendChild(note); }
    ui.append(card, btn); document.body.appendChild(ui);
    /* open once on the first visit so the panel is easy to find, then remember that it has been seen */
    try { if (!localStorage.getItem(KEY + "-seen")) { localStorage.setItem(KEY + "-seen", "1"); setTimeout(function () { ui.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }, 900); } } catch (e) {}
  }

  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
})();
