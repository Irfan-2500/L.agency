# Lakshay Agency — Dynamic Website (PHP + MySQL)

## 📁 Kya-kya hai
| Cheez | Kahan |
|---|---|
| Website | `index.html` |
| PPT Order page (form + 1 GB file upload) | `order.html` |
| Admin Panel | `yourdomain.com/admin` |
| Settings (WhatsApp, Email, Razorpay, Database) | `config.php` |
| PPT theme samples (19 themes) | `uploads/themes/samples/` |
| Customer files (private) | `uploads/requests/` |
| PPT files for sale (private) | `storage/ppt/` |

**Website par:** ⚡ "1 Hour. Your PPT. Ready!" hero · Smart Board par Pricing + Bulk offer (har 5 sec badalta) · 🎨 PPT Themes gallery (Dark/White, Questions/Theory/Theory+Q/Screenshot, Hindi/English/Both filters, auto-swipe) · Custom PPT section · ₹ Pricing popup · 🌙 Dark / ☀️ Light / 🖥️ System theme · scroll progress line · Reviews · FAQ · Contact.

**Admin Panel mein:** 🎨 Themes (ek saath kai images upload) · 🗂️ PPTs (photo, price, filters, PPT file) · 💳 Orders · 📝 Custom Requests (customer files download) · ⭐ Reviews approve · ✉️ Messages · 🔐 Password.

### 💰 Prices badalni hon toh
`index.html` mein do jagah likhi hain — **Smart Board** (`BOARD_SLIDES`) aur **Pricing popup** (`id="priceModal"`). Dono jagah same badlo.

---

## 🚀 Hostinger par live karne ke steps

### Step 1 — Database banao
hPanel → **Websites → Manage → Databases → MySQL Databases**
- Database name, Username, Password bharo → **Create**
- Ye teeno cheezein note kar lo (jaise `u123456789_lakshay`)

### Step 2 — `config.php` bharo
Computer par `config.php` kholo (Notepad mein) aur bharo:
- `db` → Step 1 wala database name, user, password
- `site` → apna WhatsApp number, email, admin email
- `razorpay` → abhi khaali chhod sakte ho (Step 6 dekho)

### Step 3 — Files upload karo
hPanel → **Files → File Manager → public_html**
- Purani files (default `index.php` / `default.php`) hata do
- Ye ZIP upload karo → right click → **Extract**
- Dhyan rahe: `index.html`, `admin`, `api` folder seedha `public_html` ke andar hon

### Step 4 — Install karo
Browser mein kholo: `https://yourdomain.com/install.php`
- Admin username + password banao → **Install Now**
- ✅ Uske baad File Manager se **`install.php` delete kar do**

### Step 5 — PPT files upload karo
`https://yourdomain.com/admin` → login → **PPTs**
- Har PPT par **Edit** → "PPT File for customers" mein asli .pptx / .zip daalo → Save
- Jis PPT par laal **Missing** likha hai, uski file abhi baaki hai
- Thumbnail photo bhi daal sakte ho (warna gradient colour dikhega)


### Step 5B — PPT Themes upload karo (100 themes)
- Install ke time aapke **19 PPT samples** pehle se lag jaate hain ("Mere 19 sample themes add karo" button se wapas bhi daal sakte ho)
- Admin → **🎨 Themes** → upar do tarike:
  - **🖼️🖼️🖼️ Ek theme, kai slides** — ek PPT ki 2–10 slides ek saath chuno, theme ka naam likho → 1 theme banegi, website par slides swipe hongi
  - **🖼️ | 🖼️ Har image alag theme** — alag PPTs ki 1-1 image → har image alag theme
- Theme / Slide Type / Language set karo → **Upload**
- Baad mein kisi bhi theme card par:
  - **＋ Add slides** — us theme mein aur slides jodo (max 10)
  - slide par mouse le jao → **★** cover banao · **‹ ›** aage-peeche · **✕** hatao
- Naam ya tag badlo → **Save All Changes** · "Live" tick hatao toh theme chhup jayegi
- PowerPoint se slide image: **File → Export → Change File Type → PNG**

### Step 6 — Razorpay (online payment) chalu karo
1. https://dashboard.razorpay.com par account banao, KYC complete karo
2. **Account & Settings → API Keys → Generate Test Key**
3. `config.php` mein `key_id` aur `key_secret` daalo
4. Website par Buy Now → test payment karo (UPI ID: `success@razorpay`)
5. Sab sahi chale toh **Live Mode** keys generate karke `config.php` mein badal do
6. Razorpay mein **Payment Capture = Automatic** hona chahiye (default yahi hota hai)

> Razorpay keys khaali hon toh online payment band rahega aur Buy Now par "not available" dikhega.

### Step 7 — Email
- Website par aur customer ke reply ke liye `config.php` ka `email` (abhi: Mdirfan7216@gmail.com) use hota hai
- Hostinger Gmail ke naam se email nahi bhej sakta, isliye hPanel → **Emails** mein ek address banao (jaise `noreply@yourdomain.com`) aur use `config.php` ke `mail_from` mein likho
- Customer ko download link aur aapko naye order/request ki khabar isi se jaati hai; customer "Reply" karega toh aapke Gmail par aayega
- Pehli baar email **Spam** folder mein ja sakti hai — "Not spam" mark kar do

### Step 8 — SSL (https)
hPanel → **Security → SSL** → free SSL install karo. Payment ke liye https zaroori hai.

### 📎 Customer file upload (PPT Order Now page)
- Customer 5 files tak bhej sakta hai, har file **1 GB tak** (Images, PDF, Word, Excel, PowerPoint, Text, ZIP/RAR/7z). Video/audio band hai.
- Badi file chhote tukdon (5 MB) mein upload hoti hai, isliye Hostinger ki upload limit se fark nahi padta. Net toote toh upload wahin se aage chalta hai.
- Files admin panel → **Custom Requests** mein order ke saath milti hain → **Download**.
- ⚠️ 1 GB files hosting ki jagah (disk space) bharti hain. Kaam ho jaane ke baad request **Delete** kar do — uski files bhi hat jaati hain.
- Jo file upload hui par order submit nahi hua, woh 1 din baad apne aap delete ho jaati hai.
- Size limit badalni ho toh `config.php` → `uploads` → `order_max_mb`.

---

## 💳 Payment kaise kaam karta hai
1. Customer Buy Now / Cart → naam, email, WhatsApp bharta hai
2. Razorpay se UPI / Card / Net Banking se pay karta hai
3. Payment verify hote hi **screen par Download button** + **email par link**
4. Link **7 din** chalta hai, **5 baar** download (config.php mein badal sakte ho)
5. Price hamesha database se liya jaata hai — koi browser se price badal kar sasta nahi khareed sakta

**Customer bole "paise kat gaye par link nahi mila":**
Admin → **Orders → Not completed** → Razorpay Dashboard mein payment "Captured" check karo → Payment ID daal kar **Mark Paid & Send Links**. Paid order mein **"Send links on WhatsApp"** button bhi hai.

---

## 🔒 Security (pehle se laga hua)
- Admin password encrypted, galat login par 15 min block (8 koshish)
- Har admin form par CSRF protection, 2 ghante baad auto logout
- File upload: sirf PDF/Word/Excel/Images, file ka asli content check hota hai, video/audio band
- PPT files aur customer files private folders mein — sirf valid link / admin login se milti hain
- Spam protection: hidden honeypot + har IP par limit
- `install.php` delete karna mat bhoolna

## 🛠️ Chhote badlaav
- **Naya subject / board / class option:** `includes/options.php` (admin ke liye) **aur** `index.html` mein `SUBJECTS` / `FILTERS` (website ke liye) — dono jagah same naam likho
- **Category naam:** `includes/options.php` mein `CATS` aur `index.html` mein `CATEGORIES`
- **FAQ:** `index.html` mein `FAQS`

## 💡 Backup
hPanel → **Files → Backups** se weekly backup on rakho (database + files dono).
