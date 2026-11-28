/* =====================================================================
   MY ACCOUNT — ek hi login mein kharidi PPTs + custom orders (website changes #6)
   account.html par email OTP se login karne wale ko usi mobile ke custom orders bhi dikhte hain
   (order number nahi poochhna padta). Custom order wale bina kharidi PPT ke: mobile + order number
   se login (customMine, pehle se hai).
   Live project mein ye code Store.gs ke aakhir mein (ya alag file "Account.gs") rakhein. Routing —
   doPost ke switch mein, 'acctMe' wali line ke paas:
     case 'acctOrders': return json_(acctOrders_(d));
   (Ye na lage to bhi website chalti hai: tab OTP wale ko orders ke liye ek baar order number daalna padta hai.)
   ===================================================================== */
function acctOrders_(d) {
  const t = String(d.token || '').split('.');
  if (t.length !== 2 || Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(t[0], acctSecret_())) !== t[1]) return { ok: false, error: 'Login expire ho gaya.' };
  const o = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(t[0])).getDataAsString());
  if (Date.now() - o.t > 60 * 864e5) return { ok: false, error: 'Login expire ho gaya.' };
  let mobile = o.k.indexOf('@') > 0 ? '' : o.k;
  if (!mobile) { const s = salesOf_(o.k); mobile = s.length ? mob_(s[s.length - 1][5]) : ''; }   // email se login: kharidte waqt bhara mobile
  if (!/^[6-9]\d{9}$/.test(mobile)) return { ok: true, orders: [] };
  const custom = {}; rows_(customSheet_()).forEach(function (r) { custom[str_(r[0])] = r; });
  const mine = rows_(sheet_('Orders', ORDER_HEAD)).filter(function (x) { return mob_(x[3]) === mobile; });
  const orders = mine.slice().reverse().slice(0, 100).map(function (x) {
    const c = custom[String(x[1])];
    return { id: String(x[1]), time: iso_(x[0]), topic: str_(x[5]), slides: str_(x[7]), status: str_(x[13]) || 'New', ready: !!(c && str_(c[2])), price: c ? Number(c[1]) || 0 : 0 };
  });
  return { ok: true, phone: mobile, name: mine.length ? str_(mine[mine.length - 1][2]).split(' ')[0] : '', orders: orders };
}
