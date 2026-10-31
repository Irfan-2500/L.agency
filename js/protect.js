/* Content protection: right-click / drag / long-press save band, Ctrl+P par khaali page,
   Ctrl+S / Ctrl+U / DevTools keys band, PrintScreen / Snipping par photo chhup jaati hain,
 (Admin page par ye file nahi lagti.) */
(function () {
  var editable = function (el) { return el && el.closest && el.closest("input,textarea,select,[contenteditable=true]"); };
  var css = ""
    + "img,video,canvas{-webkit-user-drag:none;user-drag:none;-webkit-touch-callout:none}"
    + "body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}"
    + "input,textarea,select,[contenteditable=true]{-webkit-user-select:text;user-select:text}"
    // PrintScreen / dusri window (Snipping tool) par photo dhundhli
    + "html.prot-hide img,html.prot-hide .stage,html.prot-hide .th-view{filter:blur(28px)!important;transition:none!important}"
    // Ctrl+P / print: poora page khaali (safed)
    + "@media print{html,body{background:#fff!important}body *{display:none!important;visibility:hidden!important}body::after{content:'';display:block}}";
  var st = document.createElement("style"); st.id = "protect-css"; st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  // right-click / long-press menu band (form ke andar typing chalti rahe)
  document.addEventListener("contextmenu", function (e) { if (!editable(e.target)) e.preventDefault(); }, true);
  document.addEventListener("dragstart", function (e) { if (e.target && /^(IMG|VIDEO|CANVAS|A)$/.test(e.target.tagName)) e.preventDefault(); }, true);
  document.addEventListener("copy", function (e) { if (!editable(e.target)) { e.preventDefault(); } }, true);

  var hideT = 0;
  var hide = function (ms) { document.documentElement.classList.add("prot-hide"); clearTimeout(hideT); if (ms) hideT = setTimeout(show, ms); };
  var show = function () { document.documentElement.classList.remove("prot-hide"); };

  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase(), c = e.ctrlKey || e.metaKey;
    if (k === "printscreen") { hide(2500); try { navigator.clipboard.writeText(""); } catch (x) {} return; }
    if (c && (k === "p" || k === "s" || k === "u")) { e.preventDefault(); e.stopPropagation(); return; }
    if (k === "f12" || (c && e.shiftKey && (k === "i" || k === "j" || k === "c")) || (e.metaKey && e.altKey && (k === "i" || k === "j" || k === "c"))) { e.preventDefault(); return; }
    if (e.metaKey && e.shiftKey && (k === "3" || k === "4" || k === "5" || k === "s")) hide(2500);   // Mac screenshot / Win+Shift+S
  }, true);
  document.addEventListener("keyup", function (e) { if ((e.key || "").toLowerCase() === "printscreen") { hide(2500); try { navigator.clipboard.writeText(""); } catch (x) {} } }, true);

  // Snipping Tool / doosri app khulte hi window focus kho deti hai → photo chhupa do; wapas aate hi dikhao
  window.addEventListener("blur", function () { hide(0); });
  window.addEventListener("focus", show);
  document.addEventListener("visibilitychange", function () { if (document.hidden) hide(0); else show(); });
  window.addEventListener("beforeprint", function () { hide(0); });
  window.addEventListener("afterprint", show);
})();
