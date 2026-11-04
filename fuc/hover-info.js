/* Project info on hover for every mode: the name, description, services and year of the item under the cursor appear top left, in the
   same place and style as the Cross mode caption (Cross draws its own, so it is skipped here). Mouse only; hidden while dragging. */
(function () {
  if (!matchMedia("(pointer: fine)").matches) return;
  var el = null, rows = [], shownKey = "", hideT = 0, down = false, mx = -1, my = -1, pend = false, lastRun = 0;
  function items() { return (window.__cmsItems && window.__cmsItems()) || window.__cmsDefaults || []; }
  function fname(u) { var m = /([^\/?#]+\.(?:webp|png|jpe?g|avif|gif))/i.exec(u || ""); return m ? m[1].toLowerCase() : ""; }
  function build() {
    var css = document.createElement("style");
    css.textContent = '#hv-info{position:fixed;left:40px;top:92px;max-width:min(420px,40vw);z-index:2000;pointer-events:none;color:#f2f2f2;font-family:"Anton","Inter Display",Impact,sans-serif;text-transform:uppercase;font-size:16px;line-height:1.25;letter-spacing:0;opacity:0;transition:opacity .26s ease;-webkit-font-smoothing:antialiased}' +
      '#hv-info.on{opacity:1}#hv-info div{margin-bottom:8px}' +
      '@media (max-width:809.98px){#hv-info{left:16px;top:76px}}';
    document.head.appendChild(css);
    el = document.createElement("div"); el.id = "hv-info"; el.setAttribute("aria-hidden", "true"); document.body.appendChild(el);
  }
  function mode() { var t = document.querySelector('[role="tab"][aria-selected="true"]'); return t ? t.textContent.trim().toLowerCase() : ""; }
  function cards() {
    return [].filter.call(document.querySelectorAll("#main div"), function (d) { var s = d.style; return s.position === "absolute" && s.top === "50%" && s.left === "50%" && s.zIndex; });
  }
  /* the image of a card: a plain <img>, or (Twister, where a card is cut into slices) the background image of a slice */
  function srcOf(card) {
    var im = card.querySelector("img"); if (im) return im.currentSrc || im.src;
    var all = card.querySelectorAll("*");
    for (var i = 0; i < all.length && i < 12; i++) { var bg = all[i].style && all[i].style.backgroundImage; if (bg && bg.indexOf("url") >= 0) return bg; }
    return "";
  }
  function inside(r, x, y) { return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
  function isCard(d) { var s = d.style; return s.position === "absolute" && s.top === "50%" && s.left === "50%" && s.zIndex; }
  function depth(card, slice) { /* distance towards the viewer of a slice in the 3D scene */
    try { var m = new DOMMatrix(getComputedStyle(card).transform).multiply(new DOMMatrix(getComputedStyle(slice).transform)); return m.m43; } catch (e) { return 0; }
  }
  function pick() {
    /* normal cards take the pointer, so the browser already knows which one is on top */
    var e = document.elementFromPoint(mx, my);
    for (var n = e; n && n !== document.body; n = n.parentElement) if (n.tagName === "DIV" && isCard(n) && n.closest("#main")) return n;
    /* Twister: a card is cut into slices that ignore the pointer, so test them one by one and keep the one nearest to the viewer */
    var best = null, bz = -1e9, list = cards();
    for (var i = 0; i < list.length; i++) {
      var c = list[i]; if (c.children.length <= 2) continue;
      var r = c.getBoundingClientRect(); if (r.width < 20 || !inside(r, mx, my)) continue;
      for (var k = 0; k < c.children.length; k++) {
        var sl = c.children[k]; if (!inside(sl.getBoundingClientRect(), mx, my)) continue;
        var z = depth(c, sl); if (z > bz) { bz = z; best = c; }
      }
    }
    return best;
  }
  function show(it) {
    var key = it ? it.name + "|" + it.year : "";
    if (!it) { if (!hideT) hideT = setTimeout(function () { el.classList.remove("on"); shownKey = ""; hideT = 0; }, 160); return; }
    clearTimeout(hideT); hideT = 0;
    if (key !== shownKey) {
      shownKey = key; el.textContent = "";
      [[it.name, ""], [it.description, ""], [it.services, ""], [it.year, ""]].forEach(function (p) { if (!p[0]) return; var d = document.createElement("div"); if (p[1]) d.className = p[1]; d.textContent = p[0]; el.appendChild(d); });
    }
    el.classList.add("on");
  }
  function run() {
    pend = false; lastRun = performance.now();
    if (down || window.__abOpen || document.documentElement.classList.contains("intro-on") || mode() === "cross") return show(null);
    var c = pick(); if (!c) return show(null);
    var f = fname(srcOf(c)), found = null, a = items();
    for (var i = 0; i < a.length; i++) if (a[i] && a[i].image && fname(a[i].image.src) === f) { found = a[i]; break; }
    show(found);
  }
  function sched() { if (pend) return; pend = true; setTimeout(function () { requestAnimationFrame(run); }, Math.max(0, 60 - (performance.now() - lastRun))); }
  function start() {
    build();
    addEventListener("pointermove", function (e) { if (e.pointerType === "touch") return; mx = e.clientX; my = e.clientY; sched(); }, { passive: true });
    addEventListener("pointerdown", function () { down = true; sched(); }, { passive: true });
    addEventListener("pointerup", function () { down = false; sched(); }, { passive: true });
    document.addEventListener("pointerleave", function () { mx = my = -1; sched(); });
  }
  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
})();
