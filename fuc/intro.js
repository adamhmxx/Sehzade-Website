/* Loading sequence: red screen with a big liquid "SEHZADE" bottom left, a progress line through the middle. When everything is ready the
   text melts and the red is soaked up by the black underneath, like ink sinking into paper (three layers of red at different depths, one
   WebGL shader; the word, the percentage, "Loading" and the line are drawn in the same shader, so they ripple and dissolve with the same
   flowing noise). The portfolio row slides in while the last of the red is still draining, then the Twister ribbon builds itself: every
   card rises from below, one after another, and the navbar and mode menu appear. Add #nointro to the address to skip it.
   All numbers live in DEF below and in the Liquid panel (Shift+L, tab "Intro"). */
(function () {
  var DEF = { imin: 2400, iline: 2, ildl: 600, iltr: 1300, ilst: 60, iliq: 8, iliqp: 20, iliqd: 3100, ioutd: 800, ioutl: 200,
    iseept: 3200, iseeps: 18, iseepl: 20, iseepd: 60, iseepf: 130, iseepb: 30, iseepr: 30, iseepg: 4,
    ircard: 100, irdur: 3600, irgap: 24, irn: 9, irgo: 62, itdelay: 500, itslices: 16, itdur: 3600, itdist: 100, itstart: 2400, itui: 2200 };
  window.__introDef = DEF;
  var CFG = {};
  function cfg(k) { try { var sv = JSON.parse(localStorage.getItem("liquid-cfg-v1") || "{}"); if (sv[k] !== undefined) return +sv[k]; } catch (e) {} return DEF[k]; }
  Object.keys(DEF).forEach(function (k) { CFG[k] = cfg(k); });
  if (matchMedia("(pointer: coarse)").matches) { CFG.irn = Math.min(CFG.irn, 6); CFG.itslices = Math.min(CFG.itslices, 6); } /* lighter entrance on phones */
  var root = document.documentElement;
  if (!root.classList.contains("intro-on")) return;
  var intro = document.getElementById("intro"), row = document.getElementById("intro-row");
  if (!intro) { root.classList.remove("intro-on", "intro-ui"); return; }
  var TOUCH = matchMedia("(pointer: coarse)").matches, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, T0 = performance.now(), W = innerWidth, H = innerHeight;
  function $(s, r) { return (r || document).querySelector(s); }
  function twist(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; } /* gentle start, long soft landing */
  function setA(el, k, v) { if (el) el.setAttribute(k, v); }
  var big = $(".in-big", intro), pct = $(".in-pct", intro), bar = $(".in-line i", intro), line = $(".in-line", intro),
      liqO = $("#in-liq-o"), liqD = $("#in-liq-d"), cv = $("#seep");

  /* the word has a fixed size per breakpoint (it does not stretch with the screen): phone / tablet / desktop; it only shrinks if it would not fit the width */
  var WORD = { phone: 96, tablet: 220, desktop: 320 };
  function fit() {
    var m = parseFloat(getComputedStyle(big).left) || 24, fs = innerWidth >= 1440 ? WORD.desktop : innerWidth >= 810 ? WORD.tablet : WORD.phone;
    big.style.fontSize = "100px";
    var w = big.getBoundingClientRect().width;
    if (w > 0) fs = Math.min(fs, 100 * (innerWidth - 2 * m) / w);
    big.style.fontSize = fs.toFixed(2) + "px";
  }
  line.style.height = CFG.iline + "px";
  "SEHZADE".split("").forEach(function (c) { var sp = document.createElement("span"); sp.textContent = c; big.appendChild(sp); });
  function onResize() { fit(); bigDirty = uiDirty = true; if (window.__introSize) window.__introSize(); }
  fit(); addEventListener("resize", onResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  /* ---- progress: real signals, but never faster than the minimum show time ---- */
  var target = 8, p = 0, last = T0, finished = false, MIN = reduce ? 600 : CFG.imin;
  function stage(v) { if (v > target) target = v; }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { stage(45); });
  if (document.readyState === "complete") stage(75); else addEventListener("load", function () { stage(75); });
  var seenGal = 0, poll = setInterval(function () {
    if (window.__galK && window.__galK.current) { if (!seenGal) seenGal = performance.now(); stage(92); if (performance.now() - seenGal > 500) stage(100); }
    if (performance.now() - T0 > 9000) stage(100); /* never hang */
  }, 120);

  var exitT0 = 0, wiping = false, wipeActive = false, liqAmp = 0;
  function liquid(now) {
    var t = now - T0, pulse = reduce ? 0 : Math.max(0, 1 - t / CFG.iliqd), ek = 0;
    if (exitT0) { ek = Math.max(0, Math.min(1, (now - exitT0) / CFG.ioutd)); ek *= ek; }
    liqAmp = reduce ? 0 : CFG.iliq + CFG.iliqp * pulse + 4 * Math.sin(t / 700) + CFG.ioutl * ek;
    uiAmp = reduce ? 0 : CFG.iliq * .42 + CFG.iliqp * pulse * .3 + CFG.ioutl * ek * .45;
    if (!gl && !TOUCH) { setA(liqD, "scale", liqAmp.toFixed(1)); setA(liqO, "dx", (Math.sin(t / 900) * 90).toFixed(1)); setA(liqO, "dy", (t / 18 % 400).toFixed(1)); }
  }
  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    liquid(now); if (!wiping) draw();
    if (!finished) {
      var cap = Math.min(100, (now - T0) / MIN * 100);
      p = Math.min(target, cap, p + Math.max((target - p) * 2.4, 12) * dt);
      pct.textContent = Math.floor(p) + "%"; bar.style.transform = "scaleX(" + (p / 100).toFixed(4) + ")";
      if (p >= 99.9 && target >= 100) { finished = true; pct.textContent = "100%"; bar.style.transform = "scaleX(1)"; setTimeout(wipe, 250); }
    }
    if (!wiping || wipeActive) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* red -> black: the red is soaked up by the black underneath, like ink sinking into paper. Three layers of red (bright surface, deep
     red, smoky ember) sit at different depths; each is eaten by its own slowly drifting noise field, so patches go at different times
     and the deeper layers linger below the surface. Drawn with a small WebGL shader. */
  var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FS = "precision highp float;uniform vec2 res,tAmp,uAmp;uniform sampler2D tex,tex2;uniform float time,front,soft,lag,scale,flow,bias,rim,grain,tOn;" +
    "float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}" +
    "float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}" +
    "float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,-.6,.6,.8);for(int i=0;i<" + (matchMedia("(pointer: coarse)").matches ? 3 : 4) + ";i++){v+=a*noise(p);p=r*p*2.03+11.7;a*=.48;}return v;}" +
    "void main(){vec2 uv=gl_FragCoord.xy/res;vec2 p=vec2(uv.x*res.x/res.y,uv.y)*scale;float tm=time*flow*.05;" +
    "vec2 q=vec2(fbm(p+vec2(0.,tm)),fbm(p+vec2(5.2,1.3)-vec2(tm,0.)));float n1=fbm(p+1.8*q);" +
    "vec2 q2=vec2(fbm(p*.7+vec2(8.3,2.8)+tm*.6),fbm(p*.7+vec2(1.7,9.2)-tm*.5));float n2=fbm(p*.7+2.2*q2+3.1);" +
    "n1=smoothstep(.0,1.,clamp((n1-.3)/.4,0.,1.));n2=smoothstep(.0,1.,clamp((n2-.3)/.4,0.,1.));" +
    "float fA=mix(n1,uv.y,bias),fB=mix(mix(n1,n2,.6),uv.y,bias),fC=mix(n2,uv.y,bias*.8);" +
    "float sA=soft,sB=soft*1.6,sC=soft*2.4,lB=lag,lC=lag*2.;" +
    "float aA=smoothstep(front-sA,front+sA,fA),aB=smoothstep(front-lB-sB,front-lB+sB,fB),aC=smoothstep(front-lC-sC,front-lC+sC,fC);" +
    "vec4 r=vec4(vec3(.2,.035,.03)*aC*.9,aC*.9);" +
    "r=vec4(vec3(.55,.09,.06)*aB+r.rgb*(1.-aB),aB+r.a*(1.-aB));" +
    "r=vec4(vec3(1.,.176,.125)*aA+r.rgb*(1.-aA),aA+r.a*(1.-aA));" +
    "float edge=aA*(1.-aA)*4.;r.rgb=mix(r.rgb,vec3(1.,.42,.22)*r.a,edge*rim);" +
    "if(tOn>.5){vec2 p2=vec2(uv.x*res.x/res.y,uv.y)*7.;float t2=time*.35;vec2 w=vec2(fbm(p2+vec2(0.,t2)),fbm(p2+vec2(7.1,3.3)-vec2(t2,0.)))-.5;float ta=texture2D(tex,uv+w*tAmp).a;r.rgb=mix(r.rgb,vec3(.043)*r.a,ta);float ua=texture2D(tex2,uv+w*uAmp).a;r.rgb=mix(r.rgb,vec3(.043)*r.a,ua);}" +
    "r.rgb+=(hash(gl_FragCoord.xy+fract(time)*97.)-.5)*grain*r.a;gl_FragColor=r;}";
  var gl = null, prog = null, U = {}, seepT = 0, seepNow = 0, tc = document.createElement("canvas"), tx = tc.getContext("2d"), uc = document.createElement("canvas"), ux = uc.getContext("2d"), tex = null, tex2 = null, sc = 1, uiAmp = 0;
  try {
    gl = TOUCH ? null : cv.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true });
    if (gl) {
      var mk = function (t, src) { var sh = gl.createShader(t); gl.shaderSource(sh, src); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
      prog = gl.createProgram(); gl.attachShader(prog, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ["res", "tAmp", "uAmp", "tex", "tex2", "tOn", "time", "front", "soft", "lag", "scale", "flow", "bias", "rim", "grain"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.uniform1i(U.tex, 0);
      gl.activeTexture(gl.TEXTURE1); tex2 = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex2);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(U.tex2, 1); gl.activeTexture(gl.TEXTURE0);
    }
  } catch (err) { gl = null; }
  /* the word is drawn into the same shader as the red, so its liquid ripple and its melting use the very same flowing noise */
  if (gl) { [pct, intro.querySelector(".in-welcome"), line].forEach(function (el) { el.style.visibility = "hidden"; }); big.style.visibility = "hidden"; big.style.filter = "none"; [].forEach.call(big.children, function (sp) { sp.style.transform = "none"; }); }
  else [].forEach.call(big.children, function (sp, i) {
    if (TOUCH) big.style.filter = "none"; /* phones: no animated SVG noise filter, no per-pixel shader: plain GPU-composited transforms only */
    sp.animate([{ transform: "translateY(105%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
      { duration: reduce ? 1 : CFG.iltr, delay: (reduce ? 0 : CFG.ildl) + i * CFG.ilst, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
  });
  var bigDirty = true, uiDirty = true, lastUIKey = "", TOUCH = matchMedia("(pointer: coarse)").matches;
  function renderBig(now) {
    tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, tc.width, tc.height); tx.setTransform(sc, 0, 0, sc, 0, 0);
    var fs = parseFloat(big.style.fontSize) || 100; tx.font = fs + 'px "Anton", Impact, sans-serif'; tx.textBaseline = "alphabetic"; tx.fillStyle = "#fff";
    var m = tx.measureText("H"), asc = m.fontBoundingBoxAscent || fs * .9, desc = m.fontBoundingBoxDescent || fs * .2, t = now - T0;
    [].forEach.call(big.children, function (sp, i) {
      var k = reduce ? 1 : Math.max(0, Math.min(1, (t - CFG.ildl - i * CFG.ilst) / CFG.iltr)), e = 1 - Math.pow(1 - k, 4); /* rise from below, same feel as before */
      if (e <= 0) return;
      var r = sp.getBoundingClientRect(), y = r.top + (r.height - (asc + desc)) / 2 + asc + (1 - e) * r.height * 1.05;
      tx.globalAlpha = e; tx.fillText(sp.textContent, r.left, y);
    });
    tx.globalAlpha = 1;
  }
  var uiFs = [], uiR0 = null, uiLr = null;
  function renderUI(now) {
    var t = now - T0;
    /* percentage, "Loading" and the loading line live in their own layer, so they ripple and dissolve exactly like the word but at their own, smaller scale */
    ux.setTransform(1, 0, 0, 1, 0, 0); ux.clearRect(0, 0, uc.width, uc.height); ux.setTransform(sc, 0, 0, sc, 0, 0);
    ux.textBaseline = "alphabetic"; ux.fillStyle = "#fff";
    /* "LOADING" with three dots that light up one after another, and the percentage on the right; each rises letter by letter like the word (same ease, stagger and fade, a little later); the line fades in the same way */
    var base = reduce ? 0 : CFG.ildl + 350, wel = intro.querySelector(".in-welcome");
    [{ el: wel, txt: "LOADING", dots: 1 }, { el: pct, txt: pct.textContent.toUpperCase() }].forEach(function (it, wi) {
      var el = it.el, fs = uiFs[wi] || (uiFs[wi] = parseFloat(getComputedStyle(el).fontSize) || 16);
      ux.font = fs + 'px "Anton", Impact, sans-serif';
      var um = ux.measureText("H"), ua = um.fontBoundingBoxAscent || fs * .95, ud = um.fontBoundingBoxDescent || fs * .25;
      var r = wi === 0 ? (uiR0 || (uiR0 = el.getBoundingClientRect())) : el.getBoundingClientRect(), y0 = r.top + (r.height - (ua + ud)) / 2 + ua, txt = it.txt, n = txt.length + (it.dots ? 3 : 0);
      for (var q = 0; q < n; q++) {
        var k = reduce ? 1 : Math.max(0, Math.min(1, (t - base - (wi * 5 + q) * CFG.ilst * .8) / (CFG.iltr * .85))), e = 1 - Math.pow(1 - k, 4);
        if (e <= 0) continue;
        var ch, x, al = e;
        if (q < txt.length) { ch = txt[q]; x = r.left + ux.measureText(txt.slice(0, q)).width; }
        else { var di = q - txt.length; ch = "."; x = r.left + ux.measureText(txt).width + di * (ux.measureText(".").width + fs * .04); al = e * (reduce ? 1 : .2 + .8 * (.5 + .5 * Math.sin(t / 240 - di * 1.15))); }
        ux.globalAlpha = al; ux.fillText(ch, x, y0 + (1 - e) * r.height * 1.4);
      }
    });
    var lr = uiLr || (uiLr = line.getBoundingClientRect()), lk = reduce ? 1 : Math.max(0, Math.min(1, (t - base) / CFG.iltr));
    ux.globalAlpha = 1 - Math.pow(1 - lk, 3); ux.fillRect(lr.left, lr.top, lr.width * Math.max(0, Math.min(1, p / 100)), CFG.iline); ux.globalAlpha = 1;
  }
  function draw() {
    if (!gl) { cv.style.background = "#ff2d20"; cv.style.opacity = String(1 - seepT); return; }
    var soft = CFG.iseeps / 100, lag = CFG.iseepl / 100, sC = soft * 2.4, lC = lag * 2;
    var f0 = Math.min(-soft, lC - sC, lag - soft * 1.6) - .02, f1 = 1 + Math.max(soft, lag + soft * 1.6, lC + sC) + .02;
    /* the word is uploaded to the GPU only while it is still rising (or after a resize), the small texts only when they change: a still
       frame costs the phone nothing but the shader itself */
    var now_ = performance.now(), tt = now_ - T0, key = pct.textContent + "|" + Math.round(p * 3) + "|" + Math.floor(tt / 90);
    if (bigDirty || (!reduce && tt < CFG.ildl + 7 * CFG.ilst + CFG.iltr + 150)) {
      renderBig(now_); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc); bigDirty = false;
    }
    if (uiDirty || key !== lastUIKey || (!reduce && tt < CFG.ildl + 350 + 12 * CFG.ilst + CFG.iltr + 150)) {
      renderUI(now_); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex2); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, uc); gl.activeTexture(gl.TEXTURE0); uiDirty = false; lastUIKey = key;
    }
    var ua2 = uiAmp * 2.2 * sc; gl.uniform2f(U.uAmp, ua2 / cv.width, ua2 / cv.height);
    var ta = liqAmp * 2.2 * sc; gl.uniform2f(U.tAmp, ta / cv.width, ta / cv.height); gl.uniform1f(U.tOn, 1);
    gl.uniform2f(U.res, cv.width, cv.height); gl.uniform1f(U.time, (performance.now() - T0) / 1000); gl.uniform1f(U.front, f0 + (f1 - f0) * seepT);
    gl.uniform1f(U.soft, soft); gl.uniform1f(U.lag, lag); gl.uniform1f(U.scale, CFG.iseepd / 10); gl.uniform1f(U.flow, CFG.iseepf / 100);
    gl.uniform1f(U.bias, CFG.iseepb / 100); gl.uniform1f(U.rim, CFG.iseepr / 100); gl.uniform1f(U.grain, CFG.iseepg / 100);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function sizeCv() { uiFs = []; uiR0 = uiLr = null; sc = Math.min(1, 1500 / innerWidth) * (TOUCH ? .65 : 1); bigDirty = uiDirty = true; cv.width = tc.width = uc.width = Math.max(2, Math.round(innerWidth * sc)); cv.height = tc.height = uc.height = Math.max(2, Math.round(innerHeight * sc)); if (gl) gl.viewport(0, 0, cv.width, cv.height); draw(); }
  sizeCv(); window.__size = sizeCv;
  window.__introSize = sizeCv;

  /* the loader is finished for good: give the GPU its memory back (the shader context, the textures and the full-screen canvases) and drop the loader's markup and listeners */
  function teardown() {
    removeEventListener("resize", onResize); window.__introSize = null;
    try { if (gl) { var lc = gl.getExtension("WEBGL_lose_context"); if (lc) lc.loseContext(); } } catch (e) {}
    cv.width = cv.height = tc.width = tc.height = uc.width = uc.height = 1;
    intro.style.display = "none";
    setTimeout(function () { if (intro.parentNode) intro.parentNode.removeChild(intro); }, 50);
  }

  /* ---- red -> black: the text melts and the red is soaked up; the portfolio row starts while the last of the red is still draining ---- */
  /* decode the row's pictures while the red is still being absorbed, so the row slides in without a hitch */
  function warmRow() { items().slice(0, CFG.irn).forEach(function (it) { var im = new Image(); im.src = it.image.src; if (im.decode) im.decode().catch(function () {}); (window.__introImgs = window.__introImgs || []).push(im); }); }
  function wipe() {
    clearInterval(poll); warmRow(); wiping = true; wipeActive = true; intro.classList.add("out"); exitT0 = performance.now();
    if (!gl) cv.style.background = "#ff2d20";
    if (!gl) [].forEach.call(big.children, function (sp, i) {
      sp.animate(TOUCH ? [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(60%)", opacity: 0 }] : [{ transform: "translateY(0)", opacity: 1, filter: "blur(0px)" }, { transform: "translateY(60%)", opacity: 0, filter: "blur(6px)" }],
        { duration: reduce ? 1 : CFG.ioutd, delay: reduce ? 0 : i * 50, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" });
    });
    var D = reduce ? 400 : CFG.iseept, s0 = performance.now(), rowGo = false;
    (function step(now) {
      var k = Math.min(1, (now - s0) / D);
      seepT = .5 - .5 * Math.cos(Math.PI * k); /* sine in-out: slow start, steady soak, soft tail */
      seepNow = now - s0; draw(); liquid(now);
      if (!rowGo && k > Math.max(CFG.irgo, TOUCH ? 92 : 0) / 100) { rowGo = true; row_start(); }
      if (k < 1) return requestAnimationFrame(step);
      wipeActive = false; teardown(); if (!rowGo) { rowGo = true; row_start(); }
    })(performance.now());
  }

  /* ---- portfolio row: from the right, across, and sinks off the left ---- */
  function items() {
    var a = (window.__cmsItems && window.__cmsItems()) || window.__cmsDefaults || [];
    return [].filter.call(a, function (it) { return it && it.image && it.image.src; });
  }
  /* the portfolio row cards are exactly as large as the front card of the Twister that follows: measured from the live ribbon (hidden behind the intro) */
  function twisterCardWidth() {
    var best = 0;
    [].forEach.call(document.querySelectorAll("#main div"), function (d) {
      var st = d.style; if (!(st.position === "absolute" && st.top === "50%" && st.left === "50%" && st.zIndex && d.childElementCount > 1)) return;
      var b = d.getBoundingClientRect(); if (b.left + b.width / 2 < 0 || b.left + b.width / 2 > W) return;
      var f = d.children[0].getBoundingClientRect(), l = d.children[d.children.length - 1].getBoundingClientRect();
      best = Math.max(best, Math.abs(l.right - f.left));
    });
    return best > 60 ? Math.min(best, W * .95) : W * .3;
  }
  /* the Twister is built from many slices; while it rises it uses fewer (the same ribbon, lighter), then the full count comes back */
  var effBefore;
  function lighten() { effBefore = window.__twEff; var n = Math.min(effBefore || 99, CFG.itslices); if (n !== window.__twEff) { window.__twEff = n; window.dispatchEvent(new Event("cms-change")); } }
  function restore() { if (window.__twEff !== effBefore) { window.__twEff = effBefore; window.dispatchEvent(new Event("cms-change")); } }
  function row_start() {
    var list = items(), rw = $(".rw", row);
    if (!list.length || reduce) return reveal();
    var cw = Math.max(120, twisterCardWidth() * CFG.ircard / 100), ch = cw * .75, n = Math.min(list.length, CFG.irn), gap = CFG.irgap;
    rw.style.gap = gap + "px";
    rw.style.marginTop = (-ch / 2) + "px";
    for (var i = 0; i < n; i++) { var d = document.createElement("div"); d.style.cssText = "width:" + cw + "px;height:" + ch + "px;background-image:url(" + list[i].image.src + ")"; rw.appendChild(d); }
    row.style.opacity = "0"; row.style.display = "block";
    var total = n * (cw + gap), x0 = W + 40, x1 = -total - 40, D = CFG.irdur, s0 = performance.now();
    (function step(now) {
      var k = Math.min(1, (now - s0) / D), x = x0 + (x1 - x0) * (.5 - .5 * Math.cos(Math.PI * k));
      var fd = Math.min(1, k / .16); row.style.opacity = (fd * fd * (3 - 2 * fd)).toFixed(3); /* a thin ease-in: the row fades up as it enters instead of cutting in */
      rw.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
      if (k < 1) return requestAnimationFrame(step);
      /* the row has sunk off the left edge completely: a calm pause on the empty black, then the Twister comes up */
      row.style.display = "none"; lighten(); setTimeout(reveal, CFG.itdelay);
    })(performance.now());
  }

  /* ---- the Twister rises from below as ONE piece while the ribbon turns upward; then the page is live and scrolls forever ---- */
  function reveal() {
    if (wipeActive) return setTimeout(reveal, 50); /* never cut the red short */
    if (effBefore === undefined && window.__twEff === undefined) lighten();
    var gk = window.__galK && window.__galK.current, tl = $('[role="tablist"]'), cont = tl && tl.closest('div[style*="overflow"]');
    var START = CFG.itstart, D = CFG.itdur, s0 = performance.now(), an = null;
    if (gk) { gk.ox = gk.tx = START; }
    /* the whole ribbon starts below the screen (no fading, it simply travels up into place), eased so it leaves gently and lands softly */
    /* the ribbon rises by itself: every card is lifted from below the screen into place through the gallery's own layout (window.__twRise, in px).
       The gallery frame stays still, so its clipped edge and edge fades never slide across the picture */
    var riseH = reduce ? 0 : innerHeight * CFG.itdist / 100; window.__twRise = riseH;
    root.classList.remove("intro-on");
    (function step(now) {
      var k = Math.min(1, (now - s0) / D), v = START * (1 - twist(k)), er = k * k * k * (k * (6 * k - 15) + 10);
      window.__twRise = riseH * (1 - er);
      if (gk) { gk.ox = v; gk.tx = v; }
      if (k < 1) return requestAnimationFrame(step);
      if (gk) { gk.ox = 0; gk.tx = 0; }
      window.__twRise = 0; if (gk) { gk.ox = 0; gk.tx = 0; }
      setTimeout(restore, 150); /* full slice count again, once the ribbon has landed */
    })(performance.now());
    setTimeout(function () { root.classList.remove("intro-ui"); window.dispatchEvent(new Event("intro-done")); }, reduce ? 100 : CFG.itui);
  }
})();
