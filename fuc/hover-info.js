/* Project info on hover: the name, a short description and the year of the item under the cursor. Twister: top left. Grid: centred right below the
   card lifted to the centre of the screen, as wide as the card, no background. List: description and year, top left like Twister. Mouse only; hidden while scrolling or dragging (and for one second after), while the cursor is on the mode menu,
   while the About card is open and during the intro. */
(function () {
  if (!matchMedia("(pointer: fine)").matches) return;
  var el = null, rows = [], shownKey = "", hideT = 0, down = false, mx = -1, my = -1, pend = false, lastRun = 0, quietAt = 0, recheck = 0;
  /* hover states stay off while the visitor scrolls or drags, and for one second after (the gallery shares this with the liquid hover) */
  window.__hoverLock = function () { return down || performance.now() < quietAt; };
  function items() { return (window.__cmsItems && window.__cmsItems()) || window.__cmsDefaults || []; }
  function fname(u) { var m = /([^\/?#]+\.(?:webp|png|jpe?g|avif|gif))/i.exec(u || ""); return m ? m[1].toLowerCase() : ""; }
  function build() {
    var css = document.createElement("style");
    css.textContent = '#hv-info{position:fixed;left:32px;top:auto;bottom:32px;max-width:min(420px,40vw);z-index:2000;pointer-events:none;color:#fff;mix-blend-mode:difference;font-family:"Anton","Inter Display",Impact,sans-serif;text-transform:uppercase;font-size:16px;line-height:1.25;letter-spacing:0;opacity:0;transition:opacity .26s ease;-webkit-font-smoothing:antialiased}' +
      '#hv-info.on{opacity:1}#hv-info div{margin-bottom:8px}#hv-info div:last-child{margin-bottom:0}' +
      /* Grid: no plate; the three lines are centred under the lifted card and as wide as it is */
      '#hv-info.gd{mix-blend-mode:normal;display:flex;justify-content:space-between;align-items:baseline;gap:16px;text-align:left;box-sizing:border-box;bottom:auto}#hv-info.gd div{margin:0}#hv-info.gd div:last-child{flex:none}' +   /* Grid: name on the left and year on the right, spread across the card's width */
      '@media (max-width:809.98px){#hv-info{left:16px;bottom:112px}}';
    document.head.appendChild(css);
    el = document.createElement("div"); el.id = "hv-info"; el.setAttribute("aria-hidden", "true"); document.body.appendChild(el);
  }
  /* the selected mode by position in the menu (the names can be edited in the CMS): 0 Twister, 1 Grid, 2 List */
  function mode() { var t = [].slice.call(document.querySelectorAll('[role="tab"]')), i = t.findIndex(function (x) { return x.getAttribute("aria-selected") === "true"; }); return ["twister", "grid", "list"][i] || ""; }
  function onMenu() { var tl = document.querySelector('[role="tablist"]'); if (!tl) return false; var r = tl.getBoundingClientRect(); return mx >= r.left - 16 && mx <= r.right + 16 && my >= r.top - 16 && my <= r.bottom + 16; }
  function cards() {
    return [].filter.call(document.querySelectorAll("#main div"), function (d) { var s = d.style; return s.position === "absolute" && s.top === "50%" && s.left === "50%" && s.zIndex; });
  }
  /* the image of a card: a plain <img>, or (Twister, where a card is cut into slices) the background image of a slice */
  function srcOf(card) {
    if (card.dataset && card.dataset.src) return card.dataset.src;   /* Twister (drawn on the GPU): the card box carries its picture's address */
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
    /* cards that ignore the pointer (Twister: a Twister card is cut into slices): test them one by one and keep the one nearest to the viewer */
    var best = null, bz = -1e9, list = cards();
    for (var i = 0; i < list.length; i++) {
      var c = list[i], r = c.getBoundingClientRect(); if (r.width < 20 || !inside(r, mx, my)) continue;
      if (c.children.length <= 2) { /* a whole card: its image decides, and the one nearest to the viewer wins */
        var im = c.querySelector("img"); if (im && !inside(im.getBoundingClientRect(), mx, my)) continue;
        var z0 = depth(c, im || c) + (parseFloat(c.style.zIndex) || 0) * 1e-3; if (z0 > bz) { bz = z0; best = c; } continue;
      }
      for (var k = 0; k < c.children.length; k++) {
        var sl = c.children[k]; if (!inside(sl.getBoundingClientRect(), mx, my)) continue;
        var z = depth(c, sl); if (z > bz) { bz = z; best = c; }
      }
    }
    return best;
  }
  function show(it, box) {
    var key = it ? it.name + "|" + it.description + "|" + it.year + "|" + (box ? Math.round(box.left) + "," + Math.round(box.top) : "") : "";
    if (!it) { if (!hideT) hideT = setTimeout(function () { el.classList.remove("on"); shownKey = ""; hideT = 0; }, 160); return; }
    clearTimeout(hideT); hideT = 0;
    if (key !== shownKey) {
      shownKey = key; el.textContent = "";
      [[it.name, ""], [it.year, ""]].forEach(function (p) { if (!p[0]) return; var d = document.createElement("div"); if (p[1]) d.className = p[1]; d.textContent = p[0]; el.appendChild(d); });
    }
    /* Grid: right below the card and lined up with it; Twister: the fixed corner spot of the stylesheet */
    el.classList.toggle("gd", !!box);
    if (box) { el.style.left = Math.round(box.left) + "px"; el.style.top = Math.round(Math.min(box.bottom, innerHeight - 140)) + "px"; el.style.width = el.style.maxWidth = Math.round(Math.max(160, box.width)) + "px"; }
    else { el.style.left = el.style.top = el.style.maxWidth = el.style.width = ""; }
    el.classList.add("on");
  }
  /* Grid: the card that is lifted to the centre of the screen while a card is hovered (the gallery draws it above everything else) */
  function focusCard() {
    var best = null, bz = 0, list = cards();
    for (var i = 0; i < list.length; i++) { var z = parseFloat(list[i].style.zIndex) || 0; if (z >= 8000 && z > bz) { bz = z; best = list[i]; } }
    return best;
  }
  function run() {
    pend = false; lastRun = performance.now();
    var m = mode(), root = document.documentElement;
    if (window.__abOpen || window.__wkOpen || root.classList.contains("intro-on") || root.classList.contains("intro-ui") || (m !== "twister" && m !== "grid" && m !== "list") || onMenu()) return show(null);
    /* List: the description and the year of the name under the pointer, in the Twister corner (the name itself is the big line) */
    if (m === "list") { var li = window.__lsActive && window.__lsActive(); return show(li && li.year ? { name: "", description: "", year: li.year } : null, null); }
    if (down || window.__hoverLock()) return show(null);
    var c = m === "grid" ? focusCard() : pick(); if (!c) return show(null);
    var f = fname(srcOf(c)), found = null, a = items();
    for (var i = 0; i < a.length; i++) if (a[i] && a[i].image && fname(a[i].image.src) === f) { found = a[i]; break; }
    var box = null; if (found && mode() === "grid") { var im = c.querySelector("img"), r = (im || c).getBoundingClientRect(); box = { left: r.left, top: r.top, bottom: r.bottom + 14, width: r.width }; }
    show(found, box);
  }
  function sched() { if (pend) return; pend = true; setTimeout(function () { requestAnimationFrame(run); }, Math.max(0, 60 - (performance.now() - lastRun))); }
  function start() {
    build();
    addEventListener("pointermove", function (e) { if (e.pointerType === "touch") return; mx = e.clientX; my = e.clientY; sched(); }, { passive: true });
    addEventListener("pointerdown", function () { down = true; sched(); }, { passive: true });
    addEventListener("pointerup", function () { down = false; quietAt = performance.now() + 1000; sched(); clearTimeout(recheck); recheck = setTimeout(sched, 1050); }, { passive: true });
    addEventListener("wheel", function () { quietAt = performance.now() + 1000; show(null); clearTimeout(recheck); recheck = setTimeout(sched, 1050); }, { passive: true });
    document.addEventListener("pointerleave", function () { mx = my = -1; sched(); });
    window.addEventListener("ls-active", sched);
    /* Grid: the centre card is lifted a moment after the pointer stops, and drops when it leaves, with no pointer event in between */
    setInterval(function () { if (mx >= 0 && mode() === "grid") sched(); }, 150);
  }
  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
})();
