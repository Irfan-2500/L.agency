/* Visitor count (admin panel → Analytics). Koi naam/number nahi jata, sirf ek random ID. */
(function(){
  try {
    if (window.claude || /^(localhost|127\.|\[)/.test(location.hostname) || location.protocol === "file:" || /admin/.test(location.pathname)) return;
    var v = localStorage.getItem("la_vid");
    if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("la_vid", v); }
    var q = new URLSearchParams(location.search), ref = document.referrer && document.referrer.indexOf(location.host) < 0 ? document.referrer : "";
    var data = JSON.stringify({ v: v, p: location.pathname.replace(/\.html$/, "").replace(/\/index$/, "/") || "/", r: q.get("utm_source") || ref });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/hit", data);
    else fetch("/api/hit", { method: "POST", body: data, keepalive: true });
  } catch (e) {}
})();
