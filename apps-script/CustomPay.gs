/* =====================================================================
   CUSTOM ORDER → PAYMENT → DOWNLOAD  (Track Order page)
   Admin → Orders → har order par "Final PPT" upload + daam
     → order "Done" ho jata hai, customer Track page par 10 slide ka demo dekhta hai
     → Razorpay QR / button se pay karta hai → "Order complete" + PPT download
   Sheet: CustomPPTs · Files → Drive folder "Lakshay Agency - Custom PPT Delivery"
   Code.gs mein sirf 2 line judti hain:
     doPost():  if (String(d.action || '').indexOf('custom') === 0) return json_(customPublic_(d));
     admin_():  const y = adminCustom_(a, d); if (y) return y;
   ===================================================================== */
const CUSTOM_HEAD = ['Order #', 'Price (₹)', 'File (Drive ID)', 'File name', 'Slides', 'Demo slides (ek line = ek image)', 'Updated', 'Payment ID', 'Razorpay order / QR', 'Amount paid (₹)', 'Paid at'];
const CUSTOM_FOLDER = 'Lakshay Agency - Custom PPT Delivery';
const CUSTOM_DEMO = 10;            // customer kitni slides free mein dekh sakta hai

function customSheet_() { return sheet_('CustomPPTs', CUSTOM_HEAD); }
function customFolder_() {
  const id = props_().getProperty('CUSTOM_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { } }
  const f = DriveApp.createFolder(CUSTOM_FOLDER);
  props_().setProperty('CUSTOM_FOLDER_ID', f.getId());
  return f;
}
function customObj_(r) {
  const refs = slideList_(r[5]);
  return { row: r.row, id: str_(r[0]), price: Number(r[1]) || 0, file: str_(r[2]), fileName: str_(r[3]), slides: Number(r[4]) || 0,
    refs: refs, demo: refs.map(imgUrl_), updated: iso_(r[6]), payment: str_(r[7]), ref: str_(r[8]), paid: Number(r[9]) || 0, paidAt: iso_(r[10]) };
}
function customOf_(id) {
  return rows_(customSheet_()).filter(function (r) { return str_(r[0]) === String(id); }).map(customObj_)[0] || null;
}
function orderRow_(id) {
  return rows_(sheet_('Orders', ORDER_HEAD)).filter(function (x) { return String(x[1]) === String(id); })[0] || null;
}
const customDl_ = c => 'https://drive.google.com/uc?export=download&id=' + c.file;

/* ---------- admin ---------- */
function adminCustom_(a, d) {
  switch (a) {
    case 'adminCustomList': return { ok: true, items: rows_(customSheet_()).map(customObj_), payments: payOn_() };
    case 'adminCustomStart': return adminCustomStart_(d);
    case 'adminCustomSave': return withLock_(function () { return adminCustomSave_(d); });
    case 'adminCustomRemove': return withLock_(function () { return adminCustomRemove_(d); });
    case 'adminCustomPdf': return adminCustomPdf_(d);
    case 'adminCustomFile': return adminCustomFile_(d);
  }
  return null;
}
/* Demo slides ke liye: PPTX → Google Slides → PDF (Google khud slides banata hai, badi PPT par bhi chalta hai).
   Browser is PDF ke pehle 10 page ki photo banata hai. PDF temporary hai, save ke baad hat jati hai. */
function inCustomFolder_(id) {
  try { const p = DriveApp.getFileById(id).getParents(), fid = customFolder_().getId(); while (p.hasNext()) if (p.next().getId() === fid) return true; } catch (e) { }
  return false;
}
function adminCustomPdf_(d) {
  const c = customOf_(clip_(d.id, 30));
  if (!c || !c.file) return { ok: false, error: 'Is order par PPT file nahi hai' };
  if (/\.pdf$/i.test(c.fileName)) return { ok: true, pdf: c.file, keep: true };
  if (!/\.pptx?$/i.test(c.fileName)) return { ok: false, error: 'Sirf PPT / PPTX / PDF ka demo ban sakta hai' };
  const tok = ScriptApp.getOAuthToken();
  const cp = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + c.file + '/copy?supportsAllDrives=true&fields=id', {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ name: 'tmp-demo-' + c.id, mimeType: 'application/vnd.google-apps.presentation', parents: [customFolder_().getId()] }),
    headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
  if (cp.getResponseCode() >= 300) return { ok: false, error: 'Google PPT ko convert nahi kar paya (code ' + cp.getResponseCode() + ')' };
  const gid = JSON.parse(cp.getContentText()).id;
  try {
    const ex = UrlFetchApp.fetch('https://docs.google.com/presentation/d/' + gid + '/export/pdf', { headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
    if (ex.getResponseCode() >= 300) return { ok: false, error: 'PDF nahi bani (code ' + ex.getResponseCode() + ')' };
    const f = customFolder_().createFile(ex.getBlob().setName('Order ' + c.id + ' - demo.pdf'));
    return { ok: true, pdf: f.getId(), size: f.getSize() };
  } finally { try { DriveApp.getFileById(gid).setTrashed(true); } catch (e) { } }
}
function adminCustomFile_(d) {
  const id = clip_(d.file, 100);
  if (!/^[\w-]{10,100}$/.test(id) || !inCustomFolder_(id)) return { ok: false, error: 'File nahi mili' };
  const start = Math.max(0, Number(d.start) || 0), len = Math.min(8 * 1048576, Math.max(1, Number(d.len) || 1048576));
  const res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media&supportsAllDrives=true', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), Range: 'bytes=' + start + '-' + (start + len - 1) }, muteHttpExceptions: true });
  const code = res.getResponseCode();
  if (code === 416) return { ok: true, data: '', total: DriveApp.getFileById(id).getSize() };
  if (code >= 300) return { ok: false, error: 'File nahi padh paya (code ' + code + ')' };
  const total = Number((String(header_(res, 'Content-Range') || '').split('/')[1])) || DriveApp.getFileById(id).getSize();
  return { ok: true, data: Utilities.base64Encode(res.getBlob().getBytes()), total: total };
}
function adminCustomStart_(d) {
  const name = clip_(d.name, 200), ext = (name.split('.').pop() || '').toLowerCase(), size = Number(d.size) || 0;
  if (PPT_EXT.indexOf(ext) < 0) return { ok: false, error: 'Sirf PPT, PPTX, PDF ya ZIP file' };
  if (size < 1 || size > MAX_FILE_MB * 1048576) return { ok: false, error: 'File khaali hai ya ' + MAX_FILE_MB + ' MB se badi hai' };
  const res = UrlFetchApp.fetch(DRIVE_INIT, {
    method: 'post', contentType: 'application/json; charset=UTF-8',
    payload: JSON.stringify({ name: 'Order ' + clip_(d.id, 30) + ' - ' + name, parents: [customFolder_().getId()] }),
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Length': String(size), 'X-Upload-Content-Type': clip_(d.mime, 100) || 'application/octet-stream' },
    muteHttpExceptions: true, followRedirects: false
  });
  const loc = header_(res, 'Location');
  if (res.getResponseCode() !== 200 || !loc) return { ok: false, error: 'Drive upload shuru nahi hua (code ' + res.getResponseCode() + ')' };
  return { ok: true, session: loc };
}
function adminCustomSave_(d) {
  const id = clip_(d.id, 30), order = orderRow_(id);
  if (!id || !order) return { ok: false, error: 'Order nahi mila — refresh karein' };
  const price = Math.round(Number(d.price) * 100) / 100;
  if (!(price >= 1)) return { ok: false, error: 'Daam kam se kam ₹1 hona chahiye' };
  const sh = customSheet_(), old = customOf_(id);
  if (old && old.payment) return { ok: false, error: 'Is order ka payment ho chuka hai, ab PPT nahi badal sakte' };
  const file = clip_(d.file, 100) || (old ? old.file : '');
  if (!/^[\w-]{10,100}$/.test(file)) return { ok: false, error: 'PPT / PDF file upload karein' };
  let f; try { f = DriveApp.getFileById(file); } catch (e) { return { ok: false, error: 'File Drive mein nahi mili, dobara upload karein' }; }
  const refs = Array.isArray(d.refs) ? d.refs.map(cleanRef_).filter(String).slice(0, CUSTOM_DEMO) : (old ? old.refs : []);
  if (old) {
    trashDrive_(old.refs.filter(function (x) { return refs.indexOf(x) < 0; }));
    if (old.file && old.file !== file) { try { DriveApp.getFileById(old.file).setTrashed(true); } catch (e) { } }
  }
  const vals = [safe_(id), price, file, safe_(clip_(d.fileName, 200) || f.getName()), Math.max(0, Math.round(Number(d.slides) || 0)), refs.join('\n'), new Date(), '', '', '', ''];
  const tmp = clip_(d.tmp, 100);                        // demo ke liye bani temporary PDF hatao
  if (tmp && tmp !== file && inCustomFolder_(tmp)) { try { const tf = DriveApp.getFileById(tmp); if (/ - demo\.pdf$/.test(tf.getName())) tf.setTrashed(true); } catch (e) { } }
  if (old) sh.getRange(old.row, 1, 1, vals.length).setValues([vals]);
  else sh.appendRow(vals);
  // PPT ready → order "Done" (customer ko Track page par pay ka option dikhe)
  const st = String(order[13] || 'New');
  if (st === 'New' || st === 'In Progress' || st === '') sheet_('Orders', ORDER_HEAD).getRange(order.row, 14).setValue('Done');
  return { ok: true, item: customOf_(id), status: (st === 'New' || st === 'In Progress' || st === '') ? 'Done' : st };
}
function adminCustomRemove_(d) {
  const c = customOf_(clip_(d.id, 30));
  if (!c) return { ok: true };
  if (c.payment) return { ok: false, error: 'Payment ho chuka hai, ise hata nahi sakte' };
  trashDrive_(c.refs);
  if (c.file) { try { DriveApp.getFileById(c.file).setTrashed(true); } catch (e) { } }
  customSheet_().deleteRow(c.row);
  return { ok: true };
}

/* ---------- website (Track page) ---------- */
function customPublic_(d) {
  switch (d.action) {
    case 'customTrack': return customTrack_(d);
    case 'customPayOrder': return customPayOrder_(d);
    case 'customPayVerify': return customPayVerify_(d);
    case 'customPayQr': return customPayQr_(d);
    case 'customPayStatus': return customPayStatus_(d);
  }
  return { ok: false, error: 'Unknown action' };
}
/* order number + mobile dono milein tabhi kuch milta hai */
function customFind_(d) {
  const t = trackOrder_(d);
  if (!t.ok) return { t: t };
  return { t: t, c: customOf_(t.id), order: orderRow_(t.id) };
}
function customTrack_(d) {
  const x = customFind_(d), t = x.t, c = x.c;
  if (!t.ok || !c || !c.file) return t;
  if (t.status === 'Paid') t.download = customDl_(c);                         // pay ho gaya (online ya admin ne Paid kiya)
  else if (t.status === 'Done') t.ppt = { price: c.price, slides: c.slides, demo: c.demo.slice(0, CUSTOM_DEMO), type: (c.fileName.split('.').pop() || '').toLowerCase(), payments: payOn_() };
  if (t.download) { t.fileName = c.fileName; t.paymentId = c.payment; }
  return t;
}
function customReady_(d) {
  const x = customFind_(d);
  if (!x.t.ok) return x.t;
  if (!x.c || !x.c.file) return { ok: false, error: 'PPT abhi ready nahi hai.' };
  if (x.t.status === 'Paid') return { ok: true, paid: true, download: customDl_(x.c), paymentId: x.c.payment };
  if (x.t.status !== 'Done') return { ok: false, error: 'Is order ka payment abhi nahi ho sakta.' };
  if (!payOn_()) return { ok: false, error: 'Online payment abhi band hai. WhatsApp par baat karein.' };
  return { ok: true, x: x };
}
function customPayOrder_(d) {
  const r = customReady_(d); if (!r.ok || r.paid) return r;
  const t = r.x.t, c = r.x.c, o = r.x.order;
  try {
    const ro = rzp_('orders', { amount: Math.round(c.price * 100), currency: 'INR', receipt: 'cu_' + t.id + '_' + Date.now(), notes: { custom: t.id, name: str_(o[2]), phone: mob_(o[3]) } });
    return { ok: true, key: rzpKeys_().id, amount: ro.amount, rzpOrderId: ro.id, prefill: { name: str_(o[2]), contact: mob_(o[3]) }, title: 'Order #' + t.id + ' — ' + t.topic };
  } catch (e) { return { ok: false, error: 'Payment shuru nahi hua: ' + e.message }; }
}
function customPayVerify_(d) {
  const r = customReady_(d); if (!r.ok || r.paid) return r;
  const o = String(d.razorpay_order_id || ''), p = String(d.razorpay_payment_id || ''), s = String(d.razorpay_signature || '');
  if (!o || !p || hex_(Utilities.computeHmacSha256Signature(o + '|' + p, rzpKeys_().secret)) !== s) return { ok: false, error: 'Payment verify nahi hua. Paisa kata ho to WhatsApp karein.' };
  let ro; try { ro = rzp_('orders/' + encodeURIComponent(o)); } catch (e) { return { ok: false, error: 'Payment check nahi ho paya. WhatsApp karein, payment ID: ' + p }; }
  if (String((ro.notes || {}).custom) !== String(r.x.t.id)) return { ok: false, error: 'Ye payment is order ka nahi hai.' };
  return customPaid_(r.x, p, o, Number(ro.amount_paid || ro.amount) || 0);
}
/* Razorpay QR: amount fixed, ek baar chalne wala, 30 min tak. Wahi QR dobara mile (har refresh par naya nahi) */
function customPayQr_(d) {
  const r = customReady_(d); if (!r.ok || r.paid) return r;
  const t = r.x.t, c = r.x.c, amount = Math.round(c.price * 100), cache = CacheService.getScriptCache(), key = 'cqr_' + t.id + '_' + amount;
  const hit = cache.get(key); if (hit) return Object.assign({ ok: true }, JSON.parse(hit));
  let out;
  try {
    const q = rzp_('payments/qr_codes', { type: 'upi_qr', name: 'PPT Store', usage: 'single_use', fixed_amount: true, payment_amount: amount,
      description: 'Order #' + t.id, close_by: Math.floor(Date.now() / 1000) + 1800, notes: { custom: t.id } });
    out = { qrId: q.id, image: q.image_url, amount: amount };
  } catch (e) {
    /* Razorpay account mein "QR Codes" feature band ho to: Payment Link (amount fixed) ka QR — scan karte hi Razorpay page khulta hai */
    try {
      const o = r.x.order, ph = mob_(o[3]);
      const pl = rzp_('payment_links', { amount: amount, currency: 'INR', accept_partial: false, description: ('Order #' + t.id + ' — ' + t.topic).slice(0, 2000),
        expire_by: Math.floor(Date.now() / 1000) + 1800, customer: { name: str_(o[2]).slice(0, 60), contact: ph ? '+91' + ph : undefined },
        notify: { sms: false, email: false }, reminder_enable: false, notes: { custom: t.id } });
      out = { qrId: pl.id, link: pl.short_url, amount: amount };
    } catch (e2) { return { ok: false, noQr: true, error: 'QR nahi bana: ' + e2.message }; }
  }
  cache.put(key, JSON.stringify(out), 1500);
  return Object.assign({ ok: true }, out);
}
/* Track page har 4 sec poochta hai: QR se payment aaya? */
function customPayStatus_(d) {
  const r = customReady_(d); if (!r.ok || r.paid) return r;
  const qrId = String(d.qrId || '');
  if (/^plink_\w+$/.test(qrId)) {
    try {
      const pl = rzp_('payment_links/' + qrId);
      if (String((pl.notes || {}).custom) !== String(r.x.t.id)) return { ok: false, error: 'Ye link is order ka nahi hai.' };
      const pays = (pl.payments || []).filter(function (x) { return x.status === 'captured'; });
      if (pl.status !== 'paid' || Number(pl.amount_paid) < Math.round(r.x.c.price * 100) || !pays.length) return { ok: true, paid: false };
      return customPaid_(r.x, pays[0].payment_id, qrId, Number(pl.amount_paid) || 0);
    } catch (e) { return { ok: true, paid: false }; }
  }
  if (!/^qr_\w+$/.test(qrId)) return { ok: true, paid: false };
  try {
    const q = rzp_('payments/qr_codes/' + qrId);
    if (String((q.notes || {}).custom) !== String(r.x.t.id)) return { ok: false, error: 'Ye QR is order ka nahi hai.' };
    const list = rzp_('payments/qr_codes/' + qrId + '/payments').items || [];
    const p = list.filter(function (x) { return x.status === 'captured' && Number(x.amount) >= Math.round(r.x.c.price * 100); })[0];
    if (!p) return { ok: true, paid: false };
    return customPaid_(r.x, p.id, qrId, Number(p.amount) || 0);
  } catch (e) { return { ok: true, paid: false }; }
}
function customPaid_(x, paymentId, ref, paise) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  let c;
  try {
    c = customOf_(x.t.id);
    if (!c.payment) {
      customSheet_().getRange(c.row, 8, 1, 4).setValues([[paymentId, ref, paise / 100, new Date()]]);
      const o = orderRow_(x.t.id); if (o) sheet_('Orders', ORDER_HEAD).getRange(o.row, 14).setValue('Paid');
      try { DriveApp.getFileById(c.file).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { console.error(e); }
      bust_();
      mail_('💰 Custom PPT paid — ₹' + (paise / 100) + ' — Order #' + x.t.id,
        table_([['Order', '#' + esc_(x.t.id)], ['Customer', esc_(o ? str_(o[2]) : '')], ['Mobile', esc_(o ? mob_(o[3]) : '')], ['PPT', esc_(x.t.topic), true], ['Amount', '₹' + (paise / 100)], ['Payment ID', esc_(paymentId)]]));
      c.payment = paymentId;
    }
  } finally { lock.releaseLock(); }
  return { ok: true, paid: true, download: customDl_(c), paymentId: c.payment, fileName: c.fileName };
}
