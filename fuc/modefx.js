/* Phones: switching between the modes (Twister, Space, Cross, Globe, Grid) is a clean dip through the page background instead of a morph.
   On a small screen a morph makes dozens of cards cross each other (overlaps, collisions, a few empty frames), so the layout simply
   changes under a short fade to the background colour: no card ever travels through another. The mode menu stays on top the whole time. */
(function () {
  if (window.__modefx) return;
  window.__modefx = 1;
  var busy = false, ov = null, pending = null;
  function overlay() {
    if (ov && ov.isConnected) return ov;
    var tl = document.querySelector("[role=tablist]"); if (!tl || !tl.parentElement) return null;
    ov = document.createElement("div"); ov.setAttribute("aria-hidden", "true");
    ov.style.cssText = "position:absolute;inset:0;background:#0b0b0b;opacity:0;pointer-events:none;z-index:9000";
    tl.parentElement.appendChild(ov); return ov;
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[role=tab]");
    if (!t || t.__fxGo || (innerWidth >= 810 && innerHeight >= 520) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (t.getAttribute("aria-selected") === "true") return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (busy) { pending = t; return; }   /* taps during a switch are not lost: the last one runs right after */
    var o = overlay(); if (!o) return;
    busy = true; o.style.transition = "opacity 190ms ease"; o.style.opacity = "1";
    setTimeout(function () {
      t.__fxGo = 1; t.click(); t.__fxGo = 0;                       /* the layout changes while the screen is covered */
      requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(function () {
        o.style.transition = "opacity 460ms cubic-bezier(.22,1,.36,1)"; o.style.opacity = "0";
        setTimeout(function () { busy = false; var n = pending; pending = null; if (n && n.isConnected && n.getAttribute("aria-selected") !== "true") n.click(); }, 470);
      }, 140); }); });
    }, 200);
  }, true);
})();
