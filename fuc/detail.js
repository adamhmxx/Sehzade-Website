/* Project detail page.
   A full-screen page for every work, reached by clicking a card (Twister, Grid) or a name (List). Its address is #/work/<name>, so it can be shared and the
   browser's Back button closes it. Desktop: the text on the left (description, client, year, services, challenge, approach, "Visit website") with the
   project's name set huge at the bottom, and the project's pictures on the right as one endless vertical scroll. Phone: the pictures on top as an endless
   horizontal scroll, everything else below, the name first.
   The content comes from the CMS: description, client, year, services, challenge, approach, link and a gallery of pictures per project. Empty fields are left out. */
(function () {
  var root = document.documentElement, ov = null, shown = false, cur = -1, strip = null, closing = 0, ownPush = false, lastFocus = null, resizeT = 0;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ID = "wk";

  function data() { var a = (window.__cmsItems && window.__cmsItems()) || window.__cmsDefaults || []; return [].filter.call(a, function (it) { return it && it.name; }); }
  function slugOf(s) { return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "work"; }
  function slugs(list) { var seen = {}; return list.map(function (it) { var s = slugOf(it.name), n = seen[s] = (seen[s] || 0) + 1; return n > 1 ? s + "-" + n : s; }); }
  function sm(u) { return window.__sms ? window.__sms(u) : u; }
  function fname(u) { var m = /([^\/?#]+\.(?:webp|png|jpe?g|avif|gif))/i.exec(u || ""); return m ? m[1].toLowerCase() : (u || "").slice(0, 80); }
  function phone() { return innerWidth < 810; }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function live() { return !root.classList.contains("intro-on") && !root.classList.contains("intro-ui"); }

  function css() {
    var s = document.createElement("style");
    s.textContent =
      /* the page sits under the navbar (the navbar stays exactly as it is) and replaces the mode menu with its own Back button */
      '#wk{position:fixed;inset:0;z-index:4;background:#0b0b0b;color:#f2f2f2;font-family:"Inter Display",Inter,-apple-system,BlinkMacSystemFont,sans-serif;visibility:hidden;clip-path:inset(0 0 100% 0);' +
      'transition:clip-path .75s cubic-bezier(.76,0,.24,1),visibility 0s .75s;display:grid;grid-template-columns:1fr 1fr;-webkit-font-smoothing:antialiased;overscroll-behavior:contain}' +
      '#wk.on{visibility:visible;clip-path:inset(0 0 0 0);transition:clip-path .75s cubic-bezier(.76,0,.24,1),visibility 0s}' +
      'html.wk-open [role="tablist"]{opacity:0!important;pointer-events:none!important}' +
      /* the content rises in, one piece after the other, once the page has opened */
      '#wk.fx{background:rgba(11,11,11,0);transition:background-color .9s cubic-bezier(.4,0,.2,1),visibility 0s .9s}#wk.fx.on{background:#0b0b0b;clip-path:inset(0 0 0 0);transition:background-color .9s cubic-bezier(.4,0,.2,1),visibility 0s}#wk.fx.out{pointer-events:none;clip-path:inset(0 0 0 0);visibility:visible}#wk.out .wk-in{opacity:0!important;transition:opacity .4s ease!important}' +
      '.wk-melt{will-change:opacity,scale,rotate;transition:opacity 1.3s cubic-bezier(.4,0,.2,1),scale 1.4s cubic-bezier(.4,0,.2,1),rotate 1.4s cubic-bezier(.4,0,.2,1)}html.wk-open .wk-melt{opacity:0!important;scale:var(--wk-s,1.06);rotate:var(--wk-r,0deg)}' +
      '#wk.gq,#wk.gq.on{transition:none!important}#wk.pre-g .wk-in{opacity:0!important;transition:none!important}#wk.gq .wk-in{transition:opacity .5s ease,transform .7s cubic-bezier(.22,1,.36,1)}#wk.gq.on .wk-in{transition-delay:calc(var(--i,0) * .05s)}' +
      '#wk.pre .wk-in{opacity:0!important;transition:none!important}#wk.fx .wk-in{transition:opacity 1s ease,transform 1.2s cubic-bezier(.22,1,.36,1)}#wk.fx.on .wk-in{transition-delay:calc(.15s + var(--i,0) * .1s)}' +
      '#wk .wk-in{opacity:0;transform:translateY(22px);transition:opacity .6s ease,transform .8s cubic-bezier(.22,1,.36,1)}' +
      '#wk.on .wk-in{opacity:1;transform:none;transition-delay:calc(.35s + var(--i,0) * .07s)}' +
      '#wk.sw .wk-in{opacity:0;transform:translateY(10px);transition-delay:0s;transition-duration:.18s}' +
      '#wk .wk-l{position:relative;display:flex;flex-direction:column;min-height:0;padding:104px 76px 28px 32px;box-sizing:border-box}' +
      '#wk button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      '#wk{outline:none}#wk button:focus{outline:none}#wk button:focus-visible{outline:1px solid #fff;outline-offset:3px}' +
      /* Back (with Prev / Next beside it), exactly where the mode menu is */
      '#wk .wk-bar{position:absolute;z-index:5;display:flex;align-items:center;justify-content:center;gap:var(--g,16px);font-size:var(--f,16px);line-height:1;color:#fff;mix-blend-mode:difference;white-space:nowrap}' +
      '#wk .wk-bar button{min-height:40px;padding:0 4px;opacity:.45;transition:opacity .24s ease}' +
      '#wk .wk-bar .wk-back{opacity:1}' +
      '#wk .wk-bar button:hover{opacity:1}' +
      '#wk .wk-body{flex:1;min-height:0;overflow:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin-bottom:22px}' +
      '#wk .wk-body::-webkit-scrollbar{display:none}' +
      '#wk .wk-idx{margin:0 0 18px;font-size:16px;line-height:1.3;color:#fff;font-variant-numeric:tabular-nums}' +
      '#wk .wk-lede{margin:0 0 24px;font-size:16px;line-height:1.4;font-weight:400;max-width:60ch;color:#fff}' +
      '#wk .wk-meta{margin:0 0 22px;padding:0;border:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px}' +
      '#wk .wk-meta div{padding:0}' +
      '#wk .wk-meta dt,#wk .wk-sec h3{margin:0 0 6px;font-size:16px;line-height:1.3;font-weight:400;color:rgba(255,255,255,.6)}' +
      '#wk .wk-meta dd{margin:0;font-size:16px;line-height:1.3;color:#fff}' +
      '#wk .wk-sec{margin:0 0 22px;padding:0;border:0}' +
      '#wk .wk-sec p{margin:0;font-size:16px;line-height:1.4;color:#fff;max-width:60ch;white-space:pre-line}' +
      '#wk .wk-visit{display:inline-block;align-self:flex-start;margin:0 0 14px;padding:0;border:0;background:none;color:#fff;text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:1px;font-size:16px;line-height:1.3;transition:color .25s ease}' +
      '#wk .wk-visit:hover{color:rgba(255,255,255,.6)}#wk .wk-visit i{font-style:normal}' +
      '#wk .wk-name{flex:none;margin:0;font:400 var(--nm,140px)/.92 "Anton","Inter Display",Impact,sans-serif;text-transform:uppercase;letter-spacing:0;padding-bottom:.04em;overflow-wrap:anywhere}' +
      '#wk .wk-name span{display:block;white-space:normal}' +
      '@media (min-width:1440px){#wk{--nm:160px}}@media (min-width:810px) and (max-width:1439.98px){#wk{--nm:120px}}@media (max-width:809.98px){#wk{--nm:64px}}' +
      '#wk .wk-r{position:relative;overflow:hidden;background:#0b0b0b;touch-action:none;cursor:grab}' +
      '#wk .wk-r.drag{cursor:grabbing}' +
      '#wk .wk-it{position:absolute;left:0;top:0;overflow:hidden;background:#0b0b0b;will-change:transform}' +
      '#wk .wk-it img{display:block;width:100%;height:100%;object-fit:cover;pointer-events:none;-webkit-user-drag:none;user-select:none}' +
      /* phone: the pictures on top (endless horizontal), then the details, and the name set big at the bottom, above the Back button */
      '@media (max-width:809.98px){#wk{grid-template-columns:1fr;grid-template-rows:36dvh minmax(0,1fr)}' +
      '#wk .wk-r{order:-1;touch-action:pan-y}' +
      '#wk .wk-l{padding:18px 16px var(--bar,104px);overflow:hidden}' +
      '#wk .wk-body{margin-bottom:10px}' +
      '#wk .wk-lede{max-width:none;margin-bottom:18px}' +
      '#wk .wk-meta{margin-bottom:18px}' +
      '#wk .wk-sec{margin-bottom:16px}' +
      '}' +
      '@media (prefers-reduced-motion:reduce){#wk,#wk.on{transition:none}#wk .wk-in,#wk.on .wk-in{transition:none;opacity:1;transform:none}}';
    document.head.appendChild(s);
  }

  /* ---------- the endless scroll of pictures ---------- */
  function Strip(box, urls, vertical) {
    var GAP = 12, PAD = 12, slots = [], C = 0, maxS = 0, view = 0, pos = 0, tgt = 0, vel = 0, drag = null, raf = 0, last = 0, idle = 0, alive = true, metrics = [];
    var imgs = urls.map(function (u) { var im = new Image(); im.decoding = "async"; im.src = u; return im; });
    var ready = Promise.all(imgs.map(function (im) { return im.decode ? im.decode().catch(function () {}) : new Promise(function (r) { im.onload = im.onerror = r; }); }));
    function wrapv(v, t) { return ((v % t) + t) % t; }
    function layout() {
      if (!alive) return;
      var W = box.clientWidth, H = box.clientHeight; if (!W || !H) return;
      view = vertical ? H : W;
      metrics = imgs.map(function (im) { var r = (im.naturalWidth && im.naturalHeight) ? im.naturalWidth / im.naturalHeight : 4 / 3; return vertical ? Math.round((W - PAD * 2) / r) : Math.round((H - PAD * 2) * r); });
      var L = 0; maxS = 0; metrics.forEach(function (s) { L += s + GAP; maxS = Math.max(maxS, s); });
      var copies = Math.max(1, Math.ceil((view + maxS * 2 + GAP) / L)); C = copies * L;
      box.textContent = ""; slots = [];
      for (var c = 0; c < copies; c++) { var o = c * L; for (var i = 0; i < imgs.length; i++) {
        var d = document.createElement("div"); d.className = "wk-it"; var im = new Image(); im.decoding = "async"; im.alt = ""; im.draggable = false; im.src = imgs[i].src; d.appendChild(im);
        if (vertical) { d.style.left = PAD + "px"; d.style.width = (W - PAD * 2) + "px"; d.style.height = metrics[i] + "px"; }
        else { d.style.top = PAD + "px"; d.style.height = (H - PAD * 2) + "px"; d.style.width = metrics[i] + "px"; }
        box.appendChild(d); slots.push({ el: d, off: o, size: metrics[i] }); o += metrics[i] + GAP; } }
      place(); kick();
    }
    function place() {
      for (var s = 0; s < slots.length; s++) {
        var k = slots[s], p = wrapv(k.off - pos + maxS, C) - maxS + (vertical ? PAD : PAD);
        var vis = p < view && p + k.size > 0;
        if (vis !== k.vis) { k.vis = vis; k.el.style.visibility = vis ? "" : "hidden"; }
        if (vis) k.el.style.transform = vertical ? "translate3d(0," + p.toFixed(1) + "px,0)" : "translate3d(" + p.toFixed(1) + "px,0,0)";
      }
    }
    function tick(now) {
      raf = 0; if (!alive) return;
      var dt = Math.min(40, now - last); last = now;
      if (!drag) {
        if (Math.abs(vel) > .02) { tgt += vel * dt; vel *= Math.exp(-dt / 320); } else vel = 0;
        idle += dt; if (!reduce && idle > 1400 && Math.abs(vel) < .02) tgt += (vertical ? 22 : 30) * dt / 1000;
      }
      pos += (tgt - pos) * (1 - Math.exp(-dt / (drag ? 45 : 120)));
      place(); raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf && alive) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    function onWheel(e) {
      if (!vertical) return; e.preventDefault();
      var m = e.deltaMode === 1 ? 16 : 1, d = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * m;
      tgt += d; idle = 0; vel = 0; kick();
    }
    function down(e) {
      if (e.button != null && e.button > 0) return;
      try { box.setPointerCapture(e.pointerId); } catch (x) {}
      drag = { id: e.pointerId, p: vertical ? e.clientY : e.clientX, s: [[e.timeStamp, vertical ? e.clientY : e.clientX]] }; vel = 0; idle = 0; box.classList.add("drag"); kick();
    }
    function move(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var p = vertical ? e.clientY : e.clientX; tgt -= p - drag.p; drag.p = p; idle = 0;
      drag.s.push([e.timeStamp, p]); while (drag.s.length > 2 && e.timeStamp - drag.s[0][0] > 90) drag.s.shift();
    }
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var a = drag.s[0], z = drag.s[drag.s.length - 1], dt = Math.max(16, z[0] - a[0]); vel = e.timeStamp - z[0] > 120 ? 0 : Math.max(-3.5, Math.min(3.5, -(z[1] - a[1]) / dt));
      drag = null; box.classList.remove("drag"); try { box.releasePointerCapture(e.pointerId); } catch (x) {}
    }
    box.addEventListener("wheel", onWheel, { passive: false });
    box.addEventListener("pointerdown", down); box.addEventListener("pointermove", move); box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    ready.then(layout);
    return { relayout: layout, destroy: function () { alive = false; cancelAnimationFrame(raf); box.removeEventListener("wheel", onWheel); box.removeEventListener("pointerdown", down); box.removeEventListener("pointermove", move); box.removeEventListener("pointerup", up); box.removeEventListener("pointercancel", up); box.textContent = ""; } };
  }

  /* ---------- the name, as big as the column allows ---------- */
  /* the name: one fixed size per breakpoint (160px desktop, 120px laptop/tablet, 64px phone); a long name simply wraps onto more lines */
  function fitName(h1, name) { h1.textContent = ""; h1.appendChild(el("span", "", String(name).toUpperCase())); }

  /* ---------- building the page ---------- */
  function build() {
    if (ov) return; css();
    ov = el("div"); ov.id = ID; ov.tabIndex = -1; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Project");
    document.body.appendChild(ov);
    addEventListener("keydown", function (e) {
      if (!shown) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1);
    });
    addEventListener("resize", function () { if (!shown) return; clearTimeout(resizeT); resizeT = setTimeout(function () { render(cur, true); }, 160); });
  }
  /* the Back button takes the place of the mode menu (same spot, same type size, same gap) */
  function placeBar(bar) {
    var tl = document.querySelector('[role="tablist"]'), tab = tl && tl.querySelector('[role="tab"]'), r;
    /* the gallery melts with a scale and a turn: measure the menu as if it did not (it sits inside the melting layer), or Back would land lower than the menu */
    if (tl && meltEl && meltEl.contains(tl)) {
      var ps = meltEl.style.scale, pr = meltEl.style.rotate, pt = meltEl.style.transition;
      meltEl.style.transition = "none"; meltEl.style.scale = "1"; meltEl.style.rotate = "0deg";
      var sv = root.classList.contains("wk-open"); if (sv) root.classList.remove("wk-open");
      r = tl.getBoundingClientRect();
      if (sv) root.classList.add("wk-open");
      meltEl.style.scale = ps; meltEl.style.rotate = pr; meltEl.style.transition = pt;
    } else r = tl && tl.getBoundingClientRect();
    if (!r || !r.width) { bar.style.left = "50%"; bar.style.top = (innerHeight - 56) + "px"; bar.style.transform = "translate(-50%,-50%)"; return; }
    bar.style.left = (r.left + r.width / 2) + "px"; bar.style.top = (r.top + r.height / 2) + "px"; bar.style.transform = "translate(-50%,-50%)";
    var cs = tab ? getComputedStyle(tab) : null; bar.style.setProperty("--f", (cs ? parseFloat(cs.fontSize) || 16 : 16) + "px");
    var g = parseFloat(getComputedStyle(tl).columnGap || getComputedStyle(tl).gap); bar.style.setProperty("--g", (isNaN(g) ? 16 : g) + "px");
    if (ov) ov.style.setProperty("--bar", Math.max(80, innerHeight - r.top + 14) + "px");
  }
  function render(i, keepScroll) {
    var list = data(), it = list[i]; if (!it) return;
    ov.textContent = ""; if (strip) { strip.destroy(); strip = null; }
    var bar = el("div", "wk-bar"), back = el("button", "wk-back", "Back");
    back.type = "button"; back.setAttribute("aria-label", "Back to the works");
    back.addEventListener("click", function () { close(); });
    bar.append(back);
    var l = el("div", "wk-l"), body = el("div", "wk-body"), idx = 0;
    function put(node) { node.classList.add("wk-in"); node.style.setProperty("--i", idx++); return node; }
    var h1 = put(el("h1", "wk-name")); h1.setAttribute("aria-label", it.name);
    /* every piece of information has a title (white 60%) and its text (white 100%), all 16px, in this order */
    [["Year", it.year], ["Description", it.description], ["Client", it.client], ["Challenge", it.challenge], ["Approach", it.approach]].forEach(function (x) {
      if (!x[1]) return; var sec = el("section", "wk-sec"); sec.append(el("h3", "", x[0]), el("p", "", x[1])); body.appendChild(put(sec));
    });
    var visit = null;
    if (it.link) { visit = el("a", "wk-visit"); visit.href = it.link; visit.target = "_blank"; visit.rel = "noopener noreferrer"; visit.append(document.createTextNode("Visit website "), el("i", "", "\u2197")); }
    var r = el("div", "wk-r"); r.classList.add("wk-in"); r.style.setProperty("--i", 1);
    if (visit) put(visit);
    l.append(body); if (visit) l.append(visit); l.append(h1);
    ov.append(l, r, bar);
    placeBar(bar);
    var urls = [it.image && it.image.src].concat(it.gallery || []).filter(Boolean).map(sm);
    if (!urls.length) urls = [];
    strip = urls.length ? Strip(r, urls, !phone()) : null;
    var fit = function () { placeBar(bar); fitName(h1, it.name); };
    fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    try { window.dispatchEvent(new Event("wk-render")); } catch (e) {}
  }
  /* works -> project: the clicked picture keeps its shape and slides to where the first picture of the scroll sits, the works page fades away,
     then the project's content appears */
  /* One moving picture, animated with transforms only (translate + one uniform scale) and a clip that follows the shape of the card, so nothing is
     stretched and no layout is recomputed while it moves. "big" is where it rests in the project page, "small" is the card in the gallery. */
  function flyBox(big, small, src, back, delay, done, quick) {
    var d = el("div"), pic = new Image(); pic.src = src; pic.decoding = "async";
    d.style.cssText = "position:fixed;z-index:6;left:" + big.left + "px;top:" + big.top + "px;width:" + big.width + "px;height:" + big.height + "px;overflow:hidden;background:#0b0b0b;pointer-events:none;will-change:transform,clip-path;transform-origin:50% 50%;backface-visibility:hidden";
    pic.style.cssText = "width:100%;height:100%;object-fit:cover;display:block"; d.appendChild(pic); document.body.appendChild(d);
    var cx = big.left + big.width / 2, cy = big.top + big.height / 2, sc = Math.max(small.width / big.width, small.height / big.height);
    var from = { transform: "translate3d(" + (small.left + small.width / 2 - cx) + "px," + (small.top + small.height / 2 - cy) + "px,0) scale(" + sc + ")",
                 clipPath: "inset(" + ((big.height - small.height / sc) / 2) + "px " + ((big.width - small.width / sc) / 2) + "px)" },
        to = { transform: "translate3d(0,0,0) scale(1)", clipPath: "inset(0px 0px)" };
    var a = d.animate(back ? [to, from] : [from, to], { duration: quick ? 800 : 1500, delay: delay || 0, easing: quick ? "cubic-bezier(.5,0,.15,1)" : "cubic-bezier(.62,0,.18,1)", fill: "both" });
    var fin = 0, end = function () { if (fin) return; fin = 1; done && done(); if (quick) { d.remove(); return; } var f = d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: "ease", fill: "forwards" }); f.onfinish = function () { d.remove(); }; };
    a.onfinish = end; setTimeout(end, 3600 + (delay || 0));
  }
  function fly(src, from, done, quick) {
    var r = ov && ov.querySelector(".wk-r"); if (!r || !from || !src || !ov.animate) { done(); return; }
    var im = new Image(); im.src = src;
    var run = function () {
      var b = r.getBoundingClientRect(), pad = 12, ar = (im.naturalWidth && im.naturalHeight) ? im.naturalWidth / im.naturalHeight : 4 / 3, tw, th;
      if (phone()) { th = b.height - pad * 2; tw = th * ar; } else { tw = b.width - pad * 2; th = tw / ar; }
      flyBox({ left: b.left + pad, top: b.top + pad, width: tw, height: th }, from, src, false, 0, done, quick);
    };
    if (im.complete) run(); else { im.onload = im.onerror = run; }
  }
  /* Twist: the cards that were not chosen turn and sink away (up or down, by where they are) and come back the same way; the chosen card is the moving picture */
  var twTok = 0;
  function twAnim(card, from, to, dur, delay, done) {
    var tok = ++twTok, t0 = 0;
    window.__twX = { p: from, sel: card };
    function f(now) {
      if (tok !== twTok) return;
      if (!t0) t0 = now + delay;
      var k = Math.max(0, Math.min(1, (now - t0) / dur)); window.__twX.p = from + (to - from) * k;
      if (k < 1) requestAnimationFrame(f); else { if (to === 0) window.__twX = null; done && done(); }
    }
    requestAnimationFrame(f);
  }
  /* Grid: the cards that were not chosen slide out of the screen, away from the chosen one (and slide back in when the page closes) */
  var gridOut = [];
  function gridAway(card, rect) {
    var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2, far = Math.max(innerWidth, innerHeight) * 1.15; gridOut = [];
    [].forEach.call(document.querySelectorAll("#main div"), function (d) {
      if (d === card || !(d.style && d.style.position === "absolute" && d.style.top === "50%" && d.style.left === "50%" && d.style.zIndex && d.querySelector("img"))) return;
      var r = d.getBoundingClientRect(); if (r.width < 20) return;
      var dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy, n = Math.hypot(dx, dy) || 1;
      d.style.transition = "translate .8s cubic-bezier(.55,0,.75,.35)"; d.style.translate = (dx / n * far).toFixed(0) + "px " + (dy / n * far).toFixed(0) + "px"; gridOut.push(d);
    });
  }
  function gridBack() {
    var g = gridOut; gridOut = [];
    g.forEach(function (d) { d.style.transition = "translate .9s cubic-bezier(.25,.65,.3,1)"; d.style.translate = ""; });
    setTimeout(function () { g.forEach(function (d) { d.style.transition = ""; }); }, 1100);
  }
  /* the gallery behind the page melts away while the picture flies (and comes back when the page closes): a blur, a fade and a slow turn (Twist) or sink (Grid) */
  var origin = null, flyMode = "twist", flyCard = null, meltEl = null;
  function meltOn(mode, card) {
    var t = card && card.parentElement; if (t && window.__twGLon && t.parentElement) t = t.parentElement;
    if (meltEl && meltEl !== t) meltEl.classList.remove("wk-melt");
    meltEl = t; if (!t) return;
    t.style.setProperty("--wk-s", mode === "grid" ? ".93" : "1.07"); t.style.setProperty("--wk-r", mode === "grid" ? "0deg" : "-2.5deg");
    t.classList.add("wk-melt");
  }
  function cardFor(o) {
    var best = null, bd = 1e18, cx = o.rect.left + o.rect.width / 2, cy = o.rect.top + o.rect.height / 2;
    [].forEach.call(document.querySelectorAll("#main div"), function (d) {
      if (!(d.style && d.style.position === "absolute" && d.style.top === "50%" && d.style.left === "50%" && d.style.zIndex)) return;
      var im = d.querySelector("img"), f = fname(d.dataset.src || (im && (im.currentSrc || im.src)) || ""); if (f !== fname(o.src)) return;
      var r = d.getBoundingClientRect(); if (r.width < 20) return;
      var dd = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy); if (dd < bd) { bd = dd; best = r; }
    });
    return best;
  }
  /* project -> works: the exact reverse; the picture goes back to its card while the project's content fades out and the gallery returns */
  function exitFly(o) {
    var r = ov.querySelector(".wk-r"), it = null;
    [].forEach.call(r ? r.querySelectorAll(".wk-it") : [], function (n) { if (it) return; var b = n.getBoundingClientRect(); if (b.width > 20 && b.right > 0 && b.left < innerWidth && b.bottom > 0 && b.top < innerHeight) it = b; });
    var to = cardFor(o) || o.rect;
    if (!it || !to || to.bottom < 0 || to.top > innerHeight || to.right < 0 || to.left > innerWidth) return;
    flyBox({ left: it.left, top: it.top, width: it.width, height: it.height }, to, o.src, true, 300);
  }
  function show(i) {
    build(); var list = data(); if (i < 0 || i >= list.length) return;
    var was = shown; cur = i; shown = true; closing = 0;
    if (!was) { lastFocus = document.activeElement; window.__wkOpen = true; root.classList.add("wk-open"); window.dispatchEvent(new Event("ab-toggle")); }
    render(i);
    if (!was) {
      ov.classList.remove("sw"); var ff = flyFrom, fs = flySrc; flyFrom = null;
      var tw = ff && !reduce && flyMode === "twist" && !!window.__twGLon;
      origin = (ff && !reduce) ? { rect: ff, src: fs, mode: flyMode, i: i, card: flyCard, tw: tw } : null;
      window.__twFreeze = !tw;
      var gq = ff && !reduce && flyMode === "grid";
      if (ff && !reduce) { ov.classList.add("fx", gq ? "pre-g" : "pre"); if (gq) ov.classList.add("gq"); if (tw) twAnim(flyCard, 0, 1, 1000, 0, function () { if (shown) window.__twFreeze = true; }); else if (!gq) meltOn(flyMode, flyCard); }
      if (gq) gridAway(flyCard, ff);
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        if (ff && !reduce) fly(fs, ff, function () { if (ov) ov.classList.remove("pre", "pre-g"); }, gq);
        if (gq) setTimeout(function () { if (shown && ov) ov.classList.add("on"); }, 520); else ov.classList.add("on");
      }); });
    }
    else { ov.classList.add("on"); }
    if (!was) setTimeout(function () { if (shown) ov.focus({ preventScroll: true }); }, 60);
  }
  function hide() {
    if (!shown) return; shown = false; cur = -1;
    var o = origin; origin = null;
    if (o && !reduce && ov.classList.contains("fx") && ov.animate) { exitFly(o); if (o.mode === "grid") setTimeout(gridBack, 350); ov.classList.remove("on", "pre", "pre-g", "gq"); ov.classList.add("out"); setTimeout(function () { if (!shown) ov.classList.remove("fx", "out"); }, 1100); }
    else ov.classList.remove("on", "fx", "pre", "pre-g", "gq");
    window.__wkOpen = false; root.classList.remove("wk-open");
    /* the gallery is a still picture while the page flies back (no GPU drawing during the move); it comes alive again as soon as the picture has landed or the user touches it */
    if (o && o.tw && ov.classList.contains("out")) { window.__twFreeze = false; twAnim(o.card, 1, 0, 1100, 450); }
    else if (o && ov.classList.contains("out")) {
      var thaw = function () { window.__twFreeze = false; removeEventListener("pointerdown", thaw, true); removeEventListener("wheel", thaw, true); };
      addEventListener("pointerdown", thaw, true); addEventListener("wheel", thaw, true); setTimeout(thaw, 2200);
    } else window.__twFreeze = false; window.dispatchEvent(new Event("ab-toggle"));
    clearTimeout(closing); closing = setTimeout(function () { if (!shown && strip) { strip.destroy(); strip = null; } }, reduce ? 0 : 850);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  function hashFor(i) { return "#/work/" + slugs(data())[i]; }
  function step(d) {
    var list = data(); if (!shown || !list.length) return;
    var n = (cur + d + list.length) % list.length;
    ov.classList.add("sw");
    setTimeout(function () { history.replaceState(null, "", location.pathname + location.search + hashFor(n)); ov.classList.remove("sw"); show(n); }, 190);
  }
  function close() {
    if (!shown) return;
    if (ownPush) { ownPush = false; history.back(); }
    else { history.replaceState(null, "", location.pathname + location.search); hide(); }
  }
  /* address -> page */
  function route() {
    var m = /^#\/work\/([^\/?#]+)/.exec(location.hash);
    if (!m) { hide(); return; }
    if (!live()) return;
    var i = slugs(data()).indexOf(decodeURIComponent(m[1]));
    if (i >= 0) show(i); else { hide(); history.replaceState(null, "", location.pathname + location.search); }
  }
  /* page -> address */
  var flyFrom = null, flySrc = "";
  function go(it) {
    var list = data(), i = list.findIndex(function (x) { return x.name === it.name && ((x.image && x.image.src) || "") === ((it.image && it.image.src) || ""); });
    if (i < 0) i = list.findIndex(function (x) { return x.name === it.name; }); if (i < 0) return;
    ownPush = true; location.hash = hashFor(i);
  }
  window.__wkGo = go;

  /* a click on a card in Twister or Grid opens the page (a drag does not); in Grid the highlighted (lifted) project opens */
  function cardOf(t) {
    for (var n = t; n && n !== document.body; n = n.parentElement) {
      if (n.tagName === "DIV" && n.style && n.style.position === "absolute" && n.style.top === "50%" && n.style.left === "50%" && n.style.zIndex && n.closest("#main")) return n;
    }
    return null;
  }
  document.addEventListener("click", function (e) {
    if (shown || !e.target || !e.target.closest) return;
    if (e.target.closest("#ls-root,[role='tablist'],nav,#wk")) return;
    var c = cardOf(e.target);
    if (!c) {   /* any card under the pointer, by its box (Grid / Twister layers can sit above the card) */
      var hit = null, hz = -1; [].forEach.call(document.querySelectorAll("#main div"), function (d) {
        if (!(d.style && d.style.position === "absolute" && d.style.top === "50%" && d.style.left === "50%" && d.style.zIndex && d.querySelector("img"))) return;
        var r = d.getBoundingClientRect(), z = parseFloat(d.style.zIndex) || 0;
        if (r.width > 20 && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom && z >= hz) { hit = d; hz = z; } });
      c = hit;
    }
    if (!c) {   /* Grid: the card lifted to the centre is drawn by the gallery above the others, so the click lands on its layer, not on the card box */
      var all = document.querySelectorAll("#main div");
      for (var k = 0; k < all.length && !c; k++) { var d = all[k], z = d.style && parseFloat(d.style.zIndex);
        if (z >= 8000 && z < 10000 && d.style.position === "absolute" && d.style.top === "50%" && d.querySelector("img")) c = d; }   /* the highlighted project opens, wherever on the grid the click is */
    }
    if (!c) return;
    var g = window.__galK && window.__galK.current; if (g && g.moved > 6) { e.preventDefault(); return; }
    var im = c.querySelector("img"), f = fname(c.dataset.src || (im && (im.currentSrc || im.src)) || ""), list = data(), it = null;
    for (var i = 0; i < list.length; i++) if (list[i].image && fname(list[i].image.src) === f) { it = list[i]; break; }
    if (!it) return;
    flyFrom = c.getBoundingClientRect(); flyCard = c; flyMode = window.__twGLon ? "twist" : "grid"; flySrc = (im && (im.currentSrc || im.src)) || c.dataset.src || "";
    e.preventDefault(); e.stopPropagation(); go(it);
  }, true);

  function start() {
    addEventListener("hashchange", route);
    addEventListener("popstate", route);
    addEventListener("cms-change", function () { if (shown) { var list = data(); if (cur >= list.length) hide(); else render(cur); } });
    /* a shared address opens its page as soon as the loader is gone */
    var t = setInterval(function () { if (live() && window.__cmsItems) { clearInterval(t); route(); } }, 250);
    setTimeout(function () { clearInterval(t); }, 30000);
  }
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
})();
