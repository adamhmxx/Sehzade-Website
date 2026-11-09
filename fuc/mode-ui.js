/* Two small pieces of interface that belong to the gallery modes:
   1. the List mode: every project name as one big grey line, together filling the screen from top to bottom; hovering a name turns it
      white and shows that project's picture, following the pointer;
   2. a "(scroll)" note at the bottom right in every mode that can be scrolled (Twister, Space, Grid).
   Modes are found by their place in the mode menu (0 Twister, 1 Space, 2 Grid, 3 List), so the names can be edited in the CMS. */
(function () {
  var root = document.documentElement, LIST = 3, built = false, box, listEl, pv, hint, rows = [], act = -1, mx = 0, my = 0, px = 0, py = 0, raf = 0, items = [], hideT = 0, touchT = 0;
  var fine = matchMedia("(pointer: fine)").matches, touchUI = !fine;

  function tabs() { return [].slice.call(document.querySelectorAll('[role="tab"]')); }
  function idx() { return tabs().findIndex(function (t) { return t.getAttribute("aria-selected") === "true"; }); }
  function data() { var a = (window.__cmsItems && window.__cmsItems()) || window.__cmsDefaults || []; return [].filter.call(a, function (it) { return it && it.name; }); }
  function sm(u) { return window.__sms ? window.__sms(u) : u; }
  function live() { return !root.classList.contains("intro-on") && !root.classList.contains("intro-ui"); }

  function css() {
    var s = document.createElement("style");
    s.textContent =
      /* leaving List: the names fade out quickly, before the other mode's cards fade in. Entering List: the gallery's cards fade out first
         (.ls-hide), the names only appear once they are gone, so the two are never on screen together */
      '#ls-root{position:fixed;inset:0;z-index:3;pointer-events:none;opacity:0;visibility:hidden;transition:opacity .16s ease,visibility 0s .16s}' +
      '#ls-root.on{opacity:1;visibility:visible;transition:opacity .4s ease .38s}' +
      '.ls-layer{transition:opacity .35s ease .12s}' +
      '.ls-layer.ls-hide{opacity:0!important;pointer-events:none!important;transition:opacity .3s ease}' +
      '#ls-pv{position:fixed;left:0;top:0;background-size:cover;background-position:center;background-color:#111;opacity:0;transform:scale(.94);transition:opacity .28s ease,transform .38s cubic-bezier(.22,1,.36,1);will-change:transform,opacity;pointer-events:none;border-radius:2px}' +
      '#ls-pv.on{opacity:1;transform:scale(1)}' +
      '#ls-list{position:fixed;left:0;right:0;text-align:center;font-family:"Anton","Inter Display",Impact,sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:0;touch-action:none;-webkit-user-select:none;user-select:none;mix-blend-mode:difference}' +
      '.ls-row{display:block;margin:0 auto;width:max-content;max-width:100%;color:#4d4d4d;white-space:nowrap;cursor:pointer;pointer-events:auto;transition:color .22s ease}' +
      '.ls-row.act{color:#fff}' +
      /* touch devices: one endless scrolling column, the name on the centre line is the active one, its picture sits behind the names */
      '#ls-scroll{position:fixed;left:0;right:0;overflow-y:scroll;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;scroll-snap-type:y mandatory;scrollbar-width:none;pointer-events:auto;text-align:center;font-family:"Anton","Inter Display",Impact,sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:0;mix-blend-mode:difference;-webkit-mask-image:linear-gradient(transparent,#000 14%,#000 86%,transparent);mask-image:linear-gradient(transparent,#000 14%,#000 86%,transparent)}' +
      '#ls-scroll::-webkit-scrollbar{display:none}' +
      '#ls-scroll .ls-row{scroll-snap-align:center;max-width:none;-webkit-tap-highlight-color:transparent}' +
      '#ls-mpv{position:fixed;left:0;top:0;border-radius:2px;overflow:hidden;background:#111;pointer-events:none}' +
      '#ls-mpv i{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity .3s ease}' +
      '#sc-hint{position:fixed;z-index:4;pointer-events:none;color:#fff;mix-blend-mode:difference;font:400 16px/1 "Anton","Inter Display",Impact,sans-serif;text-transform:uppercase;letter-spacing:0;opacity:0;transition:opacity .5s ease}' +
      '#sc-hint.on{opacity:1}';
    document.head.appendChild(s);
  }

  function build() {
    if (built) return; built = true; css();
    box = document.createElement("div"); box.id = "ls-root"; box.setAttribute("aria-hidden", "true");
    pv = document.createElement("div"); pv.id = "ls-pv";
    listEl = document.createElement("div"); listEl.id = "ls-list";
    box.append(pv, listEl);
    if (touchUI) buildTouch();
    document.body.appendChild(box);
    hint = document.createElement("div"); hint.id = "sc-hint"; hint.setAttribute("aria-hidden", "true"); hint.textContent = "(scroll)"; document.body.appendChild(hint);
    var move = function (e) {
      mx = e.clientX; my = e.clientY;
      var el = e.pointerType === "touch" ? document.elementFromPoint(mx, my) : e.target, row = el && el.closest && el.closest(".ls-row");
      if (row) activate(+row.dataset.i, e); else if (e.pointerType !== "touch") deactivate();
    };
    listEl.addEventListener("pointermove", move);
    listEl.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "touch") return;
      clearTimeout(touchT);
      var row = document.elementFromPoint(e.clientX, e.clientY); row = row && row.closest && row.closest(".ls-row");
      if (row && +row.dataset.i === act) openLink(act); else move(e);
    });
    listEl.addEventListener("pointerup", function (e) { if (e.pointerType === "touch") { clearTimeout(touchT); touchT = setTimeout(deactivate, 1600); } });
    listEl.addEventListener("pointerleave", function (e) { if (e.pointerType !== "touch") deactivate(); });
    listEl.addEventListener("click", function (e) { if (e.pointerType === "touch" || e.detail === 0) return; var row = e.target.closest && e.target.closest(".ls-row"); if (row) openLink(+row.dataset.i); });
  }

  /* the gallery's card layer: the highest ancestor of a card that holds neither the mode menu nor the navbar */
  var layer = null;
  function cardLayer() {
    var main = document.getElementById("main"), tl = document.querySelector('[role="tablist"]'), nav = document.querySelector("nav");
    if (!main || !tl) return layer;
    var card = [].filter.call(main.querySelectorAll("div"), function (d) { var s = d.style; return s.position === "absolute" && s.top === "50%" && s.left === "50%" && s.zIndex; })[0];
    if (!card) return layer && layer.isConnected ? layer : null;
    var n = card;
    while (n.parentElement && n.parentElement !== main && !n.parentElement.contains(tl) && !(nav && n.parentElement.contains(nav))) n = n.parentElement;
    return (layer = n);
  }
  function cardsHidden(on) {
    var l = cardLayer(); if (l) { l.classList.add("ls-layer"); l.classList.toggle("ls-hide", on); }
    if (!on) [].forEach.call(document.querySelectorAll(".ls-hide"), function (x) { x.classList.remove("ls-hide"); });
  }
  /* the project under the pointer in List, for the info text (hover-info.js) */
  window.__lsActive = function () { return act >= 0 ? items[act] || null : null; };
  function told() { try { window.dispatchEvent(new Event("ls-active")); } catch (e) {} }

  /* ---------- touch: endless column ---------- */
  var scroller, inner, mpv, la, lb, lcur, mRows = [], mN = 0, RH = 0, mK = -1, mSig = "", mTimer = 0, mRaf = 0;
  function buildTouch() {
    listEl.style.display = "none"; pv.style.display = "none";
    mpv = document.createElement("div"); mpv.id = "ls-mpv"; la = document.createElement("i"); lb = document.createElement("i"); mpv.append(la, lb); lcur = la;
    scroller = document.createElement("div"); scroller.id = "ls-scroll"; inner = document.createElement("div"); scroller.appendChild(inner);
    box.append(mpv, scroller);
    scroller.addEventListener("scroll", function () {
      if (!mRaf) mRaf = requestAnimationFrame(function () { mRaf = 0; mActive(); });
      clearTimeout(mTimer); mTimer = setTimeout(recentre, 140);
    }, { passive: true });
    /* the page behind must not react to touches on the list */
    ["pointerdown", "pointermove", "touchstart", "wheel"].forEach(function (n) { scroller.addEventListener(n, function (e) { e.stopPropagation(); }, { passive: true }); });
    scroller.addEventListener("click", function (e) {
      var row = e.target.closest && e.target.closest(".ls-row"); if (!row) return;
      var k = +row.dataset.k; if (k === mK) openLink(+row.dataset.i); else scroller.scrollTo({ top: k * RH, behavior: "smooth" });
    });
  }
  function showImg(i) {
    var it = items[i], u = it && it.image && it.image.src ? "url(" + sm(it.image.src) + ")" : "", nx = lcur === la ? lb : la;
    nx.style.backgroundImage = u; nx.style.opacity = 1; lcur.style.opacity = 0; lcur = nx;
  }
  function mActive() {
    if (!mN) return;
    var k = Math.max(0, Math.min(mRows.length - 1, Math.round(scroller.scrollTop / RH)));
    if (k === mK) return;
    if (mK >= 0 && mRows[mK]) mRows[mK].classList.remove("act");
    var i = k % mN, prev = mK < 0 ? -1 : mK % mN; mK = k; mRows[k].classList.add("act");
    if (i !== prev) showImg(i);
  }
  /* the list is repeated; once scrolling stops far from the middle copy, jump to the same name in the middle copy (nobody can see it) */
  function recentre() {
    if (!mN || !scroller) return;
    var k = Math.round(scroller.scrollTop / RH), copies = Math.round(mRows.length / mN), mid = Math.floor(copies / 2);
    if (k >= mN && k < mN * (copies - 1)) return;
    scroller.style.scrollSnapType = "none"; scroller.scrollTop = (mid * mN + (k % mN)) * RH;
    requestAnimationFrame(function () { scroller.style.scrollSnapType = ""; mK = -1; mActive(); });
  }
  function layoutTouch() {
    items = data(); mN = items.length;
    var tl = document.querySelector('[role="tablist"]'), nav = document.querySelector("nav"), vw = innerWidth, vh = innerHeight;
    var top = Math.round((nav ? nav.getBoundingClientRect().bottom : 56) + 8), bottom = Math.round((tl ? tl.getBoundingClientRect().top : vh - 72) - 8), H = Math.max(160, bottom - top);
    var sig = [mN, vw, H, items.map(function (x) { return x.name + "|" + (x.image && x.image.src || ""); }).join(",")].join("/");
    if (sig === mSig) return; mSig = sig;
    if (!mN) { inner.textContent = ""; mRows = []; mpv.style.display = "none"; return; }
    mpv.style.display = "";
    var fs = Math.round(Math.min(78, Math.max(46, vw * .19))); RH = Math.round(fs * 1.04);
    var copies = Math.max(3, Math.ceil(130 / mN)); if (copies % 2 === 0) copies++;
    inner.textContent = ""; mRows = []; mK = -1;
    scroller.style.top = top + "px"; scroller.style.height = H + "px"; scroller.style.fontSize = fs + "px";
    inner.style.padding = Math.round((H - RH) / 2) + "px 0";
    var frag = document.createDocumentFragment();
    for (var c = 0; c < copies; c++) for (var i = 0; i < mN; i++) {
      var r = document.createElement("div"); r.className = "ls-row"; r.dataset.i = i; r.dataset.k = mRows.length; r.textContent = items[i].name;
      r.style.height = RH + "px"; r.style.lineHeight = RH + "px"; frag.appendChild(r); mRows.push(r);
    }
    inner.appendChild(frag);
    var widest = 0; for (var j = 0; j < mN; j++) widest = Math.max(widest, mRows[j].getBoundingClientRect().width);
    if (widest > vw * .92) { fs = Math.floor(fs * vw * .92 / widest); RH = Math.round(fs * 1.04); scroller.style.fontSize = fs + "px"; inner.style.padding = Math.round((H - RH) / 2) + "px 0"; mRows.forEach(function (r) { r.style.height = RH + "px"; r.style.lineHeight = RH + "px"; }); }
    var w = Math.round(Math.min(vw * .74, 340)), h = Math.round(w * .75);
    mpv.style.width = w + "px"; mpv.style.height = h + "px"; mpv.style.transform = "translate3d(" + Math.round((vw - w) / 2) + "px," + Math.round(top + (H - h) / 2) + "px,0)";
    items.forEach(function (it) { if (it.image && it.image.src) { var im = new Image(); im.src = sm(it.image.src); } });
    scroller.style.scrollSnapType = "none"; scroller.scrollTop = Math.floor(copies / 2) * mN * RH;
    requestAnimationFrame(function () { scroller.style.scrollSnapType = ""; mActive(); });
  }

  function openLink(i) { var it = items[i]; if (it && it.link) { try { window.open(it.link, "_blank", "noopener"); } catch (e) {} } }

  /* one big line per project, together exactly as tall as the free space between the navbar and the mode menu */
  function layout() {
    if (!built) return;
    if (touchUI) return layoutTouch();
    items = data(); listEl.textContent = ""; rows = [];
    items.forEach(function (it, i) { var r = document.createElement("div"); r.className = "ls-row"; r.dataset.i = i; r.textContent = it.name; listEl.appendChild(r); rows.push(r); });
    var tl = document.querySelector('[role="tablist"]'), nav = document.querySelector("nav"), vw = innerWidth, vh = innerHeight;
    var top = Math.round((nav ? nav.getBoundingClientRect().bottom : 56) + 16), bottom = Math.round((tl ? tl.getBoundingClientRect().top : vh - 72) - 16);
    var avail = Math.max(120, bottom - top), n = Math.max(1, rows.length), lh = avail / n, fs = lh * 1.04;
    listEl.style.top = top + "px"; listEl.style.height = avail + "px"; listEl.style.fontSize = fs + "px";
    rows.forEach(function (r) { r.style.height = lh + "px"; r.style.lineHeight = lh + "px"; });
    var widest = 0; rows.forEach(function (r) { widest = Math.max(widest, r.getBoundingClientRect().width); });
    if (widest > vw * .94) { fs *= vw * .94 / widest; listEl.style.fontSize = fs + "px"; }
    var w = Math.round(Math.max(200, Math.min(420, vw * (vw < 810 ? .5 : .26)))); pv.style.width = w + "px"; pv.style.height = Math.round(w * .75) + "px";
    if (act >= rows.length) deactivate(); else if (act >= 0) rows[act].classList.add("act");
  }

  function activate(i, e) {
    if (i === act || !items[i]) { if (e) follow(); return; }
    if (act >= 0 && rows[act]) rows[act].classList.remove("act");
    var first = act < 0; act = i; rows[i].classList.add("act");
    var it = items[i]; pv.style.backgroundImage = it.image && it.image.src ? "url(" + sm(it.image.src) + ")" : "";
    if (first) { px = mx; py = my; }
    pv.classList.add("on"); follow(); told();
  }
  function deactivate() { var was = act; if (act >= 0 && rows[act]) rows[act].classList.remove("act"); act = -1; pv.classList.remove("on"); if (was >= 0) told(); }

  /* the picture follows the pointer with a little lag */
  function follow() { if (!raf) raf = requestAnimationFrame(tick); }
  function tick() {
    raf = 0;
    px += (mx - px) * .16; py += (my - py) * .16;
    var w = pv.offsetWidth, h = pv.offsetHeight;
    pv.style.transform = "translate3d(" + (px - w / 2).toFixed(1) + "px," + (py - h / 2).toFixed(1) + "px,0)" + (pv.classList.contains("on") ? "" : " scale(.94)");
    if (act >= 0 || Math.abs(mx - px) + Math.abs(my - py) > .5) follow();
  }

  /* "(scroll)": bottom right, level with the mode menu */
  function placeHint() {
    if (!hint) return;
    var tl = document.querySelector('[role="tablist"]'), m = innerWidth >= 1440 ? 32 : innerWidth >= 810 ? 24 : 16;
    if (tl) {
      var r = tl.getBoundingClientRect(), h = hint.offsetHeight || 16, phone = innerWidth < 810;
      hint.style.right = m + "px"; hint.style.left = "auto";
      hint.style.top = Math.round(phone ? r.bottom + 10 : r.top + (r.height - h) / 2) + "px";
      hint.style.fontSize = phone ? "13px" : "16px";
    }
  }

  function sync() {
    if (!tabs().length) return;
    build();
    var i = idx(), ok = live() && !window.__abOpen;
    box.classList.toggle("on", i === LIST && ok);
    cardsHidden(i === LIST && live());
    if (i !== LIST) { clearTimeout(hideT); deactivate(); told(); }
    else { layout(); }
    placeHint(); hint.classList.toggle("on", ok && i >= 0 && i < LIST);
  }

  function start() {
    var t0 = setInterval(function () { if (tabs().length) { clearInterval(t0); sync(); watch(); } }, 200);
  }
  function watch() {
    var tl = document.querySelector('[role="tablist"]');
    if (tl) new MutationObserver(sync).observe(tl, { attributes: true, subtree: true, attributeFilter: ["aria-selected"] });
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["class"] });
    addEventListener("resize", function () { layout(); placeHint(); });
    addEventListener("cms-change", function () { if (idx() === LIST) layout(); });
    addEventListener("ab-toggle", sync);
  }
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
})();
