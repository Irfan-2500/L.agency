/* =====================================================================
   TEAM ORDERS — team members, task assign, notes, history, Project Library
   Ye file Google Apps Script project mein "Team.gs" naam se rakhein.
   Code.gs ke doPost mein ek line chahiye (Unknown action se pehle):
     if (/^team/.test(String(d.action))) return json_(team_(d));
   Sheets apne aap bante hain: "Team", "Team Tasks", "Library".
   Salary par team hai, isliye kisi task mein paisa / payment nahi.
   ===================================================================== */
const TEAM_VER = 1;
const TEAM_ACCEPT_MIN = 60;            // itne minute mein Accept nahi kiya to task wapas "Unassigned"
const TEAM_TOKEN_DAYS = 30;
const TEAM_ORIGINS = /^https:\/\/(www\.)?pptstore\.in$|^https:\/\/[\w-]+\.vercel\.app$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const TEAM_ROLES = ['PPT', 'Design', 'PPT + Design'];

function team_(d) {
  try { return teamRoute_(d); }
  catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}
function teamRoute_(d) {
  const a = String(d.action || '');
  if (a === 'teamLogin') return teamLogin_(d);
  if (a === 'teamUpChunk') return teamUpChunk_(d);          // session id hi chaabi hai
  if (/^teamAdmin|^teamMember|^teamAssign$|^teamReview$|^teamLibDelete$/.test(a)) {
    if (!tokenOk_(d.token)) return { ok: false, auth: true, error: 'Login expired. Please login again.' };
    return teamAdminAct_(a, d);
  }
  // team member (ya admin, jo apna token bheje)
  const who = teamWho_(d);
  if (!who) return { ok: false, auth: true, error: 'Login expired. Please login again.' };
  switch (a) {
    case 'teamMe': return teamMe_(who);
    case 'teamAct': return teamAct_(who, d);
    case 'teamNote': return teamNote_(who, d);
    case 'teamCheck': return teamCheck_(who, d);
    case 'teamUpStart': return teamUpStart_(who, d);
    case 'teamUpDone': return teamUpDone_(who, d);
    case 'teamFile': return teamFile_(who, d);
    case 'teamLib': return { ok: true, lib: teamLibList_() };
    case 'teamLibSave': return teamLibSave_(who, d);
    case 'teamLibTask': return teamLibTask_(who, d);
    case 'teamPass': return teamPass_(who, d);
  }
  return { ok: false, error: 'Unknown team action' };
}

/* ---------- sheets (har row: kuch padhne layak columns + poora JSON) ---------- */
function tSheet_(name, head) {
  const ss = ss_(); let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#ede9fe'); sh.setFrozenRows(1); }
  return sh;
}
const T_MEM = ['ID', 'Name', 'WhatsApp', 'Role', 'Login', 'Active', 'Updated', 'JSON'];
const T_TASK = ['ID', 'Order', 'Member', 'Status', 'Deadline', 'Topic', 'Updated', 'JSON'];
const T_LIB = ['ID', 'Title', 'Class', 'Subject', 'Theme', 'Slides', 'Updated', 'JSON'];
function tAll_(name, head) {
  const sh = tSheet_(name, head), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, head.length, n, 1).getValues().map((r, i) => { try { const o = JSON.parse(r[0] || '{}'); o._row = i + 2; return o; } catch (e) { return null; } }).filter(o => o && o.id);
}
function tPut_(name, head, o, cols) {
  const sh = tSheet_(name, head), copy = Object.assign({}, o); delete copy._row;
  const vals = cols(o).map(v => v == null ? '' : String(v).slice(0, 300)).concat([new Date(), JSON.stringify(copy)]);
  if (o._row) sh.getRange(o._row, 1, 1, vals.length).setValues([vals]);
  else { sh.appendRow(vals); o._row = sh.getLastRow(); }
  return o;
}
function tDel_(name, head, o) { if (o && o._row) tSheet_(name, head).deleteRow(o._row); }
const memCols_ = m => [m.id, m.name, m.wa, m.role, m.login, m.active ? 'Yes' : 'No'];
const taskCols_ = t => [t.id, t.orderId || '', t.memberName || '', t.status, t.deadline || '', (t.data || {}).topic || ''];
const libCols_ = l => [l.id, l.title, l.cls, l.subject, l.theme, l.slides];
const tMembers_ = () => tAll_('Team', T_MEM);
const tTasks_ = () => tAll_('Team Tasks', T_TASK);
const tLib_ = () => tAll_('Library', T_LIB);
const tSaveMem_ = m => tPut_('Team', T_MEM, m, memCols_);
const tSaveTask_ = t => tPut_('Team Tasks', T_TASK, t, taskCols_);
const tSaveLib_ = l => tPut_('Library', T_LIB, l, libCols_);
const tStr_ = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n || 200);
const tNow_ = () => new Date().toISOString();
const tId_ = p => p + '-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();
function tLock_(fn) { const l = LockService.getScriptLock(); l.waitLock(20000); try { return fn(); } finally { l.releaseLock(); } }
function tFolder_(key, name) {
  const p = PropertiesService.getScriptProperties(), id = p.getProperty(key);
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) { } }
  const f = DriveApp.createFolder(name); p.setProperty(key, f.getId()); return f;
}
const teamFolder_ = () => tFolder_('TEAM_FOLDER_ID', 'PPT Store — Team uploads');
const libFolder_ = () => tFolder_('LIB_FOLDER_ID', 'PPT Store — Project Library');

/* ---------- login / token ---------- */
function tSecret_() {
  const p = PropertiesService.getScriptProperties(); let s = p.getProperty('TEAM_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('TEAM_SECRET', s); }
  return s;
}
const tHex_ = b => b.map(x => ((x + 256) % 256).toString(16).padStart(2, '0')).join('');
function tHash_(pw, salt) { let h = salt + '|' + pw; for (let i = 0; i < 300; i++) h = tHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt)); return h; }
function tSign_(txt) { return tHex_(Utilities.computeHmacSha256Signature(txt, tSecret_())).slice(0, 40); }
function tToken_(m) { const exp = Date.now() + TEAM_TOKEN_DAYS * 864e5, body = m.id + '.' + exp + '.' + (m.tv || 0); return body + '.' + tSign_(body); }
function teamWho_(d) {
  const t = String(d.tt || '');
  if (t) {
    const p = t.split('.'); if (p.length !== 4) return null;
    const body = p.slice(0, 3).join('.'); if (tSign_(body) !== p[3] || +p[1] < Date.now()) return null;
    const m = tMembers_().find(x => x.id === p[0]);
    if (!m || !m.active || String(m.tv || 0) !== p[2]) return null;
    return { member: m, admin: false };
  }
  if (d.token && tokenOk_(d.token)) return { member: { id: 'admin', name: 'Admin' }, admin: true };
  return null;
}
function teamLogin_(d) {
  const login = tStr_(d.login, 60).toLowerCase(), pw = String(d.password || '');
  if (!login || !pw) return { ok: false, error: 'Login ID aur password daalein' };
  const c = CacheService.getScriptCache(), k = 'tl_' + login, fails = +(c.get(k) || 0);
  if (fails >= 8) return { ok: false, error: 'Bahut baar galat password. 15 minute baad try karein.' };
  const m = tMembers_().find(x => String(x.login).toLowerCase() === login);
  if (!m || !m.hash || tHash_(pw, m.salt) !== m.hash) { c.put(k, String(fails + 1), 900); return { ok: false, error: 'Login ID ya password galat hai' }; }
  if (!m.active) return { ok: false, error: 'Aapka login band hai. Admin se baat karein.' };
  c.remove(k);
  m.lastLogin = tNow_(); tSaveMem_(m);
  return { ok: true, tt: tToken_(m), me: tMemPublic_(m) };
}
const tMemPublic_ = m => ({ id: m.id, name: m.name, role: m.role, login: m.login, wa: m.wa, active: !!m.active, added: m.added, lastLogin: m.lastLogin || '' });
function teamPass_(who, d) {
  if (who.admin) return { ok: false, error: 'Admin password Settings se badlein' };
  const m = who.member, nw = String(d.password || '');
  if (tHash_(String(d.old || ''), m.salt) !== m.hash) return { ok: false, error: 'Purana password galat hai' };
  if (nw.length < 6) return { ok: false, error: 'Naya password kam se kam 6 akshar' };
  m.salt = Utilities.getUuid(); m.hash = tHash_(nw, m.salt); m.tv = (+m.tv || 0) + 1; tSaveMem_(m);
  return { ok: true, tt: tToken_(m) };
}

/* ---------- tasks ---------- */
function tHist_(t, who, text) { t.hist = (t.hist || []).concat([{ t: tNow_(), by: who, x: tStr_(text, 300) }]).slice(-80); }
/* 1 ghante mein Accept nahi kiya → task wapas Unassigned (padhte waqt hi check, alag trigger nahi chahiye) */
function tExpire_(list) {
  const lim = TEAM_ACCEPT_MIN * 6e4;
  list.forEach(t => {
    if (t.status === 'Assigned' && t.assignedAt && Date.now() - new Date(t.assignedAt).getTime() > lim) {
      tHist_(t, 'System', `${t.memberName || 'Member'} ne ${TEAM_ACCEPT_MIN} minute mein Accept nahi kiya, task wapas Unassigned`);
      t.status = 'Unassigned'; t.lastMember = t.member; t.member = ''; t.memberName = ''; t.assignedAt = '';
      tSaveTask_(t);
    }
  });
  return list;
}
/* team ko customer ka phone / email kabhi nahi dikhta (wo task mein save hi nahi hota) */
function tTaskFor_(t) {
  const o = Object.assign({}, t); delete o._row;
  o.refs = (t.refs || []).map(r => ({ id: r.id, name: r.name }));
  return o;
}
function teamMe_(who) {
  if (who.admin) return { ok: false, error: 'Admin ke liye Admin panel kholiye' };
  const me = who.member, all = tLock_(() => tExpire_(tTasks_()));
  return { ok: true, me: tMemPublic_(me), tasks: all.filter(t => t.member === me.id || (t.done && t.doneBy === me.id)).map(tTaskFor_), now: tNow_(), acceptMin: TEAM_ACCEPT_MIN };
}
function tMine_(who, id) {
  const t = tTasks_().find(x => x.id === String(id || ''));
  if (!t) throw new Error('Task nahi mila');
  if (!who.admin && t.member !== who.member.id) throw new Error('Ye task aapka nahi hai');
  return t;
}
function teamAct_(who, d) {
  return tLock_(() => {
    const t = tExpire_([tMine_(who, d.id)])[0], act = String(d.act || ''), nm = who.member.name, note = tStr_(d.note, 500);
    if (t.member !== who.member.id && !who.admin) throw new Error('Ye task ab aapke paas nahi hai');
    const from = t.status;
    if (act === 'accept' && from === 'Assigned') { t.status = 'Accepted'; t.acceptedAt = tNow_(); tHist_(t, nm, 'Task accept kiya'); }
    else if (act === 'decline' && from === 'Assigned') { tHist_(t, nm, 'Task mana kiya' + (note ? ': ' + note : '')); t.status = 'Unassigned'; t.lastMember = t.member; t.member = ''; t.memberName = ''; t.assignedAt = ''; }
    else if (act === 'start' && /^(Accepted|Changes)$/.test(from)) { t.status = 'Working'; if (!t.startedAt) t.startedAt = tNow_(); tHist_(t, nm, from === 'Changes' ? 'Changes par kaam shuru' : 'Kaam shuru kiya'); }
    else if (act === 'submit' && /^(Working|Accepted|Changes)$/.test(from)) {
      if (!t.file) throw new Error('Pehle final file upload karein');
      t.status = 'Review'; t.submittedAt = tNow_(); if (!t.startedAt) t.startedAt = t.acceptedAt || t.submittedAt;
      tHist_(t, nm, 'Review ke liye bheja' + (note ? ': ' + note : ''));
    }
    else throw new Error(`Abhi "${from}" hai, ye kaam nahi ho sakta`);
    tSaveTask_(t);
    return { ok: true, task: tTaskFor_(t) };
  });
}
function teamNote_(who, d) {
  return tLock_(() => {
    const t = tMine_(who, d.id), x = tStr_(d.text, 1000); if (!x) throw new Error('Note likhein');
    t.notes = (t.notes || []).concat([{ t: tNow_(), by: who.member.name, admin: !!who.admin, x }]).slice(-100);
    tSaveTask_(t); return { ok: true, task: tTaskFor_(t) };
  });
}
function teamCheck_(who, d) {
  return tLock_(() => {
    const t = tMine_(who, d.id), list = Array.isArray(d.checklist) ? d.checklist : [];
    t.checklist = list.slice(0, 30).map(c => ({ x: tStr_(c.x, 120), on: !!c.on })).filter(c => c.x);
    tSaveTask_(t); return { ok: true, task: tTaskFor_(t) };
  });
}

/* ---------- upload: browser seedha Google Drive par (tez), na chale to Script ke through tukdon mein ---------- */
function teamUpStart_(who, d) {
  const size = Math.round(+d.size || 0), name = tStr_(d.name, 180) || 'file', mime = tStr_(d.mime, 100) || 'application/octet-stream';
  if (!(size > 0) || size > 2 * 1024 * 1048576) throw new Error('File 2 GB tak ki ho sakti hai');
  if (!/\.(pptx?|pdf|zip|png|jpe?g|webp|psd|ai|cdr|svg|mp4|docx?|xlsx?|key)$/i.test(name)) throw new Error('Ye file type allowed nahi hai');
  const forLib = !!d.lib; if (!forLib) tMine_(who, d.id);
  const folder = forLib ? libFolder_() : teamFolder_();
  const origin = TEAM_ORIGINS.test(String(d.origin || '')) ? String(d.origin) : '';
  const opt = { method: 'post', contentType: 'application/json; charset=UTF-8', muteHttpExceptions: true, payload: JSON.stringify({ name, parents: [folder.getId()], mimeType: mime }),
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(size) } };
  if (origin) opt.headers.Origin = origin;
  const r = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size&supportsAllDrives=true', opt);
  const h = r.getHeaders(), url = h.Location || h.location;
  if (r.getResponseCode() !== 200 || !url) throw new Error('Upload shuru nahi hua (' + r.getResponseCode() + ')');
  const sid = Utilities.getUuid();
  CacheService.getScriptCache().put('tu_' + sid, JSON.stringify({ url, size, name, by: who.member.id, task: forLib ? '' : String(d.id), lib: forLib }), 21600);
  return { ok: true, sid, url: origin ? url : '', size };
}
function teamUpChunk_(d) {
  const s = JSON.parse(CacheService.getScriptCache().get('tu_' + String(d.sid || '')) || 'null');
  if (!s) return { ok: false, stop: true, error: 'Upload session khatam, dobara upload karein' };
  const bytes = Utilities.base64Decode(String(d.data || '')), start = Math.round(+d.start || 0), end = start + bytes.length - 1;
  const r = UrlFetchApp.fetch(s.url, { method: 'put', payload: bytes, contentType: 'application/octet-stream', muteHttpExceptions: true, headers: { 'Content-Range': `bytes ${start}-${end}/${s.size}` } });
  const c = r.getResponseCode();
  if (c === 308) { const rg = (r.getHeaders().Range || r.getHeaders().range || ''), m = /-(\d+)$/.exec(rg); return { ok: true, next: m ? +m[1] + 1 : end + 1 }; }
  if (c === 200 || c === 201) { const j = JSON.parse(r.getContentText()); return { ok: true, done: true, id: j.id }; }
  return { ok: false, error: 'Upload mein dikkat (' + c + ')' };
}
/* upload pura → file task / library se jodo (session se match karke, koi aur file id nahi chalegi) */
function teamUpDone_(who, d) {
  const c = CacheService.getScriptCache(), s = JSON.parse(c.get('tu_' + String(d.sid || '')) || 'null');
  if (!s || s.by !== who.member.id) throw new Error('Upload session nahi mila, dobara upload karein');
  const f = DriveApp.getFileById(String(d.file || ''));
  if (f.getName() !== s.name || Math.abs(f.getSize() - s.size) > 0) throw new Error('Upload adhoora hai, dobara karein');
  c.remove('tu_' + d.sid);
  if (s.lib) return { ok: true, file: f.getId(), fileName: f.getName(), size: f.getSize() };
  return tLock_(() => {
    const t = tMine_(who, s.task), old = t.file;
    if (/^(Approved|Cancelled)$/.test(t.status)) throw new Error('Task band ho chuka hai');
    t.file = f.getId(); t.fileName = f.getName(); t.fileSize = f.getSize(); t.slides = Math.max(0, Math.round(+d.slides || 0)) || t.slides || 0; t.upAt = tNow_();
    tHist_(t, who.member.name, 'Final file upload: ' + t.fileName);
    tSaveTask_(t);
    if (old && old !== t.file) { try { DriveApp.getFileById(old).setTrashed(true); } catch (e) { } }
    return { ok: true, task: tTaskFor_(t) };
  });
}
/* download: sirf apne task ki file / reference file / library file. 8 MB tukde, browser 3 ek saath leta hai */
function teamFile_(who, d) {
  const id = String(d.file || '');
  if (!who.admin) {
    const me = who.member.id, okTask = tTasks_().some(t => (t.member === me || t.doneBy === me) && (t.file === id || (t.refs || []).some(r => r.id === id)));
    if (!okTask && !tLib_().some(l => l.file === id)) throw new Error('Is file ki permission nahi hai');
  }
  const start = Math.max(0, Math.round(+d.start || 0)), len = Math.min(10 * 1048576, Math.max(1, Math.round(+d.len || 8 * 1048576)));
  const r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media&supportsAllDrives=true',
    { muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), Range: `bytes=${start}-${start + len - 1}` } });
  const c = r.getResponseCode();
  if (c === 416) return { ok: true, data: '', total: start };
  if (c !== 200 && c !== 206) throw new Error('File nahi mili (' + c + ')');
  const cr = String(r.getHeaders()['Content-Range'] || r.getHeaders()['content-range'] || ''), m = /\/(\d+)$/.exec(cr), b = r.getContent();
  return { ok: true, data: Utilities.base64Encode(b), total: m ? +m[1] : start + b.length, name: d.withName ? DriveApp.getFileById(id).getName() : undefined };
}

/* ---------- Project Library ---------- */
const tLibPublic_ = l => { const o = Object.assign({}, l); delete o._row; return o; };
function teamLibList_() { return tLib_().map(tLibPublic_).sort((a, b) => String(b.time).localeCompare(String(a.time))); }
function tLibFields_(l, d) {
  ['title', 'kind', 'cls', 'subject', 'topic', 'theme', 'lang', 'board'].forEach(k => { if (d[k] != null) l[k] = tStr_(d[k], k === 'title' || k === 'topic' ? 200 : 60); });
  if (d.note != null) l.note = tStr_(d.note, 2000);
  if (d.tags != null) l.tags = tStr_(d.tags, 200);
  if (d.slides != null) l.slides = Math.max(0, Math.round(+d.slides || 0));
  if (d.minutes != null) l.minutes = Math.max(0, Math.round(+d.minutes || 0));
  if (d.anim != null) l.anim = !!d.anim;
  return l;
}
function teamLibSave_(who, d) {
  const x = d.item || {};
  return tLock_(() => {
    const list = tLib_(); let l = x.id ? list.find(i => i.id === String(x.id)) : null;
    if (x.id && !l) throw new Error('Library item nahi mila');
    if (l && !who.admin && l.by !== who.member.id) throw new Error('Sirf apna project badal sakte hain');
    if (!l) {
      if (!x.file) throw new Error('File upload karein');
      const f = DriveApp.getFileById(String(x.file)); if (f.getParents().next().getId() !== libFolder_().getId()) throw new Error('File library folder mein nahi hai');
      l = { id: tId_('P'), by: who.member.id, byName: who.member.name, time: tNow_(), file: f.getId(), fileName: f.getName(), fileSize: f.getSize() };
    }
    tLibFields_(l, x); if (!l.title) throw new Error('Project ka naam likhein');
    l.updated = tNow_(); tSaveLib_(l);
    return { ok: true, item: tLibPublic_(l) };
  });
}
/* member apna approve hua kaam library mein daale (note / tags ke saath) */
function teamLibTask_(who, d) {
  return tLock_(() => {
    const t = tTasks_().find(x => x.id === String(d.id || ''));
    if (!t || t.status !== 'Approved' || (!who.admin && t.doneBy !== who.member.id)) throw new Error('Task nahi mila');
    if (t.lib && tLib_().some(l => l.id === t.lib)) throw new Error('Ye pehle se library mein hai');
    const l = tLibFields_(tLibFromTask_(t, {}), d.item || {}); l.updated = tNow_(); tSaveLib_(l);
    t.lib = l.id; tHist_(t, who.member.name, 'Project Library mein save'); tSaveTask_(t);
    return { ok: true, item: tLibPublic_(l), task: tTaskFor_(t) };
  });
}
/* approve hone par final file ki copy library mein (customer ka naam / number kabhi nahi) */
function tLibFromTask_(t, extra) {
  const d = t.data || {}, src = DriveApp.getFileById(t.file), copy = src.makeCopy(src.getName(), libFolder_());
  const mins = t.startedAt && t.submittedAt ? Math.round((new Date(t.submittedAt) - new Date(t.startedAt)) / 6e4) : 0;
  const l = tLibFields_({ id: tId_('P'), by: t.doneBy || t.member, byName: t.memberName, time: tNow_(), file: copy.getId(), fileName: copy.getName(), fileSize: copy.getSize(), task: t.id },
    { title: d.topic || t.fileName, kind: d.kind || 'PPT', cls: d.cls || '', subject: d.subject || '', topic: d.topic || '', theme: d.theme || '', lang: d.lang || '', slides: t.slides || d.slidesN || 0, minutes: mins, note: (extra && extra.note) || '', tags: (extra && extra.tags) || '' });
  tSaveLib_(l); return l;
}

/* ---------- admin ---------- */
function tReport_(tasks, members) {
  return members.map(m => {
    const mine = tasks.filter(t => (t.doneBy || t.member || t.lastMember) === m.id), done = mine.filter(t => t.status === 'Approved');
    const late = done.filter(t => t.deadline && t.submittedAt && new Date(t.submittedAt) > new Date(t.deadline)).length;
    const mins = done.map(t => t.startedAt && t.submittedAt ? (new Date(t.submittedAt) - new Date(t.startedAt)) / 6e4 : 0).filter(x => x > 0);
    return { id: m.id, active: mine.filter(t => /^(Assigned|Accepted|Working|Changes|Review)$/.test(t.status)).length, done: done.length, onTime: done.length - late, late,
      changes: mine.reduce((s, t) => s + (+t.changes || 0), 0), avgMin: mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 0 };
  });
}
function teamAdminAct_(a, d) {
  if (a === 'teamAdmin') {
    const members = tMembers_(), tasks = tLock_(() => tExpire_(tTasks_()));
    return { ok: true, members: members.map(tMemPublic_), tasks: tasks.map(tTaskFor_), lib: teamLibList_(), report: tReport_(tasks, members), roles: TEAM_ROLES, acceptMin: TEAM_ACCEPT_MIN, now: tNow_(), v: TEAM_VER };
  }
  if (a === 'teamMemberSave') return tLock_(() => {
    const x = d.member || {}, list = tMembers_(); let m = x.id ? list.find(i => i.id === x.id) : null;
    const login = tStr_(x.login, 40).toLowerCase().replace(/\s+/g, '');
    if (!tStr_(x.name, 60)) throw new Error('Naam likhein');
    if (!/^[a-z0-9._-]{3,40}$/.test(login)) throw new Error('Login ID: kam se kam 3 akshar (a-z, 0-9, . _ -)');
    if (list.some(i => i !== m && String(i.login).toLowerCase() === login)) throw new Error('Ye Login ID pehle se hai');
    const pw = String(x.password || '');
    if (!m) { if (pw.length < 6) throw new Error('Password kam se kam 6 akshar'); m = { id: tId_('M'), added: tNow_(), tv: 0, active: true }; }
    m.name = tStr_(x.name, 60); m.wa = tStr_(x.wa, 15).replace(/[^\d]/g, ''); m.role = TEAM_ROLES.indexOf(x.role) >= 0 ? x.role : TEAM_ROLES[0]; m.login = login;
    if (x.active != null) { if (m.active && !x.active) m.tv = (+m.tv || 0) + 1; m.active = !!x.active; }
    if (pw) { if (pw.length < 6) throw new Error('Password kam se kam 6 akshar'); m.salt = Utilities.getUuid(); m.hash = tHash_(pw, m.salt); m.tv = (+m.tv || 0) + 1; }
    tSaveMem_(m); return { ok: true, member: tMemPublic_(m) };
  });
  if (a === 'teamMemberDelete') return tLock_(() => {
    const m = tMembers_().find(i => i.id === String(d.id || '')); if (!m) throw new Error('Member nahi mila');
    if (tTasks_().some(t => t.member === m.id && /^(Assigned|Accepted|Working|Changes|Review)$/.test(t.status))) throw new Error('Iske paas abhi kaam hai. Pehle task kisi aur ko dein ya login band karein.');
    tDel_('Team', T_MEM, m); return { ok: true };
  });
  if (a === 'teamAssign') return tLock_(() => {
    const x = d.task || {}, tasks = tTasks_(); let t = x.id ? tasks.find(i => i.id === x.id) : (x.orderId ? tasks.find(i => i.orderId === String(x.orderId) && !/^(Cancelled)$/.test(i.status)) : null);
    const m = x.member ? tMembers_().find(i => i.id === x.member) : null;
    if (x.member && (!m || !m.active)) throw new Error('Member nahi mila ya login band hai');
    const isNew = !t; if (!t) t = { id: tId_('T'), created: tNow_(), status: 'Unassigned', notes: [], hist: [], checklist: [], changes: 0 };
    if (/^(Approved)$/.test(t.status)) throw new Error('Ye task approve ho chuka hai');
    if (x.orderId != null) t.orderId = tStr_(x.orderId, 40);
    const dd = x.data || {}; t.data = Object.assign(t.data || {}, {
      kind: tStr_(dd.kind, 20) || (t.data && t.data.kind) || 'PPT', topic: tStr_(dd.topic, 200), theme: tStr_(dd.theme, 80), slides: tStr_(dd.slides, 40), lang: tStr_(dd.lang, 40),
      cls: tStr_(dd.cls, 40), subject: tStr_(dd.subject, 60), details: tStr_(dd.details, 4000), brief: tStr_(dd.brief, 2000) });
    if (!t.data.topic) throw new Error('Topic likhein');
    if (Array.isArray(dd.refs)) t.refs = dd.refs.slice(0, 20).map(r => ({ id: tStr_(r.id, 100), name: tStr_(r.name, 150) })).filter(r => /^[\w-]{10,}$/.test(r.id));
    if (x.deadline != null) { const dl = new Date(x.deadline); t.deadline = isNaN(dl) ? '' : dl.toISOString(); }
    if (Array.isArray(x.checklist) && !(t.checklist || []).length) t.checklist = x.checklist.slice(0, 30).map(c => ({ x: tStr_(c.x || c, 120), on: false })).filter(c => c.x);
    if (isNew) tHist_(t, 'Admin', 'Task banaya');
    if (m && t.member !== m.id) {
      if (t.member) tHist_(t, 'Admin', `${t.memberName} se hata kar ${m.name} ko diya`); else tHist_(t, 'Admin', `${m.name} ko assign kiya` + (t.deadline ? ', deadline ' + Utilities.formatDate(new Date(t.deadline), 'Asia/Kolkata', 'dd MMM, h:mm a') : ''));
      t.member = m.id; t.memberName = m.name; t.status = 'Assigned'; t.assignedAt = tNow_(); t.acceptedAt = ''; t.startedAt = ''; t.file = t.file || '';
    } else if (!m && x.member === '' && t.member) { tHist_(t, 'Admin', `${t.memberName} se task hataya`); t.lastMember = t.member; t.member = ''; t.memberName = ''; t.status = 'Unassigned'; t.assignedAt = ''; }
    else if (!isNew) tHist_(t, 'Admin', 'Task details update');
    tSaveTask_(t); return { ok: true, task: tTaskFor_(t) };
  });
  if (a === 'teamReview') return tLock_(() => {
    const t = tTasks_().find(i => i.id === String(d.id || '')); if (!t) throw new Error('Task nahi mila');
    const act = String(d.act || ''), note = tStr_(d.note, 1000);
    if (act === 'changes') {
      if (!/^(Review|Approved)$/.test(t.status)) throw new Error('Task review mein nahi hai');
      if (!note) throw new Error('Kya badalna hai, likhein');
      t.status = 'Changes'; t.changes = (+t.changes || 0) + 1; t.notes = (t.notes || []).concat([{ t: tNow_(), by: 'Admin', admin: true, x: '✏️ Changes: ' + note }]); tHist_(t, 'Admin', 'Changes maange: ' + note);
    } else if (act === 'approve') {
      if (t.status !== 'Review') throw new Error('Pehle member file submit kare');
      if (!t.file) throw new Error('File nahi hai');
      t.status = 'Approved'; t.doneAt = tNow_(); t.done = true; t.doneBy = t.member; tHist_(t, 'Admin', 'Approve kiya' + (note ? ': ' + note : ''));
      if (d.lib) { try { t.lib = tLibFromTask_(t, { note: d.libNote, tags: d.libTags }).id; tHist_(t, 'System', 'Project Library mein save'); } catch (e) { tHist_(t, 'System', 'Library save nahi hua: ' + e.message); } }
    } else if (act === 'cancel') { t.status = 'Cancelled'; tHist_(t, 'Admin', 'Task cancel' + (note ? ': ' + note : '')); }
    else if (act === 'reopen') { t.status = t.member ? 'Working' : 'Unassigned'; t.done = false; tHist_(t, 'Admin', 'Task dobara khola'); }
    else throw new Error('Galat action');
    tSaveTask_(t); return { ok: true, task: tTaskFor_(t) };
  });
  if (a === 'teamLibDelete') return tLock_(() => {
    const l = tLib_().find(i => i.id === String(d.id || '')); if (!l) throw new Error('Nahi mila');
    try { DriveApp.getFileById(l.file).setTrashed(true); } catch (e) { }
    tDel_('Library', T_LIB, l); return { ok: true };
  });
  return { ok: false, error: 'Unknown team action' };
}
