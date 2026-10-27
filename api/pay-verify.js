/* Payment ke baad: Razorpay signature check, phir order se PPT list nikaal kar download links */
const { CATALOG, enabled, hmac, same, send, rzp, dlLink } = require("./_pay.js");

module.exports = async (req, res) => {
  if (req.method !== "POST" || !enabled()) return send(res, 400, { ok: false, error: "Payment check nahi ho paya." });
  const { razorpay_order_id: o, razorpay_payment_id: p, razorpay_signature: s } = req.body || {};
  if (!o || !p || !same(s, hmac(`${o}|${p}`))) return send(res, 400, { ok: false, error: "Payment verify nahi hua. Paisa kata ho to WhatsApp karein." });
  try {
    const order = await rzp("orders/" + encodeURIComponent(o));
    const ids = String((order.notes && order.notes.items) || "").split(",").map(Number);
    const links = ids.map(id => CATALOG.find(x => x.id === id)).filter(Boolean).map(x => ({ title: x.title, url: dlLink(o, p, x.id) }));
    send(res, 200, { ok: true, orderId: o.replace(/^order_/, ""), paymentId: p, links });
  } catch (e) { send(res, 502, { ok: false, error: "Payment ho gaya, par link nahi bana. WhatsApp karein, payment ID: " + p }); }
};
