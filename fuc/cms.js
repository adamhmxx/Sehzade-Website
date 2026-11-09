/* Simple CMS for the portfolio.
   - Portfolio tab: add, edit, reorder and remove projects (image upload, name, description, category, year, link).
   - About tab: the About text, client list, email, booking link and social links.
   - Data tab: export / import everything as JSON, or reset to the original content.
   Everything is saved in this browser (localStorage) and shows up on the site. The editor is its own page (cms.html, which
   sets window.__cmsPage); the main page and the About page only read the data and pick up changes through the storage event.
   Open the editor with Shift+C on the site, or go to cms.html. */
(function () {
  if (window.__cmsLoaded) return;
  window.__cmsLoaded = 1;

  var KEY = "site-cms-v1", DKEY = "site-cms-defaults", PAGE = !!window.__cmsPage;
  var ABOUT = !!document.getElementById("about-overrides");
  var DEF_ABOUT = {
    description: "22 y.o Designer with experience since 2022, working with multiple global clients including corporate and studio.",
    trustedBy: "SlabPixel, One Week Wonders, Lexur, Webser, Enso Build, Orenji, Recruitpilot AI, Wegonorth, Varelo, Circles & more.",
    email: "adamhimawan24@gmail.com", call: "https://cal.com/adam-himawan",
    x: "https://x.com/adamhmwn", behance: "https://www.behance.net/adamhimawan", linkedin: "https://www.linkedin.com/in/adamhimawan/",
    dribbble: "https://dribbble.com/adamhmwn", instagram: "https://www.instagram.com/adamhmwn/"
  };
  var DEF_SITE = { logo: "Sehzade.", aboutLabel: "About", callLabel: "Book a call", clock: "ID (WIB)", cardName: "Adam Himawan", copyright: "\u00a9 Sehzade 2026", title: "Adam Himawan Portfolio",
                   modes: ["Twister", "Space", "Grid"] };
  var SOCIALS = [["x", "X"], ["behance", "Behance"], ["linkedin", "LinkedIn"], ["dribbble", "Dribbble"], ["instagram", "Instagram"]];

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  var data = read() || { items: null, about: {} };
  function site() { var o = Object.assign({}, DEF_SITE, (data && data.site) || {}); o.modes = DEF_SITE.modes.map(function (d, i) { return savedModes()[i] || d; }); return o; }
  /* names saved while there were five modes (Twister, Space, Cross, Globe, Grid) keep Twister, Space and Grid */
  function savedModes() { var m = ((data.site || {}).modes || []); return m.length > 3 ? [m[0], m[1], m[4]] : m; }
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
  function defaults() { try { return JSON.parse(localStorage.getItem(DKEY) || "null"); } catch (e) { return null; } }
  function seedItems() {
    if (data.items) return;
    var def = window.__cmsDefaults || defaults() || [];
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
  function applySite() {
    var o = site();
    if (document.title !== o.title && !ABOUT) document.title = o.title;
    var nav = document.querySelector("nav"); if (!nav) return;
    var links = nav.querySelectorAll("a"); /* logo, About, Book a call */
    if (links[0] && links[0].getAttribute("href") === "/") setLetters(links[0], o.logo);
    if (links[1]) setLetters(links[1], o.aboutLabel);
    if (links[2]) setLetters(links[2], o.callLabel);
    [].forEach.call(nav.querySelectorAll("span"), function (sp) { if (!sp.children.length && /^ID \(|^[A-Z]{2} \(/.test(sp.textContent) && sp.textContent !== o.clock) sp.textContent = o.clock; });
    [].forEach.call(document.querySelectorAll('[role="tab"]'), function (t, i) { if (o.modes[i]) setLetters(t, o.modes[i]); });
  }
  function applyAbout() {
    applySite();
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

  /* ---------- main page: no editor here, only the shortcut and a copy of the original projects for the editor ---------- */
  if (!PAGE) {
    var tries = 0, iv = setInterval(function () {
      var d = window.__cmsDefaults;
      if (d && d.length) {
        clearInterval(iv);
        try { localStorage.setItem(DKEY, JSON.stringify(d.map(function (x) { return { name: x.name || "", description: x.description || "", services: x.services || "", year: x.year || "", link: x.link || "", image: x.image ? { src: x.image.src || "", srcSet: x.image.srcSet || "" } : null }; }))); } catch (e) {}
      } else if (++tries > 40) clearInterval(iv);
    }, 500);
    addEventListener("keydown", function (e) {
      if (e.shiftKey && (e.key === "C" || e.key === "c") && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) location.href = "cms.html";
    });
    function start() { if (/cms/.test(location.hash)) location.href = "cms.html"; watch(); if (data.items) window.dispatchEvent(new Event("cms-change")); }
    if (document.body) start(); else addEventListener("DOMContentLoaded", start);
    return;
  }

  /* ---------- the editor page ---------- */
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
    return el("label", { class: "cp-f" }, [el("span", {}, label), input]);
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
  function bg(src) { return src ? "url('" + src.replace(/'/g, "%27") + "')" : ""; }

  var tab = "portfolio", body = null, tabsEl = null, sel = null;
  function render() {
    body.textContent = "";
    [].forEach.call(tabsEl.children, function (t) { t.classList.toggle("on", t.dataset.tab === tab); });
    if (tab === "portfolio") renderPortfolio(); else if (tab === "about") renderAbout(); else if (tab === "site") renderSite(); else renderData();
  }
  function ask(btn, label, run) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      if (btn.dataset.ask) { run(); return; }
      btn.dataset.ask = 1; btn.textContent = "Sure?";
      setTimeout(function () { delete btn.dataset.ask; btn.textContent = label; }, 2200);
    });
  }

  function renderPortfolio() {
    seedItems();
    var list = data.items;
    if (!sel || !list.some(function (x) { return x.id === sel; })) sel = list[0] && list[0].id;
    var left = el("div", { class: "cp-list" }), right = el("div", { class: "cp-edit" });
    left.appendChild(el("button", { class: "cp-btn cp-add", type: "button", onclick: function () {
      var id = "p" + Date.now().toString(36); list.unshift({ id: id, name: "New project", description: "", services: "", year: String(new Date().getFullYear()), link: "", src: "", srcSet: "" }); sel = id; changed(true); render();
    } }, "+ Add project"));
    if (!list.length) left.appendChild(el("p", { class: "cp-hint" }, "No projects yet. Add one to fill the gallery."));
    list.forEach(function (it, idx) {
      var row = el("div", { class: "cp-row" + (it.id === sel ? " on" : ""), onclick: function () { sel = it.id; render(); } }, [
        el("div", { class: "cp-thumb", style: "background-image:" + bg(it.src) }),
        el("span", { class: "cp-name" }, it.name || "Untitled"), el("span", { class: "cp-year" }, it.year || "")]);
      var bar = el("span", { class: "cp-bar" });
      var up = el("button", { type: "button", class: "cp-mini", title: "Move up", onclick: function (e) { e.stopPropagation(); if (idx > 0) { list.splice(idx - 1, 0, list.splice(idx, 1)[0]); changed(true); render(); } } }, "↑");
      var dn = el("button", { type: "button", class: "cp-mini", title: "Move down", onclick: function (e) { e.stopPropagation(); if (idx < list.length - 1) { list.splice(idx + 1, 0, list.splice(idx, 1)[0]); changed(true); render(); } } }, "↓");
      var del = el("button", { type: "button", class: "cp-mini cp-del", title: "Delete" }, "✕");
      ask(del, "✕", function () { list.splice(idx, 1); changed(true); render(); });
      del.addEventListener("click", function (e) { e.stopPropagation(); });
      bar.append(up, dn, del); row.appendChild(bar); left.appendChild(row);
    });
    var it = list.filter(function (x) { return x.id === sel; })[0];
    if (it) {
      var preview = el("div", { class: "cp-prev", style: "background-image:" + bg(it.src) }, it.src ? "" : "No image");
      var rowEl = left.querySelector(".cp-row.on");
      function setSrc(src, keepField) {
        it.src = src; it.srcSet = ""; preview.style.backgroundImage = bg(src); preview.textContent = src ? "" : "No image";
        if (rowEl) rowEl.querySelector(".cp-thumb").style.backgroundImage = bg(src);
        if (!keepField) urlField.querySelector("input").value = /^data:/.test(src) ? "" : src;
        changed(!keepField);
      }
      var file = el("input", { type: "file", accept: "image/*", style: "display:none" });
      file.addEventListener("change", function () {
        if (!file.files[0]) return; setStatus("Processing image…");
        compress(file.files[0], function (out) { if (out) setSrc(out); else setStatus("That image could not be read.", true); });
      });
      var urlField = field("Or image URL", /^data:/.test(it.src) ? "" : it.src, function (v) { setSrc(v, true); }, { placeholder: "https://…" });
      right.append(
        el("div", { class: "cp-label" }, "Editing"),
        preview,
        el("div", { class: "cp-actions" }, [el("button", { type: "button", class: "cp-btn", onclick: function () { file.click(); } }, "Upload image"), file,
          el("button", { type: "button", class: "cp-btn", onclick: function () { setSrc(""); } }, "Remove image")]),
        urlField,
        field("Name", it.name, function (v) { it.name = v; if (rowEl) rowEl.querySelector(".cp-name").textContent = v || "Untitled"; changed(); }),
        field("Description", it.description, function (v) { it.description = v; changed(); }, { area: 1, rows: 3 }),
        el("div", { class: "cp-two" }, [
          field("Category", it.services, function (v) { it.services = v; changed(); }),
          field("Year", it.year, function (v) { it.year = v; if (rowEl) rowEl.querySelector(".cp-year").textContent = v; changed(); })
        ]),
        field("Link (optional)", it.link, function (v) { it.link = v; changed(); }, { placeholder: "https://…" }),
        el("p", { class: "cp-hint" }, "Tip: 4:3 images fit the cards best. Images are resized to 1500px and stored in this browser.")
      );
    } else right.appendChild(el("p", { class: "cp-hint" }, "Select a project to edit it."));
    body.append(left, right);
  }

  function renderAbout() {
    var a = about();
    function set(k) { return function (v) { data.about = data.about || {}; data.about[k] = v; changed(); }; }
    var c1 = el("div", { class: "cp-col6" }), c2 = el("div", { class: "cp-col6" });
    c1.append(el("div", { class: "cp-label" }, "Text"),
      field("Description", a.description, set("description"), { area: 1, rows: 4 }),
      field("Trusted by", a.trustedBy, set("trustedBy"), { area: 1, rows: 3 }),
      field("Email", a.email, set("email")),
      field("Book a call link", a.call, set("call"), { placeholder: "https://…" }));
    c2.appendChild(el("div", { class: "cp-label" }, "Social links (empty hides the link)"));
    SOCIALS.forEach(function (s) { c2.appendChild(field(s[1], a[s[0]], set(s[0]), { placeholder: "https://…" })); });
    body.append(c1, c2);
  }

  function renderSite() {
    var o = site();
    function set(k) { return function (v) { data.site = data.site || {}; data.site[k] = v; changed(); }; }
    function setMode(i) { return function (v) { data.site = data.site || {}; var m = savedModes().slice(); while (m.length < 3) m.push(""); m[i] = v; data.site.modes = m; changed(); }; }
    var c1 = el("div", { class: "cp-col6" }), c2 = el("div", { class: "cp-col6" });
    c1.append(el("div", { class: "cp-label" }, "Navigation and page"),
      field("Logo (top left)", o.logo, set("logo")), field("About menu (centre)", o.aboutLabel, set("aboutLabel")),
      field("Book a call button", o.callLabel, set("callLabel")), field("Clock label", o.clock, set("clock")),
      field("Name on the About card", o.cardName, set("cardName")), field("Card footer text (top left of the card)", o.copyright, set("copyright")), field("Browser tab title", o.title, set("title")));
    c2.appendChild(el("div", { class: "cp-label" }, "Gallery mode names"));
    o.modes.forEach(function (m, i) { c2.appendChild(field("Mode " + (i + 1), m, setMode(i))); });
    c2.appendChild(el("p", { class: "cp-hint" }, "Projects are on the Portfolio tab, the About text and links on the About tab. Changes show on the site straight away."));
    body.append(c1, c2);
  }
  function renderData() {
    seedItems();
    var ta = el("textarea", { rows: 12, readonly: "readonly" });
    ta.value = JSON.stringify({ items: data.items, about: data.about, site: data.site }, null, 1);
    var imp = el("textarea", { rows: 8, placeholder: "Paste exported JSON here" });
    var c1 = el("div", { class: "cp-col6" }), c2 = el("div", { class: "cp-col6" });
    c1.append(el("div", { class: "cp-label" }, "Export"), ta,
      el("div", { class: "cp-actions" }, [el("button", { type: "button", class: "cp-btn", onclick: function () {
        ta.select(); try { navigator.clipboard.writeText(ta.value).then(function () { setStatus("Copied to clipboard"); }, function () { setStatus("Select the text and copy it"); }); } catch (e) { setStatus("Select the text and copy it"); }
      } }, "Copy JSON")]),
      el("p", { class: "cp-hint" }, "Changes live in this browser only. To make them permanent for every visitor, copy the JSON and send it to be built into the site."));
    var rs = el("button", { type: "button", class: "cp-btn cp-danger" }, "Reset all content");
    ask(rs, "Reset all content", function () { data = { items: null, about: {} }; try { localStorage.removeItem(KEY); } catch (e) {} window.dispatchEvent(new Event("cms-change")); sel = null; render(); setStatus("Back to the original content"); });
    c2.append(el("div", { class: "cp-label" }, "Import"), imp,
      el("div", { class: "cp-actions" }, [el("button", { type: "button", class: "cp-btn", onclick: function () {
        try { var j = JSON.parse(imp.value); if (!j || typeof j !== "object") throw 0; data = { items: Array.isArray(j.items) ? j.items : data.items, about: j.about || {}, site: j.site || {} }; changed(true); render(); setStatus("Imported"); } catch (e) { setStatus("That is not valid JSON.", true); }
      } }, "Apply import")]),
      el("div", { class: "cp-label", style: "margin-top:32px" }, "Reset"), rs);
    body.append(c1, c2);
  }

  /* ---------- layout: the same 12 column grid as the site (32px margins, 16px gutters; 8 columns and 24 / 16px below 1440 / 810) ---------- */
  var CSS = [
    'html,body{margin:0;background:#0b0b0b;color:#f2f2f2;-webkit-font-smoothing:antialiased}',
    '*{box-sizing:border-box}',
    '#cp{--m:32px;--g:16px;min-height:100vh;display:flex;flex-direction:column;font-family:"Anton","Inter Display",Impact,sans-serif;text-transform:uppercase;letter-spacing:.02em}',
    '#cp .cp-grid{display:grid;grid-template-columns:repeat(12,1fr);column-gap:var(--g);padding:0 var(--m)}',
    '#cp header{position:sticky;top:0;z-index:5;background:rgba(11,11,11,.9);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid rgba(242,242,242,.1)}',
    '#cp header .cp-grid{align-items:center;height:64px}',
    '#cp a{color:inherit;text-decoration:none}',
    '#cp button{text-transform:inherit;letter-spacing:inherit}',
    '#cp .cp-back{grid-column:1/4;font-size:16px}',
    '#cp .cp-tabs{grid-column:4/10;display:flex;justify-content:center;gap:8px}',
    '#cp .cp-tab{padding:7px 16px;border:1px solid rgba(242,242,242,.18);border-radius:999px;background:none;color:inherit;font:inherit;font-size:14px;cursor:pointer;transition:background .4s,color .4s,border-color .4s}',
    '#cp .cp-tab:hover{border-color:rgba(242,242,242,.5)}',
    '#cp .cp-tab.on{background:#f2f2f2;color:#0b0b0b;border-color:#f2f2f2}',
    '#cp .cp-side{grid-column:10/13;display:flex;justify-content:flex-end;align-items:center;gap:16px;font-size:14px}',
    '#cp #cp-status{color:rgba(242,242,242,.55)}',
    '#cp h1{grid-column:1/-1;margin:48px 0 32px;font:400 clamp(56px,9vw,128px)/.9 "Anton",Impact,sans-serif;letter-spacing:0}',
    '#cp main{flex:1;padding-bottom:96px}',
    '#cp .cp-body{align-items:start;row-gap:32px}',
    '#cp .cp-list{grid-column:1/5}',
    '#cp .cp-edit{grid-column:5/13;position:sticky;top:96px}',
    '#cp .cp-col6{grid-column:span 6}',
    '#cp .cp-label{margin:0 0 12px;font-size:12px;color:rgba(242,242,242,.5)}',
    '#cp .cp-btn{padding:9px 16px;border:1px solid rgba(242,242,242,.2);border-radius:999px;background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer;transition:background .3s,border-color .3s}',
    '#cp .cp-btn:hover{background:rgba(242,242,242,.1);border-color:rgba(242,242,242,.5)}',
    '#cp .cp-add{width:100%;margin-bottom:12px;padding:12px;background:#f2f2f2;color:#0b0b0b;border-color:#f2f2f2}',
    '#cp .cp-add:hover{background:#fff}',
    '#cp .cp-danger{border-color:rgba(255,107,94,.5);color:#ff8a7e}',
    '#cp .cp-actions{display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap}',
    '#cp .cp-row{display:flex;align-items:center;gap:12px;margin-bottom:6px;padding:8px 10px;border:1px solid rgba(242,242,242,.1);border-radius:12px;cursor:pointer;font-size:14px;transition:background .3s,border-color .3s}',
    '#cp .cp-row:hover{background:rgba(242,242,242,.05)}',
    '#cp .cp-row.on{border-color:#f2f2f2;background:rgba(242,242,242,.08)}',
    '#cp .cp-thumb{flex:none;width:48px;height:36px;border-radius:6px;background:#222 center/cover}',
    '#cp .cp-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#cp .cp-year{color:rgba(242,242,242,.5);font-size:12px}',
    '#cp .cp-bar{display:flex;gap:4px}',
    '#cp .cp-mini{min-width:26px;height:26px;padding:0 6px;border:1px solid rgba(242,242,242,.16);border-radius:999px;background:none;color:inherit;font:inherit;font-size:12px;line-height:1;cursor:pointer;transition:background .3s}',
    '#cp .cp-mini:hover{background:rgba(242,242,242,.14)}',
    '#cp .cp-prev{display:flex;align-items:center;justify-content:center;aspect-ratio:4/3;max-height:340px;width:100%;margin-bottom:12px;border-radius:12px;background:#1b1b1b center/contain no-repeat;color:rgba(242,242,242,.4);font-size:12px}',
    '#cp .cp-f{display:block;margin-bottom:16px;font-size:12px;color:rgba(242,242,242,.6)}',
    '#cp .cp-f span{display:block;margin-bottom:6px}',
    '#cp .cp-two{display:grid;grid-template-columns:1fr 120px;gap:16px}',
    '#cp input,#cp textarea{width:100%;padding:11px 12px;border:1px solid rgba(242,242,242,.16);border-radius:10px;background:rgba(242,242,242,.05);color:#f2f2f2;font:15px/1.4 "Inter Display",Inter,system-ui,sans-serif;letter-spacing:0;text-transform:none;resize:vertical;transition:border-color .3s}',
    '#cp input:focus,#cp textarea:focus{outline:none;border-color:rgba(242,242,242,.6)}',
    '#cp .cp-hint{margin:12px 0;font:13px/1.45 "Inter Display",Inter,system-ui,sans-serif;letter-spacing:0;text-transform:none;color:rgba(242,242,242,.5)}',
    '#cp :focus-visible{outline:1px solid rgba(242,242,242,.7);outline-offset:3px}',
    '@media (max-width:1439.98px){#cp{--m:24px}#cp .cp-grid{grid-template-columns:repeat(8,1fr)}#cp .cp-back{grid-column:1/3}#cp .cp-tabs{grid-column:3/7}#cp .cp-side{grid-column:7/9}#cp .cp-list{grid-column:1/4}#cp .cp-edit{grid-column:4/9}#cp .cp-col6{grid-column:span 4}}',
    '@media (max-width:809.98px){#cp{--m:16px}#cp .cp-back{grid-column:1/-1;grid-row:1}#cp header .cp-grid{height:auto;padding-top:12px;padding-bottom:12px;row-gap:10px}#cp .cp-tabs{grid-column:1/-1;grid-row:2;justify-content:flex-start}#cp .cp-side{grid-column:1/-1;grid-row:1;justify-self:end}#cp .cp-list,#cp .cp-edit,#cp .cp-col6{grid-column:1/-1;position:static}}'
  ].join("\n");

  function build() {
    document.head.appendChild(el("style", {}, CSS));
    statusEl = el("span", { id: "cp-status" }, "Saved");
    tabsEl = el("div", { class: "cp-tabs" }, [["portfolio", "Portfolio"], ["about", "About"], ["site", "Site"], ["data", "Data"]].map(function (t) {
      return el("button", { type: "button", class: "cp-tab", "data-tab": t[0], onclick: function () { tab = t[0]; render(); window.scrollTo(0, 0); } }, t[1]);
    }));
    body = el("div", { class: "cp-grid cp-body" });
    var back = el("a", { class: "cp-back", href: "./" }, "← Sehzade");
    back.addEventListener("click", function (e) { if (document.referrer && history.length > 1) { e.preventDefault(); history.back(); } });
    var root = el("div", { id: "cp" }, [
      el("header", {}, el("div", { class: "cp-grid" }, [back, tabsEl, el("div", { class: "cp-side" }, [statusEl, el("a", { href: "./" }, "View site")])])),
      el("main", {}, [el("div", { class: "cp-grid" }, el("h1", {}, "CMS")), body])
    ]);
    document.body.appendChild(root);
    var def = window.__cmsDefaults || defaults();
    if (data.items || def) render();
    else {
      body.appendChild(el("p", { class: "cp-hint", style: "grid-column:1/-1" }, "Loading the current projects…"));
      var f = el("iframe", { src: "./", style: "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none", "aria-hidden": "true", tabindex: "-1" });
      document.body.appendChild(f);
      var n = 0, t = setInterval(function () {
        if (defaults() || ++n > 60) { clearInterval(t); f.remove(); render(); }
      }, 300);
    }
    document.title = "CMS — Sehzade";
  }
  if (document.body) build(); else addEventListener("DOMContentLoaded", build);
})();
