/* Frame-rate probe: open the site with #perf at the end of the address (e.g. adamhimawan.com/#perf) to see a small live readout in the corner:
   frames per second, the worst frame of the last two seconds and how many frames were slower than 33 ms. Nothing runs without #perf. */
(function () {
  if (!/(^|[#&])perf\b/.test(location.hash)) return;
  var box = document.createElement("div");
  box.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483647;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.78);color:#7CFF8A;font:11px/1.35 ui-monospace,Menlo,monospace;pointer-events:none;white-space:pre";
  document.documentElement.appendChild(box);
  var last = performance.now(), win = [], lt = 0, phase = "";
  window.addEventListener("intro-done", function () { phase = "ready"; });
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (e.duration > 50) lt++; }); }).observe({ entryTypes: ["longtask"] }); } catch (e) {}
  (function f(t) {
    var d = t - last; last = t; win.push([t, d]);
    while (win.length && t - win[0][0] > 2000) win.shift();
    if (!f.n || (f.n = (f.n + 1) % 15) === 1) {
      var mx = 0, slow = 0; win.forEach(function (w) { if (w[1] > mx) mx = w[1]; if (w[1] > 33.4) slow++; });
      var tab = document.querySelector('[role="tab"][aria-selected="true"]');
      box.textContent = "build " + (window.__build || "?") + "   fps " + Math.round(win.length / 2) + "   worst " + Math.round(mx) + " ms   slow " + slow + "\nlong tasks " + lt + "   " + (document.documentElement.classList.contains("intro-on") ? "intro" : (tab ? tab.textContent.trim() : "")) + "   " + innerWidth + "x" + innerHeight + " @" + (devicePixelRatio || 1);
    }
    f.n = f.n || 1; requestAnimationFrame(f);
  })(performance.now());
})();
