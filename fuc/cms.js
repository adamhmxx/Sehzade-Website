/* Site content for visitors (small): reads the saved content (content.json, cached in localStorage) and applies it to the page: gallery
   items for the gallery, the navbar texts, the About text and the social links. The editor lives in cms-editor.js and is only loaded
   by the studio page, which sets window.__cmsPage; this file then just hands it the shared state as window.__cms. */
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
                   modes: ["Twister", "Grid", "List"] };
  var SOCIALS = [["x", "X"], ["behance", "Behance"], ["linkedin", "LinkedIn"], ["dribbble", "Dribbble"], ["instagram", "Instagram"]];

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  var data = read() || { items: null, about: {} };
  function site() { var o = Object.assign({}, DEF_SITE, (data && data.site) || {}); o.modes = DEF_SITE.modes.map(function (d, i) { return savedModes()[i] || d; }); return o; }
  /* names saved while there were more modes keep Twister, Grid and List: five (Twister, Space, Cross, Globe, Grid) -> 1st and 5th; four (Twister, Space, Grid, List) -> 1st, 3rd and 4th */
  function savedModes() { var m = ((data.site || {}).modes || []); return m.length > 4 ? [m[0], m[4]] : m.length === 4 ? [m[0], m[2], m[3]] : m; }
  function about() {
    var o = Object.assign({}, DEF_ABOUT, data.about || {});
    if (!Array.isArray(o.socials)) o.socials = SOCIALS.map(function (s) { return { label: s[1], url: o[s[0]] || "" }; });
    return o;
  }
  /* take content.json from the server as the truth (visitors and the editor both do this) */
  function applyRemote(j) {
    if (!j || typeof j !== "object") return;
    var next = { items: Array.isArray(j.items) ? j.items : null, about: j.about || {}, site: j.site || {} };
    if (JSON.stringify(next) === JSON.stringify(data)) return;
    data = next;
    var ok = true; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { ok = false; }
    applyAbout();
    if (ok) { try { window.dispatchEvent(new StorageEvent("storage", { key: KEY })); return; } catch (e) {} }
    window.dispatchEvent(new Event("cms-change"));
  }
  function loadRemote(cb) {
    fetch("content.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (j) { if (j) applyRemote(j); if (cb) cb(!!j); });
  }
  /* ---------- gallery data, read by the gallery component ---------- */
  window.__cmsItems = function () {
    if (!data || !data.items) return null;
    return data.items.map(function (it) {
      return { name: it.name || "", description: it.description || "", services: it.services || "", year: it.year || "", link: it.link || "",
               client: it.client || "", challenge: it.challenge || "", approach: it.approach || "", gallery: Array.isArray(it.gallery) ? it.gallery.filter(Boolean) : [],
               image: it.src ? { src: it.src, srcSet: it.srcSet || undefined, alt: it.name || "" } : undefined };
    });
  };
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
    syncSocials(a.socials);
  }
  /* the "Discover" column: one link per entry, extra links are copies of the last one, unused originals are hidden */
  function syncSocials(list) {
    var lab = [].filter.call(document.querySelectorAll("p"), function (p) { return p.textContent.trim().toLowerCase() === "discover"; })[0];
    var col = lab && lab.nextElementSibling; if (!col) return;
    var as = [].filter.call(col.children, function (c) { return c.tagName === "A"; });
    if (!as.length) return;
    var shown = list.filter(function (s) { return s && s.label && s.url; });
    shown.forEach(function (s, i) {
      var a = as[i];
      if (!a) { a = as[as.length - 1].cloneNode(true); a.setAttribute("data-cms-x", "1"); col.appendChild(a); as.push(a); }
      a.style.display = "";
      if (a.getAttribute("href") !== s.url) a.setAttribute("href", s.url);
      setLetters(a, s.label);
    });
    as.slice(shown.length).forEach(function (a) { if (a.hasAttribute("data-cms-x")) a.remove(); else a.style.display = "none"; });
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


  if (PAGE) {
    window.__cms = { KEY: KEY, DKEY: DKEY, SOCIALS: SOCIALS, site: site, about: about, savedModes: savedModes, applyRemote: applyRemote,
                     get data() { return data; }, set data(v) { data = v; } };
    return;
  }

  if (ABOUT) { if (document.body) watch(); else addEventListener("DOMContentLoaded", watch); loadRemote(); return; }

  /* ---------- main page: keeps a copy of the original projects for the editor ---------- */
  {
    var tries = 0, iv = setInterval(function () {
      var d = window.__cmsDefaults;
      if (d && d.length) {
        clearInterval(iv);
        try { localStorage.setItem(DKEY, JSON.stringify(d.map(function (x) { return { name: x.name || "", description: x.description || "", services: x.services || "", year: x.year || "", link: x.link || "", image: x.image ? { src: x.image.src || "", srcSet: x.image.srcSet || "" } : null }; }))); } catch (e) {}
      } else if (++tries > 40) clearInterval(iv);
    }, 500);
    function start() { watch(); if (data.items) window.dispatchEvent(new Event("cms-change")); loadRemote(); }
    if (document.body) start(); else addEventListener("DOMContentLoaded", start);
    return;
  }

})();
