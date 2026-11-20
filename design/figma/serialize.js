/* In-page DOM → compact layout tree for the Figma builder.
   Runs inside the browser (page.evaluate). Returns { root, images, canvases }.
   Node kinds: F frame, T text, I image, S svg.  Coordinates are absolute page px. */
(() => {
  const R = v => Math.round(v * 10) / 10;
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = 1;
  const cx = cvs.getContext('2d', { willReadFrequently: true });
  const colCache = new Map();
  function color(c) {
    if (!c || c === 'transparent' || c === 'none') return null;
    if (colCache.has(c)) return colCache.get(c);
    let out = null;
    const m = c.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/);
    if (m) out = [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    else {
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data; out = [d[0], d[1], d[2], R(d[3] / 255)];
    }
    if (out && out[3] === 0) out = null;
    if (out) out = [Math.round(out[0]), Math.round(out[1]), Math.round(out[2]), R(out[3] * 100) / 100];
    colCache.set(c, out); return out;
  }
  function splitTop(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
  function px(v, ref) { if (!v) return 0; if (v.endsWith('%')) return parseFloat(v) / 100 * ref; return parseFloat(v) || 0; }

  const images = []; const imgIdx = new Map(); const canvases = [];
  function img(src) { if (!src) return -1; if (!imgIdx.has(src)) { imgIdx.set(src, images.length); images.push(src); } return imgIdx.get(src); }

  function gradient(g, w, h) {
    const lin = g.match(/^(repeating-)?linear-gradient\((.*)\)$/s);
    const rad = g.match(/^(repeating-)?radial-gradient\((.*)\)$/s);
    const body = (lin || rad) ? (lin || rad)[2] : null; if (!body) return null;
    let parts = splitTop(body), ang = 180;
    if (lin) {
      const p0 = parts[0];
      if (/deg|turn|rad/.test(p0) && !/rgb|#|color/.test(p0)) { ang = p0.endsWith('turn') ? parseFloat(p0) * 360 : p0.endsWith('rad') ? parseFloat(p0) * 57.2958 : parseFloat(p0); parts = parts.slice(1); }
      else if (p0.startsWith('to ')) {
        const t = p0.slice(3); const map = { top: 0, right: 90, bottom: 180, left: 270, 'top right': 45, 'right top': 45, 'bottom right': 135, 'right bottom': 135, 'bottom left': 225, 'left bottom': 225, 'top left': 315, 'left top': 315 };
        ang = map[t] ?? 180; parts = parts.slice(1);
      }
    } else if (!/^(rgb|#|color|hsl|transparent)/.test(parts[0])) parts = parts.slice(1);
    const stops = [];
    for (const p of parts) {
      const m = p.match(/^(rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]+|[a-z]+)\s*(.*)$/i); if (!m) continue;
      const c = color(m[1]) || [0, 0, 0, 0];
      const poss = m[2].trim() ? m[2].trim().split(/\s+/) : [];
      if (!poss.length) stops.push([null, ...c]);
      for (const q of poss) stops.push([q.endsWith('%') ? parseFloat(q) / 100 : q.endsWith('px') ? parseFloat(q) / (lin ? Math.max(1, Math.abs(w * Math.sin(ang * Math.PI / 180)) + Math.abs(h * Math.cos(ang * Math.PI / 180))) : Math.max(w, h) / 2) : null, ...c]);
    }
    if (stops.length < 2) return null;
    if (stops[0][0] == null) stops[0][0] = 0; if (stops[stops.length - 1][0] == null) stops[stops.length - 1][0] = 1;
    for (let i = 1; i < stops.length - 1; i++) if (stops[i][0] == null) { let j = i; while (stops[j][0] == null) j++; const a = stops[i - 1][0], b = stops[j][0]; for (let k = i; k < j; k++) stops[k][0] = a + (b - a) * (k - i + 1) / (j - i + 1); }
    stops.forEach(s => s[0] = R(Math.min(1, Math.max(0, s[0])) * 1000) / 1000);
    return lin ? { t: 'l', a: R(ang), st: stops } : { t: 'r', st: stops };
  }

  const clipText = cs => /text/.test(cs.webkitBackgroundClip || '') || /text/.test(cs.backgroundClip || '');
  function paints(cs, w, h, el) {
    const out = [];
    if (clipText(cs)) return out;
    const bc = color(cs.backgroundColor); if (bc) out.push({ t: 's', c: bc });
    const bi = cs.backgroundImage;
    if (bi && bi !== 'none') {
      const layers = splitTop(bi).reverse();
      for (const L of layers) {
        if (L.startsWith('url(')) {
          const u = L.slice(4, -1).replace(/^["']|["']$/g, '');
          const size = cs.backgroundSize; out.push({ t: 'i', i: img(u), f: /contain/.test(size) ? 'FIT' : /^\d/.test(size) && !/cover/.test(size) && cs.backgroundRepeat !== 'no-repeat' ? 'TILE' : 'FILL' });
        } else if (/conic-gradient/.test(L) && el) {
          if (!el.hasAttribute('data-fig-cap')) { el.setAttribute('data-fig-cap', canvases.length); el.setAttribute('data-fig-bgonly', '1'); canvases.push(canvases.length); }
          out.push({ t: 'i', i: img('cap:' + el.getAttribute('data-fig-cap')), f: 'FILL' });
        } else { const g = gradient(L, w, h); if (g) out.push(g); }
      }
    }
    return out;
  }
  function shadows(cs) {
    const s = cs.boxShadow; if (!s || s === 'none') return null;
    const out = [];
    for (const part of splitTop(s)) {
      const inset = /\binset\b/.test(part); const p = part.replace(/\binset\b/, '').trim();
      const cm = p.match(/(rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]+)/i); const c = color(cm ? cm[1] : cs.color); if (!c) continue;
      const nums = p.replace(cm ? cm[1] : '', '').trim().split(/\s+/).map(parseFloat);
      out.push({ i: inset ? 1 : 0, c, x: nums[0] || 0, y: nums[1] || 0, b: nums[2] || 0, s: nums[3] || 0 });
    }
    return out.length ? out : null;
  }
  function radii(cs, w, h) {
    const r = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map(k => { const v = cs[k].split(' ')[0]; return R(Math.min(px(v, Math.min(w, h)), Math.min(w, h) / 2)); });
    if (r.every(v => v === 0)) return 0; if (r.every(v => v === r[0])) return r[0]; return r;
  }
  function border(cs) {
    const sides = ['Top', 'Right', 'Bottom', 'Left'];
    const ws = sides.map(s => cs['border' + s + 'Style'] === 'none' || cs['border' + s + 'Style'] === 'hidden' ? 0 : parseFloat(cs['border' + s + 'Width']) || 0);
    if (ws.every(v => v === 0)) return null;
    let c = null; for (let i = 0; i < 4; i++) if (ws[i]) { c = color(cs['border' + sides[i] + 'Color']); if (c) break; }
    if (!c) return null;
    const dash = sides.some((s, i) => ws[i] && /dash|dot/.test(cs['border' + s + 'Style']));
    return { w: ws.every(v => v === ws[0]) ? ws[0] : ws, c, d: dash ? 1 : 0 };
  }
  const FAM = ['Space Grotesk', 'Plus Jakarta Sans', 'Hind', 'Poppins', 'Inter'];
  function family(cs) {
    for (let f of cs.fontFamily.split(',')) { f = f.trim().replace(/^["']|["']$/g, ''); if (FAM.includes(f)) return f; if (/mono|consol|menlo/i.test(f)) return 'Roboto Mono'; if (/system-ui|apple|segoe|roboto|helvetica|arial|sans-serif/i.test(f)) return 'Inter'; }
    return 'Inter';
  }
  function tstyle(cs) {
    const sz = parseFloat(cs.fontSize);
    const lh = cs.lineHeight === 'normal' ? 0 : R(parseFloat(cs.lineHeight));
    const ls = cs.letterSpacing === 'normal' ? 0 : R(parseFloat(cs.letterSpacing));
    let c = color(cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color);
    let grad = null;
    if ((!c || c[3] === 0) && /text/.test(cs.webkitBackgroundClip || cs.backgroundClip || '')) { const g = gradient(splitTop(cs.backgroundImage)[0] || '', 100, 30); if (g) grad = g; }
    if (!c) c = [0, 0, 0, grad ? 1 : 0];
    return { f: family(cs), wt: +cs.fontWeight || 400, sz: R(sz), lh, ls, c, g: grad, it: cs.fontStyle === 'italic' ? 1 : 0, u: /underline/.test(cs.textDecorationLine) ? 1 : /line-through/.test(cs.textDecorationLine) ? 2 : 0, tt: cs.textTransform };
  }
  function xform(s, tt) { if (tt === 'uppercase') return s.toUpperCase(); if (tt === 'lowercase') return s.toLowerCase(); if (tt === 'capitalize') return s.replace(/(^|\s)(\S)/g, (a, b, c) => b + c.toUpperCase()); return s; }

  const INLINE = new Set(['SPAN', 'B', 'STRONG', 'EM', 'I', 'A', 'SMALL', 'BR', 'SUP', 'SUB', 'U', 'MARK', 'CODE', 'ABBR', 'LABEL', 'S', 'DEL', 'INS', 'Q', 'CITE', 'TIME', 'BDI', 'WBR']);
  const LAND = new Set(['HEADER', 'NAV', 'MAIN', 'SECTION', 'FOOTER', 'ASIDE', 'FORM', 'ARTICLE', 'DIALOG', 'TABLE', 'UL', 'OL']);
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META', 'HEAD', 'TITLE', 'SOURCE', 'TRACK', 'IFRAME']);

  function visible(el, cs) { return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.visibility !== 'collapse' && parseFloat(cs.opacity) > 0.01; }
  function hasBox(cs) { return !!((!clipText(cs) && (color(cs.backgroundColor) || (cs.backgroundImage && cs.backgroundImage !== 'none'))) || border(cs) || (cs.boxShadow && cs.boxShadow !== 'none')); }

  // inline element with no own visual => can be part of a text run
  function plainInline(el, cs) { return INLINE.has(el.tagName) && /^inline/.test(cs.display) && cs.display !== 'inline-block' && cs.display !== 'inline-flex' && cs.display !== 'inline-grid' && !hasBox(cs) && cs.position !== 'absolute' && cs.position !== 'fixed'; }
  function isTextBlock(el) {
    let any = false;
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { if (n.data.trim()) any = true; continue; }
      if (n.nodeType !== 1) continue;
      const cs = getComputedStyle(n);
      if (cs.display === 'none') continue;
      if (n.tagName === 'BR') continue;
      if (!plainInline(n, cs)) return false;
      if (!isTextBlock(n)) return false;
      if (n.textContent.trim()) any = true;
    }
    return any;
  }
  function collectRuns(el, runs, ws) {
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { runs.push({ s: n.data, el: n.parentElement }); continue; }
      if (n.nodeType !== 1) continue;
      const cs = getComputedStyle(n); if (cs.display === 'none') continue;
      if (n.tagName === 'BR') { runs.push({ s: '\n', el: n.parentElement, br: 1 }); continue; }
      collectRuns(n, runs, ws);
    }
  }
  function lineInfo(range) {
    const rects = [...range.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5);
    const tops = []; for (const r of rects) if (!tops.some(t => Math.abs(t - r.top) < r.height * 0.5)) tops.push(r.top);
    return { n: Math.max(1, tops.length), first: rects[0] };
  }
  function makeText(el, range, runsIn, sy) {
    const cs = getComputedStyle(el);
    const pre = /pre/.test(cs.whiteSpace);
    // build runs with collapsed whitespace
    let txt = '', segs = [];
    for (const r of runsIn) {
      let s = r.s;
      if (!r.br && !pre) s = s.replace(/[\s ]*\n[\s ]*/g, ' ').replace(/[ \t\r\f]+/g, ' ');
      const rcs = getComputedStyle(r.el);
      s = xform(s, rcs.textTransform);
      if (!pre && !r.br && txt.endsWith(' ') && s.startsWith(' ')) s = s.slice(1);
      if (!pre && !r.br && (txt === '' || txt.endsWith('\n')) ) s = s.replace(/^ +/, '');
      if (!s) continue;
      if (r.br && txt.endsWith(' ')) { txt = txt.slice(0, -1); if (segs.length) segs[segs.length - 1].e = txt.length; }
      segs.push({ b: txt.length, e: txt.length + s.length, st: tstyle(rcs) });
      txt += s;
    }
    const trimmed = txt.replace(/\s+$/, ''); if (!trimmed.trim()) return null;
    segs = segs.filter(s => s.b < trimmed.length).map(s => ({ ...s, e: Math.min(s.e, trimmed.length) }));
    const box = range.getBoundingClientRect(); if (box.width < 0.5 || box.height < 0.5) return null;
    const li = lineInfo(range); const base = tstyle(cs);
    const lh = base.lh || base.sz * 1.25;
    const fl = li.first || box;
    let y = fl.top - (lh - fl.height) / 2 + sy;
    const node = { k: 'T', x: R(box.left), y: R(y), w: R(box.width), h: R(Math.max(box.height, lh * li.n)), s: trimmed, st: base, al: { center: 'C', right: 'R', end: 'R', justify: 'J' }[cs.textAlign] || 'L', wr: li.n > 1 || /\n/.test(trimmed) ? 1 : 0 };
    // style ranges that differ from base
    const key = s => JSON.stringify([s.f, s.wt, s.sz, s.c, s.it, s.u, s.ls, s.g]);
    const bk = key(base); const rs = segs.filter(s => key(s.st) !== bk).map(s => [s.b, s.e, s.st]);
    if (rs.length) node.rs = rs;
    node.n = trimmed.slice(0, 40);
    return node;
  }

  function svgMarkup(el, cs) {
    const clone = el.cloneNode(true);
    // expand <use>
    clone.querySelectorAll('use').forEach(u => {
      const href = u.getAttribute('href') || u.getAttribute('xlink:href'); const sym = href && document.querySelector(href);
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      if (sym) { for (const c of sym.childNodes) g.appendChild(c.cloneNode(true)); if (sym.getAttribute('viewBox') && !clone.getAttribute('viewBox')) clone.setAttribute('viewBox', sym.getAttribute('viewBox')); }
      u.replaceWith(g);
    });
    // inline computed presentation on original-mapped elements
    const origs = [el, ...el.querySelectorAll('*')]; const clones = [clone, ...clone.querySelectorAll('*')];
    const props = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-opacity', 'stroke-opacity', 'opacity', 'fill-rule'];
    const rootCs = cs;
    const resolve = (v, ccs) => v === 'currentcolor' || v === 'currentColor' ? ccs.color : v;
    if (origs.length === clones.length) {
      origs.forEach((o, i) => { const ocs = getComputedStyle(o); props.forEach(p => { let v = ocs.getPropertyValue(p); if (!v) return; v = resolve(v, ocs); if (/^url/.test(v)) return; clones[i].setAttribute(p, v); }); });
    } else {
      props.forEach(p => { let v = rootCs.getPropertyValue(p); if (!v) return; v = resolve(v, rootCs); clone.setAttribute(p, v); });
    }
    clone.querySelectorAll('*').forEach(n => { for (const a of [...n.attributes]) if (a.value === 'currentColor' || a.value === 'currentcolor') n.setAttribute(a.name, rootCs.color); });
    const r = el.getBoundingClientRect();
    clone.setAttribute('width', R(r.width)); clone.setAttribute('height', R(r.height));
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.removeAttribute('class'); clone.removeAttribute('style');
    if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${R(r.width)} ${R(r.height)}`);
    return clone.outerHTML.replace(/\s+/g, ' ');
  }

  let count = 0;
  function nameOf(el) {
    if (el.id) return '#' + el.id;
    const cl = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(c => c && !/^(on|active|show|open|in|vis|reveal|is-)/.test(c))[0] : '';
    const t = el.tagName.toLowerCase();
    return cl ? t + '.' + cl : t;
  }

  function walk(el, out, sy, depth) {
    if (SKIP.has(el.tagName)) return;
    const cs = getComputedStyle(el);
    if (!visible(el, cs)) return;
    const r = el.getBoundingClientRect();
    const tag = el.tagName;
    const op = parseFloat(cs.opacity);
    if (tag === 'svg' || el instanceof SVGSVGElement) {
      if (r.width < 0.5 || r.height < 0.5) return;
      const chart = [...el.querySelectorAll('*')].some(n => { const c = getComputedStyle(n); return (c.strokeDasharray && c.strokeDasharray !== 'none') || /url\(/.test(c.fill + c.stroke) || n.tagName === 'linearGradient' || n.tagName === 'text'; });
      if (chart) { el.setAttribute('data-fig-cap', canvases.length); out.push({ k: 'I', n: 'chart (image)', x: R(r.left), y: R(r.top + sy), w: R(r.width), h: R(r.height), i: img('cap:' + canvases.length), f: 'FILL' }); canvases.push(canvases.length); count++; return; }
      out.push({ k: 'S', n: nameOf(el), x: R(r.left), y: R(r.top + sy), w: R(r.width), h: R(r.height), svg: svgMarkup(el, cs), o: op < 1 ? op : undefined }); count++; return;
    }
    if (el instanceof SVGElement) return;
    if (tag === 'IMG' || tag === 'VIDEO' || tag === 'CANVAS' || false) {
      if (r.width < 0.5 || r.height < 0.5) return;
      const node = { k: 'I', n: nameOf(el), x: R(r.left), y: R(r.top + sy), w: R(r.width), h: R(r.height), r: radii(cs, r.width, r.height), o: op < 1 ? op : undefined, f: cs.objectFit === 'contain' ? 'FIT' : 'FILL' };
      if (tag === 'IMG') node.i = img(el.currentSrc || el.src);
      else if (tag === 'VIDEO' && el.poster) node.i = img(el.poster);
      else { el.setAttribute('data-fig-cap', canvases.length); node.i = img('cap:' + canvases.length); canvases.push(canvases.length); }
      const b = border(cs); if (b) node.b = b;
      out.push(node); count++; return;
    }
    const w = r.width, h = r.height;
    const isRoot = depth === 0;
    const isForm = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON';
    const clip = cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
    const childEls = [...el.children].filter(c => !SKIP.has(c.tagName));
    const flexy = /flex|grid/.test(cs.display) && childEls.length >= 2;
    const keep = isRoot || hasBox(cs) || isForm || (clip && el.scrollHeight >= 0 && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) || LAND.has(tag) || op < 1 || flexy || depth === 1;
    let node = null, target = out;
    if (keep && w > 0.5 && h > 0.5) {
      node = { k: 'F', n: nameOf(el), x: R(r.left), y: R(r.top + sy), w: R(w), h: R(h) };
      const p = paints(cs, w, h, el); if (p.length) node.p = p;
      const rd = radii(cs, w, h); if (rd) node.r = rd;
      const b = border(cs); if (b) node.b = b;
      const sh = shadows(cs); if (sh) node.sh = sh;
      if (op < 1) node.o = op;
      if (clip) node.c = 1;
      const bf = cs.backdropFilter && cs.backdropFilter !== 'none' ? parseFloat((cs.backdropFilter.match(/blur\(([\d.]+)px/) || [])[1]) : 0; if (bf) node.bb = bf;
      node.ch = []; target = node.ch; out.push(node); count++;
    } else if (keep && clip) return; // zero-size clipped container
    // form control text
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      const type = (el.type || '').toLowerCase();
      if (type === 'checkbox' || type === 'radio') {
        if (node) { node.r = type === 'radio' ? R(w / 2) : node.r || 3; if (!node.b) node.b = { w: 1.5, c: [120, 120, 130, 1] }; if (el.checked) node.p = [{ t: 's', c: color(cs.accentColor) || [37, 99, 235, 1] }]; }
        return;
      }
      if (type === 'range' || type === 'file' || type === 'hidden' || type === 'color') return;
      let val = tag === 'SELECT' ? (el.options[el.selectedIndex] || {}).text || '' : el.value;
      let ph = false; if (!val && el.placeholder) { val = el.placeholder; ph = true; }
      if (type === 'password' && !ph) val = '•'.repeat(val.length);
      if (val) {
        const st = tstyle(cs); if (ph) { const pc = color(getComputedStyle(el, '::placeholder').color); if (pc) st.c = pc; else st.c = [...st.c.slice(0, 3), 0.5]; }
        const pl = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth), pt = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
        const lh = st.lh || st.sz * 1.25;
        const multi = tag === 'TEXTAREA';
        const ty = multi ? r.top + pt : r.top + (h - lh) / 2;
        target.push({ k: 'T', n: ph ? 'placeholder' : 'value', x: R(r.left + pl), y: R(ty + sy), w: R(w - pl * 2), h: R(multi ? h - pt * 2 : lh), s: val, st, al: { center: 'C', right: 'R' }[cs.textAlign] || 'L', wr: multi ? 1 : 0, cut: 1 });
        count++;
      }
      return;
    }
    // text
    if (isTextBlock(el)) {
      const range = document.createRange(); range.selectNodeContents(el);
      const runs = []; collectRuns(el, runs);
      const t = makeText(el, range, runs, sy); if (t) { target.push(t); count++; }
      return;
    }
    for (const n of el.childNodes) {
      if (n.nodeType === 3) {
        if (!n.data.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(n);
        const t = makeText(el, range, [{ s: n.data, el }], sy); if (t) { target.push(t); count++; }
      } else if (n.nodeType === 1) {
        const ncs = getComputedStyle(n);
        if (n.tagName !== 'BR' && plainInline(n, ncs) && isTextBlock(n)) {
          const range = document.createRange(); range.selectNodeContents(n);
          const runs = []; collectRuns(n, runs);
          const t = makeText(n, range, runs, sy); if (t) { target.push(t); count++; }
        } else walk(n, target, sy, depth + 1);
      }
    }
  }

  // stacking: fixed/absolute elements with z-index keep DOM order (good enough)
  const sy = window.scrollY;
  const body = document.body; const bcs = getComputedStyle(body); const hcs = getComputedStyle(document.documentElement);
  const W = document.documentElement.clientWidth;
  const H = Math.max(document.documentElement.scrollHeight, body.scrollHeight);
  const root = { k: 'F', n: document.title || location.pathname, x: 0, y: 0, w: W, h: H, ch: [] };
  const bgp = paints(bcs, W, H); const hp = paints(hcs, W, H);
  root.p = bgp.length ? (hp.length ? [...hp, ...bgp] : bgp) : hp.length ? hp : [{ t: 's', c: [255, 255, 255, 1] }];
  for (const c of body.childNodes) {
    if (c.nodeType === 1) walk(c, root.ch, sy, 1);
    else if (c.nodeType === 3 && c.data.trim()) { const range = document.createRange(); range.selectNodeContents(c); const t = makeText(body, range, [{ s: c.data, el: body }], sy); if (t) root.ch.push(t); }
  }
  return { root, images, canvases: canvases.length, count };
})()
