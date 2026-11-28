/* =====================================================================
   WHATSAPP AUTO MESSAGE — order "Done" / "Cancelled" hote hi customer ko
   WhatsApp Cloud API (Meta) se apne aap message.
   Live project mein ye code Store.gs ke aakhir mein hai. Routing (adminCustom_):
     'adminWaCfg', 'adminWaSave', 'adminWaTest', 'adminOrderNotify'
   Setup: Admin → Settings → "WhatsApp auto message" (Phone number ID, token,
   2 approved template ke naam). Token sirf Script Properties mein rehta hai.

   Meta mein 2 "Utility" template banane hain (body bilkul aise, variables same order mein):
     order_ready      → {{1}} naam, {{2}} order #, {{3}} PPT ka topic, {{4}} tracking link
     order_cancelled  → {{1}} naam, {{2}} order #, {{3}} PPT ka topic
   ===================================================================== */
const WA_API = 'https://graph.facebook.com/v21.0/';
function waCfg_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('WA_SEND') || '{}'); } catch (e) { return {}; } }
function waReady_(c) { c = c || waCfg_(); return !!(c.on && c.phoneId && c.token && (c.tplDone || c.tplCancel)); }
function waPub_(c) {
  return { on: !!c.on, ready: waReady_(c), phoneId: c.phoneId || '', number: c.number || '', hasToken: !!c.token,
    tplDone: c.tplDone || '', tplCancel: c.tplCancel || '', lang: c.lang || 'en', site: c.site || '' };
}
function adminWaCfg_() { return { ok: true, wa: waPub_(waCfg_()) }; }

function waApi_(c, path, body) {
  const o = { muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + c.token } };
  if (body) { o.method = 'post'; o.contentType = 'application/json'; o.payload = JSON.stringify(body); }
  let j = {}; try { j = JSON.parse(UrlFetchApp.fetch(WA_API + path, o).getContentText() || '{}'); } catch (e) { throw new Error('Meta se jawab nahi aaya'); }
  if (j.error) throw new Error(j.error.error_user_msg || j.error.message || 'Meta error');
  return j;
}

function adminWaSave_(d) {
  const c = waCfg_();
  if (d.phoneId != null) c.phoneId = String(d.phoneId).replace(/\D/g, '');
  if (d.token) c.token = String(d.token).trim();
  const tpl = v => String(v || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 80);
  if (d.tplDone != null) c.tplDone = tpl(d.tplDone);
  if (d.tplCancel != null) c.tplCancel = tpl(d.tplCancel);
  if (d.lang != null) c.lang = String(d.lang).trim().replace(/[^A-Za-z_]/g, '').slice(0, 10) || 'en';
  if (d.site != null) { const s = String(d.site).trim().replace(/\/+$/, ''); c.site = /^https:\/\/[^\s"'<>]+$/.test(s) ? s : ''; }
  c.on = !!d.on;
  if (c.on) {
    if (!c.phoneId || !c.token) return { ok: false, error: 'Phone number ID aur token dono chahiye' };
    if (!c.tplDone && !c.tplCancel) return { ok: false, error: 'Kam se kam ek template ka naam daalein' };
    try { const p = waApi_(c, c.phoneId + '?fields=display_phone_number,verified_name'); c.number = (p.display_phone_number || '') + (p.verified_name ? ' · ' + p.verified_name : ''); }
    catch (e) { return { ok: false, error: 'Meta check fail: ' + e.message }; }
  }
  PropertiesService.getScriptProperties().setProperty('WA_SEND', JSON.stringify(c));
  return { ok: true, wa: waPub_(c) };
}

function waTrack_(c, id) { return (c.site || 'https://www.pptstore.in') + '/track.html#id=' + encodeURIComponent(id); }
function waSend_(c, mobile10, tpl, params) {
  const j = waApi_(c, c.phoneId + '/messages', { messaging_product: 'whatsapp', to: '91' + mobile10, type: 'template',
    template: { name: tpl, language: { code: c.lang || 'en' },
      components: [{ type: 'body', parameters: params.map(function (t) { return { type: 'text', text: String(t || '-').replace(/\s+/g, ' ').slice(0, 300) }; }) }] } });
  return (j.messages && j.messages[0] && j.messages[0].id) || '';
}
function waParams_(c, st, name, id, topic) {
  return st === 'Done' ? [name, '#' + id, topic, waTrack_(c, id)] : [name, '#' + id, topic];
}

/* Admin status badalta hai → panel ye call karta hai */
function adminOrderNotify_(d) {
  const c = waCfg_();
  if (!waReady_(c)) return { ok: false, off: true, error: 'WhatsApp auto message off hai' };
  const st = d.status === 'Cancelled' ? 'Cancelled' : d.status === 'Done' ? 'Done' : '';
  const tpl = st === 'Done' ? c.tplDone : st === 'Cancelled' ? c.tplCancel : '';
  if (!tpl) return { ok: false, off: true, error: 'Is status ka template set nahi hai' };
  const o = orderRow_(String(d.id)); if (!o) return { ok: false, error: 'Order nahi mila' };
  const m = mob_(o[3]); if (!/^[6-9]\d{9}$/.test(m)) return { ok: false, error: 'Customer ka mobile number sahi nahi hai' };
  try { waSend_(c, m, tpl, waParams_(c, st, str_(o[2]).split(' ')[0] || 'Customer', String(d.id), str_(o[5]))); }
  catch (e) { return { ok: false, error: 'WhatsApp nahi gaya: ' + e.message }; }
  return { ok: true };
}

/* Settings → "Test message" apne number par */
function adminWaTest_(d) {
  const c = waCfg_();
  if (!c.phoneId || !c.token) return { ok: false, error: 'Pehle Phone number ID aur token save karein' };
  const m = String(d.mobile || '').replace(/\D/g, '').slice(-10); if (!/^[6-9]\d{9}$/.test(m)) return { ok: false, error: '10 digit mobile number daalein' };
  const st = d.status === 'Cancelled' ? 'Cancelled' : 'Done', tpl = st === 'Done' ? c.tplDone : c.tplCancel;
  if (!tpl) return { ok: false, error: 'Template ka naam set nahi hai' };
  try { waSend_(c, m, tpl, waParams_(c, st, 'Test', 'TEST-1', 'Sample PPT')); } catch (e) { return { ok: false, error: e.message }; }
  return { ok: true };
}
