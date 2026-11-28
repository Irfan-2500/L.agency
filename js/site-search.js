/* Poori website ka search — har page ke header mein (logo ke baad).
   Ready PPTs, Study Notes, Books, Themes, Category menu (State Books, NCERT, JEE...) aur website ke pages,
   sab ek hi box se. PPT list pichhli baar ki (la_ppts) turant, warna Google Script se ek baar laate hain. */
(function () {
  if (window.SiteSearch) return;
  var D = document, W = window;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var ic = function (d, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 18) + '" height="' + (w || 18) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; };
  var I_S = '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', I_X = '<path d="M18 6 6 18M6 6l12 12"/>';
  var PAGES = [
    ["Ready PPTs — kharidein aur download karein", "ready-ppts.html", "ppt shop buy download ready made store"],
    ["PDF Study Notes", "ready-ppts.html?type=notes", "notes pdf study material hindi english"],
    ["Books (PDF)", "ready-ppts.html?type=books", "books kitab pdf ebook competitive exam"],
    ["Custom PPT order — 1 ghante mein", "order.html", "custom order banwaye design 1 hour new ppt"],
    ["AI PPT Maker", "ai-ppt.html", "ai ppt maker gemini auto generate topic"],
    ["Theme Sample — saari PPT designs", "index.html#themes-all", "theme design sample dark light template"],
    ["Pricing", "index.html#pricing", "price rate cost kitna paisa bulk offer"],
    ["My PPTs / My Account", "account.html", "login my ppts download dobara account profile otp"],
    ["Track Order", "track.html", "track order status custom order kahan hai"],
    ["State Board Books, Syllabus & Papers", "state-board.html", "state board books syllabus papers bihar up mp rajasthan"],
    ["Bihar Board Class 10 Syllabus 2026-27", "bihar-board-class-10-syllabus.html", "bihar bseb class 10 syllabus matric"],
    ["Bihar Board Class 12 Syllabus 2026-27", "bihar-board-class-12-syllabus.html", "bihar bseb class 12 syllabus inter science commerce arts"],
    ["CBSE Date Sheet 2027", "cbse-date-sheet-2027.html", "cbse date sheet exam dates 2027 class 10 12 board exam"],
    ["Previous Year Question Papers", "papers.html", "pyq previous year question papers model paper"],
    ["Chapter Wise Notes", "chapters.html", "chapter wise notes"],
    ["Lecture Recording", "service.html?s=lecture-recording", "lecture recording video class"],
    ["Thumbnail Design", "service.html?s=thumbnail-design", "thumbnail youtube design"],
    ["Video Editing", "service.html?s=video-editing", "video editing reels shorts youtube"],
    ["Social Media Management", "service.html?s=social-media-management", "social media instagram facebook youtube management"],
    ["Educational PPT", "educational-ppt.html", "educational ppt teachers"],
    ["PPT for Students", "student-ppt.html", "student project seminar school"],
    ["CBSE, ICSE & State Board PPT", "cbse-icse-state-board-ppt.html", "cbse icse state board ppt"],
    ["About us", "about.html", "about company team who"],
    ["Contact / WhatsApp", "contact.html", "contact whatsapp phone email call help"],
    ["Refund Policy", "refund.html", "refund cancel return money"],
    ["Delivery Policy", "delivery.html", "delivery shipping kab milega"],
    ["Privacy Policy", "privacy.html", "privacy"],
    ["Terms & Conditions", "terms.html", "terms conditions"]
  ];
  var css = '.ss-btn{display:inline-flex;align-items:center;gap:8px;flex:1 1 auto;min-width:0;max-width:300px;height:40px;margin:0 10px;padding:0 14px;border-radius:12px;border:1px solid var(--line2,rgba(255,255,255,.18));background:var(--card,rgba(255,255,255,.06));color:var(--muted,#9a93b8);font-size:.86rem;font-weight:500;font-family:inherit;cursor:text;text-align:left;white-space:nowrap;overflow:hidden}' +
    '.ss-btn:hover{border-color:#a855f7}.ss-btn svg{flex:none;color:#a855f7}.ss-btn span{overflow:hidden;text-overflow:ellipsis}' +
    '@media(max-width:760px){.ss-btn{flex:none;width:40px;max-width:40px;padding:0;justify-content:center;margin:0 0 0 auto;cursor:pointer}.ss-btn span{display:none}}' +
    '.g-compact .ss-btn+.g-solo{margin-left:6px!important}' +
    'header .logo,header .cart-btn{flex-shrink:0}.ss-btn{min-width:40px}' +
    '#ssBox{position:fixed;inset:0;z-index:9990;display:none;background:rgba(10,6,24,.55);backdrop-filter:blur(3px)}#ssBox.on{display:block}' +
    '#ssBox .ss-in{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:min(680px,calc(100% - 16px));max-height:calc(100% - 24px);display:flex;flex-direction:column;border-radius:16px;background:var(--bg2,var(--bg,#120c26));border:1px solid var(--line2,rgba(255,255,255,.15));box-shadow:0 30px 60px -20px rgba(0,0,0,.6);overflow:hidden}' +
    '#ssBox .ss-top{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line,rgba(255,255,255,.1))}#ssBox .ss-top>svg{color:#a855f7;flex:none}' +
    '#ssBox input{flex:1;min-width:0;height:40px;border:0;outline:0;background:none;color:var(--text,#fff);font-size:1rem;font-weight:500;font-family:inherit}' +
    '#ssBox .ss-x{flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:10px;border:0;background:var(--card2,rgba(255,255,255,.08));color:var(--text,#fff);cursor:pointer}' +
    '#ssBox .ss-res{overflow:auto;padding:6px 8px 12px}#ssBox h6{margin:10px 8px 4px;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#9a93b8)}' +
    '#ssBox a.ss-it{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;color:var(--text,#fff);text-decoration:none}#ssBox a.ss-it:hover,#ssBox a.ss-it.on{background:var(--card2,rgba(139,44,255,.12))}' +
    '#ssBox .ss-it i{flex:none;display:grid;place-items:center;width:44px;height:30px;border-radius:6px;background:var(--card2,rgba(255,255,255,.08)) center/cover no-repeat;font-style:normal;font-size:.95rem}' +
    '#ssBox .ss-it b{display:block;font-weight:600;font-size:.9rem;line-height:1.25}#ssBox .ss-it small{display:block;color:var(--muted,#9a93b8);font-size:.76rem}#ssBox .ss-it em{margin-left:auto;font-style:normal;font-weight:700;font-size:.85rem;color:#22c55e;white-space:nowrap}' +
    '#ssBox mark{background:rgba(250,204,21,.35);color:inherit;border-radius:3px}#ssBox .ss-more{display:block;margin:2px 8px 0;font-size:.82rem;font-weight:600;color:#a855f7;text-decoration:none}#ssBox .ss-none{padding:18px 10px;color:var(--muted,#9a93b8);font-size:.9rem}' +
    '#ssBox .ss-hint{display:flex;flex-wrap:wrap;gap:6px;padding:4px 8px}#ssBox .ss-hint button{border:1px solid var(--line2,rgba(255,255,255,.15));background:none;color:var(--text,#fff);font-size:.8rem;font-weight:500;font-family:inherit;padding:5px 10px;border-radius:99px;cursor:pointer}' +
    'html.light #ssBox{background:rgba(30,20,60,.25)}';
  var st = D.createElement("style"); st.textContent = css; D.head.appendChild(st);

  /* ---------- data ---------- */
  var PPTS = null, loading = null;
  var LS = function (k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  var MARK = "https://pptstore.in/#card-end";
  var norm = function (p) { var a = (p.previews || []).filter(Boolean), i = a.indexOf(MARK), card = i < 0 ? [] : a.slice(0, i), sl = i < 0 ? a : a.slice(i + 1);
    return Object.assign({}, p, { thumb: p.thumb || card[0] || sl[0] || "", cards: p.cards || card, previews: sl }); };
  var needCfg = function () { return W.LA_CONFIG ? Promise.resolve() : new Promise(function (ok) { var s = D.createElement("script"); s.src = "config.js"; s.onload = s.onerror = function () { ok(); }; D.head.appendChild(s); }); };
  function loadPpts() {
    if (PPTS) return Promise.resolve(PPTS);
    var c = LS("la_ppts"); if (Array.isArray(c) && c.length) { PPTS = c; return Promise.resolve(PPTS); }
    if (loading) return loading;
    return (loading = needCfg().then(function () {
      var U = String((W.LA_CONFIG || {}).orderUrl || "").trim(); if (!U) return [];
      return fetch(U + "?action=ppts").then(function (r) { return r.json(); }).then(function (j) { return j && j.ok && j.products ? j.products.map(norm) : []; }).catch(function () { return []; });
    }).then(function (l) { if (!l.length && W.LA_CATALOG) l = W.LA_CATALOG.map(function (p) { return Object.assign({}, p, { thumb: "uploads/previews/demo-" + p.slug + "-1.webp" }); });
      PPTS = l; if (l.length && !W.LA_CATALOG) try { localStorage.setItem("la_ppts", JSON.stringify(l)); } catch (e) {} return l; }));
  }
  var themes = function () { var d = LS("la_data"); return d && Array.isArray(d.themes) ? d.themes : (W.THEMES && W.THEMES.length ? W.THEMES : []); };
  function cats() {
    var out = [], d = LS("la_data"), L = W.catnavList ? W.catnavList(d && d.settings) : (W.CATNAV_DEFAULT || []);
    var sp = W.catnavSplit || function (x) { return [String(x), ""]; };
    L.forEach(function (c) { if (c.h) return; (c.it || []).forEach(function (x) { var s = sp(x), n = s[0];
      out.push({ t: n, sub: c.n, e: c.e || "📁", u: s[1] || (c.k === "states" ? "state-board.html?s=" + encodeURIComponent(n) : "state-board.html?" + new URLSearchParams({ s: c.n + " › " + n })) }); }); });
    return out;
  }
  if (!W.catnavList && !W.CATNAV_DEFAULT) { var cs = D.createElement("script"); cs.src = "js/catnav.js"; D.head.appendChild(cs); }

  /* ---------- match ---------- */
  var toks = function (q) { return String(q || "").toLowerCase().replace(/class\s+(\d+)/g, "class$1").split(/[\s,]+/).filter(Boolean); };
  var hayOf = function (a) { return a.filter(Boolean).join(" ").toLowerCase().replace(/[_\-–—|]+/g, " ").replace(/class\s+(\d+)/g, "class$1"); };
  var hit = function (hay, t) { return t.every(function (w) { return hay.indexOf(w) >= 0; }); };
  var hl = function (s, q) { var k = String(q || "").trim().split(/\s+/)[0]; s = String(s || ""); if (!k) return esc(s); var j = s.toLowerCase().indexOf(k.toLowerCase());
    return j < 0 ? esc(s) : esc(s.slice(0, j)) + "<mark>" + esc(s.slice(j, j + k.length)) + "</mark>" + esc(s.slice(j + k.length)); };
  var arr = function (v) { return Array.isArray(v) ? v : (v ? [v] : []); };
  var isBook = function (p) { return arr(p.level).indexOf("Books") >= 0; }, isNote = function (p) { return !isBook(p) && (p.cat === "notes" || arr(p.level).indexOf("Study Notes") >= 0); };
  var inr = function (n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); };

  /* ---------- UI ---------- */
  var box = D.createElement("div"); box.id = "ssBox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Search the website");
  box.innerHTML = '<div class="ss-in"><div class="ss-top">' + ic(I_S, 20) + '<input id="ssQ" type="search" autocomplete="off" placeholder="Search PPT, notes, books, themes, pages…" aria-label="Search the whole website"><button type="button" class="ss-x" aria-label="Close">' + ic(I_X) + '</button></div><div class="ss-res" id="ssRes"></div></div>';
  var q = box.querySelector("#ssQ"), res = box.querySelector("#ssRes"), sel = -1, back = false;
  var item = function (u, t, sub, thumb, em, qq) { return '<a class="ss-it" href="' + esc(u) + '"><i' + (thumb ? ' style="background-image:url(\'' + esc(String(thumb).replace(/['"\\()]/g, "")) + '\')"' : "") + ">" + (thumb ? "" : esc(em || "🔗")) + "</i><span><b>" + hl(t, qq) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</span></a>"; };
  function draw() {
    var v = q.value.trim(), t = toks(v); sel = -1;
    if (!t.length) { res.innerHTML = '<h6>Jaldi dhundhein</h6><div class="ss-hint">' + ["Class 10 Science", "Maths", "Hindi", "Notes", "Bihar Board", "Theme", "Track order"].map(function (x) { return '<button type="button">' + esc(x) + "</button>"; }).join("") + "</div>"; return; }
    var out = [], P = PPTS || [];
    var group = function (name, list, all, more) { if (!list.length) return; out.push("<h6>" + esc(name) + " · " + all + "</h6>" + list.join("") + (more && all > list.length ? '<a class="ss-more" href="' + esc(more) + '">Saare ' + all + " dekhein →</a>" : "")); };
    var mk = function (kindFn, u) { var m = P.filter(kindFn).filter(function (p) { return hit(hayOf([p.title, p.desc, p.subject, p.lang, p.cat, p.badge].concat(arr(p.level), arr(p.board), arr(p.tags))), t); });
      return [m.slice(0, 5).map(function (p) { return '<a class="ss-it" href="ready-ppts.html?' + (u ? "type=" + u + "&" : "") + "id=" + encodeURIComponent(p.id) + '"><i' + (p.thumb ? " style=\"background-image:url('" + esc(String(p.thumb).replace(/['"\\()]/g, "")) + "')\"" : "") + "></i><span><b>" + hl(p.title, v) + "</b><small>" + esc([p.subject, p.lang, p.slides ? p.slides + (u ? " pages" : " slides") : ""].filter(Boolean).join(" · ")) + "</small></span><em>" + inr(p.price) + "</em></a>"; }), m.length]; };
    var a = mk(function (p) { return !isNote(p) && !isBook(p); }, ""); group("Ready PPTs", a[0], a[1], "ready-ppts.html?q=" + encodeURIComponent(v));
    a = mk(isNote, "notes"); group("Study Notes", a[0], a[1], "ready-ppts.html?type=notes&q=" + encodeURIComponent(v));
    a = mk(isBook, "books"); group("Books", a[0], a[1], "ready-ppts.html?type=books&q=" + encodeURIComponent(v));
    var th = themes().filter(function (x) { return hit(hayOf([x.name, x.type, x.tone, x.lang].concat(arr(x.subjects), arr(x.classes), arr(x.tags))), t); });
    group("Themes", th.slice(0, 4).map(function (x) { return item("index.html#theme=" + encodeURIComponent(x.id || x.name), x.name, [x.tone === "White" ? "Light" : "Dark", x.type].filter(Boolean).join(" · "), (x.slides && x.slides[0]) || x.img, "🎨", v); }), th.length, "index.html#themes-all");
    var cn = cats().filter(function (x) { return hit(hayOf([x.t, x.sub]), t); });
    group("Books, Syllabus & Exams", cn.slice(0, 5).map(function (x) { return item(x.u, x.t, x.sub, "", x.e, v); }), cn.length);
    var pg = PAGES.filter(function (x) { return hit(hayOf([x[0], x[2]]), t); });
    group("Pages", pg.slice(0, 5).map(function (x) { return item(x[1], x[0], "", "", "📄", v); }), pg.length);
    res.innerHTML = out.length ? out.join("") : '<div class="ss-none">"' + esc(v) + '" ke liye kuch nahi mila. Doosra shabd try karein — ya <a href="order.html" style="color:#a855f7">custom PPT order</a> karein.</div>' + (PPTS ? "" : '<div class="ss-none">PPT list aa rahi hai…</div>');
  }
  function open(v) {
    if (!box.parentNode) D.body.appendChild(box);
    box.classList.add("on"); D.documentElement.style.overflow = "hidden";
    if (typeof v === "string") q.value = v;
    draw(); setTimeout(function () { q.focus(); q.select(); }, 30);
    if (!PPTS) loadPpts().then(draw);
    if (!back) { back = true; try { history.pushState({ ss: 1 }, ""); } catch (e) {} }
  }
  function close(fromPop) {
    if (!box.classList.contains("on")) return;
    box.classList.remove("on"); D.documentElement.style.overflow = "";
    if (back && !fromPop) { back = false; try { history.back(); } catch (e) {} } else back = false;
  }
  addEventListener("popstate", function () { if (box.classList.contains("on")) close(true); });
  var tmr; q.addEventListener("input", function () { clearTimeout(tmr); tmr = setTimeout(draw, 80); });
  q.addEventListener("keydown", function (e) {
    var L = res.querySelectorAll("a.ss-it");
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!L.length) return; sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + L.length) % L.length; L.forEach(function (a, i) { a.classList.toggle("on", i === sel); }); L[sel].scrollIntoView({ block: "nearest" }); }
    if (e.key === "Enter") { e.preventDefault(); var a = L[sel] || null, v = q.value.trim(); if (!a && !v) return;
      go(a ? a.getAttribute("href") : "ready-ppts.html?q=" + encodeURIComponent(v)); }
  });
  function go(u) { back = false; box.classList.remove("on"); D.documentElement.style.overflow = ""; if (W.PSLoader) PSLoader.show(); location.href = u; }
  box.addEventListener("click", function (e) {
    if (e.target === box || e.target.closest(".ss-x")) return close();
    var h = e.target.closest(".ss-hint button"); if (h) { q.value = h.textContent; draw(); q.focus(); return; }
    var a = e.target.closest("a"); if (a && !e.ctrlKey && !e.metaKey) { e.preventDefault(); var u = a.getAttribute("href");
      var here = location.pathname.replace(/\/$/, "/index.html").split("/").pop() || "index.html";
      if (/^index\.html#/.test(u) && /^(index\.html)?$/.test(here)) { close(); setTimeout(function () { location.hash = u.slice(u.indexOf("#")); }, 60); return; }
      go(u); }
  });
  /* "/" dabane par search khule (input mein type karte waqt nahi) */
  D.addEventListener("keydown", function (e) { if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test((D.activeElement || {}).tagName || "") && !(D.activeElement || {}).isContentEditable) { e.preventDefault(); open(); } });

  /* ---------- header button ---------- */
  function mount() {
    if (D.querySelector(".ss-btn")) return;
    var hd = D.querySelector("header"); if (!hd) return;
    var logo = hd.querySelector(".logo, a.brand, .nav > a:first-child"); if (!logo) return;
    var b = D.createElement("button"); b.type = "button"; b.className = "ss-btn"; b.setAttribute("aria-label", "Search the website");
    b.innerHTML = ic(I_S) + "<span>Search PPT, notes, books…</span>";
    b.onclick = function () { open(); };
    logo.after(b);
  }
  W.SiteSearch = { open: open, close: close, mount: mount };
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", mount); else mount();
})();
