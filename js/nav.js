/* Har page par Home page jaisa top menu (Home, Shop PPTs, Custom PPT, Pricing, My PPTs, More).
   Page ka "Back to Home" link isse badal jaata hai. */
(function () {
  var back = document.querySelector("header a.back, .top a.back");
  if (!back || document.querySelector(".gnav")) return;
  var ic = function (d, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 16) + '" height="' + (w || 16) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; };
  var I = {
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    spark: '<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>'
  };
  var page = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  var more = [
    ["service.html?s=ready-to-use-presentations", "Ready-to-Use Presentations"],
    ["service.html?s=lecture-recording", "Lecture Recording"],
    ["service.html?s=thumbnail-design", "Thumbnail Design"],
    ["ready-ppts.html?type=notes", "Study Notes"],
    ["service.html?s=video-editing", "Video Editing"],
    ["service.html?s=social-media-management", "Social Media Management"],
    ["service.html", "View all offerings →"]
  ];
  var css = '.gnav{display:flex;align-items:center;gap:6px;margin-left:auto}' +
    '.gnav a,.gnav .g-more>button{display:inline-flex;align-items:center;gap:7px;padding:9px 12px;border-radius:10px;font-family:inherit;font-size:.86rem;font-weight:600;line-height:1.1;white-space:nowrap;text-decoration:none;color:#fff;border:0;cursor:pointer;transition:.2s}' +
    '.gnav a:hover,.gnav .g-more>button:hover{filter:brightness(1.1);transform:translateY(-1px)}' +
    '.gnav .g-home{background:linear-gradient(135deg,#8b2cff,#a855f7);box-shadow:0 6px 20px -4px rgba(139,44,255,.7)}' +
    '.gnav .g-shop{background:linear-gradient(135deg,#06b6d4,#3b82f6);box-shadow:0 6px 20px -4px rgba(6,182,212,.6)}' +
    '.gnav .g-custom{color:var(--text,#fff);background:var(--card2,rgba(255,255,255,.06));border:1px solid rgba(192,132,252,.45)}.gnav .g-custom svg{color:#c084fc}' +
    '.gnav .g-price{background:linear-gradient(135deg,#ff8a00,#ff3d6e);box-shadow:0 6px 20px -4px rgba(255,100,40,.6)}.gnav .g-rs{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.25);font-size:.78rem;font-weight:800}' +
    '.gnav .g-my{color:var(--text,#fff);background:var(--card,transparent);border:1px solid rgba(192,132,252,.6)}' +
    '.gnav .g-more{position:relative}.gnav .g-more>button{background:linear-gradient(135deg,#10b981,#0ea5e9)}' +
    '.gnav .g-menu{position:absolute;top:calc(100% + 8px);right:0;width:260px;display:none;flex-direction:column;gap:2px;padding:8px;border-radius:14px;background:var(--card,#1a1433);border:1px solid var(--line2,rgba(255,255,255,.15));box-shadow:0 24px 50px -14px rgba(0,0,0,.55);z-index:80}' +
    '.gnav .g-more.open .g-menu{display:flex}.gnav .g-menu a{color:var(--text,#fff);padding:9px 10px;font-weight:600}.gnav .g-menu a:hover{background:var(--card2,rgba(255,255,255,.08));transform:none}' +
    '.gnav .g-on{outline:2px solid #fff;outline-offset:-2px}html.light .gnav .g-on{outline-color:#1a1433}' +
    '.g-burger{display:none;place-items:center;flex:none;width:42px;height:42px;border-radius:12px;border:1px solid var(--line2,rgba(255,255,255,.15));background:none;color:var(--text,#fff);cursor:pointer}' +
    '@media(max-width:1100px){.gnav a,.gnav .g-more>button{padding:8px 9px;font-size:.8rem}}' +
    '.g-solo{display:none!important}' +
    /* Patla header (phone ya chhota page): Home button + menu button, baaki menu khulne par */
    '.g-compact .g-solo{display:inline-flex!important;margin-left:auto}.g-compact .g-burger{display:grid;margin-left:6px}.g-compact .gnav{position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:stretch;padding:14px;border-radius:0 0 14px 14px;background:var(--bg2,var(--bg,#0f0a1e));border:1px solid var(--line,rgba(255,255,255,.1));box-shadow:0 20px 40px -20px rgba(0,0,0,.5);display:none;z-index:70}.g-compact .gnav.open{display:flex}.g-compact .gnav .g-more>button{width:100%}.g-compact .gnav .g-menu{position:static;width:auto;margin-top:6px;box-shadow:none}' +
    '.g-solo{padding:8px 13px;border-radius:10px;font-family:inherit;font-size:.84rem;font-weight:600;color:#fff;text-decoration:none;white-space:nowrap;background:linear-gradient(135deg,#8b2cff,#a855f7);box-shadow:0 6px 20px -4px rgba(139,44,255,.7)}';
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  var on = function (p) { return page === p ? " g-on" : ""; };
  var nav = document.createElement("nav"); nav.className = "gnav"; nav.setAttribute("aria-label", "Main menu");
  nav.innerHTML =
    '<a class="g-home' + on("index") + '" href="index.html">Home</a>' +
    '<a class="g-shop' + on("ready-ppts") + '" href="ready-ppts.html">' + ic(I.bag) + 'Shop PPTs</a>' +
    '<a class="g-custom' + on("order") + '" href="index.html#custom">' + ic(I.spark) + 'Custom PPT</a>' +
    '<a class="g-price" href="index.html#pricing"><span class="g-rs">₹</span>Pricing</a>' +
    '<a class="g-my' + on("account") + '" href="account.html">' + ic(I.user) + 'My PPTs</a>' +
    '<div class="g-more"><button type="button" aria-haspopup="true" aria-expanded="false">' + ic(I.grid) + 'More' + ic(I.down, 14) + '</button><div class="g-menu" role="menu">' +
    more.map(function (m) { return '<a role="menuitem" href="' + m[0] + '">' + m[1] + "</a>"; }).join("") + "</div></div>";
  var burger = document.createElement("button"); burger.type = "button"; burger.className = "g-burger"; burger.setAttribute("aria-label", "Menu"); burger.innerHTML = ic(I.menu, 20);
  var bar = back.parentNode; if (getComputedStyle(bar).position === "static") bar.style.position = "relative";
  var solo = document.createElement("a"); solo.className = "g-solo"; solo.href = "index.html"; solo.textContent = "Home";
  back.replaceWith(nav); nav.before(solo, burger);
  var fit = function () { bar.classList.toggle("g-compact", bar.clientWidth < 1000); };
  fit(); addEventListener("resize", fit);
  var my = document.querySelector("header .my-btn"); if (my) my.remove();   // My PPTs ab menu mein hai
  burger.onclick = function () { nav.classList.toggle("open"); };
  var box = nav.querySelector(".g-more"), btn = box.querySelector("button");
  btn.onclick = function (e) { e.stopPropagation(); var o = box.classList.toggle("open"); btn.setAttribute("aria-expanded", String(o)); };
  document.addEventListener("click", function (e) { if (!e.target.closest(".g-more")) { box.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } });
})();
