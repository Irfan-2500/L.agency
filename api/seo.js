/* SEO pages (Google ke liye server par bane HTML pages).
   Google ko har file / board / category ka apna page chahiye jiska title us file ke naam par ho.
   Ye function Google Script se list padhta hai aur ye pages banata hai:
     /sitemap.xml                 saare pages ki list (har nayi upload apne aap jud jaati hai)
     /study-material              sab boards + categories ka hub page
     /board/<state>               jaise /board/up  ->  "UP Board Books, Syllabus, Previous Year Papers..."
     /board/<state>/<file>        state board ki ek file (class, medium, subject)
     /topic/<category>/<item>     jaise /topic/cbse/sample-papers
     /ppt/<id>-<title>            har Ready PPT / Notes / Category file ka apna page
   Data 1 ghante tak cache hota hai, isliye nayi file kuch der me dikhti hai. */
const fs = require("fs");
const path = require("path");

const SITE = "https://www.pptstore.in";
const read = f => { try { return fs.readFileSync(path.join(__dirname, "..", f), "utf8"); } catch (e) { return ""; } };
const SCRIPT = (/orderUrl:\s*"([^"]+)"/.exec(read("config.js")) || [])[1] || "";
const CATNAV = (() => { const m = /CATNAV_DEFAULT=(\[[\s\S]*?\]);\s*\n/.exec(read("js/catnav.js")); try { return m ? JSON.parse(m[1]) : []; } catch (e) { return []; } })();

const STATES = ["Bihar","UP","Andhra Pradesh","Chhattisgarh","West Bengal","Gujarat","Karnataka","Kerala","Madhya Pradesh","Haryana","Maharashtra","Punjab","Rajasthan","Tamilnadu","Jharkhand","Telangana","CISCE","NIOS","Odisha","Assam","Jammu & Kashmir"];
/* Log jo naam search karte hain */
const ALIAS = { "Bihar":"Bihar Board (BSEB)", "UP":"UP Board (UPMSP)", "Andhra Pradesh":"AP Board (BSEAP)", "Chhattisgarh":"CG Board (CGBSE)", "West Bengal":"WB Board (WBBSE / WBCHSE)",
  "Gujarat":"Gujarat Board (GSEB)", "Karnataka":"Karnataka Board (KSEAB)", "Kerala":"Kerala Board (SCERT)", "Madhya Pradesh":"MP Board (MPBSE)", "Haryana":"Haryana Board (HBSE)",
  "Maharashtra":"Maharashtra Board (MSBSHSE)", "Punjab":"Punjab Board (PSEB)", "Rajasthan":"Rajasthan Board (RBSE)", "Tamilnadu":"Tamil Nadu Board (TN Samacheer)",
  "Jharkhand":"Jharkhand Board (JAC)", "Telangana":"Telangana Board (TS BSE)", "CISCE":"CISCE (ICSE / ISC)", "NIOS":"NIOS", "Odisha":"Odisha Board (BSE / CHSE)",
  "Assam":"Assam Board (SEBA / AHSEC)", "Jammu & Kashmir":"JK Board (JKBOSE)" };
const STATIC = [["", "1.0"], ["cbse-date-sheet-2027.html", "0.9"], ["bihar-board-class-10-syllabus.html", "0.9"], ["bihar-board-class-12-syllabus.html", "0.9"], ["ready-ppts.html", "0.9"], ["study-material", "0.9"], ["state-books.html", "0.8"], ["order.html", "0.8"], ["educational-ppt.html", "0.8"], ["ready-made-ppt.html", "0.8"],
  ["ai-ppt.html", "0.8"], ["custom-ppt-design.html", "0.8"], ["student-ppt.html", "0.8"], ["study-notes-pdf.html", "0.8"], ["cbse-icse-state-board-ppt.html", "0.8"], ["lecture-recording-video-editing.html", "0.7"],
  ["about.html", "0.5"], ["service.html", "0.5"], ["contact.html", "0.4"], ["privacy.html", "0.2"], ["terms.html", "0.2"], ["refund.html", "0.2"], ["delivery.html", "0.2"]];

const slug = t => String(t || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const catKey = (c, i) => { const s = t => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); return ("#" + s(c) + "/" + s(i)).slice(0, 40); };   // js/catnav.js jaisa
const arr = v => Array.isArray(v) ? v : (v ? [v] : []);
const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };
const qs = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== "")).toString();
const CARD_MARK = "https://pptstore.in/#card-end";
const fit = (base, tail) => (base + tail).length <= 66 ? base + tail + " | PPT Store" : (base.length <= 66 ? base : clip(base, 66)) + " | PPT Store";
const isNote = p => p.cat === "notes" || arr(p.level).includes("Study Notes");

/* ---------- data (Google Script), memory cache ---------- */
let memo = { t: 0 };
async function getJSON(action) {
  if (!SCRIPT) return null;
  try { const r = await fetch(SCRIPT + (SCRIPT.includes("?") ? "&" : "?") + "action=" + action, { redirect: "follow" }); return r.ok ? await r.json() : null; } catch (e) { return null; }
}
async function data() {
  if (memo.t > Date.now() - 10 * 60 * 1000) return memo;
  const [p, s, d] = await Promise.all([getJSON("ppts"), getJSON("stateFiles"), getJSON("data")]);
  let cats = CATNAV;
  try { const raw = d && d.settings && d.settings.catnav; const j = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null; if (j && Array.isArray(j.cats) && j.cats.length) cats = j.cats; } catch (e) {}
  const products = (p && p.ok && Array.isArray(p.products)) ? p.products.filter(x => x && x.id && x.title) : (memo.products || []);
  const files = (s && s.ok && s.files && typeof s.files === "object") ? s.files : (memo.files || {});
  memo = { t: Date.now(), products, files, cats: (cats || []).filter(c => c && c.n).map(c => ({ n: String(c.n), d: String(c.d || ""), it: arr(c.it).map(x => String(x).split(" | ")[0].trim()).filter(Boolean), k: c.k })) };
  return memo;
}

/* ---------- helpers for each kind of page ---------- */
const pptUrl = p => "/ppt/" + p.id + "-" + slug(p.title);
const sbParts = k => { const [st, t, c, m, sub, y] = String(k).split("|"); return { st, t, c, m, sub, y }; };
const sbTitle = (k) => { const x = sbParts(k); return [ALIAS[x.st] ? x.st + " Board" : x.st, "Class " + x.c, x.sub, x.t === "Previous Year Questions" ? "Previous Year Paper" : x.t, x.y, x.m ? x.m + " Medium" : ""].filter(Boolean).join(" "); };
const sbUrl = k => { const x = sbParts(k); return "/board/" + slug(x.st) + "/" + slug([x.t, "class", x.c, x.m, x.sub, x.y].filter(Boolean).join(" ")); };
const sbLink = (k, v) => {   // website ka asli page jahan file khulti hai
  const x = sbParts(k), base = { s: x.st, t: x.t, c: x.c, m: x.m, sub: x.sub };
  if (x.y || (v && v.sets)) return "/papers.html?" + qs({ s: x.st, c: x.c, m: x.m, sub: x.sub, y: x.y });
  if (v && v.chapters) return "/chapters.html?" + qs(base);
  const f = v && (v.pdf ? "PDF" : v.word ? "Word" : v.ppt ? "PPT" : "PDF");
  return "/view.html?" + qs({ ...base, f });
};
/* Menu item ki apni bani hui page ho to wahi khulti hai */
const LEVEL_ALIAS = { Bihar: { 10: "Matric", 12: "Inter" }, UP: { 10: "High School", 12: "Intermediate" }, Jharkhand: { 10: "Matric", 12: "Inter" } };
const BOARD_PAGES = { Bihar: [["/bihar-board-class-10-syllabus.html", "Class 10 Syllabus 2026-27"], ["/bihar-board-class-12-syllabus.html", "Class 12 Syllabus 2026-27"]] };
const ITEM_PAGE = { "/topic/cbse/cbse-exam-date-sheet-2027": "/cbse-date-sheet-2027.html" };
/* Admin → menu item me upload hui files (key "CBSE › CBSE Exam Date Sheet 2027|...") */
const itemFiles = (D, cat, item) => Object.keys(D.files).filter(k => sbParts(k).st === cat + " › " + item);
const itemCount = (D, cat, item) => productsFor(D, cat, item).length + itemFiles(D, cat, item).length;
const stateOf = s => STATES.find(x => slug(x) === s);
const productsFor = (D, cat, item) => { const k = catKey(cat, item); return D.products.filter(p => arr(p.board).includes(k)); };
const img = p => { const a = arr(p.previews).filter(u => /^https:\/\//.test(u) && u !== CARD_MARK); return a[0] || ""; };
const kindOf = p => isNote(p) ? "Notes PDF" : (p.type === "pdf" ? "PDF" : "PPT");

/* ---------- page shell ---------- */
function page({ url, title, desc, h1, sub, body, ld = [], image, noindex }) {
  const canon = SITE + url;
  const lds = ld.map(x => '<script type="application/ld+json">' + JSON.stringify(x).replace(/</g, "\\u003c") + "</script>").join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${E(title)}</title>
<meta name="description" content="${E(desc)}">
<link rel="canonical" href="${E(canon)}">
<meta name="robots" content="${noindex ? "noindex, follow" : "index, follow, max-image-preview:large"}">
<meta name="theme-color" content="#07080c">
<meta property="og:type" content="website"><meta property="og:site_name" content="PPT Store"><meta property="og:locale" content="en_IN">
<meta property="og:title" content="${E(title)}"><meta property="og:description" content="${E(desc)}"><meta property="og:url" content="${E(canon)}">
<meta property="og:image" content="${E(image || SITE + "/uploads/brand/og-image.jpg")}"><meta name="twitter:card" content="summary_large_image">
${lds}
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" type="image/png" sizes="192x192" href="/uploads/brand/icon-192.png"><link rel="apple-touch-icon" href="/uploads/brand/apple-touch-icon.png">
<script>(function(){var m="system";try{m=localStorage.getItem("la_theme")||"system"}catch(e){}var l=m==="light"||(m==="system"&&matchMedia("(prefers-color-scheme: light)").matches);document.documentElement.classList.toggle("light",l);})();</script>
<style>
:root{--bg:#07080c;--card:#0f121b;--line:rgba(255,255,255,.12);--text:#f4f5fb;--muted:#9aa1b8;--accent:#c084fc;--grad:linear-gradient(90deg,#8b2cff,#06b6d4)}
html.light{--bg:#f7f7fb;--card:#fff;--line:rgba(0,0,0,.1);--text:#14151c;--muted:#5b6070;--accent:#7c3aed}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--text);line-height:1.65;padding:0 16px}
a{color:var(--accent)}
.wrap{max-width:960px;margin:0 auto;padding:22px 0 56px}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:22px}
.top a{color:var(--text);text-decoration:none;display:inline-flex;align-items:center;gap:8px;font-weight:700}
.back{padding:8px 14px;border:1px solid var(--line);border-radius:10px;font-size:.88rem;background:var(--card);font-weight:500!important}
.crumb{font-size:.82rem;color:var(--muted);margin-bottom:10px}.crumb a{color:var(--muted)}
h1{font-size:clamp(1.5rem,4.5vw,2.2rem);line-height:1.2;margin-bottom:8px}
.sub{color:var(--muted);margin-bottom:16px}
h2{font-size:1.15rem;margin:28px 0 10px}
.btns{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:11px 18px;border-radius:12px;font-weight:600;text-decoration:none;font-size:.95rem;border:1px solid var(--line);background:var(--card);color:var(--text)}
.btn.p{background:var(--grad);color:#fff;border:0}
.list{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;list-style:none}
.list a{display:block;height:100%;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--text);text-decoration:none}
.list a:hover{border-color:var(--accent)}.list small{display:block;color:var(--muted);font-size:.8rem;margin-top:2px}
.chips{display:flex;flex-wrap:wrap;gap:8px}.chips a{padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--text);text-decoration:none;font-size:.86rem}
.hero{display:grid;grid-template-columns:1fr;gap:18px}
.hero img{width:100%;max-width:520px;border-radius:14px;border:1px solid var(--line)}
.price{font-size:1.6rem;font-weight:800}.price s{font-size:1rem;color:var(--muted);font-weight:400;margin-left:8px}
.facts{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.facts span{font-size:.8rem;padding:4px 10px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
p.txt{color:var(--muted);max-width:760px}
footer{margin-top:44px;padding-top:18px;border-top:1px solid var(--line);font-size:.88rem;display:flex;flex-wrap:wrap;gap:8px 16px}
@media(min-width:780px){.hero.two{grid-template-columns:1.1fr 1fr;align-items:start}}
@media(max-width:600px){.btn{flex:1 1 100%}}
</style>
</head>
<body>
<div class="wrap">
<div class="top"><a href="/"><img src="/uploads/brand/logo.webp" alt="PPT Store logo" width="50" height="22" style="height:22px;width:auto">PPT STORE</a><a class="back" href="/study-material">All Study Material</a></div>
${body}
<footer><a href="/">Home</a><a href="/ready-ppts.html">Ready PPTs</a><a href="/study-material">Study Material</a><a href="/state-books.html">State Boards</a><a href="/order.html">Custom PPT</a><a href="/contact.html">Contact</a></footer>
</div>
<script src="/js/track.js" defer></script>
</body>
</html>`;
}
const crumbs = (items) => '<nav class="crumb" aria-label="Breadcrumb">' + items.map(([n, u]) => u ? `<a href="${E(u)}">${E(n)}</a>` : E(n)).join(" › ") + "</nav>";
const crumbLD = (items) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE + (u || "") })) });
const pptList = ps => '<ul class="list">' + ps.map(p => `<li><a href="${E(pptUrl(p))}"><b>${E(p.title)}</b><small>${E([kindOf(p), arr(p.level).filter(l => l !== "Study Notes" && l !== "Other")[0], p.subject, p.lang, p.price ? "₹" + p.price : ""].filter(Boolean).join(" · "))}</small></a></li>`).join("") + "</ul>";

/* ---------- pages ---------- */
function pptPage(D, id) {
  const p = D.products.find(x => String(x.id) === String(id));
  if (!p) return null;
  const lv = arr(p.level).filter(l => l !== "Study Notes" && l !== "Other"), kind = kindOf(p);
  const boards = arr(p.board).filter(b => b && b[0] !== "#");
  const tags = arr(p.board).filter(b => b && b[0] === "#");
  const topics = []; D.cats.forEach(c => c.it.forEach(it => { if (tags.includes(catKey(c.n, it))) topics.push([c.n, it]); }));
  const title = fit(`${p.title}${lv.length && !p.title.includes(lv[0]) ? " – " + lv[0] : ""}${p.subject && !p.title.includes(p.subject) ? " " + p.subject : ""}`, ` ${kind} Download`);
  const desc = clip(`${p.title}: ${p.desc || ""} ${[lv.join(", "), p.subject, boards.join(", "), p.lang ? p.lang + " medium" : ""].filter(Boolean).join(" · ")}. Editable ${kind}${p.slides ? ", " + p.slides + (isNote(p) ? " pages" : " slides") : ""}, instant download.`, 158);
  const open = (isNote(p) ? "/ready-ppts.html?type=notes&" : "/ready-ppts.html?") + qs({ q: p.title });
  const im = img(p), url = pptUrl(p);
  const crumb = [["Home", "/"], [isNote(p) ? "Study Notes" : "Ready PPTs", isNote(p) ? "/ready-ppts.html?type=notes" : "/ready-ppts.html"], [p.title]];
  const related = D.products.filter(x => x.id !== p.id && (x.subject === p.subject || arr(x.level).some(l => lv.includes(l)))).slice(0, 8);
  const body = `${crumbs(crumb)}
<div class="hero${im ? " two" : ""}"><div>
<h1>${E(p.title)}</h1>
<div class="facts">${[kind, ...lv, p.subject, ...boards, p.lang && p.lang !== "Both" ? p.lang + " Medium" : p.lang === "Both" ? "Hindi + English" : "", p.slides ? p.slides + (isNote(p) ? " pages" : " slides") : ""].filter(Boolean).map(t => `<span>${E(t)}</span>`).join("")}</div>
${p.price ? `<p class="price">₹${E(p.price)}${p.mrp > p.price ? `<s>₹${E(p.mrp)}</s>` : ""}</p>` : ""}
<p class="txt">${E(p.desc || p.title)}</p>
<div class="btns"><a class="btn p" href="${E(open)}">Preview &amp; Buy</a><a class="btn" href="/order.html">Need a custom version?</a></div>
</div>${im ? `<img src="${E(im)}" alt="${E(p.title)} preview" loading="lazy">` : ""}</div>
${topics.length ? `<h2>Listed in</h2><div class="chips">${topics.map(([c, it]) => `<a href="/topic/${slug(c)}/${slug(it)}">${E(c + " · " + it)}</a>`).join("")}</div>` : ""}
${related.length ? `<h2>Related study material</h2>${pptList(related)}` : ""}`;
  const ld = [crumbLD(crumb.map(([n, u]) => [n, u || url])), {
    "@context": "https://schema.org", "@type": "Product", name: p.title, description: clip(p.desc || p.title, 300), sku: String(p.id),
    category: [kind, ...lv, p.subject].filter(Boolean).join(", "), brand: { "@type": "Brand", name: "PPT Store" }, ...(im ? { image: im } : {}),
    offers: { "@type": "Offer", price: String(p.price || 0), priceCurrency: "INR", availability: "https://schema.org/InStock", url: SITE + url } }];
  return page({ url, title, desc, body, ld, image: im });
}

function topicPage(D, cs, is) {
  const c = D.cats.find(x => slug(x.n) === cs); if (!c) return null;
  const item = c.it.find(x => slug(x) === is); if (!item) return null;
  const url = `/topic/${cs}/${is}`;
  if (ITEM_PAGE[url]) return { redirect: ITEM_PAGE[url] };
  const ps = productsFor(D, c.n, item), fk = itemFiles(D, c.n, item), n = ps.length + fk.length;
  const name = item.toLowerCase().includes(c.n.toLowerCase()) ? item : `${c.n} ${item}`;
  const title = fit(name, fk.length && !ps.length ? " – PDF Download" : " – PDF, Notes & PPT Download");
  const desc = clip(`${name}: ${n ? n + " files – " + ps.slice(0, 3).map(p => p.title).join(", ") + ". " : ""}Download PDF, notes and PPT for ${c.n} preparation, in Hindi & English. ${c.d}`, 158);
  const crumb = [["Home", "/"], ["Study Material", "/study-material"], [c.n, `/topic/${cs}`], [item]];
  const body = `${crumbs(crumb)}<h1>${E(name)}</h1><p class="sub">${E(c.d || "Study material")} · PDF, Notes &amp; PPT</p>
${fk.length ? `<div class="btns"><a class="btn p" href="/state-board.html?${E(qs({ s: c.n + " › " + item }))}">View ${E(name)} PDF</a></div>` : ""}
${ps.length ? pptList(ps) : fk.length ? "" : `<p class="txt">Files for ${E(name)} are being added. Need it now? <a href="/order.html">Request a custom PPT</a> or message us on WhatsApp.</p>`}
<div class="btns"><a class="btn p" href="/ready-ppts.html?${E(qs({ m: catKey(c.n, item), t: item }))}">Open in store</a></div>
<h2>More in ${E(c.n)}</h2><div class="chips">${c.it.filter(x => x !== item).map(x => `<a href="/topic/${cs}/${slug(x)}">${E(x)}</a>`).join("")}</div>`;
  return page({ url, title, desc, body, ld: [crumbLD(crumb.map(([n, u]) => [n, u || url]))], noindex: !n });
}

function catPage(D, cs) {
  const c = D.cats.find(x => slug(x.n) === cs); if (!c) return null;
  if (c.k === "states") return { redirect: "/study-material#boards" };
  const url = `/topic/${cs}`, n = D.products.filter(p => c.it.some(it => arr(p.board).includes(catKey(c.n, it)))).length + c.it.reduce((a, it) => a + itemFiles(D, c.n, it).length, 0);
  const title = fit(`${c.n} Study Material`, " – Notes, PYQ, PDF & PPT");
  const desc = clip(`${c.n} study material: ${c.it.slice(0, 8).join(", ")}. PDF, notes and PPT in Hindi & English.`, 158);
  const crumb = [["Home", "/"], ["Study Material", "/study-material"], [c.n]];
  const body = `${crumbs(crumb)}<h1>${E(c.n)} Study Material</h1><p class="sub">${E(c.d)}${n ? " · " + n + " files" : ""}</p>
<ul class="list">${c.it.map(it => { const k = itemCount(D, c.n, it), h = ITEM_PAGE[`/topic/${cs}/${slug(it)}`] || `/topic/${cs}/${slug(it)}`; return `<li><a href="${E(h)}"><b>${E(it)}</b><small>${k ? k + " files" : "Coming soon"}</small></a></li>`; }).join("")}</ul>`;
  return page({ url, title, desc, body, ld: [crumbLD(crumb.map(([n, u]) => [n, u || url]))], noindex: !n });
}

function boardPage(D, ss) {
  const st = stateOf(ss); if (!st) return null;
  const keys = Object.keys(D.files).filter(k => sbParts(k).st === st).sort();
  const nm = ALIAS[st] || st + " Board", url = `/board/${ss}`;
  const types = [...new Set(keys.map(k => sbParts(k).t))];
  const title = fit(`${nm} Books, Syllabus, PYQ & Notes`, " – Class 1 to 12");
  const desc = clip(`${nm} study material: syllabus, books & answers, previous year question papers (PYQ), model papers, practice questions and chapter-wise notes for Class 1 to 12, Hindi & English medium. PDF, Word & PPT.`, 158);
  const crumb = [["Home", "/"], ["State Boards", "/state-books.html"], [nm]];
  const groups = types.map(t => `<h2>${E(st)} Board ${E(t)}</h2><ul class="list">${keys.filter(k => sbParts(k).t === t).map(k => { const x = sbParts(k); return `<li><a href="${E(sbUrl(k))}"><b>${E(["Class " + x.c, x.sub, x.y].filter(Boolean).join(" · "))}</b><small>${E([x.m && x.m + " Medium", t].filter(Boolean).join(" · "))}</small></a></li>`; }).join("")}</ul>`).join("");
  const body = `${crumbs(crumb)}<h1>${E(nm)} — Books, Syllabus, PYQ &amp; Notes</h1>
<p class="sub">Class 1 to 12 · Hindi &amp; English medium · PDF, Word &amp; PPT</p>
<div class="btns"><a class="btn p" href="/state-board.html?${E(qs({ s: st }))}">Open ${E(st)} Board section</a>${BOARD_PAGES[st] ? BOARD_PAGES[st].map(([u, n]) => `<a class="btn" href="${E(u)}">${E(n)}</a>`).join("") : ""}</div>
${groups || `<p class="txt">${E(nm)} files are being added. <a href="/order.html">Request a PPT</a> for any chapter.</p>`}
<h2>Other boards</h2><div class="chips">${STATES.filter(x => x !== st).map(x => `<a href="/board/${slug(x)}">${E(ALIAS[x] || x)}</a>`).join("")}</div>`;
  return page({ url, title, desc, body, ld: [crumbLD(crumb.map(([n, u]) => [n, u || url]))], noindex: !keys.length });
}

function boardFilePage(D, ss, fs) {
  const st = stateOf(ss); if (!st) return null;
  const k = Object.keys(D.files).find(x => sbParts(x).st === st && sbUrl(x) === `/board/${ss}/${fs}`); if (!k) return null;
  const x = sbParts(k), v = D.files[k] || {}, nm = ALIAS[st] || st + " Board", url = sbUrl(k), t = sbTitle(k);
  const fmts = ["pdf", "word", "ppt"].filter(f => v[f]).map(f => f === "pdf" ? "PDF" : f === "word" ? "Word" : "PPT");
  const chapters = arr(v.chapters).map(c => c && c.name).filter(Boolean);
  const isPYQ = x.t === "Previous Year Questions", lvl = LEVEL_ALIAS[st] && LEVEL_ALIAS[st][x.c];   // Bihar: Matric / Inter
  const stN = ALIAS[st] ? st + " Board" : st, enM = /english/i.test(x.m || "") ? " English Medium" : "";
  const title = isPYQ ? fit(`${stN} Class ${x.c} ${x.sub} Question Paper ${x.y || ""}`.trim() + enM, ` PDF${lvl ? " (" + lvl + " PYQ)" : " (PYQ)"}`)
    : fit(t, ` – ${fmts.length ? fmts.join(", ") : "PDF"} Download`);
  const desc = isPYQ
    ? clip(`${nm} Class ${x.c}${lvl ? " (" + lvl + ")" : ""} ${x.sub} previous year question paper ${x.y || ""} PDF, ${x.m || "Hindi & English"} medium. ${v.sets ? arr(v.sets).length + " sets. " : ""}Real board exam paper (PYQ) for practice – view and download free on PPT Store.`, 158)
    : clip(`${nm} Class ${x.c} ${x.sub} ${x.t}${x.y ? " " + x.y : ""} (${x.m || "Hindi & English"} medium). ${chapters.length ? chapters.length + " chapters: " + chapters.slice(0, 4).join(", ") + ". " : ""}${v.sets ? arr(v.sets).length + " sets. " : ""}View and download online.`, 158);
  const crumb = [["Home", "/"], [nm, `/board/${ss}`], [t]];
  const sibs = Object.keys(D.files).filter(o => o !== k && sbParts(o).st === st && sbParts(o).c === x.c).slice(0, 12);
  const body = `${crumbs(crumb)}<h1>${E(t)}</h1>
<div class="facts">${[nm, "Class " + x.c, x.sub, x.t, x.y, x.m && x.m + " Medium", ...fmts].filter(Boolean).map(s => `<span>${E(s)}</span>`).join("")}</div>
<p class="txt">${E(nm)} Class ${E(x.c)} ${E(x.sub)} ${E(x.t)}${x.y ? " " + E(x.y) : ""}${x.m ? " in " + E(x.m) + " medium" : ""}. Open it online on PPT Store${fmts.length ? " in " + E(fmts.join(", ")) : ""}.</p>
${isPYQ ? `<p class="txt">Ye ${E(st)} Board ${lvl ? E(lvl) + " (Class " + E(x.c) + ")" : "Class " + E(x.c)} ${E(x.sub)} ka ${x.y ? E(x.y) + " ka " : ""}asli board exam question paper hai. Pichhle saal ke paper solve karne se exam pattern, important questions aur marks distribution samajh aata hai.</p>` : ""}
${chapters.length ? `<h2>Chapters</h2><ol style="padding-left:20px;color:var(--muted)">${chapters.map(c => `<li>${E(c)}</li>`).join("")}</ol>` : ""}
<div class="btns"><a class="btn p" href="${E(sbLink(k, v))}">Open &amp; Download</a><a class="btn" href="/board/${ss}">All ${E(nm)} files</a></div>
${sibs.length ? `<h2>More ${E(st)} Board Class ${E(x.c)}</h2><ul class="list">${sibs.map(o => { const y = sbParts(o); return `<li><a href="${E(sbUrl(o))}"><b>${E([y.sub, y.t, y.y].filter(Boolean).join(" · "))}</b><small>${E(y.m ? y.m + " Medium" : "")}</small></a></li>`; }).join("")}</ul>` : ""}`;
  return page({ url, title, desc, body, ld: [crumbLD(crumb.map(([n, u]) => [n, u || url])), { "@context": "https://schema.org", "@type": "LearningResource", name: t, url: SITE + url, educationalLevel: "Class " + x.c, inLanguage: /hindi/i.test(x.m) ? "hi" : "en", learningResourceType: x.t, about: x.sub, provider: { "@type": "Organization", name: "PPT Store", url: SITE } }] });
}

/* /open/<category>/<item>: menu item me upload hui file seedhe viewer me kholo (state-board.html jaisa link) */
function openItem(D, cs, is) {
  const c = D.cats.find(x => slug(x.n) === cs), item = c && c.it.find(x => slug(x) === is); if (!item) return null;
  const st = c.n + " › " + item, keys = itemFiles(D, c.n, item).sort(), FK = [["PDF", "pdf"], ["Word", "word"], ["PPT", "ppt"]];
  const k = keys.find(x => FK.some(([, f]) => (D.files[x] || {})[f])) || "";
  if (!k) return { redirect: "/state-board.html?" + qs({ s: st }), code: 302 };
  const v = D.files[k], f = FK.find(([, f]) => v[f])[0], p = k.split("|");
  if (p[1] === "Seedha file") return { redirect: "/view.html?" + qs({ s: st, t: p[1], c: 0, m: "-", sub: "-", f }), code: 302 };
  return { redirect: "/view.html?" + qs({ s: st, t: p[1], c: p[2], m: p[3], sub: p[4], f, y: p[5], one: keys.length === 1 ? 1 : "" }), code: 302 };
}

/* /open/file?s=Bihar&t=Syllabus&c=10&m=Hindi&sub=Maths: State Books ki upload hui file seedhe viewer me */
function openFile(D, q) {
  const s = String(q.s || ""), t = String(q.t || ""), c = String(q.c || ""), m = String(q.m || ""), sub = String(q.sub || "").toLowerCase();
  const FK = [["PDF", "pdf"], ["Word", "word"], ["PPT", "ppt"]];
  const ok = k => { const x = sbParts(k); return x.st === s && x.t === t && String(x.c) === c && String(x.sub || "").toLowerCase() === sub; };
  const keys = Object.keys(D.files).filter(k => ok(k) && FK.some(([, f]) => (D.files[k] || {})[f])).sort((a, b) => (sbParts(b).m === m) - (sbParts(a).m === m));
  if (!keys.length) return { redirect: "/state-board.html?" + qs({ s, t, c, m }), code: 302 };
  const k = keys[0], x = sbParts(k), f = FK.find(([, f]) => D.files[k][f])[0];
  return { redirect: "/view.html?" + qs({ s: x.st, t: x.t, c: x.c, m: x.m, sub: x.sub, f, y: x.y }), code: 302 };
}

function hubPage(D) {
  const url = "/study-material";
  const title = "Study Material – State Boards, CBSE, NCERT, JEE, NEET Notes, PYQ & PPT | PPT Store";
  const desc = "Free and paid study material: State Board books, syllabus and previous year papers, CBSE sample papers, NCERT solutions, JEE, NEET, CUET notes, PYQ, practice questions and PPTs in Hindi & English.";
  const recent = D.products.slice().sort((a, b) => (b.added || 0) - (a.added || 0)).slice(0, 24);
  const body = `${crumbs([["Home", "/"], ["Study Material"]])}<h1>Study Material — Notes, PYQ, Papers &amp; PPT</h1>
<p class="sub">Every board and exam in one place · Hindi &amp; English</p>
<div class="btns"><a class="btn p" href="/cbse-date-sheet-2027.html">CBSE Date Sheet 2027 – Class 10 &amp; 12</a></div>
<h2 id="boards">State Boards</h2><div class="chips">${STATES.map(x => `<a href="/board/${slug(x)}">${E(ALIAS[x] || x)}</a>`).join("")}</div>
${D.cats.filter(c => c.k !== "states" && c.it.length).map(c => `<h2>${E(c.n)}</h2><div class="chips">${c.it.map(it => { const u = `/topic/${slug(c.n)}/${slug(it)}`; return `<a href="${E(ITEM_PAGE[u] || u)}">${E(it)}</a>`; }).join("")}</div>`).join("")}
${recent.length ? `<h2>Latest files</h2>${pptList(recent)}` : ""}`;
  return page({ url, title, desc, body, ld: [crumbLD([["Home", "/"], ["Study Material", url]])] });
}

function sitemap(D) {
  const today = new Date().toISOString().slice(0, 10), u = [];
  const add = (loc, pr, lm) => u.push(`<url><loc>${E(SITE + "/" + loc.replace(/^\//, ""))}</loc><lastmod>${lm || today}</lastmod><priority>${pr}</priority></url>`);
  STATIC.forEach(([l, p]) => add(l, p));
  STATES.forEach(st => { if (Object.keys(D.files).some(k => sbParts(k).st === st)) add("/board/" + slug(st), "0.8"); });
  Object.keys(D.files).filter(k => !sbParts(k).st.includes(" › ")).forEach(k => add(sbUrl(k), "0.6"));
  D.cats.forEach(c => { if (c.k === "states") return; let any = 0; c.it.forEach(it => { if (itemCount(D, c.n, it)) { any = 1; const u = `/topic/${slug(c.n)}/${slug(it)}`; if (!ITEM_PAGE[u]) add(u, "0.7"); } }); if (any) add(`/topic/${slug(c.n)}`, "0.7"); });
  D.products.forEach(p => add(pptUrl(p), "0.7", p.added ? new Date(p.added).toISOString().slice(0, 10) : ""));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${u.join("\n")}\n</urlset>\n`;
}

module.exports = async (req, res) => {
  const q = req.query || {}, r = String(q.r || ""), a = String(q.a || "").toLowerCase(), b = String(q.b || "").toLowerCase();
  const D = await data();
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  if (r === "sitemap") { res.setHeader("Content-Type", "application/xml; charset=utf-8"); return res.status(200).send(sitemap(D)); }
  let out = null;
  if (r === "hub") out = hubPage(D);
  else if (r === "ppt") out = pptPage(D, (/^(\d+)/.exec(a) || [])[1]);
  else if (r === "topic") out = b ? topicPage(D, a, b) : catPage(D, a);
  else if (r === "file") out = openFile(D, q);
  else if (r === "open") out = openItem(D, a, b);
  else if (r === "board") out = b ? boardFilePage(D, a, b) : boardPage(D, a);
  if (out && out.redirect) { if (out.code === 302) res.setHeader("Cache-Control", "public, s-maxage=600"); res.setHeader("Location", out.redirect); return res.status(out.code || 301).end(); }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (!out) { res.setHeader("Cache-Control", "public, s-maxage=300"); return res.status(404).send(page({ url: "/study-material", title: "Not found | PPT Store", desc: "This page was not found.", body: `<h1>Page not found</h1><p class="txt">It may have moved. See <a href="/study-material">all study material</a>.</p>`, noindex: true })); }
  return res.status(200).send(out);
};
module.exports._test = { slug, catKey, sbUrl, sbTitle, pptPage, topicPage, catPage, boardPage, boardFilePage, hubPage, sitemap, openItem, openFile, setData: d => { memo = { t: Date.now(), ...d }; } };
