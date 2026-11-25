/* Sirf PREVIEW / TEST ke liye: Google Apps Script ki nakli services (Sheets, Drive, Cache...) taaki
   google-script/Team.gs bina Google ke browser / Node mein chal sake. Asli website par ye load nahi hota. */
(function (root) {
  const LS = (() => { try { return root.localStorage; } catch (e) { return null; } })();
  const KEY = "la_gas_demo";
  let S = null;
  try { S = LS ? JSON.parse(LS.getItem(KEY) || "null") : null; } catch (e) { S = null; }
  if (!S) S = { sheets: {}, props: {}, cache: {}, files: {}, folders: {}, ups: {}, n: 1 };
  if (!S.blob) S.blob = {};
  const BYTES = new Proxy({}, { get: (o, k) => S.blob[k] ? b64d(S.blob[k]) : undefined, set: (o, k, v) => { S.blob[k] = b64e(v); return true; } });   // chhoti file ka content
  const save = () => { if (LS) try { LS.setItem(KEY, JSON.stringify(S)); } catch (e) { } };

  /* ---- sha256 / hmac (sync) ---- */
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const utf8 = s => Array.from(new TextEncoder().encode(String(s)));
  function sha(bytes) {
    const m = bytes.slice(), l = m.length * 8; m.push(0x80); while (m.length % 64 !== 56) m.push(0);
    for (let i = 7; i >= 0; i--) m.push(Math.floor(l / Math.pow(2, i * 8)) & 255);
    const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], w = new Array(64), r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < m.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
      for (let i = 16; i < 64; i++) { const s0 = r(w[i-15], 7) ^ r(w[i-15], 18) ^ (w[i-15] >>> 3), s1 = r(w[i-2], 17) ^ r(w[i-2], 19) ^ (w[i-2] >>> 10); w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
      [a, b, c, d, e, f, g, h].forEach((v, i) => H[i] = (H[i] + v) | 0);
    }
    const out = []; H.forEach(v => out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255)); return out;
  }
  function hmac(msg, key) {
    let k = utf8(key); if (k.length > 64) k = sha(k); while (k.length < 64) k.push(0);
    return sha(k.map(x => x ^ 0x5c).concat(sha(k.map(x => x ^ 0x36).concat(utf8(msg)))));
  }
  const signed = a => a.map(x => x > 127 ? x - 256 : x);
  const b64e = a => { let s = ""; const u = Uint8Array.from(a.map(x => (x + 256) % 256)); for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); };
  const b64d = s => Array.from(atob(s), c => c.charCodeAt(0));
  const uuid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });

  /* ---- Sheets ---- */
  function sheet(name) {
    const rows = () => S.sheets[name];
    const range = (r, c, nr, nc) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => ((rows()[r - 1 + i] || [])[c - 1 + j]) ?? "")),
      setValues: v => { v.forEach((row, i) => { const R = rows()[r - 1 + i] || (rows()[r - 1 + i] = []); row.forEach((x, j) => R[c - 1 + j] = x instanceof Date ? x.toISOString() : x); }); save(); return range(r, c, nr, nc); },
      setFontWeight() { return this; }, setBackground() { return this; }, setNumberFormat() { return this; }
    });
    return { getRange: range, appendRow: v => { rows().push(v.map(x => x instanceof Date ? x.toISOString() : x)); save(); }, getLastRow: () => rows().length,
      deleteRow: n => { rows().splice(n - 1, 1); save(); }, setFrozenRows() { }, getName: () => name };
  }
  const SS = { getSheetByName: n => S.sheets[n] ? sheet(n) : null, insertSheet: n => { S.sheets[n] = []; save(); return sheet(n); } };

  /* ---- Drive ---- */
  const folder = id => ({ getId: () => id, isTrashed: () => false, getName: () => S.folders[id] });
  function file(id) {
    const f = S.files[id]; if (!f || f.trashed) throw new Error("File not found: " + id);
    return { getId: () => id, getName: () => f.name, getSize: () => f.size, setTrashed: t => { f.trashed = !!t; save(); }, isTrashed: () => !!f.trashed,
      getParents: () => ({ next: () => folder(f.parent), hasNext: () => true }),
      makeCopy: (name, fo) => { const nid = "F" + (S.n++) + "demofile00"; S.files[nid] = { name, size: f.size, parent: fo.getId() }; if (BYTES[id]) BYTES[nid] = BYTES[id]; save(); return file(nid); } };
  }
  const resp = (code, body, headers) => ({ getResponseCode: () => code, getContentText: () => typeof body === "string" ? body : JSON.stringify(body || {}), getHeaders: () => headers || {},
    getContent: () => Array.isArray(body) ? body : [] });

  root.ss_ = () => SS;
  root.tokenOk_ = t => t === "demo";
  root.SpreadsheetApp = { getActiveSpreadsheet: () => SS };
  root.Utilities = { getUuid: uuid, DigestAlgorithm: { SHA_256: "sha256" }, computeDigest: (a, s) => signed(sha(utf8(s))), computeHmacSha256Signature: (m, k) => signed(hmac(m, k)),
    base64Encode: b64e, base64Decode: b64d, formatDate: d => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }) };
  root.CacheService = { getScriptCache: () => ({ get: k => { const c = S.cache[k]; return c && c.e > Date.now() ? c.v : null; }, put: (k, v, s) => { S.cache[k] = { v: String(v), e: Date.now() + (s || 600) * 1000 }; save(); }, remove: k => { delete S.cache[k]; save(); } }) };
  root.PropertiesService = { getScriptProperties: () => ({ getProperty: k => S.props[k] ?? null, setProperty: (k, v) => { S.props[k] = String(v); save(); }, deleteProperty: k => { delete S.props[k]; save(); } }) };
  root.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
  root.ScriptApp = { getOAuthToken: () => "demo" };
  root.DriveApp = { createFolder: n => { const id = "D" + (S.n++) + "demofolder0"; S.folders[id] = n; save(); return folder(id); }, getFolderById: id => { if (!S.folders[id]) throw new Error("no folder"); return folder(id); }, getFileById: file };
  root.UrlFetchApp = { fetch(url, o) {
    o = o || {}; const h = o.headers || {};
    if (/uploadType=resumable/.test(url)) { const meta = JSON.parse(o.payload), id = "U" + (S.n++); S.ups[id] = { name: meta.name, parent: meta.parents[0], size: +h["X-Upload-Content-Length"], got: 0 }; save(); return resp(200, "", { Location: "demo://upload/" + id }); }
    let m = /^demo:\/\/upload\/(\w+)$/.exec(url);
    if (m) { const u = S.ups[m[1]], pay = o.payload || [], cr = /bytes (\d+)-(\d+)\/(\d+)/.exec(h["Content-Range"] || ""); if (!u || !cr) return resp(404, "");
      u.buf = (u.buf || []).concat(u.size < 3e6 ? pay : []); u.got = +cr[2] + 1; save();
      if (u.got < u.size) return resp(308, "", { Range: "bytes=0-" + (u.got - 1) });
      const fid = "F" + (S.n++) + "demofile00"; S.files[fid] = { name: u.name, size: u.size, parent: u.parent }; if (u.buf.length) BYTES[fid] = u.buf; delete S.ups[m[1]]; save();
      return resp(200, { id: fid, name: u.name, size: String(u.size) }); }
    m = /\/drive\/v3\/files\/([^?]+)\?alt=media/.exec(url);
    if (m) { const id = decodeURIComponent(m[1]), f = S.files[id]; if (!f || f.trashed) return resp(404, ""); const rg = /bytes=(\d+)-(\d+)/.exec(h.Range || ""), a = +rg[1], b = Math.min(+rg[2], f.size - 1);
      if (a >= f.size) return resp(416, ""); const all = BYTES[id] || [], part = Array.from({ length: b - a + 1 }, (_, i) => all[a + i] || 0);
      return resp(206, part, { "Content-Range": `bytes ${a}-${b}/${f.size}` }); }
    return resp(404, "");
  } };
  root.GAS_DEMO_LOAD = () => { try { const x = LS && JSON.parse(LS.getItem(KEY) || "null"); if (x) { S = x; if (!S.blob) S.blob = {}; } } catch (e) { } };   // doosre tab ke badlav
  root.GAS_DEMO_RESET = () => { if (LS) LS.removeItem(KEY); };
  root.GAS_DEMO_STATE = () => S;
})(typeof window !== "undefined" ? window : globalThis);
