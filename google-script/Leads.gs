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
const LEAD_HEAD = ['Phone', 'Name', 'Status', 'Last message', 'Last time', 'Source', 'Updated', 'JSON'];
const LEAD_MSGS = 40;             // har lead ke itne aakhri message yaad rakhte hain

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
  return { ok: true, leads: leads, statuses: LEAD_STATUS,
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
  lPut_(l);
  return { ok: true, lead: lClean_(l) };
}
function leadsAdd_(d) {
  const x = d.lead || {}, id = lNum_(x.phone);
  if (!/^\d{11,15}$/.test(id)) return { ok: false, error: 'Enter a valid mobile number' };
  const now = new Date().toISOString();
  let l = lFind_(id);
  if (!l) l = { id: id, name: '', status: 'New', notes: '', msgs: [], createdAt: now, src: x.src || 'Manual' };
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
        const t = m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : new Date().toISOString();
        let l = byId[id];
        if (!l) { l = byId[id] = { id: id, name: names[id] || '', status: 'New', notes: '', msgs: [], createdAt: t, src: 'WhatsApp' }; }
        if (!l.name && names[id]) l.name = names[id];
        l.msgs = l.msgs || [];
        if (m.id && l.msgs.some(x => x.id === m.id)) return;          // Meta kabhi kabhi ek hi message 2 baar bhejta hai
        l.msgs.push({ t: t, text: text.slice(0, 1000), id: m.id || '', by: 'customer' });
        if (l.msgs.length > LEAD_MSGS) l.msgs = l.msgs.slice(-LEAD_MSGS);
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
  const vals = [l.id, l.name || '', l.status || 'New', String(l.last || '').slice(0, 300), l.lastAt || '', l.src || '', new Date(), JSON.stringify(copy)];
  if (l._row) sh.getRange(l._row, 1, 1, vals.length).setValues([vals]);
  else { sh.appendRow(vals); l._row = sh.getLastRow(); }
  return l;
}
function lClean_(l) { const c = Object.assign({}, l); delete c._row; return c; }
