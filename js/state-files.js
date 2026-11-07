/* State Books files
   Har line ka format:
   "State|Category|Class|Medium|Subject": { pdf: "link", word: "link", ppt: "link" }
   Link Google Drive ka "Anyone with the link" wala ho sakta hai, ya website par upload ki hui file.
   Example:
   "Bihar|Syllabus|12|Hindi|Physics": { pdf: "https://drive.google.com/file/d/XXXX/view" },

   Previous Year paper ke liye saal bhi jodein, aur har set ka link "sets" me:
   "Bihar|Previous Year Questions|10|Hindi|Maths|2025": { sets: ["set1.pdf", "set2.pdf", "set3.pdf"] },
   Notes chapter wise hote hain:
   "Bihar|Notes|10|Hindi|English": { chapters: [ { name: "Chapter ka naam", pdf: "ch1.pdf", word: "ch1.docx", ppt: "ch1.pptx" }, ... ] },

   PPT ki 10 slide free dikhti hain, baaki lock. Shop wali PPT ka number (product id) "product" me likhein,
   to lock par "Add to Cart" / "Buy Now" aayega:  { ppt: "file.pptx", product: 12 }
   Kisi set ki Word/PPT bhi ho to:  { pdf: "set1.pdf", word: "set1.docx", ppt: "set1.pptx" }
*/
window.STATE_FILES = {
  "Bihar|Syllabus|10|Hindi|Poori Class": { pdf: "/uploads/syllabus/bihar-board-class-10-syllabus-2026-27.pdf" },
  "Bihar|Syllabus|12|Hindi|Poori Class": { pdf: "/uploads/syllabus/bihar-board-class-12-syllabus-2026-27.pdf" },
};
