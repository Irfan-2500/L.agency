/* Page badalte waqt (aur jab tak PPTs load ho rahi hon) upar RGB line + "Opening…".
   <script src="js/loader.js" data-wait> lagao to page khulte hi dikhega; page khud PSLoader.hide() bulaye. */
(function () {
  var me = document.currentScript, wait = me && me.hasAttribute("data-wait");
  /* Poora page dhakne wala parda nahi: upar patli RGB line + chhota "Opening…" chip.
     Isse purana page "atka hua" nahi lagta, aur naya page apni skeleton ke saath turant khulta hai. */
  var st = document.createElement("style");
  st.textContent = "#psLoad{position:fixed;left:0;right:0;top:0;z-index:9998;height:3px;pointer-events:none;opacity:0;transition:opacity .2s}" +
    "#psLoad.on{opacity:1}" +
    "#psLoad:before{content:'';position:absolute;inset:0;width:30%;background:linear-gradient(90deg,#ff3d6e,#ff8a00,#ffd166,#22c55e,#06b6d4,#3b82f6,#8b2cff);box-shadow:0 0 10px rgba(139,44,255,.7);animation:psBar 1.1s ease-in-out infinite}" +
    "#psLoad b{position:fixed;top:10px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:6px 12px 6px 8px;border-radius:99px;background:var(--card,#1a1433);color:var(--text,#fff);border:1px solid var(--line2,rgba(255,255,255,.15));box-shadow:0 10px 30px -10px rgba(0,0,0,.5);font:600 .8rem system-ui,sans-serif}" +
    "#psLoad i{width:16px;height:16px;border-radius:50%;background:conic-gradient(#ff3d6e,#ff8a00,#ffd166,#22c55e,#06b6d4,#3b82f6,#8b2cff,#ff3d6e);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px));mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2.5px));animation:psSpin .7s linear infinite}" +
    "html.light #psLoad b{background:#fff;color:#1a1433}" +
    "@keyframes psSpin{to{transform:rotate(360deg)}}@keyframes psBar{0%{left:-30%}100%{left:100%}}";
  document.head.appendChild(st);
  var el = document.createElement("div"); el.id = "psLoad"; el.setAttribute("role", "status"); el.innerHTML = "<b><i></i>Opening…</b>";
  var put = function () { if (!el.parentNode) document.body.appendChild(el); };
  var timer;
  var show = function () { put(); el.classList.add("on"); clearTimeout(timer); timer = setTimeout(hide, 12000); };
  var hide = function () { clearTimeout(timer); el.classList.remove("on"); };
  window.PSLoader = { show: show, hide: hide };
  if (wait) { if (document.body) show(); else document.addEventListener("DOMContentLoaded", show); }
  // Doosre page ka link dabaya (naya tab nahi, # wala nahi) to turant loader
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank" || a.hasAttribute("download")) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (u.origin !== location.origin || !/^https?:$/.test(u.protocol)) return;
    if (u.pathname === location.pathname && (u.hash || u.search === location.search)) return;
    setTimeout(function () { if (!e.defaultPrevented) show(); }, 0);
  }, true);
  // Back button se page wapas aaye to loader band
  addEventListener("pageshow", function (e) { if (e.persisted) hide(); });
  // Link par ungli / mouse rakhte hi agla page pehle se laana shuru (Chrome / Edge) — click par turant khulta hai
  try {
    if (HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) {
      var sr = document.createElement("script"); sr.type = "speculationrules";
      sr.textContent = JSON.stringify({ prefetch: [{ where: { and: [{ href_matches: "/*" }, { not: { href_matches: "/api/*" } }, { not: { selector_matches: "[download],[target=_blank]" } }] }, eagerness: "moderate" }] });
      document.head.appendChild(sr);
    }
  } catch (x) {}
})();
