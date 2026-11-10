/* The CMS editor (loaded by the studio page only, after cms.js which shares the saved content as window.__cms).
   - Portfolio tab: add, edit, reorder and remove projects (image upload, name, description, category, year, link).
   - About tab: the About text, client list, email, booking link and social links.
   - Data tab: export / import everything as JSON, or reset to the original content.
   With server.py running, the editor asks for the CMS password once, then every change is published to content.json / uploads/
   (visitors load content.json). On a static host (Vercel) the editor connects to GitHub with a token and commits content.json and
   uploads/ to the repo; the host redeploys by itself. Without either it falls back to this browser only (localStorage).
   The studio page's file name is its address, so nothing on the public site links to it. */
(function () {
  var S = window.__cms; if (!S) return;
  var KEY = S.KEY, DKEY = S.DKEY, SOCIALS = S.SOCIALS, PAGE = true, site = S.site, about = S.about, savedModes = S.savedModes, applyRemote = S.applyRemote;
  var API = false, GHM = false, AUTHED = false, pushTimer = 0, pushing = false, pushAgain = false, ghTimer = 0, previews = {};
  function remote() { return (API || GHM) && AUTHED; }
  function gated() { return (API || GHM) && !AUTHED; }
  /* GitHub mode: token + repo are kept in this browser only */
  var GHKEY = "site-cms-gh", DEF_REPO = "adamhmxx/sehzade-website";
  function readGH() { try { return JSON.parse(localStorage.getItem(GHKEY) || "null") || {}; } catch (e) { return {}; } }
  var GHC = readGH();
  function ghApi(path, opts) {
    opts = opts || {};
    return fetch((GHC.api || "https://api.github.com") + path, Object.assign({}, opts, { headers: Object.assign({ Authorization: "Bearer " + GHC.token, Accept: "application/vnd.github+json" }, opts.headers || {}) }));
  }
  function b64utf8(str) { var b = new TextEncoder().encode(str), s = ""; for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
  /* GitHub's own reason for a refusal (e.g. "403 Resource not accessible by personal access token") is shown instead of a guess */
  var ghWhy = "";
  function ghDeny(r) { return r.json().catch(function () { return {}; }).then(function (j) { ghWhy = r.status + (j && j.message ? " " + j.message : ""); throw "auth"; }); }
  function authMsg() { return "GitHub refused the token" + (ghWhy ? " (" + ghWhy + ")" : "") + ". In the token settings, Repository access must include this repository and Contents must be Read and write."; }
  function ghFile(path) {
    return ghApi("/repos/" + GHC.repo + "/contents/" + path + "?ref=" + encodeURIComponent(GHC.branch || "main") + "&t=" + Date.now()).then(function (r) {
      if (r.status === 404) return null; if (r.status === 401 || r.status === 403) return ghDeny(r); if (!r.ok) throw r.status; return r.json();
    });
  }
  /* create or update one file in the repo (skips the commit when nothing changed) */
  function ghPut(path, b64, msg, isNew) {
    function attempt(n) {
      return (isNew ? Promise.resolve(null) : ghFile(path)).then(function (f) {
        if (f && f.content && f.content.replace(/\s/g, "") === b64) return { same: true };
        var body = { message: msg, content: b64, branch: GHC.branch || "main" }; if (f && f.sha) body.sha = f.sha;
        return ghApi("/repos/" + GHC.repo + "/contents/" + path, { method: "PUT", body: JSON.stringify(body) }).then(function (r) {
          if (r.ok) return r.json(); if ((r.status === 409 || r.status === 422) && n < 2) return attempt(n + 1);
          if (r.status === 401 || r.status === 403 || r.status === 404) return ghDeny(r); throw r.status;
        });
      });
    }
    return attempt(0);
  }
  function ghPush() {
    if (pushing) { pushAgain = true; return; }
    pushing = true; pushAgain = false; setStatus("Publishing…");
    var text = JSON.stringify({ items: S.data.items, about: S.data.about || {}, site: S.data.site || {} }, null, 1) + "\n";
    ghPut("content.json", b64utf8(text), "CMS: update content").then(function () {
      pushing = false; if (pushAgain) ghPush(); else setStatus("Published. Live in about a minute.");
    }).catch(function (e) {
      pushing = false;
      if (e === "auth") { AUTHED = false; showConnect(authMsg()); setStatus("Not connected", true); }
      else setStatus("Could not publish (" + e + "). Your edits are kept in this browser.", true);
    });
  }
  var saveTimer = 0, statusEl = null;
  function setStatus(t, bad) { if (statusEl) { statusEl.textContent = t; statusEl.style.color = bad ? "#ff6b5e" : "rgba(242,242,242,.55)"; } }
  function persist() {
    var ok = true;
    try { localStorage.setItem(KEY, JSON.stringify(S.data)); } catch (e) { ok = false; }
    if (PAGE && GHM && AUTHED) { clearTimeout(ghTimer); setStatus("Saved. Publishing in a moment…"); ghTimer = setTimeout(function () { ghTimer = 0; ghPush(); }, 2500); return; }
    if (PAGE && API && AUTHED) { push(); return; }
    if (ok) setStatus(PAGE && !API ? "Saved in this browser only" : "Saved"); else setStatus("Storage is full. Remove a project or use smaller images.", true);
  }
  /* publish to the server (content.json); runs one request at a time and re-runs if more edits came in meanwhile */
  function push() {
    if (pushing) { pushAgain = true; return; }
    pushing = true; pushAgain = false; setStatus("Publishing…");
    fetch("api/content", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: S.data.items, about: S.data.about || {}, site: S.data.site || {} }) })
      .then(function (r) { if (r.status === 401) { AUTHED = false; throw "auth"; } if (!r.ok) throw 0; return r.json(); })
      .then(function (saved) {
        var fix = false;
        (saved.items || []).forEach(function (s) { (S.data.items || []).forEach(function (x) { if (x.id === s.id && /^data:/.test(x.src || "") && s.src !== x.src) { x.src = s.src; fix = true; } }); });
        if (fix) { try { localStorage.setItem(KEY, JSON.stringify(S.data)); } catch (e) {} if (tab === "portfolio" && body) render(); }
        pushing = false; if (pushAgain) push(); else setStatus("Published");
      })
      .catch(function (e) {
        pushing = false;
        if (e === "auth") { showLogin(); setStatus("Signed out", true); } else setStatus("Could not publish. Your edits are kept in this browser.", true);
      });
  }
  function changed(immediate) {
    window.dispatchEvent(new Event("cms-change"));
    clearTimeout(saveTimer);
    if (immediate) persist(); else { setStatus("Saving…"); saveTimer = setTimeout(persist, 300); }
  }

  function defaults() { try { return JSON.parse(localStorage.getItem(DKEY) || "null"); } catch (e) { return null; } }
  function seedItems() {
    if (S.data.items) return;
    var def = window.__cmsDefaults || defaults() || [];
    S.data.items = def.map(function (x, n) {
      return { id: "p" + n + Date.now().toString(36), name: x.name || "", description: x.description || "", services: x.services || "", year: x.year || "",
               link: x.link || "", src: (x.image && x.image.src) || "", srcSet: (x.image && x.image.srcSet) || "" };
    });
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
  /* with the server: store the image as a file and keep only its path; otherwise keep the data URL */
  function uploadImage(dataUrl, done) {
    if (GHM && AUTHED) {
      var m = /^data:(image\/[a-z+.-]+);base64,(.*)$/.exec(dataUrl), ext = m && ({ "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" })[m[1]];
      if (!m || !ext) { done(dataUrl); return; }
      var path = "uploads/" + Math.random().toString(16).slice(2, 10) + Date.now().toString(16) + "." + ext;
      setStatus("Uploading image…");
      ghPut(path, m[2], "CMS: add image", true).then(function () { previews[path] = dataUrl; done(path); }).catch(function () { setStatus("Could not upload the image.", true); done(""); });
      return;
    }
    if (!(API && AUTHED)) { done(dataUrl); return; }
    fetch(dataUrl).then(function (r) { return r.blob(); }).then(function (b) {
      return fetch("api/upload", { method: "POST", credentials: "same-origin", headers: { "Content-Type": b.type || "image/jpeg" }, body: b });
    }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) { done(j.url); }).catch(function () { done(dataUrl); });
  }
  /* dropped / chosen image files become new projects */
  function addFiles(files) {
    files = [].filter.call(files || [], function (f) { return /^image\//.test(f.type); });
    if (!files.length) return;
    seedItems(); setStatus("Processing images…");
    (function next(i) {
      if (i >= files.length) { changed(true); render(); return; }
      compress(files[i], function (out) {
        if (!out) { next(i + 1); return; }
        uploadImage(out, function (url) {
          if (!url) { next(i + 1); return; }
          var id = "p" + Date.now().toString(36) + i;
          S.data.items.unshift({ id: id, name: files[i].name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), description: "", services: "", year: String(new Date().getFullYear()), link: "", src: url, srcSet: "" });
          sel = id; tab = "portfolio"; next(i + 1);
        });
      });
    })(0);
  }
  function bg(src) { src = previews[src] || src; return src ? "url('" + src.replace(/'/g, "%27") + "')" : ""; }

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
    var list = S.data.items;
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
        compress(file.files[0], function (out) { if (out) uploadImage(out, setSrc); else setStatus("That image could not be read.", true); });
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
        el("p", { class: "cp-hint" }, "Tip: 4:3 images fit the cards best. Drop image files anywhere on this page to add them as new projects. Images are resized to 1500px" + (API || GHM ? "." : " and stored in this browser."))
      );
    } else right.appendChild(el("p", { class: "cp-hint" }, "Select a project to edit it."));
    body.append(left, right);
  }

  function renderAbout() {
    var a = about();
    function set(k) { return function (v) { S.data.about = S.data.about || {}; S.data.about[k] = v; changed(); }; }
    var c1 = el("div", { class: "cp-col6" }), c2 = el("div", { class: "cp-col6" });
    c1.append(el("div", { class: "cp-label" }, "Text"),
      field("Description", a.description, set("description"), { area: 1, rows: 4 }),
      field("Trusted by", a.trustedBy, set("trustedBy"), { area: 1, rows: 3 }),
      field("Email", a.email, set("email")),
      field("Book a call link", a.call, set("call"), { placeholder: "https://…" }));
    c2.appendChild(el("div", { class: "cp-label" }, "Social links (empty link hides it)"));
    var socials = a.socials.map(function (s) { return { label: s.label, url: s.url }; }), box = el("div", {});
    function saveSocials() { S.data.about = S.data.about || {}; S.data.about.socials = socials.map(function (s) { return { label: s.label, url: s.url }; }); changed(); }
    function drawSocials() {
      box.textContent = "";
      socials.forEach(function (s, i) {
        var l = el("input", { type: "text", placeholder: "Name", "aria-label": "Name" }), u = el("input", { type: "text", placeholder: "https://…", "aria-label": "Link" });
        l.value = s.label; u.value = s.url;
        l.addEventListener("input", function () { s.label = l.value; saveSocials(); }); u.addEventListener("input", function () { s.url = u.value; saveSocials(); });
        var up = el("button", { type: "button", class: "cp-mini", title: "Move up", onclick: function () { if (i > 0) { socials.splice(i - 1, 0, socials.splice(i, 1)[0]); saveSocials(); drawSocials(); } } }, "↑");
        var dn = el("button", { type: "button", class: "cp-mini", title: "Move down", onclick: function () { if (i < socials.length - 1) { socials.splice(i + 1, 0, socials.splice(i, 1)[0]); saveSocials(); drawSocials(); } } }, "↓");
        var del = el("button", { type: "button", class: "cp-mini cp-del", title: "Remove" }, "✕");
        ask(del, "✕", function () { socials.splice(i, 1); saveSocials(); drawSocials(); });
        box.appendChild(el("div", { class: "cp-soc" }, [l, u, el("span", { class: "cp-bar" }, [up, dn, del])]));
      });
    }
    drawSocials();
    c2.appendChild(box);
    c2.appendChild(el("div", { class: "cp-actions" }, el("button", { type: "button", class: "cp-btn", onclick: function () { socials.push({ label: "", url: "" }); drawSocials(); var ins = box.querySelectorAll("input"); if (ins.length > 1) ins[ins.length - 2].focus(); } }, "+ Add link")));
    c2.appendChild(el("p", { class: "cp-hint" }, "Any platform works: name it and paste the link. Rows without a name or link are not shown on the site."));
    body.append(c1, c2);
  }

  function renderSite() {
    var o = site();
    function set(k) { return function (v) { S.data.site = S.data.site || {}; S.data.site[k] = v; changed(); }; }
    function setMode(i) { return function (v) { S.data.site = S.data.site || {}; var m = savedModes().slice(); while (m.length < 3) m.push(""); m[i] = v; S.data.site.modes = m; changed(); }; }
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
    ta.value = JSON.stringify({ items: S.data.items, about: S.data.about, site: S.data.site }, null, 1);
    var imp = el("textarea", { rows: 8, placeholder: "Paste exported JSON here" });
    var c1 = el("div", { class: "cp-col6" }), c2 = el("div", { class: "cp-col6" });
    c1.append(el("div", { class: "cp-label" }, "Export"), ta,
      el("div", { class: "cp-actions" }, [el("button", { type: "button", class: "cp-btn", onclick: function () {
        ta.select(); try { navigator.clipboard.writeText(ta.value).then(function () { setStatus("Copied to clipboard"); }, function () { setStatus("Select the text and copy it"); }); } catch (e) { setStatus("Select the text and copy it"); }
      } }, "Copy JSON")]),
      el("p", { class: "cp-hint" }, API || GHM ? "Backup of everything on the site. The live copy is content.json in the site." : "Not connected, so changes live in this browser only. Connect GitHub (or run python3 server.py) to publish for every visitor."));
    var rs = el("button", { type: "button", class: "cp-btn cp-danger" }, "Reset all content");
    ask(rs, "Reset all content", function () { S.data = { items: null, about: {} }; try { localStorage.removeItem(KEY); } catch (e) {} window.dispatchEvent(new Event("cms-change")); sel = null; render(); setStatus("Back to the original content"); });
    c2.append(el("div", { class: "cp-label" }, "Import"), imp,
      el("div", { class: "cp-actions" }, [el("button", { type: "button", class: "cp-btn", onclick: function () {
        try { var j = JSON.parse(imp.value); if (!j || typeof j !== "object") throw 0; S.data = { items: Array.isArray(j.items) ? j.items : S.data.items, about: j.about || {}, site: j.site || {} }; changed(true); render(); setStatus("Imported"); } catch (e) { setStatus("That is not valid JSON.", true); }
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
    '#cp .cp-soc{display:grid;grid-template-columns:1fr 2fr auto;gap:8px;align-items:center;margin-bottom:8px}',
    '#cp .cp-login{grid-column:1/6;max-width:420px}',
    /* sign-in / connect screens: only the title, the fields and the button, in the middle of the page */
    '#cp.cp-gate header,#cp.cp-gate .cp-label,#cp.cp-gate .cp-hint:not(.cp-err),#cp.cp-gate .cp-link{display:none!important}',
    '#cp.cp-gate{min-height:100vh}#cp.cp-gate main{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:24px var(--m);box-sizing:border-box}',
    '#cp.cp-gate main .cp-grid{display:block;padding:0;width:100%;max-width:420px}#cp.cp-gate h1{margin:0 0 32px;text-align:center}',
    '#cp.cp-gate .cp-login{max-width:420px;width:100%}#cp.cp-gate .cp-actions{justify-content:center;margin-top:16px}#cp.cp-gate .cp-err{text-align:center}',
    '#cp .cp-err{min-height:18px;color:#ff8a7e}',
    '#cp .cp-link{background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer;opacity:.7}',
    '#cp .cp-link:hover{opacity:1}',
    '#cp input,#cp textarea{width:100%;padding:11px 12px;border:1px solid rgba(242,242,242,.16);border-radius:10px;background:rgba(242,242,242,.05);color:#f2f2f2;font:15px/1.4 "Inter Display",Inter,system-ui,sans-serif;letter-spacing:0;text-transform:none;resize:vertical;transition:border-color .3s}',
    '#cp input:focus,#cp textarea:focus{outline:none;border-color:rgba(242,242,242,.6)}',
    '#cp .cp-hint{margin:12px 0;font:13px/1.45 "Inter Display",Inter,system-ui,sans-serif;letter-spacing:0;text-transform:none;color:rgba(242,242,242,.5)}',
    '#cp :focus-visible{outline:1px solid rgba(242,242,242,.7);outline-offset:3px}',
    '@media (max-width:1439.98px){#cp{--m:24px}#cp .cp-grid{grid-template-columns:repeat(8,1fr)}#cp .cp-back{grid-column:1/3}#cp .cp-tabs{grid-column:3/7}#cp .cp-side{grid-column:7/9}#cp .cp-list{grid-column:1/4}#cp .cp-edit{grid-column:4/9}#cp .cp-col6{grid-column:span 4}}',
    '@media (max-width:809.98px){#cp{--m:16px}#cp .cp-back{grid-column:1/-1;grid-row:1}#cp header .cp-grid{height:auto;padding-top:12px;padding-bottom:12px;row-gap:10px}#cp .cp-tabs{grid-column:1/-1;grid-row:2;justify-content:flex-start}#cp .cp-side{grid-column:1/-1;grid-row:1;justify-self:end}#cp .cp-list,#cp .cp-edit,#cp .cp-col6,#cp .cp-login{grid-column:1/-1;position:static}#cp .cp-soc{grid-template-columns:1fr 1fr}#cp .cp-soc .cp-bar{grid-column:1/-1}}'
  ].join("\n");

  /* ---------- start: ask the server who we are, sign in if needed, then show the editor ---------- */
  var logoutEl = null;
  function enter() {
    gate(false);
    if (logoutEl) { logoutEl.style.display = API || GHM ? "" : "none"; logoutEl.textContent = GHM ? "Disconnect" : "Log out"; }
    var go = function () {
      var def = window.__cmsDefaults || defaults();
      if (S.data.items || def) { render(); return; }
      body.textContent = "";
      body.appendChild(el("p", { class: "cp-hint", style: "grid-column:1/-1" }, "Loading the current projects…"));
      var f = el("iframe", { src: "./", style: "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none", "aria-hidden": "true", tabindex: "-1" });
      document.body.appendChild(f);
      var n = 0, t = setInterval(function () { if (defaults() || ++n > 60) { clearInterval(t); f.remove(); render(); } }, 300);
    };
    if (!API && !GHM) { setStatus("Saved in this browser only"); go(); return; }
    /* the published copy wins; if there is none yet, publish what this browser already has */
    var first = GHM ? ghFile("content.json").then(function (f) { return f && f.content ? JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(f.content.replace(/\s/g, "")), function (c) { return c.charCodeAt(0); }))) : null; })
                    : fetch("content.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; });
    first.catch(function (e) { if (e === "auth") { AUTHED = false; showConnect(authMsg()); return "stop"; } return null; }).then(function (j) {
      if (j === "stop") return;
      if (j) applyRemote(j);
      else if (S.data.items || Object.keys(S.data.about || {}).length || Object.keys(S.data.site || {}).length) { if (GHM) ghPush(); else push(); }
      setStatus(GHM ? "Connected to GitHub" : "Published"); go();
    });
  }
  function gate(on) { var r = document.getElementById("cp"); if (r) r.classList.toggle("cp-gate", !!on); }
  function showLogin() {
    gate(true); body.textContent = "";
    var pw = el("input", { type: "password", autocomplete: "current-password", placeholder: "Password", "aria-label": "Password" }), err = el("p", { class: "cp-err cp-hint" });
    var form = el("form", { class: "cp-login", onsubmit: function (e) {
      e.preventDefault(); err.textContent = "";
      fetch("api/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw.value }) })
        .then(function (r) { return r.json().then(function (j) { return [r.ok, j]; }); })
        .then(function (x) { if (x[0]) { AUTHED = true; enter(); } else { err.textContent = x[1].error || "Could not sign in"; pw.select(); } })
        .catch(function () { err.textContent = "Could not reach the server"; });
    } }, [el("div", { class: "cp-label" }, "Sign in to edit the site"), pw, err, el("div", { class: "cp-actions" }, el("button", { type: "submit", class: "cp-btn cp-add", style: "margin:0" }, "Sign in")),
      el("p", { class: "cp-hint" }, "The password is in .cms-password next to server.py (or the CMS_PASSWORD you set).")]);
    body.appendChild(form); pw.focus();
  }
  /* static host: connect GitHub once with a fine-grained token (Contents: read and write on this one repo) */
  function showConnect(msg) {
    GHM = true; gate(true); body.textContent = ""; if (logoutEl) logoutEl.style.display = "none";
    var tok = el("input", { type: "password", autocomplete: "off", placeholder: "github_pat_…", "aria-label": "GitHub token" }), repo = el("input", { type: "text", "aria-label": "Repository" }), err = el("p", { class: "cp-err cp-hint" }, msg || "");
    repo.value = GHC.repo || DEF_REPO;
    /* the editor-without-publishing escape hatch exists on localhost only; on the public site nothing shows until a token is accepted */
    var skip = /^(localhost|127\.|\[::1\])/.test(location.hostname) ? el("button", { type: "button", class: "cp-link", style: "margin-left:16px", onclick: function () { GHM = false; AUTHED = false; enter(); } }, "Edit without publishing") : "";
    var form = el("form", { class: "cp-login", onsubmit: function (e) {
      e.preventDefault(); err.textContent = "Checking…";
      GHC = { token: tok.value.trim(), repo: repo.value.trim(), branch: "main", api: GHC.api };
      ghApi("/repos/" + GHC.repo).then(function (r) { if (!r.ok) throw r.status; return r.json(); }).then(function (j) {
        if (!j.permissions || !j.permissions.push) throw "perm";
        GHC.branch = j.default_branch || "main";
        /* the repository can be opened with any token; reading its files needs the Contents permission, so check that here */
        return ghApi("/repos/" + GHC.repo + "/contents/content.json?ref=" + encodeURIComponent(GHC.branch)).then(function (c) {
          if (c.status === 401 || c.status === 403) return ghDeny(c);
          try { localStorage.setItem(GHKEY, JSON.stringify(GHC)); } catch (x) {}
          AUTHED = true; enter();
        });
      }).catch(function (x) { err.textContent = x === "auth" ? authMsg() : x === "perm" ? "This token cannot write to that repository. Give it Contents: Read and write." : x === 401 || x === 404 ? "GitHub did not accept that token for this repository." : "Could not reach GitHub."; });
    } }, [el("div", { class: "cp-label" }, "Connect GitHub to publish"), tok, repo, err,
      el("div", { class: "cp-actions" }, [el("button", { type: "submit", class: "cp-btn cp-add", style: "margin:0;width:auto" }, "Connect"), skip]),
      el("p", { class: "cp-help" }, el("a", { href: "https://github.com/settings/personal-access-tokens/new", target: "_blank", rel: "noopener", style: "color:inherit;opacity:.55;font-size:13px;text-decoration:underline" }, "Need a token? Create one (this repo, Contents: Read and write)")),
      el("p", { class: "cp-hint" }, "One time only. Create a fine-grained token at github.com/settings/personal-access-tokens/new, limited to this repository with Contents: Read and write. It stays in this browser. Every change is saved to the repo and the site redeploys by itself in about a minute.")]);
    body.appendChild(form); tok.focus();
  }
  function boot() {
    fetch("api/session", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (s) {
        API = !!(s && s.api);
        if (API) { AUTHED = !!s.authed; if (!AUTHED) { if (logoutEl) logoutEl.style.display = "none"; showLogin(); } else enter(); return; }
        GHM = true; if (GHC.token && GHC.repo) { AUTHED = true; enter(); } else showConnect();
      });
  }
  addEventListener("beforeunload", function (e) { if (PAGE && (ghTimer || pushing)) { e.preventDefault(); e.returnValue = ""; } });

  function build() {
    document.head.appendChild(el("style", {}, CSS));
    statusEl = el("span", { id: "cp-status" }, "Saved");
    logoutEl = el("button", { type: "button", class: "cp-link", style: "display:none", onclick: function () {
      if (GHM) { try { localStorage.removeItem(GHKEY); } catch (e) {} GHC = {}; AUTHED = false; setStatus(""); showConnect(); return; }
      fetch("api/logout", { method: "POST", credentials: "same-origin" }).then(function () { AUTHED = false; logoutEl.style.display = "none"; setStatus(""); showLogin(); });
    } }, "Log out");
    tabsEl = el("div", { class: "cp-tabs" }, [["portfolio", "Portfolio"], ["about", "About"], ["site", "Site"], ["data", "Data"]].map(function (t) {
      return el("button", { type: "button", class: "cp-tab", "data-tab": t[0], onclick: function () { tab = t[0]; render(); window.scrollTo(0, 0); } }, t[1]);
    }));
    body = el("div", { class: "cp-grid cp-body" });
    var back = el("a", { class: "cp-back", href: "./" }, "← Sehzade");
    back.addEventListener("click", function (e) { if (document.referrer && history.length > 1) { e.preventDefault(); history.back(); } });
    var root = el("div", { id: "cp" }, [
      el("header", {}, el("div", { class: "cp-grid" }, [back, tabsEl, el("div", { class: "cp-side" }, [statusEl, el("a", { href: "./" }, "View site"), logoutEl])])),
      el("main", {}, [el("div", { class: "cp-grid" }, el("h1", {}, "CMS")), body])
    ]);
    document.body.appendChild(root);
    addEventListener("dragover", function (e) { if (!gated()) { var t = (e.dataTransfer || {}).types; if (t && [].indexOf.call(t, "Files") >= 0) e.preventDefault(); } });
    addEventListener("drop", function (e) { if (!(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length)) return; e.preventDefault(); if (gated()) return; addFiles(e.dataTransfer.files); });
    boot();
    document.title = "CMS — Sehzade";
  }
  if (document.body) build(); else addEventListener("DOMContentLoaded", build);
})();
