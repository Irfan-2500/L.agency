/* =====================================================================
   ORDERS v2 — Track page par customer ke saare orders, change request,
   aur Admin panel se customer ka order banana.
   Live project mein ye code Store.gs ke aakhir mein hai. Routing:
     customPublic_  → 'customMine', 'customChange' (+ customTrack mein changes)
     adminCustom_   → 'adminOrderNew', 'adminChanges', 'adminChangeSet'
   Sheet apne aap banti hai: "Change Requests".
   ===================================================================== */
const CHG_HEAD = ['Time', 'Order #', 'Name', 'Mobile', 'Request', 'Status (Open/Done)', 'Done at'];
function chgSheet_() { return sheet_('Change Requests', CHG_HEAD); }
function chgObj_(r) {
  return { row: r.row, time: iso_(r[0]), id: str_(r[1]), name: str_(r[2]), mobile: mob_(r[3]), text: str_(r[4]), status: str_(r[5]) === 'Done' ? 'Done' : 'Open', doneAt: iso_(r[6]) };
}
function chgOf_(id) { return rows_(chgSheet_()).map(chgObj_).filter(function (c) { return c.id === String(id); }); }
const chgPub_ = id => chgOf_(id).map(function (c) { return { time: c.time, text: c.text, status: c.status }; });

/* Track page: order number + mobile sahi ho to us mobile ke SAARE orders */
function customMine_(d) {
  const t = trackOrder_(d); if (!t.ok) return t;
  const phone = mob_(d.phone), custom = {};
  rows_(customSheet_()).forEach(function (r) { custom[str_(r[0])] = r; });
  const list = rows_(sheet_('Orders', ORDER_HEAD)).filter(function (x) { return mob_(x[3]) === phone; }).reverse().slice(0, 100).map(function (x) {
    const c = custom[String(x[1])];
    return { id: String(x[1]), time: iso_(x[0]), topic: str_(x[5]), slides: str_(x[7]), status: str_(x[13]) || 'New', ready: !!(c && str_(c[2])), price: c ? Number(c[1]) || 0 : 0 };
  });
  return { ok: true, orders: list };
}

/* Track page: PPT dekh kar badlav maangna. Order wapas "In Progress" ho jata hai */
function customChange_(d) {
  const t = trackOrder_(d); if (!t.ok) return t;
  if (t.status === 'Cancelled') return { ok: false, error: 'Ye order cancel ho chuka hai.' };
  const text = clip_(d.text, 2000);
  if (text.length < 3) return { ok: false, error: 'Kya badlav chahiye, thoda detail mein likhein.' };
  if (chgOf_(t.id).filter(function (c) { return c.status === 'Open'; }).length >= 10) return { ok: false, error: 'Pehle ke badlav abhi chal rahe hain. Thodi der baad try karein.' };
  const o = orderRow_(t.id);                                     // lock: customPublic_ mein withLock_
  chgSheet_().appendRow([new Date(), safe_(t.id), safe_(str_(o[2])), "'+91 " + mob_(o[3]), safe_(text), 'Open', '']);
  if (t.status === 'Done') sheet_('Orders', ORDER_HEAD).getRange(o.row, 14).setValue('In Progress');
  mail_('✏️ Change request — Order #' + t.id + ' — ' + str_(o[2]),
    table_([['Order', '#' + esc_(t.id)], ['Customer', esc_(str_(o[2]))], ['Mobile', esc_(mob_(o[3]))], ['PPT', esc_(t.topic), true], ['Badlav', esc_(text).replace(/\n/g, '<br>'), true]]));
  return { ok: true, status: t.status === 'Done' ? 'In Progress' : t.status, changes: chgPub_(t.id) };
}

/* ---------- admin ---------- */
function adminOrderNew_(d) {
  return saveOrder_({ name: d.name, phone: d.phone, topic: d.topic, theme: d.theme, slides: d.slides, language: d.language, details: d.details, source: 'Admin panel' });
}
function adminChanges_() { return { ok: true, changes: rows_(chgSheet_()).map(chgObj_).reverse() }; }
function adminChangeSet_(d) {
  const sh = chgSheet_(), row = Number(d.row);
  if (!(row >= 2 && row <= sh.getLastRow()) || str_(sh.getRange(row, 2).getValue()) !== String(d.id)) return { ok: false, error: 'Sheet changed — please refresh' };
  const done = d.status === 'Done';
  sh.getRange(row, 6, 1, 2).setValues([[done ? 'Done' : 'Open', done ? new Date() : '']]);
  return { ok: true };
}
