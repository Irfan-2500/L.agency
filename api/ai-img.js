/* AI PPT ke liye topic wali photo (Pexels, free).
   Vercel env: PEXELS_API_KEY (pexels.com/api se free key). Key na ho to slides bina photo ke bante hain. */
const KEY = (process.env.PEXELS_API_KEY || "").trim();
const send = (res, code, obj) => res.status(code).setHeader("Cache-Control", code === 200 ? "public, max-age=86400" : "no-store").json(obj);

module.exports = async (req, res) => {
  if (!KEY) return send(res, 404, { ok: false });
  const q = String((req.query && req.query.q) || "").replace(/[^\w\s-]/g, " ").trim().slice(0, 60);
  if (q.length < 2) return send(res, 400, { ok: false });
  try {
    const r = await fetch("https://api.pexels.com/v1/search?per_page=3&orientation=landscape&query=" + encodeURIComponent(q), { headers: { Authorization: KEY } });
    const j = await r.json();
    const p = (j.photos || [])[0];
    if (!p) return send(res, 404, { ok: false });
    send(res, 200, { ok: true, url: p.src.large, by: p.photographer, link: p.url });
  } catch (e) { send(res, 502, { ok: false }); }
};
