/* Capture pages of the site into layout JSON for Figma.
   Usage: node design/figma/capture.js <outDir> [only-screen-name...]
   Needs a static server of the repo on http://localhost:8765 */
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const BASE = 'http://localhost:8765/';
const OUT = process.argv[2] || 'out'; const ONLY = process.argv.slice(3);
const SER = fs.readFileSync(path.join(__dirname, 'serialize.js'), 'utf8');

const PUBLIC = ['index', 'ready-ppts', 'order', 'service', 'about', 'contact', 'track', 'account', 'ai-ppt', 'view', 'thank-you',
  'chapters', 'papers', 'state-board', 'state-books', 'study-notes-pdf', 'cbse-date-sheet-2027', 'bihar-board-class-10-syllabus', 'bihar-board-class-12-syllabus',
  'educational-ppt', 'student-ppt', 'ready-made-ppt', 'custom-ppt-design', 'cbse-icse-state-board-ppt', 'lecture-recording-video-editing',
  'delivery', 'privacy', 'refund', 'terms'];
const ADMIN_TABS = ['dash', 'stats', 'report', 'orders', 'sales', 'customers', 'coupons', 'messages', 'reviews', 'ppts', 'notes', 'cfiles', 'themes', 'prices', 'menu', 'site', 'settings'];

const PREP = `(() => {
  const st = document.createElement('style');
  st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} .xp-b::before{content:none!important} .xp-a::after{content:none!important} html{scroll-behavior:auto!important}';
  document.head.appendChild(st);
  // materialize ::before / ::after so they become real layers
  const all = [...document.body.querySelectorAll('*')];
  for (const el of all) {
    if (el instanceof SVGElement || /^(INPUT|TEXTAREA|SELECT|IMG|BR|HR|SCRIPT|STYLE)$/.test(el.tagName)) continue;
    for (const p of ['before', 'after']) {
      const cs = getComputedStyle(el, '::' + p);
      const c = cs.content; if (!c || c === 'none' || c === 'normal') continue;
      if (cs.display === 'none') continue;
      const sp = document.createElement('x-ps');
      let css = ''; for (let i = 0; i < cs.length; i++) { const k = cs[i]; css += k + ':' + cs.getPropertyValue(k) + ';'; }
      sp.style.cssText = css;
      let txt = ''; const m = c.match(/^"(.*)"$/s); if (m) txt = m[1].replace(/\\\\([0-9a-f]{1,6}) ?/gi, (a, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\\\(.)/g, '$1');
      sp.textContent = txt;
      if (p === 'before') el.insertBefore(sp, el.firstChild); else el.appendChild(sp);
      el.classList.add(p === 'before' ? 'xp-b' : 'xp-a');
    }
  }
})()`;

async function settle(page) {
  await page.evaluate(async () => {
    const H = () => document.documentElement.scrollHeight;
    for (let y = 0; y < H(); y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 300));
    document.querySelectorAll('[class*=reveal],[class*=fade],[data-aos]').forEach(e => e.classList.add('in', 'show', 'visible', 'is-visible', 'aos-animate'));
    await document.fonts.ready;
  });
  await page.waitForTimeout(400);
}

async function snap(page, name, vw) {
  await page.evaluate(() => document.querySelectorAll('body > div').forEach(d => { if (/Preview demo/.test(d.textContent) && d.style.position === 'fixed') d.remove(); }));
  await page.evaluate(PREP);
  await page.waitForTimeout(150);
  const res = await page.evaluate(SER);
  // capture canvases / videos as PNG
  for (let i = 0; i < res.canvases; i++) {
    const h = await page.$(`[data-fig-cap="${i}"]`);
    const f = path.join(OUT, 'img', `${name}-cap${i}.png`);
    const bgOnly = await h.evaluate(e => { if (!e.hasAttribute('data-fig-bgonly')) return false; [...e.children].forEach(c => { c.dataset.figVis = c.style.visibility; c.style.visibility = 'hidden'; }); e.dataset.figColor = e.style.color; e.style.color = 'transparent'; return true; });
    try { await h.screenshot({ path: f, omitBackground: true }); } catch (e) { }
    if (bgOnly) await h.evaluate(e => { [...e.children].forEach(c => { c.style.visibility = c.dataset.figVis || ''; }); e.style.color = e.dataset.figColor || ''; });
    res.images = res.images.map(s => s === 'cap:' + i ? 'file:' + f : s);
  }
  await page.screenshot({ path: path.join(OUT, 'ref', name + '.png'), fullPage: true });
  res.name = name; res.vw = vw;
  fs.writeFileSync(path.join(OUT, 'json', name + '.json'), JSON.stringify(res));
  console.log(name, 'nodes', res.count, 'imgs', res.images.length, 'h', res.root.h);
}

(async () => {
  for (const d of ['json', 'ref', 'img']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
  const browser = await chromium.launch();
  const VIEWS = [['d', { width: 1440, height: 900 }, false], ['m', { width: 390, height: 844 }, true]];
  for (const [tag, vp, mobile] of VIEWS) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: 'light' });
    await ctx.route('**/config.js', async route => { const r = await route.fetch(); let b = await r.text(); b += '\nwindow.LA_CONFIG.previewDemo = true;'; route.fulfill({ response: r, body: b }); });
    await ctx.route(/^https?:\/\/(?!localhost|fonts\.g)/, route => route.abort());
    await ctx.addInitScript(() => { try { localStorage.setItem('la_theme', 'light'); localStorage.setItem('la_admin_theme', 'light'); } catch (e) { } });
    for (const p of PUBLIC) {
      const name = `site-${p}-${tag}`; if (ONLY.length && !ONLY.includes(name)) continue;
      const page = await ctx.newPage();
      try { await page.goto(BASE + p + '.html', { waitUntil: 'load', timeout: 30000 }); await page.waitForTimeout(1200); await settle(page); await snap(page, name, vp.width); }
      catch (e) { console.log('FAIL', name, e.message.slice(0, 200)); }
      await page.close();
    }
    if (tag === 'd' || ONLY.some(o => o.startsWith('admin'))) {
      // admin: login screen + each tab
      const names = ['login', ...ADMIN_TABS].map(t => `admin-${t}-${tag}`);
      if (!ONLY.length || names.some(n => ONLY.includes(n))) {
        const page = await ctx.newPage();
        if (!ONLY.length || ONLY.includes(`admin-login-${tag}`)) { const p2 = await ctx.newPage(); await p2.goto(BASE + 'admin.html'); await p2.waitForTimeout(800); await settle(p2); await snap(p2, `admin-login-${tag}`, vp.width); await p2.close(); }
        for (const t of ADMIN_TABS) {
          const name = `admin-${t}-${tag}`; if (ONLY.length && !ONLY.includes(name)) continue;
          const p2 = await ctx.newPage();
          try {
            await p2.goto(BASE + 'admin.html', { waitUntil: 'load' }); await p2.waitForTimeout(900);
            await p2.fill('#uid', 'admin'); await p2.fill('#pw', 'demo'); await p2.click('#loginBtn'); await p2.waitForTimeout(1500);
            const btn = await p2.$(`[data-t="${t}"]`); if (mobile) { const mb = await p2.$('#menuBtn'); if (mb) await mb.click(); }
            await btn.click(); await p2.waitForTimeout(1500); await p2.mouse.move(0, 0); await settle(p2);
            await snap(p2, name, vp.width);
          } catch (e) { console.log('FAIL', name, e.message.slice(0, 200)); }
          await p2.close();
        }
        await page.close();
      }
    }
    await ctx.close();
  }
  await browser.close();
})();
