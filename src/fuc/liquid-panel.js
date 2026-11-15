/* The liquid control panel (Shift+L, or #liquid in the address). It is only needed by whoever tunes the effects, so it lives in its own file
   and is loaded on demand by liquid.js, instead of being downloaded and compiled by every visitor. */
window.__lqPanel = function (api) {
  var own = api.own, save = api.save, kick = api.kick, DEF = api.DEF, KEY = api.KEY, ENABLED = api.ENABLED;

    var ROWS = [
      ["radius", "Radius", 16, 140, 1, "px"],
      ["softness", "Edge softness", 0, 1, .01, ""],
      ["brightness", "Brightness", 0, .3, .005, ""],
      ["trail", "Trail", 0, 1.4, .02, ""],
      ["distort", "Distortion", 0, 30, .5, "px"],
      ["blur", "Component blur", 0, 4, .1, "px"],
      ["reach", "Blur reach", 60, 420, 5, "px"],
      ["#", "Intro"],
      ["imin", "Minimum loading time", 1000, 10000, 100, "ms"],
      ["iline", "Loading line thickness", 1, 16, 1, "px"],
      ["ildl", "SEHZADE start delay", 0, 1500, 25, "ms"],
      ["iltr", "SEHZADE letter rise time", 300, 3000, 50, "ms"],
      ["ilst", "SEHZADE letter stagger", 0, 300, 5, "ms"],
      ["iliq", "SEHZADE liquid (steady)", 0, 40, 1, "px"],
      ["iliqp", "SEHZADE liquid (opening burst)", 0, 80, 1, "px"],
      ["iliqd", "Opening burst fades over", 300, 6000, 100, "ms"],
      ["ioutd", "Text melt build-up time", 200, 3000, 50, "ms"],
      ["ioutl", "Text liquid melt", 0, 400, 5, "px"],
      ["iseept", "Red seeps into black: time", 1500, 10000, 100, "ms"],
      ["iseeps", "Red seeps: edge softness", 3, 50, 1, "%"],
      ["iseepl", "Red seeps: depth layers spread", 0, 60, 1, "%"],
      ["iseepd", "Red seeps: patch detail", 5, 120, 1, ""],
      ["iseepf", "Red seeps: flow", 0, 300, 5, "%"],
      ["iseepb", "Red seeps: direction (100 = from bottom)", 0, 100, 1, "%"],
      ["iseepr", "Red seeps: hot edge glow", 0, 100, 1, "%"],
      ["iseepg", "Red seeps: grain", 0, 10, 1, "%"],
      ["itdur", "Twister: entrance time", 1200, 8000, 100, "ms"],
      ["itstart", "Twister: ribbon turn while rising", 0, 3000, 50, "px"],
      ["itui", "Navbar & menu appear after", 0, 6000, 100, "ms"],
      ["#", "Link hover"],
      ["ldur", "Duration", 300, 2000, 10, "ms"],
      ["ldist", "Slide distance", 0, 60, 1, "px"],
      ["lblur", "Link blur", 0, 10, .5, "px"],
      ["lstag", "Stagger", 0, 300, 5, "ms"],
      ["#", "About popup"],
      ["pliq", "Liquid appear", 0, 120, 1, "px"],
      ["#", "Grid"],
      ["ggap", "Gap", 0, 64, 1, "px"],
      ["gstag", "Column stagger", 0, 300, 5, "px"],
      ["gpar", "Column parallax", 0, 60, 1, "%"],
      ["#", "Gallery hover"],
      ["jel", "Wet-paint wobble (master)", 0, 250, 5, "%", ""],
      ["jpush", "Cursor push", 0, 250, 5, "%", ""],
      ["jjolt", "Arrival jolt", 0, 250, 5, "%", ""],
      ["jbnc", "Bounciness", 0, 100, 1, "", ""],
      ["jsq", "Squash & stretch", 0, 250, 5, "%", ""],
      ["jtw", "Twist", 0, 250, 5, "%", ""],
      ["jrng", "Reach", 40, 250, 5, "%", ""],
      ["gmelt", "Picture melt (0 = off)", 0, 60, 1, "px", ""],
      ["gdis", "Picture dissolve (0 = off)", 0, 100, 1, "%", ""],
      ["gmsz", "Melt / dissolve spot size", 40, 250, 5, "%", ""],
      ["gnz", "Melt / dissolve noise size", 30, 300, 5, "%", ""],
      ["#", "Twister"],
      ["asp", "Auto scroll speed (0 = off)", 0, 300, 5, "px/s"],
      ["twr", "Curve radius (small = tighter)", 20, 70, 1, "%"],
      ["twn", "Curve smoothness (slices)", 8, 40, 1, ""],
      ["twg", "Item spacing (100 = touching)", 80, 160, 1, "%"],
      ["twp", "Rise per turn", 50, 200, 5, "%"],
      ["twsc", "Card size", 60, 120, 1, "%"]
    ];
    var DESC = {
      imin: "Shortest time the loading screen stays, even if the site is ready sooner.", iline: "Thickness of the black loading line (it always spans the full screen width).",
      ildl: "Wait before the first SEHZADE letter rises.", iltr: "How long each letter takes to rise into place.", ilst: "Delay between one SEHZADE letter and the next.",
      iliq: "Constant liquid ripple on the SEHZADE letters.", iliqp: "Extra liquid ripple right when the loading starts.", iliqd: "How long the opening ripple takes to calm down.",
      ioutd: "How long the melting of the text builds up once loading is done.", ioutl: "How strongly the letters, the percentage, Designer and the line warp and melt while they go.",
      iseept: "How long the red takes to be soaked up by the black. Higher is slower and calmer.", iseeps: "Width of the blurry front between red and black. Low is a sharper stain, high is a diffuse fade.",
      iseepl: "How far the deeper layers of red (dark red, then smoky ember) trail behind the surface. 0 is a single flat layer.", iseepd: "Size of the patches the red breaks into. Low is a few big areas, high is many fine ones.",
      iseepf: "How fast the patches drift while they dissolve. 0 keeps them still.", iseepb: "0 soaks in at random places, 100 soaks in from the bottom of the screen upward.",
      iseepr: "Warm glow along the edge of the red as it is absorbed.", iseepg: "Fine film grain that keeps the gradients from banding.",
      itdur: "How long the Twister takes to build itself, from the first picture to the last.",
      itstart: "How far the ribbon turns while it builds itself. 0 keeps it still, higher turns it more.",
      itui: "When the navbar and the mode menu fade in after the Twister starts rising.",
      radius: "Size of the liquid blob that follows the cursor.", softness: "How soft the blob's edge is. Lower is sharper.", brightness: "How bright the blob glows over the background.",
      trail: "Length of the blob's tail behind the cursor.", distort: "How strongly text and cards ripple when the cursor is near.", blur: "Soft blur added to components close to the cursor.",
      reach: "How far from the cursor components still react.",
      ldur: "How long the letter slide on links takes.", ldist: "How far letters travel while sliding in.", lblur: "Blur on the letters during the slide.", lstag: "Delay between one letter and the next.",
      pliq: "Ripple strength on the About card text while it moves.",
      ggap: "Space between cards in the grid.", gstag: "Shifts every second column down to make the grid uneven.", gpar: "How much columns move at different speeds when you scroll.",
      jel: "Master strength of the wet-paint wobble of the cards under the cursor. 0 turns the whole wobble off.", jpush: "How strongly moving the cursor shoves the cards along with it, as if dragging a finger through paint.",
      jjolt: "The squashy jolt a card gets, away from the cursor, the moment the cursor arrives on it.", jbnc: "How long the wobble keeps swinging. Low settles at once, high keeps sloshing for a while.",
      jsq: "How much a card stretches one way and squeezes the other while it wobbles.", jtw: "How much a card twists a little as it jolts and wobbles.", jrng: "How far from the cursor the cards still react.",
      gmelt: "The loading screen's melt on the picture under the cursor: how hard flowing noise pushes its pixels around. Higher looks more liquid but gets rougher on slanted edges. 0 turns the melt off.",
      gdis: "The loading screen's dissolve: how much of the picture under the cursor is eaten away in patches when the cursor arrives. 0 turns the dissolve off.",
      gmsz: "Size of the area around the cursor where the melt and the dissolve happen.", gnz: "Size of the waves and patches of the melt and the dissolve. Low is a few big waves, high is many small ones.",
      asp: "How fast the gallery keeps moving by itself. It pauses while the cursor is over it or while it is dragged. 0 turns it off.", twr: "Radius of the spiral. Smaller is a tighter, rounder curve.", twn: "How many slices each card is cut into. More is smoother but heavier.",
      twg: "Gap between neighbouring cards. 100 means they touch, higher opens gaps.", twp: "How steeply the ribbon climbs each turn. Lower packs the turns closer together.", twsc: "Size of every card in Twister."
    };
    var GALLERY = /^(asp|tw(r|p|sc|g|n)|ggap|gstag|gpar)$/;
    var css = document.createElement("style");
    css.textContent =
      '#liquid-ui{position:fixed;right:var(--lm,32px);bottom:88px;z-index:2147483600;font-family:"Anton","Inter Display",Impact,sans-serif;text-transform:uppercase;color:#f2f2f2;letter-spacing:.04em;-webkit-font-smoothing:antialiased}' +
      '#liquid-ui *{box-sizing:border-box;font-family:inherit;text-transform:inherit;letter-spacing:inherit}' +
      '#liquid-ui .lq-btn{display:flex;align-items:center;gap:8px;margin-left:auto;padding:8px 13px;border:1px solid rgba(242,242,242,.16);border-radius:999px;background:rgba(14,14,14,.62);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:inherit;font-size:12px;cursor:pointer;transition:border-color .5s,background .5s}' +
      '#liquid-ui .lq-btn:hover{border-color:rgba(242,242,242,.4);background:rgba(14,14,14,.8)}' +
      '#liquid-ui .lq-dot{width:8px;height:8px;border-radius:50%;background:#f2f2f2;box-shadow:0 0 10px rgba(242,242,242,.55);opacity:.9;transition:opacity .5s}' +
      '#liquid-ui.off .lq-dot{opacity:.25;box-shadow:none}' +
      '#liquid-ui .lq-card{width:calc(3 * (100vw - 2 * var(--lm,32px) - 176px) / 12 + 32px);max-height:calc(100vh - 168px);overflow:auto;margin-bottom:10px;padding:16px 16px 12px;border:1px solid rgba(242,242,242,.14);border-radius:16px;background:rgba(14,14,14,.7);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:0 18px 50px rgba(0,0,0,.45);opacity:0;transform:translateY(10px);visibility:hidden;pointer-events:none;transition:opacity .55s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1),visibility 0s .7s}' +
      '#liquid-ui.open .lq-card{opacity:1;transform:none;visibility:visible;pointer-events:auto;transition:opacity .55s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1)}' +
      '#liquid-ui .lq-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-bottom:14px;padding:3px;border:1px solid rgba(242,242,242,.14);border-radius:20px}' +
      '#liquid-ui .lq-tabs button{padding:6px 0;font-size:10px;border:0;border-radius:999px;background:none;color:rgba(242,242,242,.7);font-size:11px;cursor:pointer;transition:background .4s,color .4s}' +
      '#liquid-ui .lq-tabs button.on{background:#f2f2f2;color:#0b0b0b}' +
      '#liquid-ui .lq-sec{margin:16px 0 10px;padding-top:12px;border-top:1px solid rgba(242,242,242,.12);font-size:11px;color:rgba(242,242,242,.5)}' +
      '#liquid-ui .lq-demo{display:inline-block;margin:0 0 12px;font-size:16px;color:#f2f2f2;text-decoration:none;cursor:pointer}' +
      '#liquid-ui .lq-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px}' +
      '#liquid-ui .lq-row{display:grid;grid-template-columns:1fr auto;gap:2px 8px;margin-bottom:11px;font-size:11px;color:rgba(242,242,242,.72)}' +
      '#liquid-ui .lq-desc{grid-column:1/-1;font-size:10px;line-height:1.35;color:rgba(242,242,242,.45);text-transform:none!important;letter-spacing:.01em!important;font-family:Inter,-apple-system,sans-serif!important}' +
      '#liquid-ui .lq-row b{font-weight:400;color:#f2f2f2;font-variant-numeric:tabular-nums}' +
      '#liquid-ui input[type=range]{grid-column:1/-1;width:100%;height:16px;margin:0;background:none;-webkit-appearance:none;appearance:none;cursor:pointer}' +
      '#liquid-ui input[type=range]::-webkit-slider-runnable-track{height:2px;border-radius:2px;background:rgba(242,242,242,.22)}' +
      '#liquid-ui input[type=range]::-moz-range-track{height:2px;border-radius:2px;background:rgba(242,242,242,.22)}' +
      '#liquid-ui input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;margin-top:-5px;border-radius:50%;border:0;background:#f2f2f2;transition:transform .3s}' +
      '#liquid-ui input[type=range]::-moz-range-thumb{width:12px;height:12px;border-radius:50%;border:0;background:#f2f2f2}' +
      '#liquid-ui input[type=range]:hover::-webkit-slider-thumb{transform:scale(1.25)}' +
      '#liquid-ui .lq-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}' +
      '#liquid-ui .lq-actions button{padding:7px 0;border:1px solid rgba(242,242,242,.18);border-radius:999px;background:transparent;color:inherit;font-size:11px;cursor:pointer;transition:border-color .4s,background .4s}' +
      '#liquid-ui .lq-actions button:hover{border-color:rgba(242,242,242,.5);background:rgba(242,242,242,.08)}' +
      '#liquid-ui :focus-visible{outline:1px solid rgba(242,242,242,.7);outline-offset:3px}' +
      '@media (max-width:1439.98px){#liquid-ui{--lm:24px}#liquid-ui .lq-card{width:calc(4 * (100vw - 2 * var(--lm) - 112px) / 8 + 48px)}}@media (max-width:809.98px){#liquid-ui{--lm:16px}#liquid-ui .lq-card{width:calc(100vw - 32px)}}#liquid-ui .lq-actions button:last-child:nth-child(odd){grid-column:1/-1}';
    document.head.appendChild(css);

    var ui = document.createElement("div"); ui.id = "liquid-ui";
    /* hidden by default. Shift+L (or adding #liquid to the address) shows it again; the settings are kept either way */
    var UIKEY = KEY + "-ui3"; /* new key: the panel starts hidden again for everyone */
    function showUI(v) { ui.style.display = v ? "" : "none"; try { localStorage.setItem(UIKEY, v ? "1" : "0"); } catch (e) {} if (!v) ui.classList.remove("open"); }
    var shown = false;
    try { shown = localStorage.getItem(UIKEY) === "1"; } catch (e) {}
    if (/liquid/.test(location.hash)) shown = true;
    if (window.__lqOpenNow) { shown = true; window.__lqOpenNow = 0; setTimeout(function () { showUI(true); ui.classList.add("open"); }, 30); }
    ui.style.display = shown ? "" : "none";
    addEventListener("keydown", function (e) {
      if (e.shiftKey && (e.key === "L" || e.key === "l") && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) { showUI(ui.style.display === "none"); if (ui.style.display !== "none") ui.classList.add("open"); }
    });
    var card = document.createElement("div"); card.className = "lq-card"; card.setAttribute("role", "group"); card.setAttribute("aria-label", "Liquid hover settings");
    card.innerHTML = '<div class="lq-title"><span>Liquid hover</span></div>';
    var inputs = {}, pages = {}, tabs = document.createElement("div"), cur = null;
    tabs.className = "lq-tabs";
    [["Cursor", "Cursor"], ["Link hover", "Links"], ["About popup", "Popup"], ["Intro", "Intro"], ["Grid", "Grid"], ["Gallery hover", "Hover"], ["Twister", "Twist"]].forEach(function (t) {
      var pg = document.createElement("div"); pg.className = "lq-page"; pages[t[0]] = pg;
      var tb = document.createElement("button"); tb.type = "button"; tb.textContent = t[1]; tb.dataset.page = t[0];
      tb.onclick = function () { setPage(t[0]); try { localStorage.setItem(KEY + "-tab", t[0]); } catch (e) {} };
      tabs.appendChild(tb);
    });
    function setPage(n) { cur = n; [].forEach.call(tabs.children, function (b) { b.classList.toggle("on", b.dataset.page === n); }); Object.keys(pages).forEach(function (k) { pages[k].style.display = k === n ? "" : "none"; }); }
    card.appendChild(tabs); Object.keys(pages).forEach(function (k) { card.appendChild(pages[k]); });
    var host = pages["Cursor"];
    ROWS.forEach(function (r) {
      if (r[0] === "#") {
        host = pages[r[1]];
        if (r[1] === "Intro") {
          var rp = document.createElement("button"); rp.type = "button"; rp.textContent = "Replay intro"; rp.className = "lq-demo";
          rp.style.cssText = "border:1px solid rgba(242,242,242,.4);border-radius:999px;background:none;padding:7px 14px;font-size:12px";
          rp.onclick = function () { save(); if (/nointro/.test(location.hash)) location.hash = "liquid"; location.reload(); };
          host.appendChild(rp);
        }
        if (r[1] === "Link hover") {
          var demo = document.createElement("a"); demo.href = "#"; demo.className = "lq-demo";
          "Hover to preview".split("").forEach(function (ch) { var sp = document.createElement("span"); sp.style.cssText = "display:inline-block;white-space:pre"; sp.textContent = ch; demo.appendChild(sp); });
          demo.onclick = function (e) { e.preventDefault(); if (window.__linkfxPlay) window.__linkfxPlay(demo); };
          host.appendChild(demo);
        }
        return;
      }
      var row = document.createElement("label"); row.className = "lq-row";
      var name = document.createElement("span"); name.textContent = r[1];
      var val = document.createElement("b");
      var inp = document.createElement("input"); inp.type = "range"; inp.min = r[2]; inp.max = r[3]; inp.step = r[4]; inp.id = "lq-" + r[0];
      function show() { var v = +own[r[0]]; val.textContent = (r[4] < 1 ? v.toFixed(r[4] < .01 ? 3 : 2) : Math.round(v)) + r[5]; }
      inp.value = own[r[0]]; show();
      inp.addEventListener("input", function () { own[r[0]] = +inp.value; show(); save(); kick(); if (GALLERY.test(r[0])) { window.__gcfgV = (window.__gcfgV || 0) + 1; if (r[0][0] !== "c") dispatchEvent(new Event("cms-change")); } });
      inputs[r[0]] = [inp, show];
      row.append(name, val, inp);
      if (DESC[r[0]]) { var dsc = document.createElement("small"); dsc.className = "lq-desc"; dsc.textContent = DESC[r[0]]; row.appendChild(dsc); }
      host.appendChild(row);
    });
    var savedTab = "Cursor"; try { savedTab = localStorage.getItem(KEY + "-tab") || "Cursor"; } catch (e) {}
    setPage(pages[savedTab] ? savedTab : "Cursor");
    var actions = document.createElement("div"); actions.className = "lq-actions";
    var reset = document.createElement("button"); reset.type = "button"; reset.textContent = "Reset";
    reset.onclick = function () { Object.keys(DEF).forEach(function (k) { own[k] = DEF[k]; if (inputs[k]) { inputs[k][0].value = DEF[k]; inputs[k][1](); } }); ui.classList.remove("off"); save(); kick(); window.__gcfgV = (window.__gcfgV || 0) + 1; dispatchEvent(new Event("cms-change")); };
    var toggle = document.createElement("button"); toggle.type = "button"; toggle.textContent = own.on ? "Turn off" : "Turn on";
    toggle.onclick = function () { own.on = own.on ? 0 : 1; toggle.textContent = own.on ? "Turn off" : "Turn on"; ui.classList.toggle("off", !own.on); save(); kick(); };
    ui.classList.toggle("off", !own.on);
    var copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Copy values";
    copy.onclick = function () {
      var o = {}; Object.keys(DEF).forEach(function (k) { o[k] = own[k]; }); var txt = JSON.stringify(o);
      var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy values"; }, 1400); };
      try { navigator.clipboard.writeText(txt).then(done, function () { copy.textContent = txt.slice(0, 18) + "…"; }); } catch (e) { copy.textContent = "Not allowed"; }
    };
    var hide = document.createElement("button"); hide.type = "button"; hide.textContent = "Save & hide";
    hide.onclick = function () { save(); showUI(false); };
    var cmsBtn = document.createElement("button"); cmsBtn.type = "button"; cmsBtn.textContent = "Open CMS"; cmsBtn.onclick = function () { location.href = "/cms"; };
    actions.append(reset, toggle, copy, hide); if (/^(localhost|127\.)/.test(location.hostname)) actions.append(cmsBtn); card.appendChild(actions);
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "lq-btn"; btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="lq-dot"></span><span>Liquid</span>';
    btn.onclick = function () { var o = ui.classList.toggle("open"); btn.setAttribute("aria-expanded", o); };
    addEventListener("keydown", function (e) { if (e.key === "Escape" && ui.classList.contains("open")) { ui.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } });
    if (!ENABLED) { var note = document.createElement("div"); note.style.cssText = "margin-top:8px;font-size:10px;color:rgba(242,242,242,.55);line-height:1.3"; note.textContent = "Hover effects need a mouse and motion enabled on this device."; card.appendChild(note); }
    ui.append(card, btn); document.body.appendChild(ui);
  };
