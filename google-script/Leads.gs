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
      case 'leadsFb': return leadsFbSave_(d);
      case 'leadsSpendSetup': return leadsSpendSetup_(d);
      case 'leadsSpend': return leadsSpend_(d);
      case 'leadsImport': return leadsImport_(d);
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
    wa: { key: waKey_(), lastHook: p.getProperty('WA_LAST') || '', verified: p.getProperty('WA_VERIFIED') || '' },
    spend: spendInfo_(),
    fb: { pages: Object.keys(fbPages_()).map(id => ({ id: id, name: fbPages_()[id].name, sub: !!fbPages_()[id].sub })), last: p.getProperty('FB_LAST') || '', err: p.getProperty('FB_ERR') || '' } };
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
  lProps_().setProperty(body.object === 'page' ? 'FB_LAST' : 'WA_LAST', new Date().toISOString());
  const added = body.object === 'page' ? fbIn_(body) : waIn_(body);
  return { ok: true, added: added };
}
function waIn_(body) {
  if (!body || body.object !== 'whatsapp_business_account') return 0;
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  let added = 0;
  try {
    const byId = lById_();
    (body.entry || []).forEach(en => (en.changes || []).forEach(ch => {
      const v = ch.value || {}; if (ch.field && ch.field !== 'messages') return;
      const names = {};
      (v.contacts || []).forEach(c => { if (c.wa_id) names[lNum_(c.wa_id)] = (c.profile && c.profile.name) || ''; });
      (v.messages || []).forEach(m => {
        const id = lNum_(m.from); if (!id) return;
        const text = waText_(m); if (text === null) return;
        const ref = m.referral || null;                                   // Click-to-WhatsApp ad se aaya message
        const ad = ref ? { headline: String(ref.headline || '').slice(0, 200), body: String(ref.body || '').slice(0, 300), id: String(ref.source_id || ''), url: String(ref.source_url || '').slice(0, 300), type: String(ref.source_type || '') } : null;
        if (lAdd_(byId, { id: id, name: names[id] || '', text: text, msgId: m.id || '', ad: ad, src: 'WhatsApp',
          t: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : new Date().toISOString() })) added++;
      });
    }));
  } finally { lock.releaseLock(); }
  return added;
}
function lById_() { const byId = {}; lAll_().forEach(l => byId[l.id] = l); return byId; }
/* Ek naya message / form lead jodna (number se pehchaan). o: { id, name, text, t, msgId, ad, src, extra } */
function lAdd_(byId, o) {
  let l = byId[o.id];
  if (!l) l = byId[o.id] = { id: o.id, name: o.name || '', status: 'New', notes: '', msgs: [], createdAt: o.t, src: o.src };
  if (!l.name && o.name) l.name = o.name;
  l.msgs = l.msgs || [];
  if (o.msgId && l.msgs.some(x => x.id === o.msgId)) return false;     // Meta kabhi kabhi ek hi cheez 2 baar bhejta hai
  l.msgs.push({ t: o.t, text: String(o.text).slice(0, 1000), id: o.msgId || '', by: 'customer', src: o.src });
  l.msgs.sort((x, y) => String(x.t).localeCompare(String(y.t)));
  if (l.msgs.length > LEAD_MSGS) l.msgs = l.msgs.slice(-LEAD_MSGS);
  if (o.ad) l.ad = o.ad;
  if (o.extra) l.form = Object.assign(l.form || {}, o.extra);
  if (!l.service || l.service === LEAD_OTHER) {
    const ad = o.ad ? [o.ad.headline, o.ad.body, o.ad.url].join(' ') : '';
    l.service = (ad && lDetect_(ad) !== LEAD_OTHER) ? lDetect_(ad) : lDetect_(o.text);
  }
  if (!l.lastAt || String(o.t) >= String(l.lastAt)) { l.last = String(o.text).slice(0, 300); l.lastAt = o.t; }
  l.unread = true; l.count = (l.count || 0) + 1;
  lPut_(l);
  return true;
}

/* ---------- Facebook / Instagram Lead form ads ----------
   Meta "leadgen" webhook sirf lead ka ID bhejta hai; naam / number Page token se Graph API se laate hain. */
const FB_GRAPH = 'https://graph.facebook.com/v21.0/';
function fbGet_(path, token) {
  const r = UrlFetchApp.fetch(FB_GRAPH + path + (path.indexOf('?') < 0 ? '?' : '&') + 'access_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  let j = {}; try { j = JSON.parse(r.getContentText() || '{}'); } catch (e) { }
  if (r.getResponseCode() >= 300 || j.error) throw new Error((j.error && j.error.message) || ('Facebook error ' + r.getResponseCode()));
  return j;
}
function fbPages_() { try { return JSON.parse(lProps_().getProperty('FB_PAGES') || '{}'); } catch (e) { return {}; } }
/* Admin ek token deta hai (Page token, ya user / system user token). Pages dhoondh kar har Page ko leadgen par subscribe karte hain. */
function leadsFbSave_(d) {
  const tok = String(d.fbToken || '').trim();
  if (!tok) { lProps_().deleteProperty('FB_PAGES'); return Object.assign(leadsList_(), { fbMsg: 'Facebook disconnected' }); }
  let pages = {};
  try {
    const acc = fbGet_('me/accounts?fields=id,name,access_token&limit=100', tok);
    (acc.data || []).forEach(p => { if (p.access_token) pages[p.id] = { name: p.name, token: p.access_token }; });
  } catch (e) { }
  if (!Object.keys(pages).length) {                                    // shayad ye khud Page token hai
    const me = fbGet_('me?fields=id,name', tok);
    pages[me.id] = { name: me.name, token: tok };
  }
  const done = [];
  Object.keys(pages).forEach(id => {
    const r = UrlFetchApp.fetch(FB_GRAPH + id + '/subscribed_apps', { method: 'post', muteHttpExceptions: true,
      payload: { subscribed_fields: 'leadgen', access_token: pages[id].token } });
    pages[id].sub = r.getResponseCode() < 300; done.push(pages[id].name + (pages[id].sub ? '' : ' (subscribe failed)'));
  });
  lProps_().setProperty('FB_PAGES', JSON.stringify(pages));
  lProps_().deleteProperty('FB_ERR');
  return Object.assign(leadsList_(), { fbMsg: 'Connected: ' + done.join(', ') });
}
function fbIn_(body) {
  if (!body || body.object !== 'page') return 0;
  const pages = fbPages_(); let added = 0;
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const byId = lById_();
    (body.entry || []).forEach(en => (en.changes || []).forEach(ch => {
      if (ch.field !== 'leadgen') return;
      const v = ch.value || {}, pg = pages[String(v.page_id || en.id)];
      if (!pg) { lProps_().setProperty('FB_ERR', new Date().toISOString() + ' · Lead aayi par Page ' + (v.page_id || en.id) + ' ka token nahi hai'); return; }
      try { if (fbLead_(byId, String(v.leadgen_id), pg.token, v)) added++; }
      catch (e) { lProps_().setProperty('FB_ERR', new Date().toISOString() + ' · ' + String(e.message || e).slice(0, 200)); }
    }));
  } finally { lock.releaseLock(); }
  return added;
}
function fbFormName_(formId, token) {
  if (!formId) return '';
  const c = CacheService.getScriptCache(), k = 'fbform_' + formId, hit = c.get(k); if (hit !== null) return hit;
  let n = ''; try { n = fbGet_(formId + '?fields=name', token).name || ''; } catch (e) { }
  c.put(k, n, 21600); return n;
}
function fbLead_(byId, leadId, token, v) {
  const L = fbGet_(leadId + '?fields=created_time,field_data,ad_name,adset_name,campaign_name,form_id,platform', token);
  const f = {}; (L.field_data || []).forEach(x => f[String(x.name || '').toLowerCase()] = (x.values || []).join(', '));
  return fbRow_(byId, { id: leadId, created: L.created_time, fields: f, ad: L.ad_name, campaign: L.campaign_name || L.adset_name, form: fbFormName_(L.form_id || v.form_id, token), platform: L.platform, src: 'Lead form' });
}
/* Ek form lead (webhook ya CSV) → lead. r: { id, created, fields{}, ad, campaign, form, platform, src } */
function fbRow_(byId, r) {
  const f = r.fields || {}, pick = re => { const k = Object.keys(f).filter(k => re.test(k))[0]; return k ? String(f[k]) : ''; };
  const phone = lNum_(pick(/phone|mobile|whatsapp|contact|number|फ़ोन|मोबाइल/).replace(/^p:/i, ''));
  if (!/^\d{11,15}$/.test(phone)) return false;
  const name = (pick(/^full_?name$|^name$|पूरा नाम|नाम/) || [pick(/first_?name/), pick(/last_?name/)].join(' ')).trim();
  const skip = /^(full_?name|name|first_?name|last_?name|phone_?number|phone|mobile)$/;
  const qa = Object.keys(f).filter(k => !skip.test(k) && f[k]).map(k => k.replace(/_/g, ' ').replace(/\?$/, '') + ': ' + f[k]);
  const text = '📝 Form' + (r.form ? ' "' + r.form + '"' : '') + (qa.length ? ' · ' + qa.join(' · ') : '');
  const t = r.created ? new Date(r.created).toISOString() : new Date().toISOString();
  const ad = (r.ad || r.campaign || r.form) ? { headline: String(r.ad || r.campaign || '').slice(0, 200), body: String(r.form || '').slice(0, 300), id: '', url: '', type: 'lead form' + (r.platform ? ' · ' + r.platform : '') } : null;
  return lAdd_(byId, { id: phone, name: name, text: text, t: t, msgId: 'fb' + r.id, ad: ad, src: r.src || 'Lead form', extra: { email: pick(/e-?mail/), city: pick(/city|शहर/) } });
}
/* ---------- Kharcha: Meta ads ka spend (har ad) + WhatsApp API messages ka cost ----------
   Token (system user) mein ads_read + whatsapp_business_management chahiye. Token kabhi wapas browser ko nahi bhejte. */
function spendCfg_() { try { return JSON.parse(lProps_().getProperty('SPEND_CFG') || '{}'); } catch (e) { return {}; } }
function spendInfo_() { const c = spendCfg_(); return { adAccount: c.adAccount || '', waba: c.waba || '', hasToken: !!c.token }; }
function leadsSpendSetup_(d) {
  const c = spendCfg_();
  if (d.adAccount != null) c.adAccount = String(d.adAccount).replace(/[^\d]/g, '');
  if (d.waba != null) c.waba = String(d.waba).replace(/[^\d]/g, '');
  if (d.metaToken) c.token = String(d.metaToken).trim();
  if (!c.token) return { ok: false, error: 'Paste the token' };
  if (!c.adAccount && !c.waba) return { ok: false, error: 'Enter the Ad account ID or WhatsApp account ID' };
  if (c.adAccount) fbGet_('act_' + c.adAccount + '?fields=name,currency', c.token);     // galat ho to yahin error
  lProps_().setProperty('SPEND_CFG', JSON.stringify(c));
  CacheService.getScriptCache().remove('spend_last');
  return { ok: true, spend: spendInfo_() };
}
/* d.since / d.until: 'YYYY-MM-DD' */
function leadsSpend_(d) {
  const c = spendCfg_(); if (!c.token) return { ok: true, setup: true, spend: spendInfo_() };
  const since = /^\d{4}-\d\d-\d\d$/.test(d.since) ? d.since : Utilities.formatDate(new Date(Date.now() - 29 * 864e5), 'Asia/Kolkata', 'yyyy-MM-dd');
  const until = /^\d{4}-\d\d-\d\d$/.test(d.until) ? d.until : Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  const ck = 'spend_' + since + '_' + until, cache = CacheService.getScriptCache(), hit = !d.fresh && cache.get(ck);
  if (hit) return JSON.parse(hit);
  const out = { ok: true, since: since, until: until, spend: spendInfo_(), ads: [], wa: [], errors: [], currency: 'INR' };
  if (c.adAccount) try {
    const acc = fbGet_('act_' + c.adAccount + '?fields=currency,name', c.token); out.currency = acc.currency || 'INR'; out.account = acc.name || '';
    let url = 'act_' + c.adAccount + '/insights?level=ad&limit=200&fields=ad_name,campaign_name,spend,impressions,clicks,actions&time_range=' + encodeURIComponent(JSON.stringify({ since: since, until: until }));
    for (let page = 0; page < 10 && url; page++) {
      const r = fbGet_(url, c.token);
      (r.data || []).forEach(a => {
        const act = {}; (a.actions || []).forEach(x => act[x.action_type] = Number(x.value) || 0);
        const chats = act['onsite_conversion.messaging_conversation_started_7d'] || 0;
        const forms = act['lead'] || act['onsite_conversion.lead_grouped'] || act['leadgen_grouped'] || 0;
        out.ads.push({ ad: a.ad_name || '', campaign: a.campaign_name || '', spend: Number(a.spend) || 0, impressions: Number(a.impressions) || 0, clicks: Number(a.clicks) || 0,
          chats: chats, forms: forms, service: lDetect_([a.ad_name, a.campaign_name].join(' ')) });
      });
      url = r.paging && r.paging.next ? r.paging.next.replace(/^https:\/\/graph\.facebook\.com\/v[\d.]+\//, '').replace(/([?&])access_token=[^&]*&?/, '$1') : '';
    }
  } catch (e) { out.errors.push('Ads: ' + String(e.message || e)); }
  if (c.waba) try {
    const st = Math.floor(new Date(since + 'T00:00:00+05:30') / 1000), en = Math.floor(new Date(until + 'T23:59:59+05:30') / 1000);
    const r = fbGet_(c.waba + '?fields=pricing_analytics.start(' + st + ').end(' + en + ').granularity(DAILY).dimensions(["PRICING_CATEGORY"])', c.token);
    const pts = ((((r.pricing_analytics || {}).data || [])[0] || {}).data_points) || [];
    const by = {}; pts.forEach(p => { const k = String(p.pricing_category || 'OTHER'); by[k] = by[k] || { category: k, volume: 0, cost: 0 }; by[k].volume += Number(p.volume) || 0; by[k].cost += Number(p.cost) || 0; });
    out.wa = Object.keys(by).map(k => by[k]);
  } catch (e) { out.errors.push('WhatsApp: ' + String(e.message || e)); }
  try { cache.put(ck, JSON.stringify(out), 1800); } catch (e) { }
  return out;
}
/* Meta Leads Center / Ads Manager se download ki hui file (browser mein padhi gayi rows) */
function leadsImport_(d) {
  const rows = Array.isArray(d.rows) ? d.rows.slice(0, 500) : [];
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  let added = 0, skipped = 0;
  try {
    const byId = lById_();
    rows.forEach(r => { if (fbRow_(byId, Object.assign({}, r, { src: 'Lead form (file)' }))) added++; else skipped++; });
  } finally { lock.releaseLock(); }
  return Object.assign(leadsList_(), { added: added, skipped: skipped });
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
