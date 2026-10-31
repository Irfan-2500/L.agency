/* Page badalte waqt (aur jab tak PPTs load ho rahi hon) beech mein RGB ghoomta circle.
   <script src="js/loader.js" data-wait> lagao to page khulte hi dikhega; page khud PSLoader.hide() bulaye. */
(function () {
  var me = document.currentScript, wait = me && me.hasAttribute("data-wait");
  var st = document.createElement("style");
  st.textContent = "#psLoad{position:fixed;inset:0;z-index:9998;display:grid;place-content:center;justify-items:center;gap:14px;background:var(--bg,#0a0618);opacity:0;pointer-events:none;transition:opacity .2s}" +
    "#psLoad.on{opacity:1;pointer-events:auto}" +
    "#psLoad i{width:58px;height:58px;border-radius:50%;background:conic-gradient(#ff3d6e,#ff8a00,#ffd166,#22c55e,#06b6d4,#3b82f6,#8b2cff,#ff3d6e);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));mask:radial-gradient(farthest-side,transparent calc(100% - 7px),#000 calc(100% - 6px));animation:psSpin .8s linear infinite;filter:drop-shadow(0 0 10px rgba(139,44,255,.6))}" +
    "#psLoad b{font:600 .9rem system-ui,sans-serif;color:#fff;letter-spacing:.02em}" +
    "html.light #psLoad{background:var(--bg,#f5f4fa)}html.light #psLoad b{color:#1a1433}" +
    "@keyframes psSpin{to{transform:rotate(360deg)}}";
  document.head.appendChild(st);
  var el = document.createElement("div"); el.id = "psLoad"; el.setAttribute("role", "status"); el.innerHTML = "<i></i><b>Loading…</b>";
  var put = function () { if (!el.parentNode) document.body.appendChild(el); };
  var timer;
  var show = function () { put(); el.classList.add("on"); clearTimeout(timer); timer = setTimeout(hide, 15000); };
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
})();
