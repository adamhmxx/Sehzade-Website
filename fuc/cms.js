/* Simple CMS for the portfolio.
   - Portfolio tab: add, edit, reorder and remove projects (image upload, name, description, category, year, link).
   - About tab: the About text, client list, email, booking link and social links.
   - Data tab: export / import everything as JSON, or reset to the original content.
   Everything is saved in this browser (localStorage) and shows up live. The main page owns the editor; the About
   page, which is shown inside the main page, picks the changes up through the storage event. */
(function () {
  if (window.__cmsLoaded) return;
  window.__cmsLoaded = 1;

  var KEY = "site-cms-v1", UIKEY = "site-cms-ui";
  var ABOUT = !!document.getElementById("about-overrides");
  var DEF_ABOUT = {
    description: "22 y.o Designer with experience since 2022, working with multiple global clients including corporate and studio.",
    trustedBy: "SlabPixel, One Week Wonders, Lexur, Webser, Enso Build, Orenji, Recruitpilot AI, Wegonorth, Varelo, Circles & more.",
    email: "adamhimawan24@gmail.com", call: "https://cal.com/adam-himawan",
    x: "https://x.com/adamhmwn", behance: "https://www.behance.net/adamhimawan", linkedin: "https://www.linkedin.com/in/adamhimawan/",
    dribbble: "https://dribbble.com/adamhmwn", instagram: "https://www.instagram.com/adamhmwn/"
  };
  var SOCIALS = [["x", "X"], ["behance", "Behance"], ["linkedin", "LinkedIn"], ["dribbble", "Dribbble"], ["instagram", "Instagram"]];

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  var data = read() || { items: null, about: {} };
  function about() { return Object.assign({}, DEF_ABOUT, data.about || {}); }
  var saveTimer = 0, statusEl = null;
  function setStatus(t, bad) { if (statusEl) { statusEl.textContent = t; statusEl.style.color = bad ? "#ff6b5e" : "rgba(242,242,242,.55)"; } }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); setStatus("Saved"); }
    catch (e) { setStatus("Storage is full. Remove a project or use smaller images.", true); }
  }
  function changed(immediate) {
    window.dispatchEvent(new Event("cms-change"));
    clearTimeout(saveTimer);
    if (immediate) persist(); else { setStatus("Saving…"); saveTimer = setTimeout(persist, 300); }
    applyAbout();
  }

  /* ---------- gallery data, read by the gallery component ---------- */
  window.__cmsItems = function () {
    if (!data || !data.items) return null;
    return data.items.map(function (it) {
      return { name: it.name || "", description: it.description || "", services: it.services || "", year: it.year || "", link: it.link || "",
               image: it.src ? { src: it.src, srcSet: it.srcSet || undefined, alt: it.name || "" } : undefined };
    });
  };
  function seedItems() {
    if (data.items) return;
    var def = window.__cmsDefaults || [];
    data.items = def.map(function (x, n) {
      return { id: "p" + n + Date.now().toString(36), name: x.name || "", description: x.description || "", services: x.services || "", year: x.year || "",
               link: x.link || "", src: (x.image && x.image.src) || "", srcSet: (x.image && x.image.srcSet) || "" };
    });
  }

  /* ---------- About, navbar and links: patched in the page and kept in place ---------- */
  function setLetters(el, text) {
    var box = el.querySelector("span"); if (!box) return;
    if (box.textContent === text) return;
    box.textContent = "";
    for (var i = 0; i < text.length; i++) { var s = document.createElement("span"); s.style.cssText = "display:inline-block;white-space:pre"; s.textContent = text[i]; box.appendChild(s); }
  }
  function applyAbout() {
    var a = about();
    [].forEach.call(document.querySelectorAll("a[target=_blank]"), function (el) {
      if (/cal\.com|\/book/i.test(el.href) || (el.closest("nav") && /book/i.test(el.textContent))) { if (a.call && el.getAttribute("href") !== a.call) el.setAttribute("href", a.call); }
    });
    if (!ABOUT) return;
    var h1 = document.querySelector("h1");
    if (h1 && a.description && h1.textContent !== a.description) h1.textContent = a.description;
    [].forEach.call(document.querySelectorAll("p"), function (p) {
      if (p.textContent.trim().toLowerCase() === "trusted by" && p.nextElementSibling && a.trustedBy && p.nextElementSibling.textContent !== a.trustedBy) p.nextElementSibling.textContent = a.trustedBy;
    });
    var mail = document.querySelector('a[href^="mailto:"]');
    if (mail && a.email) { if (mail.getAttribute("href") !== "mailto:" + a.email) mail.setAttribute("href", "mailto:" + a.email); setLetters(mail, a.email); }
    SOCIALS.forEach(function (s) {
      [].forEach.call(document.querySelectorAll("a[href]"), function (el) {
        if (el.textContent.trim().toLowerCase() !== s[1].toLowerCase()) return;
        var url = a[s[0]];
        el.style.display = url ? "" : "none";
        if (url && el.getAttribute("href") !== url) el.setAttribute("href", url);
      });
    });
  }
  var obsTimer = 0;
  function watch() {
    new MutationObserver(function () { clearTimeout(obsTimer); obsTimer = setTimeout(applyAbout, 120); }).observe(document.body, { childList: true, subtree: true });
    applyAbout();
  }
  addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    data = read() || { items: null, about: {} };
    applyAbout(); window.dispatchEvent(new Event("cms-change"));
  });

  if (ABOUT) { if (document.body) watch(); else addEventListener("DOMContentLoaded", watch); return; }

  /* ---------- editor (main page only) ---------- */
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) { if (k === "style") n.style.cssText = props[k]; else if (k === "class") n.className = props[k]; else if (k.slice(0, 2) === "on") n[k] = props[k]; else n.setAttribute(k, props[k]); });
    [].concat(kids || []).forEach(function (c) { n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function field(label, value, onInput, opts) {
    opts = opts || {};
    var input = el(opts.area ? "textarea" : "input", opts.area ? { rows: opts.rows || 3 } : { type: "text" });
    input.value = value || ""; if (opts.placeholder) input.placeholder = opts.placeholder;
    input.addEventListener("input", function () { onInput(input.value); });
    return el("label", { class: "cm-f" }, [el("span", {}, label), input]);
  }
  function compress(file, done) {
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var sc = Math.min(1, 1500 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        var out; try { out = c.toDataURL("image/webp", .82); if (out.indexOf("image/webp") < 0) throw 0; } catch (e) { out = c.toDataURL("image/jpeg", .85); }
        done(out);
      };
      img.onerror = function () { done(null); };
      img.src = fr.result;
    };
    fr.onerror = function () { done(null); };
    fr.readAsDataURL(file);
  }

  var tab = "portfolio", body = null, root = null, openId = null;
  function render() {
    body.textContent = "";
    [].forEach.call(root.querySelectorAll(".cm-tab"), function (t) { t.classList.toggle("on", t.dataset.tab === tab); });
    if (tab === "portfolio") renderPortfolio(); else if (tab === "about") renderAbout(); else renderData();
  }

  function renderPortfolio() {
    seedItems();
    var list = data.items;
    body.appendChild(el("button", { class: "cm-btn cm-add", type: "button", onclick: function () {
      var id = "p" + Date.now().toString(36); list.unshift({ id: id, name: "New project", description: "", services: "", year: String(new Date().getFullYear()), link: "", src: "", srcSet: "" }); openId = id; changed(true); render();
    } }, "+ Add project"));
    if (!list.length) body.appendChild(el("p", { class: "cm-hint" }, "No projects yet. Add one to fill the gallery."));
    list.forEach(function (it, idx) {
      var thumb = el("div", { class: "cm-thumb", style: it.src ? "background-image:url('" + it.src.replace(/'/g, "%27") + "')" : "" });
      var head = el("summary", {}, [thumb, el("span", { class: "cm-name" }, it.name || "Untitled"), el("span", { class: "cm-year" }, it.year || "")]);
      var d = el("details", { class: "cm-item" }, [head]);
      if (openId === it.id) d.open = true;
      d.addEventListener("toggle", function () { if (d.open) openId = it.id; });
      var bar = el("div", { class: "cm-bar" }, [
        el("button", { type: "button", class: "cm-mini", title: "Move up", onclick: function (e) { e.preventDefault(); if (idx > 0) { list.splice(idx - 1, 0, list.splice(idx, 1)[0]); changed(true); render(); } } }, "↑"),
        el("button", { type: "button", class: "cm-mini", title: "Move down", onclick: function (e) { e.preventDefault(); if (idx < list.length - 1) { list.splice(idx + 1, 0, list.splice(idx, 1)[0]); changed(true); render(); } } }, "↓"),
        el("button", { type: "button", class: "cm-mini cm-del", title: "Delete", onclick: function (e) { e.preventDefault(); if (d.dataset.ask) { list.splice(idx, 1); changed(true); render(); } else { d.dataset.ask = 1; e.target.textContent = "Sure?"; setTimeout(function () { delete d.dataset.ask; if (e.target) e.target.textContent = "✕"; }, 2200); } } }, "✕")
      ]);
      head.appendChild(bar);
      var preview = el("div", { class: "cm-prev", style: it.src ? "background-image:url('" + it.src.replace(/'/g, "%27") + "')" : "" }, it.src ? "" : "No image");
      function setSrc(src) { it.src = src; it.srcSet = ""; var u = it.src ? "url('" + it.src.replace(/'/g, "%27") + "')" : ""; preview.style.backgroundImage = u; thumb.style.backgroundImage = u; preview.textContent = it.src ? "" : "No image"; changed(true); }
      var file = el("input", { type: "file", accept: "image/*", style: "display:none" });
      file.addEventListener("change", function () {
        if (!file.files[0]) return; setStatus("Processing image…");
        compress(file.files[0], function (out) { if (out) setSrc(out); else setStatus("That image could not be read.", true); });
      });
      var urlField = field("Or image URL", /^data:/.test(it.src) ? "" : it.src, function (v) { it.src = v; it.srcSet = ""; var u = v ? "url('" + v.replace(/'/g, "%27") + "')" : ""; preview.style.backgroundImage = u; thumb.style.backgroundImage = u; changed(); }, { placeholder: "https://…" });
      d.appendChild(el("div", { class: "cm-body" }, [
        preview,
        el("div", { class: "cm-row" }, [el("button", { type: "button", class: "cm-btn", onclick: function () { file.click(); } }, "Upload image"), file,
          el("button", { type: "button", class: "cm-btn", onclick: function () { setSrc(""); urlField.querySelector("input").value = ""; } }, "Remove image")]),
        urlField,
        field("Name", it.name, function (v) { it.name = v; head.querySelector(".cm-name").textContent = v || "Untitled"; changed(); }),
        field("Description", it.description, function (v) { it.description = v; changed(); }),
        el("div", { class: "cm-two" }, [
          field("Category", it.services, function (v) { it.services = v; changed(); }),
          field("Year", it.year, function (v) { it.year = v; head.querySelector(".cm-year").textContent = v; changed(); })
        ]),
        field("Link (optional)", it.link, function (v) { it.link = v; changed(); }, { placeholder: "https://…" })
      ]));
      body.appendChild(d);
    });
    body.appendChild(el("p", { class: "cm-hint" }, "Tip: 4:3 images fit the cards best. Images are resized to 1500px and stored in this browser."));
  }

  function renderAbout() {
    var a = about();
    function set(k) { return function (v) { data.about = data.about || {}; data.about[k] = v; changed(); }; }
    body.appendChild(field("Description", a.description, set("description"), { area: 1, rows: 4 }));
    body.appendChild(field("Trusted by", a.trustedBy, set("trustedBy"), { area: 1, rows: 3 }));
    body.appendChild(field("Email", a.email, set("email")));
    body.appendChild(field("Book a call link", a.call, set("call"), { placeholder: "https://…" }));
    body.appendChild(el("div", { class: "cm-sec" }, "Social links (empty hides the link)"));
    SOCIALS.forEach(function (s) { body.appendChild(field(s[1], a[s[0]], set(s[0]), { placeholder: "https://…" })); });
  }

  function renderData() {
    var ta = el("textarea", { rows: 8, readonly: "readonly" });
    function dump() { ta.value = JSON.stringify({ items: data.items, about: data.about }, null, 1); }
    seedItems(); dump();
    var imp = el("textarea", { rows: 6, placeholder: "Paste exported JSON here" });
    body.appendChild(el("div", { class: "cm-sec" }, "Export"));
    body.appendChild(ta);
    body.appendChild(el("div", { class: "cm-row" }, [el("button", { type: "button", class: "cm-btn", onclick: function () {
      ta.select(); try { navigator.clipboard.writeText(ta.value).then(function () { setStatus("Copied to clipboard"); }, function () { setStatus("Select the text and copy it"); }); } catch (e) { setStatus("Select the text and copy it"); }
    } }, "Copy JSON")]));
    body.appendChild(el("div", { class: "cm-sec" }, "Import"));
    body.appendChild(imp);
    body.appendChild(el("div", { class: "cm-row" }, [el("button", { type: "button", class: "cm-btn", onclick: function () {
      try { var j = JSON.parse(imp.value); if (!j || typeof j !== "object") throw 0; data = { items: Array.isArray(j.items) ? j.items : data.items, about: j.about || {} }; changed(true); render(); setStatus("Imported"); } catch (e) { setStatus("That is not valid JSON.", true); }
    } }, "Apply import")]));
    body.appendChild(el("div", { class: "cm-sec" }, "Reset"));
    var rs = el("button", { type: "button", class: "cm-btn cm-danger", onclick: function () {
      if (rs.dataset.ask) { data = { items: null, about: {} }; try { localStorage.removeItem(KEY); } catch (e) {} window.dispatchEvent(new Event("cms-change")); applyAbout(); render(); setStatus("Back to the original content"); }
      else { rs.dataset.ask = 1; rs.textContent = "Click again to confirm"; setTimeout(function () { delete rs.dataset.ask; rs.textContent = "Reset all content"; }, 2600); }
    } }, "Reset all content");
    body.appendChild(rs);
    body.appendChild(el("p", { class: "cm-hint" }, "Changes live in this browser only. To make them permanent for every visitor, copy the JSON and send it to be built into the site."));
  }

  function build() {
    var css = el("style", {}, [
      '#cms-ui{position:fixed;left:max(16px,env(safe-area-inset-left,0px));bottom:max(16px,env(safe-area-inset-bottom,0px));z-index:2147483550;font-family:"Anton","Inter Display",Impact,sans-serif;color:#f2f2f2;letter-spacing:.04em;text-transform:uppercase;-webkit-font-smoothing:antialiased}' +
      '#cms-ui *{box-sizing:border-box}' +
      '#cms-ui .cm-pill{display:flex;align-items:center;gap:8px;padding:8px 13px;border:1px solid rgba(242,242,242,.16);border-radius:999px;background:rgba(14,14,14,.62);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:inherit;font:inherit;font-size:12px;cursor:pointer;transition:border-color .5s,background .5s}' +
      '#cms-ui .cm-pill:hover{border-color:rgba(242,242,242,.4);background:rgba(14,14,14,.8)}' +
      '#cms-ui .cm-dot{width:8px;height:8px;border-radius:2px;background:#f2f2f2;opacity:.9}' +
      '#cms-ui .cm-card{position:fixed;left:0;top:0;bottom:0;width:min(420px,100vw);display:flex;flex-direction:column;background:rgba(12,12,12,.9);-webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);border-right:1px solid rgba(242,242,242,.12);box-shadow:24px 0 70px rgba(0,0,0,.5);transform:translateX(-102%);visibility:hidden;transition:transform .8s cubic-bezier(.22,1,.36,1),visibility 0s .8s}' +
      '#cms-ui.open .cm-card{transform:none;visibility:visible;transition:transform .8s cubic-bezier(.22,1,.36,1)}' +
      '#cms-ui.open .cm-pill{opacity:0;pointer-events:none}' +
      '#cms-ui .cm-top{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 10px;font-size:14px}' +
      '#cms-ui .cm-top button{background:none;border:0;color:inherit;font:inherit;font-size:12px;cursor:pointer;opacity:.7;transition:opacity .3s}' +
      '#cms-ui .cm-top button:hover{opacity:1}' +
      '#cms-ui .cm-tabs{display:flex;gap:6px;padding:0 18px 12px;border-bottom:1px solid rgba(242,242,242,.1)}' +
      '#cms-ui .cm-tab{padding:6px 12px;border:1px solid rgba(242,242,242,.16);border-radius:999px;background:none;color:inherit;font:inherit;font-size:11px;cursor:pointer;transition:background .4s,border-color .4s}' +
      '#cms-ui .cm-tab.on{background:#f2f2f2;color:#0b0b0b;border-color:#f2f2f2}' +
      '#cms-ui .cm-body{overflow:auto}' +
      '#cms-ui .cm-main{flex:1;overflow:auto;padding:14px 18px 8px}' +
      '#cms-ui .cm-foot{padding:10px 18px 14px;border-top:1px solid rgba(242,242,242,.1);font-size:11px;color:rgba(242,242,242,.55)}' +
      '#cms-ui input,#cms-ui textarea{width:100%;padding:9px 10px;border:1px solid rgba(242,242,242,.16);border-radius:10px;background:rgba(242,242,242,.05);color:#f2f2f2;font:14px/1.35 "Inter Display",Inter,system-ui,sans-serif;letter-spacing:0;text-transform:none;resize:vertical;transition:border-color .3s}' +
      '#cms-ui input:focus,#cms-ui textarea:focus{outline:none;border-color:rgba(242,242,242,.55)}' +
      '#cms-ui .cm-f{display:block;margin-bottom:11px;font-size:11px;color:rgba(242,242,242,.6)}' +
      '#cms-ui .cm-f span{display:block;margin-bottom:5px}' +
      '#cms-ui .cm-two{display:grid;grid-template-columns:1fr 90px;gap:10px}' +
      '#cms-ui .cm-btn{padding:8px 14px;border:1px solid rgba(242,242,242,.2);border-radius:999px;background:transparent;color:inherit;font:inherit;font-size:11px;cursor:pointer;transition:background .3s,border-color .3s}' +
      '#cms-ui .cm-btn:hover{background:rgba(242,242,242,.1);border-color:rgba(242,242,242,.5)}' +
      '#cms-ui .cm-add{width:100%;margin-bottom:12px;padding:11px;background:#f2f2f2;color:#0b0b0b;border-color:#f2f2f2}' +
      '#cms-ui .cm-add:hover{background:#fff}' +
      '#cms-ui .cm-danger{border-color:rgba(255,107,94,.5);color:#ff8a7e}' +
      '#cms-ui .cm-row{display:flex;gap:8px;margin:0 0 12px;flex-wrap:wrap}' +
      '#cms-ui .cm-item{margin-bottom:8px;border:1px solid rgba(242,242,242,.12);border-radius:14px;background:rgba(242,242,242,.03);overflow:hidden}' +
      '#cms-ui .cm-item summary{display:flex;align-items:center;gap:10px;padding:9px 10px;cursor:pointer;list-style:none;font-size:13px}' +
      '#cms-ui .cm-item summary::-webkit-details-marker{display:none}' +
      '#cms-ui .cm-thumb{flex:none;width:48px;height:36px;border-radius:6px;background:#222 center/cover}' +
      '#cms-ui .cm-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#cms-ui .cm-year{color:rgba(242,242,242,.5);font-size:11px}' +
      '#cms-ui .cm-bar{display:flex;gap:4px}' +
      '#cms-ui .cm-mini{width:26px;height:26px;border:1px solid rgba(242,242,242,.16);border-radius:50%;background:none;color:inherit;font:inherit;font-size:12px;line-height:1;cursor:pointer;transition:background .3s}' +
      '#cms-ui .cm-mini:hover{background:rgba(242,242,242,.14)}' +
      '#cms-ui .cm-del{width:auto;padding:0 8px;border-radius:999px}' +
      '#cms-ui .cm-body{padding:4px 12px 6px}' +
      '#cms-ui .cm-prev{display:flex;align-items:center;justify-content:center;aspect-ratio:4/3;margin-bottom:10px;border-radius:10px;background:#1b1b1b center/cover;color:rgba(242,242,242,.4);font-size:11px}' +
      '#cms-ui .cm-sec{margin:16px 0 8px;font-size:11px;color:rgba(242,242,242,.5)}' +
      '#cms-ui .cm-hint{margin:12px 0;font:12px/1.4 "Inter Display",Inter,system-ui,sans-serif;letter-spacing:0;text-transform:none;color:rgba(242,242,242,.5)}' +
      '#cms-ui :focus-visible{outline:1px solid rgba(242,242,242,.7);outline-offset:2px}'
    ]);
    document.head.appendChild(css);
    root = el("div", { id: "cms-ui" });
    var pill = el("button", { type: "button", class: "cm-pill", onclick: function () { root.classList.add("open"); render(); } }, [el("span", { class: "cm-dot" }), "CMS"]);
    body = el("div", { class: "cm-main" });
    statusEl = el("div", { class: "cm-foot" }, "Saved");
    var tabs = el("div", { class: "cm-tabs" }, [["portfolio", "Portfolio"], ["about", "About"], ["data", "Data"]].map(function (t) {
      return el("button", { type: "button", class: "cm-tab", "data-tab": t[0], onclick: function () { tab = t[0]; render(); } }, t[1]);
    }));
    var card = el("div", { class: "cm-card", role: "dialog", "aria-label": "Content manager" }, [
      el("div", { class: "cm-top" }, [el("span", {}, "Content"), el("span", {}, [
        el("button", { type: "button", onclick: function () { showPill(false); } }, "Hide CMS  "),
        el("button", { type: "button", onclick: function () { root.classList.remove("open"); } }, "Close")])]),
      tabs, body, statusEl]);
    root.append(pill, card); document.body.appendChild(root);
    function showPill(v) { root.style.display = v ? "" : "none"; if (!v) root.classList.remove("open"); try { localStorage.setItem(UIKEY, v ? "1" : "0"); } catch (e) {} }
    var vis = true; try { vis = localStorage.getItem(UIKEY) !== "0"; } catch (e) {}
    if (/cms/.test(location.hash)) vis = true;
    root.style.display = vis ? "" : "none";
    addEventListener("keydown", function (e) {
      if (e.shiftKey && (e.key === "C" || e.key === "c") && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) { var show = root.style.display === "none"; showPill(show); if (show) { root.classList.add("open"); render(); } }
      if (e.key === "Escape") root.classList.remove("open");
    });
  }

  function start() { build(); watch(); if (data.items) window.dispatchEvent(new Event("cms-change")); }
  if (document.body) start(); else addEventListener("DOMContentLoaded", start);
})();
