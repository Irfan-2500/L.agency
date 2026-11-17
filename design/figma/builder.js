/* Figma-side builder. Executed inside use_figma via AsyncFunction('figma','P', src).
   P = { pageId, screens:[{ name, section, sx, sy, sw, sh, fx, fy, root, hashes:{imgIndex:hash} }] } */
let made = 0, errs = [];
const page = await figma.getNodeByIdAsync(P.pageId);
await figma.setCurrentPageAsync(page);
const AV = {};
for (const f of await figma.listAvailableFontsAsync()) (AV[f.fontName.family] ||= new Set()).add(f.fontName.style);
const WN = { 100: ['Thin'], 200: ['ExtraLight', 'Extra Light'], 300: ['Light'], 400: ['Regular'], 500: ['Medium'], 600: ['SemiBold', 'Semi Bold'], 700: ['Bold'], 800: ['ExtraBold', 'Extra Bold'], 900: ['Black'] };
const fontCache = {};
function pickFont(fam, wt, it) {
  if (!AV[fam]) fam = 'Inter';
  const key = fam + wt + it; if (fontCache[key]) return fontCache[key];
  const styles = AV[fam]; let best = null, bd = 1e9;
  for (const w of Object.keys(WN)) for (const nm of WN[w]) {
    const cands = it ? [nm === 'Regular' ? 'Italic' : nm + ' Italic'] : [nm];
    for (const c of cands) if (styles.has(c)) { const d = Math.abs(w - wt) + (w < wt ? 1 : 0); if (d < bd) { bd = d; best = c; } }
  }
  if (!best) best = styles.has('Regular') ? 'Regular' : [...styles][0];
  return (fontCache[key] = { family: fam, style: best });
}
const DEVA = /[ऀ-ॿ]/; const NODEVA = new Set(['Space Grotesk', 'Plus Jakarta Sans', 'Inter', 'Roboto Mono']);
// collect & load fonts
const need = new Map();
function addF(st, s) { const f = pickFont(st.f, st.wt, st.it); need.set(f.family + '|' + f.style, f); if (s && DEVA.test(s) && NODEVA.has(f.family)) { const h = pickFont('Hind', st.wt, 0); need.set(h.family + '|' + h.style, h); } }
function scan(n) { if (n.k === 'T') { addF(n.st, n.s); (n.rs || []).forEach(r => addF(r[2], n.s)); } (n.ch || []).forEach(scan); }
P.screens.forEach(s => scan(s.root));
await Promise.all([...need.values()].map(f => figma.loadFontAsync(f)));

const rgb = c => ({ r: c[0] / 255, g: c[1] / 255, b: c[2] / 255 });
function gradT(a, w, h) {
  const rad = a * Math.PI / 180, dx = Math.sin(rad), dy = -Math.cos(rad);
  const L = Math.abs(w * dx) + Math.abs(h * dy);
  const sx = (w / 2 - dx * L / 2) / w, sy = (h / 2 - dy * L / 2) / h, ex = (w / 2 + dx * L / 2) / w, ey = (h / 2 + dy * L / 2) / h;
  const ux = ex - sx, uy = ey - sy; const vx = -uy * (h ? w / h : 1) * 0 - uy, vy = ux; // perpendicular
  const ox = sx - 0.5 * vx, oy = sy - 0.5 * vy;
  const det = ux * vy - vx * uy || 1e-6;
  const i00 = vy / det, i01 = -vx / det, i10 = -uy / det, i11 = ux / det;
  return [[i00, i01, -(i00 * ox + i01 * oy)], [i10, i11, -(i10 * ox + i11 * oy)]];
}
function stops(st) { return st.map(s => ({ position: s[0], color: { r: s[1] / 255, g: s[2] / 255, b: s[3] / 255, a: s[4] } })); }
function paint(p, w, h, hashes) {
  if (p.t === 's') return { type: 'SOLID', color: rgb(p.c), opacity: p.c[3] };
  if (p.t === 'l') return { type: 'GRADIENT_LINEAR', gradientTransform: gradT(p.a, w, h), gradientStops: stops(p.st) };
  if (p.t === 'r') return { type: 'GRADIENT_RADIAL', gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: stops(p.st) };
  if (p.t === 'i') { const hsh = hashes[p.i]; return hsh ? { type: 'IMAGE', imageHash: hsh, scaleMode: p.f || 'FILL' } : null; }
  return null;
}
function applyBox(f, n, hashes) {
  try { if (n.p) f.fills = n.p.map(p => paint(p, n.w, n.h, hashes)).filter(Boolean); else f.fills = []; } catch (e) { errs.push('fill ' + String(e).slice(0, 80)); f.fills = []; }
  if (n.r) { if (Array.isArray(n.r)) { f.topLeftRadius = n.r[0]; f.topRightRadius = n.r[1]; f.bottomRightRadius = n.r[2]; f.bottomLeftRadius = n.r[3]; } else f.cornerRadius = n.r; }
  if (n.b) {
    f.strokes = [{ type: 'SOLID', color: rgb(n.b.c), opacity: n.b.c[3] }]; f.strokeAlign = 'INSIDE';
    if (Array.isArray(n.b.w)) { f.strokeTopWeight = n.b.w[0]; f.strokeRightWeight = n.b.w[1]; f.strokeBottomWeight = n.b.w[2]; f.strokeLeftWeight = n.b.w[3]; } else f.strokeWeight = n.b.w;
    if (n.b.d) f.dashPattern = [5, 4];
  }
  const fx = [];
  (n.sh || []).forEach(s => fx.push({ type: s.i ? 'INNER_SHADOW' : 'DROP_SHADOW', color: { ...rgb(s.c), a: s.c[3] }, offset: { x: s.x, y: s.y }, radius: s.b, spread: s.s, visible: true, blendMode: 'NORMAL' }));
  if (n.bb) fx.push({ type: 'BACKGROUND_BLUR', radius: n.bb, visible: true });
  if (fx.length) { try { f.effects = fx; } catch (e) { errs.push('fx ' + String(e).slice(0, 80)); } }
  if (n.o !== undefined && n.o < 1) f.opacity = n.o;
}
function tfill(st) {
  if (st.g) { const p = paint(st.g, 100, 30); return [p]; }
  return [{ type: 'SOLID', color: rgb(st.c), opacity: st.c[3] }];
}
function mkText(n, px, py) {
  const t = figma.createText();
  const st = n.st; const f = pickFont(st.f, st.wt, st.it);
  t.fontName = f; t.characters = n.s; t.fontSize = Math.max(1, st.sz);
  t.lineHeight = st.lh ? { unit: 'PIXELS', value: st.lh } : { unit: 'AUTO' };
  if (st.ls) t.letterSpacing = { unit: 'PIXELS', value: st.ls };
  t.fills = tfill(st);
  if (st.u) t.textDecoration = st.u === 1 ? 'UNDERLINE' : 'STRIKETHROUGH';
  t.textAlignHorizontal = { C: 'CENTER', R: 'RIGHT', J: 'JUSTIFIED' }[n.al] || 'LEFT';
  for (const [b, e, s] of (n.rs || [])) {
    if (e <= b) continue;
    try {
      t.setRangeFontName(b, e, pickFont(s.f, s.wt, s.it)); t.setRangeFontSize(b, e, Math.max(1, s.sz)); t.setRangeFills(b, e, tfill(s));
      if (s.u) t.setRangeTextDecoration(b, e, s.u === 1 ? 'UNDERLINE' : 'STRIKETHROUGH');
      if (s.ls) t.setRangeLetterSpacing(b, e, { unit: 'PIXELS', value: s.ls });
    } catch (e2) { }
  }
  if (DEVA.test(n.s)) {
    const re = /[ऀ-ॿ][ऀ-ॿ\s.,!?'"()\-–—:;।॥0-9]*/g; let m;
    while ((m = re.exec(n.s))) { const b = m.index, e = b + m[0].replace(/\s+$/, '').length; const cur = t.getRangeFontName(b, b + 1); if (cur !== figma.mixed && NODEVA.has(cur.family)) { const wt = (Object.entries(WN).find(([w, ns]) => ns.includes(cur.style.replace(' Italic', '').replace('Italic', 'Regular'))) || [400])[0]; t.setRangeFontName(b, e, pickFont('Hind', +wt, 0)); } }
  }
  t.name = n.n || n.s.slice(0, 40);
  if (n.cut) { t.textAutoResize = 'NONE'; t.resize(Math.max(1, n.w), Math.max(1, n.h)); t.textTruncation = 'ENDING'; t.x = n.x - px; t.y = n.y - py; }
  else if (n.wr) { t.textAutoResize = 'HEIGHT'; t.resize(Math.max(1, n.w + 3), Math.max(1, n.h)); t.x = n.x - px - (n.al === 'C' ? 1.5 : n.al === 'R' ? 3 : 0); t.y = n.y - py; }
  else { t.textAutoResize = 'WIDTH_AND_HEIGHT'; const cx = n.al === 'C' ? n.x + n.w / 2 - t.width / 2 : n.al === 'R' ? n.x + n.w - t.width : n.x; t.x = cx - px; t.y = n.y - py; }
  return t;
}
function build(n, parent, px, py, hashes) {
  let node;
  try {
    if (n.k === 'F') {
      node = figma.createFrame(); node.name = n.n; node.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
      node.clipsContent = !!n.c; applyBox(node, n, hashes);
      parent.appendChild(node); node.x = n.x - px; node.y = n.y - py; made++;
      for (const c of (n.ch || [])) build(c, node, n.x, n.y, hashes);
      return node;
    }
    if (n.k === 'T') { node = mkText(n, px, py); parent.appendChild(node); made++; return node; }
    if (n.k === 'I') {
      node = figma.createRectangle(); node.name = n.n; node.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
      const h = hashes[n.i]; node.fills = h ? [{ type: 'IMAGE', imageHash: h, scaleMode: n.f || 'FILL' }] : [{ type: 'SOLID', color: { r: 0.85, g: 0.86, b: 0.9 } }];
      if (n.r) { if (Array.isArray(n.r)) { node.topLeftRadius = n.r[0]; node.topRightRadius = n.r[1]; node.bottomRightRadius = n.r[2]; node.bottomLeftRadius = n.r[3]; } else node.cornerRadius = n.r; }
      if (n.b) { node.strokes = [{ type: 'SOLID', color: rgb(n.b.c), opacity: n.b.c[3] }]; node.strokeAlign = 'INSIDE'; node.strokeWeight = Array.isArray(n.b.w) ? Math.max(...n.b.w) : n.b.w; }
      if (n.o !== undefined) node.opacity = n.o;
      parent.appendChild(node); node.x = n.x - px; node.y = n.y - py; made++; return node;
    }
    if (n.k === 'S') {
      try { node = figma.createNodeFromSvg(n.svg); } catch (e) { node = figma.createFrame(); node.fills = []; }
      node.name = n.n.startsWith('svg') ? 'icon' : n.n; node.clipsContent = false;
      try { if (Math.abs(node.width - n.w) > 0.5 || Math.abs(node.height - n.h) > 0.5) node.resize(Math.max(0.01, n.w), Math.max(0.01, n.h)); } catch (e) { }
      if (n.o !== undefined) node.opacity = n.o;
      parent.appendChild(node); node.x = n.x - px; node.y = n.y - py; made++; return node;
    }
  } catch (e) { errs.push((n.n || n.k) + ': ' + String(e).slice(0, 120)); if (node && !node.parent) node.remove(); }
}
const out = [];
for (const s of P.screens) {
  let sec = page.children.find(c => c.type === 'SECTION' && c.name === s.section);
  if (!sec) { sec = figma.createSection(); sec.name = s.section; page.appendChild(sec); sec.x = s.sx; sec.y = s.sy; sec.resizeWithoutConstraints(s.sw, s.sh); }
  const old = sec.children.find(c => c.name === s.name); if (old) old.remove();
  const root = build(s.root, sec, -s.fx + 0, -s.fy + 0, s.hashes);
  root.name = s.name; root.clipsContent = true; root.x = s.fx; root.y = s.fy;
  out.push({ name: s.name, id: root.id, section: sec.id });
}
return { out, made, errs: errs.slice(0, 15), nErr: errs.length };
