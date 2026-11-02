/* One hover effect for every text link, button and tab, shared by the main page and the About page:
   the letters fly in from both edges toward the middle with a motion blur. Underlines on links are removed. */
(function () {
  if (window.__linkfx) return;
  window.__linkfx = 1;
  var SEL = 'a[href], #about-close, [role="tab"]';
  var css = document.createElement("style");
  css.textContent =
    'a[href],#about-close{text-decoration:none!important}' +
    'a[href]>span[aria-hidden="true"]{display:none!important}' +
    'a[href] span,#about-close span,[role="tab"] span{animation:none!important}';
  document.head.appendChild(css);

  function letters(el) {
    var s = [].filter.call(el.querySelectorAll("span"), function (x) { return !x.children.length && x.textContent.length === 1; });
    if (s.length || el.id !== "about-close" || el.dataset.fx) return s;
    /* plain-text controls (the panel's Close button) are split into letters once */
    var t = el.textContent; el.textContent = ""; el.dataset.fx = 1;
    for (var i = 0; i < t.length; i++) {
      var c = document.createElement("span");
      c.style.cssText = "display:inline-block;white-space:pre";
      c.textContent = t[i]; el.appendChild(c); s.push(c);
    }
    return s;
  }

  function play(el) {
    var s = letters(el);
    if (!s.length || !s[0].animate) return;
    var mid = (s.length - 1) / 2;
    s.forEach(function (n, i) {
      var d = i - mid, dir = d < 0 ? -1 : d > 0 ? 1 : 0, far = Math.abs(d) / (mid || 1);
      n.animate([
        { transform: "translateX(" + dir * (18 + far * 26) + "px)", filter: "blur(6px)", opacity: 0 },
        { transform: "translateX(0)", filter: "blur(0)", opacity: 1 }
      ], { duration: 520, delay: (1 - far) * 60, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
    });
  }

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var cur = null;
  document.addEventListener("mouseover", function (e) {
    var el = e.target.closest && e.target.closest(SEL);
    if (!el || el === cur) return;
    cur = el;
    play(el);
  }, true);
  document.addEventListener("mouseout", function (e) {
    if (cur && !cur.contains(e.relatedTarget)) cur = null;
  }, true);
})();
