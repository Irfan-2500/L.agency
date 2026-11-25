/* =====================================================================
   LEADS — WhatsApp par aane wale message apne aap Admin panel ke "Leads" mein
   Ye file Google Apps Script project mein "Leads.gs" naam se rakhein.

   Code.gs mein 3 line jodni hain:
   1) doGet ke andar, sabse upar (try { ke turant baad):
        if (e && e.parameter && e.parameter['hub.mode']) return waVerify_(e);
   2) doPost ke andar, sabse upar (try { ke turant baad):
        if (e && e.parameter && e.parameter.wa) return json_(waHook_(e));
   3) doPost ke switch ke baad (Unknown action se pehle):
        if (/^leads/.test(String(d.action))) return json_(leads_(d));

   Meta (WhatsApp Cloud API) ka webhook isi script ke URL par aata hai.
   Webhook URL aur Verify token Admin → Leads → "WhatsApp jodein" mein milte hain.
   Sheet apne aap banti hai: "Leads".
   ===================================================================== */
const LEAD_STATUS = ['New', 'Called', 'Interested', 'Converted', 'Not interested'];
const LEAD_HEAD = ['Phone', 'Name', 'Status', 'Last message', 'Last time', 'Service', 'Updated', 'JSON'];
const LEAD_MSGS = 40;             // har lead ke itne aakhri message yaad rakhte hain
/* Ek hi number par kai ads: lead kis service ki hai, ye ad ki headline / text aur customer ke message
   ke shabdon se apne aap tay hota hai. Admin → Leads → Categories mein shabd badal sakte hain. */
const LEAD_OTHER = 'Other';
const LEAD_RULES_DEFAULT = [         // upar wali category pehle jaanchi jaati hai
  { name: 'Team hiring', words: ['hiring', 'vacancy', 'vacancies', 'join team', 'join our team', 'work from home', 'internship', 'भर्ती', 'वैकेंसी'] },
  { name: 'CV making', words: ['cv', 'resume', 'biodata', 'bio data', 'bio-data', 'बायोडाटा', 'रिज्यूम', 'सीवी'] },
  { name: 'PPT making', words: ['ppt', 'presentation', 'slides', 'powerpoint', 'प्रेजेंटेशन', 'पीपीटी'] },
  { name: 'Computer', words: ['computer', 'typing', 'data entry', 'excel', 'tally', 'ms office', 'कंप्यूटर', 'टाइपिंग'] }
];

/* ---------- admin actions (login token zaroori) ---------- */
function leads_(d) {
  try {
    if (!tokenOk_(d.token)) return { ok: false, auth: true, error: 'Login expired. Please login again.' };
    const a = String(d.action || '');
    switch (a) {
      case 'leadsAdmin': return leadsList_();
      case 'leadsSave': return leadsSave_(d);
      case 'leadsAdd': return leadsAdd_(d);
      case 'leadsCall': return leadsCall_(d);
      case 'leadsDelete': return leadsDelete_(d);
      case 'leadsRules': return leadsRules_(d);
      case 'leadsNewKey': lProps_().deleteProperty('WA_KEY'); return Object.assign(leadsList_(), { renewed: true });
    }
    return { ok: false, error: 'Unknown leads action' };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}
function lProps_() { return PropertiesService.getScriptProperties(); }
function waKey_() {
  const p = lProps_(); let k = p.getProperty('WA_KEY');
  if (!k) { k = Utilities.getUuid().replace(/-/g, '').slice(0, 24); p.setProperty('WA_KEY', k); }
  return k;
}
function leadsList_() {
  const leads = lAll_().sort((a, b) => String(b.lastAt || b.createdAt).localeCompare(String(a.lastAt || a.createdAt)));
  const p = lProps_();
  return { ok: true, leads: leads, statuses: LEAD_STATUS, rules: lRules_(), other: LEAD_OTHER,
    wa: { key: waKey_(), lastHook: p.getProperty('WA_LAST') || '', verified: p.getProperty('WA_VERIFIED') || '' } };
}
function lFind_(id) { id = lNum_(id); return lAll_().filter(l => l.id === id)[0] || null; }
function leadsSave_(d) {
  const x = d.lead || {}, l = lFind_(x.id); if (!l) return { ok: false, error: 'Lead not found' };
  if (x.name != null) l.name = String(x.name).trim().slice(0, 80);
  if (x.status != null) { if (LEAD_STATUS.indexOf(x.status) < 0) return { ok: false, error: 'Invalid status' }; l.status = x.status; }
  if (x.notes != null) l.notes = String(x.notes).slice(0, 3000);
  if (x.seen) l.unread = false;
  if (x.followUp != null) l.followUp = String(x.followUp).slice(0, 30);
  if (x.service != null) l.service = String(x.service).trim().slice(0, 40) || LEAD_OTHER;
  lPut_(l);
  return { ok: true, lead: lClean_(l) };
}
function leadsAdd_(d) {
  const x = d.lead || {}, id = lNum_(x.phone);
  if (!/^\d{11,15}$/.test(id)) return { ok: false, error: 'Enter a valid mobile number' };
  const now = new Date().toISOString();
  let l = lFind_(id);
  if (!l) l = { id: id, name: '', status: 'New', notes: '', msgs: [], createdAt: now, src: x.src || 'Manual' };
  if (x.service) l.service = String(x.service).trim().slice(0, 40);
  else if (!l.service || l.service === LEAD_OTHER) l.service = lDetect_(x.message || '');
  if (x.name) l.name = String(x.name).trim().slice(0, 80);
  if (x.message) { l.msgs.push({ t: now, text: String(x.message).slice(0, 1000), by: 'note' }); l.last = String(x.message).slice(0, 300); l.lastAt = now; }
  if (!l.lastAt) l.lastAt = now;
  lPut_(l);
  return { ok: true, lead: lClean_(l) };
}
function leadsCall_(d) {
  const l = lFind_(d.id); if (!l) return { ok: false, error: 'Lead not found' };
  l.calls = (l.calls || 0) + 1; l.calledAt = new Date().toISOString(); l.unread = false;
  if (l.status === 'New') l.status = 'Called';
  lPut_(l);
  return { ok: true, lead: lClean_(l) };
}
function leadsDelete_(d) {
  const l = lFind_(d.id); if (!l) return { ok: true };
  lSheet_().deleteRow(l._row);
  return { ok: true };
}

/* ---------- services (kis ad / kaam ki lead) ---------- */
function lRules_() {
  try { const r = JSON.parse(lProps_().getProperty('LEAD_RULES') || 'null'); if (Array.isArray(r) && r.length) return r; } catch (e) { }
  return LEAD_RULES_DEFAULT;
}
function lDetect_(text) {
  const t = ' ' + String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ') + ' ';
  const rules = lRules_();
  for (let i = 0; i < rules.length; i++) {
    const ws = rules[i].words || [];
    for (let j = 0; j < ws.length; j++) {
      const w = String(ws[j] || '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').trim();
      if (w && t.indexOf(' ' + w + ' ') >= 0) return rules[i].name;
    }
  }
  return LEAD_OTHER;
}
function leadsRules_(d) {
  const r = (Array.isArray(d.rules) ? d.rules : []).map(x => ({
    name: String(x.name || '').trim().slice(0, 40),
    words: (Array.isArray(x.words) ? x.words : String(x.words || '').split(',')).map(w => String(w).trim().slice(0, 40)).filter(Boolean).slice(0, 60)
  })).filter(x => x.name && x.name !== LEAD_OTHER).slice(0, 12);
  if (!r.length) return { ok: false, error: 'Add at least one category' };
  lProps_().setProperty('LEAD_RULES', JSON.stringify(r));
  let moved = 0;                                     // purani "Other" leads ko naye shabdon se dobara jaanchein
  if (d.resort) lAll_().forEach(l => {
    if (l.service && l.service !== LEAD_OTHER) return;
    const ad = l.ad ? [l.ad.headline, l.ad.body, l.ad.url].join(' ') : '';
    const sv = ad && lDetect_(ad) !== LEAD_OTHER ? lDetect_(ad) : lDetect_((l.msgs || []).map(m => m.text).join(' '));
    if (sv !== LEAD_OTHER) { l.service = sv; lPut_(l); moved++; }
  });
  return Object.assign(leadsList_(), { moved: moved });
}

/* ---------- Meta webhook ---------- */
/* Meta pehli baar URL check karta hai: ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=... */
function waVerify_(e) {
  const p = e.parameter || {};
  if (p['hub.mode'] === 'subscribe' && p['hub.verify_token'] && p['hub.verify_token'] === waKey_()) {
    lProps_().setProperty('WA_VERIFIED', new Date().toISOString());
    return ContentService.createTextOutput(String(p['hub.challenge'] || ''));
  }
  return ContentService.createTextOutput('Wrong verify token');
}
/* Har naya WhatsApp message yahan aata hai (URL mein ?wa=KEY hona zaroori, warna koi bhi nakli lead daal sakta) */
function waHook_(e) {
  if (String((e.parameter || {}).wa) !== waKey_()) return { ok: false, error: 'bad key' };
  let body = {};
  try { body = JSON.parse((e.postData && e.postData.contents) || '{}'); } catch (err) { return { ok: false, error: 'bad json' }; }
  lProps_().setProperty('WA_LAST', new Date().toISOString());
  const added = waIn_(body);
  return { ok: true, added: added };
}
function waIn_(body) {
  if (!body || body.object !== 'whatsapp_business_account') return 0;
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  let added = 0;
  try {
    const all = lAll_(), byId = {};
    all.forEach(l => byId[l.id] = l);
    (body.entry || []).forEach(en => (en.changes || []).forEach(ch => {
      const v = ch.value || {}; if (ch.field && ch.field !== 'messages') return;
      const names = {};
      (v.contacts || []).forEach(c => { if (c.wa_id) names[lNum_(c.wa_id)] = (c.profile && c.profile.name) || ''; });
      (v.messages || []).forEach(m => {
        const id = lNum_(m.from); if (!id) return;
        const text = waText_(m); if (text === null) return;
        const ref = m.referral || null;                                   // Click-to-WhatsApp ad se aaya message
        const t = m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : new Date().toISOString();
        let l = byId[id];
        if (!l) { l = byId[id] = { id: id, name: names[id] || '', status: 'New', notes: '', msgs: [], createdAt: t, src: 'WhatsApp' }; }
        if (!l.name && names[id]) l.name = names[id];
        l.msgs = l.msgs || [];
        if (m.id && l.msgs.some(x => x.id === m.id)) return;          // Meta kabhi kabhi ek hi message 2 baar bhejta hai
        l.msgs.push({ t: t, text: text.slice(0, 1000), id: m.id || '', by: 'customer' });
        if (l.msgs.length > LEAD_MSGS) l.msgs = l.msgs.slice(-LEAD_MSGS);
        if (ref) l.ad = { headline: String(ref.headline || '').slice(0, 200), body: String(ref.body || '').slice(0, 300), id: String(ref.source_id || ''), url: String(ref.source_url || '').slice(0, 300), type: String(ref.source_type || '') };
        if (!l.service || l.service === LEAD_OTHER) {
          const ad = ref ? [ref.headline, ref.body, ref.source_url].join(' ') : '';
          l.service = (ad && lDetect_(ad) !== LEAD_OTHER) ? lDetect_(ad) : lDetect_(text);
        }
        l.last = text.slice(0, 300); l.lastAt = t; l.unread = true; l.count = (l.count || 0) + 1;
        lPut_(l); added++;
      });
    }));
  } finally { lock.releaseLock(); }
  return added;
}
function waText_(m) {
  const cap = x => x && x.caption ? ': ' + x.caption : '';
  switch (m.type) {
    case 'text': return (m.text && m.text.body) || '';
    case 'button': return (m.button && m.button.text) || '[Button]';
    case 'interactive': { const i = m.interactive || {}; return (i.button_reply && i.button_reply.title) || (i.list_reply && i.list_reply.title) || '[Reply]'; }
    case 'image': return '📷 Photo' + cap(m.image);
    case 'video': return '🎬 Video' + cap(m.video);
    case 'audio': return '🎤 Voice message';
    case 'document': return '📄 ' + ((m.document && m.document.filename) || 'File') + cap(m.document);
    case 'sticker': return '🙂 Sticker';
    case 'location': { const g = m.location || {}; return '📍 Location' + (g.name ? ': ' + g.name : '') + (g.latitude ? ' (' + g.latitude + ', ' + g.longitude + ')' : ''); }
    case 'contacts': return '👤 Contact card';
    case 'reaction': return null;                                   // 👍 reaction ko lead nahi maante
    case 'system': return null;
  }
  return '[' + (m.type || 'message') + ']';
}

/* ---------- sheet ---------- */
function lNum_(n) { const d = String(n || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; }
function lSheet_() {
  const ss = ss_(); let sh = ss.getSheetByName('Leads');
  if (!sh) { sh = ss.insertSheet('Leads'); sh.appendRow(LEAD_HEAD); sh.getRange(1, 1, 1, LEAD_HEAD.length).setFontWeight('bold').setBackground('#dcfce7'); sh.setFrozenRows(1); }
  return sh;
}
function lAll_() {
  const sh = lSheet_(), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, LEAD_HEAD.length, n, 1).getValues().map((r, i) => {
    try { const o = JSON.parse(r[0] || '{}'); o._row = i + 2; return o; } catch (e) { return null; }
  }).filter(o => o && o.id);
}
function lPut_(l) {
  const sh = lSheet_(), copy = lClean_(l);
  const vals = [l.id, l.name || '', l.status || 'New', String(l.last || '').slice(0, 300), l.lastAt || '', l.service || LEAD_OTHER, new Date(), JSON.stringify(copy)];
  if (l._row) sh.getRange(l._row, 1, 1, vals.length).setValues([vals]);
  else { sh.appendRow(vals); l._row = sh.getLastRow(); }
  return l;
}
function lClean_(l) { const c = Object.assign({}, l); delete c._row; return c; }
