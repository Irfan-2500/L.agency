/* ===== Poora chapter preview: har Ready PPT ki SAARI slides ki photo =====
   Photo admin panel banata hai (Google Slides → PDF → har page ki photo → adminImage), yahan sirf list rakhte hain.
   Public:  GET  ?action=pvsGet&id=12      → { ok, id, n, imgs:[url,...] }   (preview kholne par hi aata hai, products list halki rehti hai)
   Admin:   POST pvsSave {id, imgs, n}  ·  pvsList → { ids:{id:n} }  ·  pvsDelete {id}
   Code.gs mein do line chahiye:
     doGet  ke shuru mein:  if (e && e.parameter && e.parameter.action === 'pvsGet') return json_(pvsGet_(e.parameter.id));
     doPost mein (team wali line ke paas):  if (/^pvs/.test(String(d.action))) return json_(pvs_(d));          */

const PVS_SHEET = 'PPT Slides';

function pvsSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(PVS_SHEET);
  if (!sh) { sh = ss.insertSheet(PVS_SHEET); sh.appendRow(['PPT id', 'Slides', 'Photos (JSON)', 'Updated']); sh.setFrozenRows(1); }
  return sh;
}
function pvsRows_() {
  const sh = pvsSheet_(), n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, 3).getValues();
}
function pvsGet_(id) {
  id = String(id || '').replace(/\D/g, ''); if (!id) return { ok: false, error: 'id?' };
  const c = CacheService.getScriptCache(), k = 'pvs_' + id, hit = c.get(k);
  if (hit) return JSON.parse(hit);
  const row = pvsRows_().find(r => String(r[0]) === id);
  let imgs = []; try { imgs = row ? JSON.parse(row[2] || '[]') : []; } catch (e) { imgs = []; }
  const out = { ok: true, id: +id, n: row ? +row[1] || imgs.length : 0, imgs: imgs };
  try { c.put(k, JSON.stringify(out), 21600); } catch (e) { }
  return out;
}
function pvs_(d) {
  try {
    if (!tokenOk_(d.token)) return { ok: false, auth: true, error: 'Login expired. Please login again.' };
    const a = String(d.action);
    if (a === 'pvsList') { const ids = {}; pvsRows_().forEach(r => { ids[String(r[0])] = +r[1] || 0; }); return { ok: true, ids: ids }; }
    const id = String(d.id || '').replace(/\D/g, ''); if (!id) return { ok: false, error: 'PPT id nahi mila' };
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const sh = pvsSheet_(), rows = pvsRows_(), i = rows.findIndex(r => String(r[0]) === id);
      if (a === 'pvsDelete') { if (i >= 0) sh.deleteRow(i + 2); }
      else if (a === 'pvsSave') {
        const imgs = (Array.isArray(d.imgs) ? d.imgs : []).slice(0, 400)
          .map(u => String(u || '').trim()).map(u => /^(https:\/\/|data:image\/)/.test(u) && u.length < 2000 ? u : '');
        const v = [[+id, Math.max(+d.n || 0, imgs.length), JSON.stringify(imgs), new Date()]];
        if (i >= 0) sh.getRange(i + 2, 1, 1, 4).setValues(v); else sh.appendRow(v[0]);
      } else return { ok: false, error: 'Unknown admin action: ' + a };
    } finally { lock.releaseLock(); }
    CacheService.getScriptCache().remove('pvs_' + id);
    return { ok: true, id: +id };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}
