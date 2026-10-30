/* Razorpay order: daam server par catalog.js se, customer badal nahi sakta */
const { CATALOG, KEY_ID, enabled, send, rzp } = require("./_pay.js");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "POST only" });
  if (!enabled()) return send(res, 503, { ok: false, error: "Online payment abhi band hai." });
  const b = req.body || {};
  if (b.website) return send(res, 400, { ok: false, error: "Spam" });
  const name = String(b.name || "").trim().slice(0, 80), email = String(b.email || "").trim().toLowerCase().slice(0, 120);
  const phone = String(b.phone || "").replace(/\D/g, "").slice(-10);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[6-9]\d{9}$/.test(phone))
    return send(res, 400, { ok: false, error: "Naam, mobile aur email sahi bharein." });
  const ids = [...new Set((Array.isArray(b.items) ? b.items : []).map(Number))];
  const items = ids.map(id => CATALOG.find(p => p.id === id)).filter(Boolean);
  if (!items.length || items.length !== ids.length) return send(res, 400, { ok: false, error: "PPT nahi mili. Page refresh karein." });
  const amount = items.reduce((s, p) => s + Math.round(p.price * 100), 0);
  try {
    const o = await rzp("orders", { amount, currency: "INR", receipt: "la_" + Date.now(),
      notes: { items: items.map(p => p.id).join(","), name, email, phone } });
    send(res, 200, { ok: true, key: KEY_ID, amount, rzpOrderId: o.id, name: "PPT Store", prefill: { name, email, contact: phone } });
  } catch (e) { send(res, 502, { ok: false, error: "Payment shuru nahi hua: " + e.message }); }
};
