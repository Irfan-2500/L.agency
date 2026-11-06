/* State Books: Admin Panel (Google Script) wali files website par.
   js/state-files.js ki entries + Admin Panel → State Books ki entries (admin wali jeetti hain).
   Pichhli baar ka data browser me yaad rehta hai, isliye page turant khulta hai; naya data aate hi "sbdata" event. */
(function(){
 var W = window;
 /* jagah ka naam: State Books me "Bihar" → "Bihar Board"; baaki menu (NCERT, CBSE…) me "NCERT › NCERT Solutions" → "NCERT Solutions" */
 W.sbLabel = function(s){ s = String(s || ""); var i = s.indexOf(" › "); return i < 0 ? s + " Board" : s.slice(i + 3); };
 W.sbGroup = function(s){ s = String(s || ""); var i = s.indexOf(" › "); return i < 0 ? "State Books" : s.slice(0, i); };
 var U = String((W.LA_CONFIG || {}).orderUrl || "").trim(), BASE = Object.assign({}, W.STATE_FILES || {});
 function use(m){ W.STATE_FILES = Object.assign({}, BASE, m || {}); }
 var old = null; try { old = JSON.parse(localStorage.getItem("la_sb") || "null"); } catch (e) {}
 use(old && old.files);
 W.SB_CACHED = !!(old && old.files);
 W.SB_READY = !U ? Promise.resolve(false) : fetch(U + (U.indexOf("?") < 0 ? "?" : "&") + "action=stateFiles", { cache: "no-store" })
  .then(function(r){ return r.json(); })
  .then(function(j){
   if (!j || !j.ok || !j.files) return false;
   var s = JSON.stringify(j.files), changed = !old || JSON.stringify(old.files) !== s;
   use(j.files);
   try { localStorage.setItem("la_sb", JSON.stringify({ t: Date.now(), files: j.files })); } catch (e) {}
   return changed;
  })
  .catch(function(){ return false; });
 W.SB_READY.then(function(changed){ if (changed) document.dispatchEvent(new Event("sbdata")); });
 /* Admin wali file ("drive:ID") ko tukdon me laana */
 var memo = {};
 W.SB_BLOB = function(ref, prog){
  if (memo[ref]) return memo[ref];
  var id = String(ref).slice(6);
  return memo[ref] = (async function(){
   var parts = [], start = 0, total = 1, mime = "";
   while (start < total) {
    var r = await fetch(U, { method: "POST", body: JSON.stringify({ action: "sbFile", id: id, start: start }), headers: { "Content-Type": "text/plain;charset=utf-8" } });
    var j = await r.json();
    if (!j.ok) throw new Error(j.error || "file");
    total = j.total; mime = j.mime || "";
    if (!j.data) break;
    var b = atob(j.data), a = new Uint8Array(b.length);
    for (var k = 0; k < b.length; k++) a[k] = b.charCodeAt(k);
    parts.push(a); start += a.length;
    if (prog) prog(Math.min(1, start / total));
   }
   return new Blob(parts, { type: mime });
  })().catch(function(e){ delete memo[ref]; throw e; });
 };
})();
