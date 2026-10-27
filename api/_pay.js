/* Vercel par Razorpay (Hostinger/PHP ke bina).
   Vercel → Settings → Environment Variables mein ye do daalein: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
   Asli PPT file ka link (optional): PPT_LINKS = {"photosynthesis":"https://drive.google.com/...", ...}
   Link na ho to demo/ppt/<slug>.pptx di jati hai. */
const crypto = require("crypto");
const CATALOG = require("../catalog.js");

const KEY_ID = (process.env.RAZORPAY_KEY_ID || "").trim();   // paste karte waqt aaye space hata do
const SECRET = (process.env.RAZORPAY_KEY_SECRET || "").trim();
const LINK_DAYS = 7;   // download link kitne din chalega

/* Key ID rzp_live_/rzp_test_ se shuru na ho to Razorpay band, website UPI QR + UTR par chalti rahe */
const enabled = () => /^rzp_(live|test)_/.test(KEY_ID) && !!SECRET;
const hmac = s => crypto.createHmac("sha256", SECRET).update(s).digest("hex");
const same = (a, b) => typeof a === "string" && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const send = (res, code, obj) => res.status(code).setHeader("Cache-Control", "no-store").json(obj);

async function rzp(path, body){
  const r = await fetch("https://api.razorpay.com/v1/" + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: "Basic " + Buffer.from(KEY_ID + ":" + SECRET).toString("base64"), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.description) || "Razorpay error");
  return j;
}

/* Download link: order + payment + PPT + expiry par signature, taaki koi link bana na sake */
function dlLink(orderId, paymentId, id){
  const exp = Math.floor(Date.now() / 1000) + LINK_DAYS * 86400;
  const t = hmac(`dl|${orderId}|${paymentId}|${id}|${exp}`);
  return `/api/pay-dl?o=${encodeURIComponent(orderId)}&p=${encodeURIComponent(paymentId)}&i=${id}&e=${exp}&t=${t}`;
}
function fileUrl(p){
  let links = {}; try { links = JSON.parse(process.env.PPT_LINKS || "{}"); } catch(e) {}
  return links[p.slug] || links[p.id] || `/demo/ppt/${p.slug}.pptx`;
}

module.exports = { CATALOG, KEY_ID, enabled, hmac, same, send, rzp, dlLink, fileUrl };
