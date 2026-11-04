/* State Books files
   Har line ka format:
   "State|Category|Class|Medium|Subject": { pdf: "link", word: "link", ppt: "link" }
   Link Google Drive ka "Anyone with the link" wala ho sakta hai, ya website par upload ki hui file.
   Example:
   "Bihar|Syllabus|12|Hindi|Physics": { pdf: "https://drive.google.com/file/d/XXXX/view" },

   Previous Year paper ke liye saal bhi jodein, aur har set ka link "sets" me:
   "Bihar|Previous Year Questions|10|Hindi|Maths|2025": { sets: ["set1.pdf", "set2.pdf", "set3.pdf"] },
   Kisi set ki Word/PPT bhi ho to:  { pdf: "set1.pdf", word: "set1.docx", ppt: "set1.pptx" }
*/
window.STATE_FILES = {
};
