/* Download: link ki signature + expiry check, phir PPT file par bhejo */
const { CATALOG, enabled, hmac, same, fileUrl } = require("./_pay.js");

module.exports = (req, res) => {
  const { o = "", p = "", i = "", e = "", t = "" } = req.query || {};
  const prod = CATALOG.find(x => String(x.id) === String(i));
  const ok = enabled() && prod && same(String(t), hmac(`dl|${o}|${p}|${i}|${e}`));
  res.setHeader("Cache-Control", "no-store");
  if (!ok) return res.status(403).send("Download link galat hai.");
  if (Number(e) < Date.now() / 1000) return res.status(410).send("Download link expire ho gaya. WhatsApp par payment ID bhejein, naya link milega.");
  res.redirect(302, fileUrl(prod));
};
