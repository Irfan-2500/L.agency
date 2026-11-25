/* Books: bechne wali kitabon ki categories (website + admin panel dono yahi list padhte hain).
   Kitab ki pehchaan uski "Class" list mein chhupe tags se hoti hai (Google Script mein koi badlav nahi chahiye):
     "Books"                 → ye product ek kitab hai
     "bk:fiction"            → category
     "bk:fiction:novel"      → category ke andar ka type
   Nayi category / type jodni ho to sirf is list mein jodein. id chhota rakhein (Script 40 akshar tak rakhta hai). */
var BOOK_TAG = "Books";
var BOOK_CATS = [
  { id: "fiction",   e: "📖", name: "Fiction Books",      hi: "काल्पनिक पुस्तकें",
    sub: [["novel","Novel"],["story","Story"],["mystery","Mystery"],["thriller","Thriller"],["fantasy","Fantasy"],["other","Other Fiction"]] },
  { id: "nonfiction", e: "🧭", name: "Non-Fiction Books", hi: "वास्तविक जानकारी पर आधारित",
    sub: [["biography","Biography"],["history","History"],["science","Science"],["selfhelp","Self-help"],["gk","General Knowledge"],["other","Other Non-Fiction"]] },
  { id: "edu",       e: "🎓", name: "Educational Books",  hi: "शैक्षिक पुस्तकें",
    sub: [["ncert","NCERT"],["textbook","Textbooks"],["reference","Reference Books"],["guide","Guide Books"],["qbank","Question Banks"],["other","Other Educational"]] },
  { id: "exam",      e: "🏆", name: "Competitive Exam Books", hi: "प्रतियोगी परीक्षा",
    sub: [["jnv","JNV"],["neet","NEET"],["jee","JEE"],["upsc","UPSC"],["ssc","SSC"],["ctet","CTET"],["tgtpgt","TGT / PGT"],["other","Other Exams"]] },
  { id: "kids",      e: "🧸", name: "Children's Books",   hi: "बाल साहित्य",
    sub: [["picture","Picture Books"],["activity","Activity Books"],["story","Story Books"],["coloring","Coloring Books"],["other","Other Kids Books"]] },
  { id: "religious", e: "🪔", name: "Religious & Spiritual", hi: "धार्मिक व आध्यात्मिक",
    sub: [["granth","धार्मिक ग्रंथ (Holy Texts)"],["spiritual","आध्यात्मिक पुस्तकें (Spiritual)"],["puja","पूजा-पाठ (Puja Path)"],["other","Other Religious"]] }
];
/* p.level se kitab ki category / type nikaalna: { c, s, cat, sub } (na mile to khaali) */
function bookOf(p) {
  var lv = Array.isArray(p && p.level) ? p.level : [], c = "", s = "";
  lv.forEach(function (x) { var m = /^bk:([\w-]+)(?::([\w-]+))?$/.exec(String(x)); if (m) { if (m[2]) { c = m[1]; s = m[2]; } else if (!c) c = m[1]; } });
  var cat = BOOK_CATS.filter(function (k) { return k.id === c; })[0] || null;
  var sub = cat ? (cat.sub.filter(function (x) { return x[0] === s; })[0] || null) : null;
  return { c: cat ? c : "", s: sub ? s : "", cat: cat, sub: sub };
}
function isBookP(p) { return !!p && (p.book === true || (Array.isArray(p.level) && p.level.indexOf(BOOK_TAG) >= 0)); }
function isBookTag(x) { x = String(x); return x === BOOK_TAG || /^bk:/.test(x); }
/* Save ke waqt: purane book tags hata kar naye lagao */
function bookTags(c, s) { return c ? [BOOK_TAG, "bk:" + c].concat(s ? ["bk:" + c + ":" + s] : []) : [BOOK_TAG]; }
