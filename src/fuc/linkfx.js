/* One hover effect for every text link, button and tab, shared by the main page and the About page:
   the letters fly in from both edges toward the middle with a motion blur. Underlines on links are removed. */
(function () {
  if (window.__linkfx) return;
  window.__linkfx = 1;
  var SPLIT = "#wk .wk-bar button, #wk .wk-visit"; /* plain-text controls of the project page (Back, Visit website), split into letters on first hover */
  var SEL = 'a[href], [role="tab"], button.abx-close, ' + SPLIT;
  var css = document.createElement("style");
  css.textContent =
    'a[href]{text-decoration:none!important}' +
    'a[href]>span[aria-hidden="true"]{display:none!important}' +
    'a[href] span,[role="tab"] span{animation:none!important}' +
    /* the letters travel outside their own box while sliding in, so the box must not clip them */
    'a[href]>span:first-child,[role="tab"]>span:first-child{overflow:visible!important;padding:0 3px;margin:0 -3px}';
  document.head.appendChild(css);

  function letters(el) {
    var s = [].filter.call(el.querySelectorAll("span"), function (x) { return !x.children.length && x.textContent.length === 1; });
    if (s.length || !el.matches(SPLIT) || !el.textContent) return s;
    /* plain-text pieces (the card's Close button, copyright line and name) are split into letters, again whenever their text is replaced */
    var t = el.textContent; el.textContent = "";
    for (var i = 0; i < t.length; i++) {
      var c = document.createElement("span");
      c.style.cssText = "display:inline-block;white-space:pre";
      c.textContent = t[i]; el.appendChild(c); s.push(c);
    }
    return s;
  }

  /* settings come from the control panel (main page); the About page reads them from its parent */
  var LD = { ldur: 1000, ldist: 10, lblur: 2, lstag: 148 };
  function cfg() {
    var c = null;
    try { c = window.__liquidCfg || (window.parent !== window && window.parent.__liquidCfg); } catch (e) {}
    return Object.assign({}, LD, c || {});
  }

  /* The hover text interaction: the letters fly in from both edges toward the middle with a motion blur (the liquid ripple on the word comes from liquid.js) */
  function play(el) {
    var s = letters(el);
    if (!s.length || !s[0].animate) return;
    var c = cfg(), mid = (s.length - 1) / 2;
    s.forEach(function (n, i) {
      var d = i - mid, dir = d < 0 ? -1 : d > 0 ? 1 : 0, far = Math.abs(d) / (mid || 1);
      var off = dir * c.ldist * (.57 + far);
      n.animate([
        { transform: "translateX(" + off + "px)", filter: "blur(" + c.lblur + "px)", opacity: 0, offset: 0 },
        { transform: "translateX(" + off * .45 + "px)", filter: "blur(" + c.lblur * .5 + "px)", opacity: .55, offset: .45 },
        { transform: "translateX(0)", filter: "blur(0)", opacity: 1, offset: 1 }
      ], { duration: c.ldur, delay: Math.pow(1 - far, 1.2) * c.lstag, easing: "cubic-bezier(.33,.1,.2,1)", fill: "backwards" });
    });
  }
  window.__linkfxPlay = play;

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var cur = null;
  /* the logo (first link of the navbar) has no hover effect */
  function isLogo(el) { return !!(el.matches && el.matches('nav a[href="/"], nav a[href="./"]')); }
  /* clicking the logo goes nowhere: the router must not see the click either (capture phase) */
  if (!document.getElementById("about-overrides")) {
    document.addEventListener("click", function (e) { var l = e.target.closest && e.target.closest('nav a[href="/"], nav a[href="./"]'); if (l) { e.preventDefault(); e.stopPropagation(); } }, true);
    var lcss = document.createElement("style"); lcss.textContent = 'nav a[href="/"],nav a[href="./"]{cursor:default!important}'; document.head.appendChild(lcss);
  }
  /* phones and tablets have no hover: a tap must not trigger the letter animation (the logo rule above still applies) */
  if (matchMedia("(hover: none), (pointer: coarse)").matches) return;
  document.addEventListener("mouseover", function (e) {
    var el = e.target.closest && e.target.closest(SEL);
    if (!el || isLogo(el)) return;
    /* the effect restarts on every real entry, even if the previous element was replaced by a re-render or the pointer left the window */
    if (el === cur && el.isConnected) return;
    cur = el;
    play(el);
    /* the mode menu re-renders its letters right when the pointer arrives, which would throw the animation away: replay it once on the new letters */
    if (window.MutationObserver) {
      var n = 0, mo = new MutationObserver(function () { if (cur !== el || ++n > 2) return mo.disconnect(); if (letters(el).some(function (x) { return !x.getAnimations().length; })) play(el); });
      mo.observe(el, { childList: true, subtree: true }); setTimeout(function () { mo.disconnect(); }, 900);
    }
  }, true);
  document.addEventListener("mouseout", function (e) {
    if (cur && !cur.contains(e.relatedTarget)) { cur = null; }
  }, true);
  document.addEventListener("pointerleave", function () { cur = null; });
  /* a click re-renders the mode menu: let the next hover play again */
  document.addEventListener("click", function () { cur = null; }, true);
})();
