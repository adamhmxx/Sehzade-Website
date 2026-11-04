/* Control panel for the loading / entrance animation. Hidden by default: Shift+I (or #intro-panel in the address) shows it.
   Values are saved in this browser and read by intro.js the next time the page loads; "Replay" reloads the page to show the sequence again. */
(function () {
  var KEY = "intro-cfg-v4";
  var ROWS = [
    ["#", "Loading screen"],
    ["min", "Minimum show time", 1000, 8000, 100, "ms", "The loading screen never finishes faster than this, even if the page is ready."],
    ["lstag", "Letter stagger", 0, 300, 5, "ms", "Delay between one letter of SEHZADE and the next as they rise."],
    ["lrise", "Letter rise", 300, 2500, 50, "ms", "How long each letter takes to rise into place."],
    ["lstr", "Liquid strength", 0, 60, 1, "px", "How strongly the big text ripples at the start."],
    ["ldecay", "Liquid calm-down", 500, 6000, 100, "ms", "How long the ripple takes to settle."],
    ["hold", "Pause at 100%", 0, 1500, 50, "ms", "Wait on 100% before the red starts turning black."],
    ["#", "Red to black"],
    ["wdur", "Wipe duration", 800, 6000, 100, "ms", "How long each liquid blob takes to grow over the screen."],
    ["wstag", "Blob delay", 0, 1200, 20, "ms", "Delay between the first, second and third blob starting."],
    ["#", "Portfolio row"],
    ["rdur", "Row duration", 800, 6000, 100, "ms", "Time the row takes to cross from the right to the left."],
    ["rn", "Cards in the row", 3, 14, 1, "", "Number of portfolio cards in the row."],
    ["rgap", "Pause before Twister", 0, 3000, 50, "ms", "Black pause after the row has sunk off the left, before the Twister starts rising."],
    ["rsz", "Card size", 15, 45, 1, "% w", "Width of each card as a share of the screen width."],
    ["#", "Twister entrance"],
    ["tdur", "Entrance duration", 600, 5000, 100, "ms", "How long the ribbon takes to rise and untwist: higher is slower."],
    ["tstart", "Twist amount", 400, 3000, 50, "", "How far the ribbon is wound when it starts: higher spins more."],
    ["trise", "Rise from below", 0, 120, 1, "vh", "How far below its place the ribbon starts, in screen heights. There is no fade: the cards just travel up."],
    ["#", "Navbar and menu"],
    ["udel", "Appear delay", 0, 3000, 50, "ms", "Wait after the ribbon starts moving before the navbar and menu fade in."]
  ];
  var DEF = { min: 3000, lstag: 85, lrise: 1000, lstr: 22, ldecay: 2400, hold: 150, wdur: 2000, wstag: 200, rdur: 1700, rn: 9, rsz: 26, rgap: 1000, tdur: 2800, tstart: 1600, trise: 90, udel: 500 };
  var cfg = Object.assign({}, DEF);
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  window.__introCfg = cfg;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }

  function build() {
    var css = document.createElement("style");
    css.textContent =
      '#intro-ui-panel{position:fixed;right:24px;bottom:24px;z-index:2147483647;width:300px;max-height:calc(100vh - 48px);overflow:auto;padding:16px;border:1px solid rgba(242,242,242,.14);border-radius:16px;background:rgba(14,14,14,.82);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#f2f2f2;font-family:"Anton","Inter Display",Impact,sans-serif;text-transform:uppercase;letter-spacing:.04em;-webkit-font-smoothing:antialiased}' +
      '#intro-ui-panel *{box-sizing:border-box;font-family:inherit;text-transform:inherit;letter-spacing:inherit}' +
      '#intro-ui-panel .ip-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px}' +
      '#intro-ui-panel .ip-title button{border:0;background:none;color:inherit;font-size:16px;cursor:pointer}' +
      '#intro-ui-panel .ip-sec{margin:16px 0 10px;padding-top:12px;border-top:1px solid rgba(242,242,242,.12);font-size:11px;color:rgba(242,242,242,.5)}' +
      '#intro-ui-panel .ip-sec:first-of-type{margin-top:0;padding-top:0;border:0}' +
      '#intro-ui-panel .ip-row{display:grid;grid-template-columns:1fr auto;gap:2px 8px;margin-bottom:11px;font-size:11px;color:rgba(242,242,242,.72)}' +
      '#intro-ui-panel .ip-row b{font-weight:400;color:#f2f2f2;font-variant-numeric:tabular-nums}' +
      '#intro-ui-panel .ip-desc{grid-column:1/-1;font-size:10px;line-height:1.35;color:rgba(242,242,242,.45);text-transform:none!important;letter-spacing:.01em!important;font-family:Inter,-apple-system,sans-serif!important}' +
      '#intro-ui-panel input[type=range]{grid-column:1/-1;width:100%;height:16px;margin:0;background:none;-webkit-appearance:none;appearance:none;cursor:pointer}' +
      '#intro-ui-panel input[type=range]::-webkit-slider-runnable-track{height:2px;border-radius:2px;background:rgba(242,242,242,.22)}' +
      '#intro-ui-panel input[type=range]::-moz-range-track{height:2px;border-radius:2px;background:rgba(242,242,242,.22)}' +
      '#intro-ui-panel input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;margin-top:-5px;border-radius:50%;border:0;background:#f2f2f2}' +
      '#intro-ui-panel input[type=range]::-moz-range-thumb{width:12px;height:12px;border-radius:50%;border:0;background:#f2f2f2}' +
      '#intro-ui-panel .ip-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}' +
      '#intro-ui-panel .ip-actions button{padding:7px 0;border:1px solid rgba(242,242,242,.18);border-radius:999px;background:transparent;color:inherit;font-size:11px;cursor:pointer}' +
      '#intro-ui-panel .ip-actions button:hover{border-color:rgba(242,242,242,.5);background:rgba(242,242,242,.08)}' +
      '#intro-ui-panel .ip-actions .go{grid-column:1/-1;background:#f2f2f2;color:#0b0b0b}' +
      '@media (max-width:809.98px){#intro-ui-panel{right:16px;bottom:16px;width:calc(100vw - 32px)}}';
    document.head.appendChild(css);
    var ui = document.createElement("div"); ui.id = "intro-ui-panel"; ui.style.display = "none";
    var t = document.createElement("div"); t.className = "ip-title"; t.innerHTML = "<span>Loading animation</span>";
    var x = document.createElement("button"); x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Close"); x.onclick = function () { show(false); }; t.appendChild(x); ui.appendChild(t);
    var inputs = {};
    ROWS.forEach(function (r) {
      if (r[0] === "#") { var h = document.createElement("div"); h.className = "ip-sec"; h.textContent = r[1]; ui.appendChild(h); return; }
      var row = document.createElement("label"); row.className = "ip-row";
      var name = document.createElement("span"); name.textContent = r[1];
      var val = document.createElement("b"), inp = document.createElement("input");
      inp.type = "range"; inp.min = r[2]; inp.max = r[3]; inp.step = r[4]; inp.value = cfg[r[0]];
      function show_() { val.textContent = (+inp.value) + (r[5] ? " " + r[5] : ""); }
      inp.addEventListener("input", function () { cfg[r[0]] = +inp.value; show_(); save(); });
      show_(); inputs[r[0]] = [inp, show_];
      var d = document.createElement("small"); d.className = "ip-desc"; d.textContent = r[6];
      row.append(name, val, inp, d); ui.appendChild(row);
    });
    var act = document.createElement("div"); act.className = "ip-actions";
    var go = document.createElement("button"); go.type = "button"; go.className = "go"; go.textContent = "Replay";
    go.onclick = function () { save(); location.hash = ""; location.reload(); };
    var reset = document.createElement("button"); reset.type = "button"; reset.textContent = "Reset";
    reset.onclick = function () { Object.keys(DEF).forEach(function (k) { cfg[k] = DEF[k]; inputs[k][0].value = DEF[k]; inputs[k][1](); }); save(); };
    var copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Copy values";
    copy.onclick = function () {
      var txt = JSON.stringify(cfg), done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy values"; }, 1400); };
      try { navigator.clipboard.writeText(txt).then(done, function () { copy.textContent = "Not allowed"; }); } catch (e) { copy.textContent = "Not allowed"; }
    };
    act.append(go, reset, copy); ui.appendChild(act); document.body.appendChild(ui);
    function show(v) { ui.style.display = v ? "" : "none"; }
    window.__introPanelToggle = function () { show(ui.style.display === "none"); };
    if (/intro-panel/.test(location.hash)) show(true);
  }
  addEventListener("keydown", function (e) {
    if (e.shiftKey && (e.key === "I" || e.key === "i") && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) { if (window.__introPanelToggle) window.__introPanelToggle(); }
  });
  if (document.body) build(); else addEventListener("DOMContentLoaded", build);
})();
