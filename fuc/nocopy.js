/* The text of the site cannot be selected, highlighted or copied (typing fields excepted). The CSS in each page's <head> stops the
   highlight; this stops select-all, copy, cut and dragging text out. Screenshots and the page source of course remain possible. */
(function () {
  function typing(t) { t = t && t.nodeType === 3 ? t.parentElement : t; return !!(t && t.closest && t.closest("input,textarea,select,[contenteditable='true']")); }
  ["selectstart", "copy", "cut", "dragstart"].forEach(function (n) {
    document.addEventListener(n, function (e) { if (!typing(e.target)) e.preventDefault(); }, true);
  });
  document.addEventListener("selectionchange", function () {
    var s = window.getSelection && getSelection();
    if (s && !s.isCollapsed && !typing(s.anchorNode)) s.removeAllRanges();
  });
})();
