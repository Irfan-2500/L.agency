# Lakshay Agency — Dynamic Website (PHP + MySQL)

## 📁 Kya-kya hai
| Cheez | Kahan |
|---|---|
| Website | `index.html` |
| PPT Order page (form + 1 GB file upload) | `order.html` |
| Admin Panel | `yourdomain.com/admin` |
| Settings (WhatsApp, Email, Razorpay, Database) | `config.php` |
| PPT theme samples (19 themes) | `uploads/themes/samples/` |
| Customer files (private) | `storage/requests/` |
| PPT files for sale (private) | `storage/ppt/` |
| Ready PPTs page (filter + cart + Buy Now) | `ready-ppts.html` |
| 5 demo PPTs (.pptx) | `demo/ppt/` |

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

### Step 5 — Ready PPTs upload karo
`https://yourdomain.com/admin` → login → **🗂️ Ready PPTs** → **+ Nayi PPT upload karo**
- Naam, price, MRP, slides, class, subject, language bharo
- **Cover photo** + **Preview slides** (kai photos ek saath) daalo — customer "Preview" mein yahi dekhega
- **PPT file** (.pptx / .ppt / .pdf / .zip) daalo — ye customer ko sirf payment ke baad milti hai
- Jis PPT par **⚠ PPT file nahi hai** likha hai, uski file abhi baaki hai
- Install ke time **5 demo PPTs** (asli .pptx ke saath) lag jaati hain — inhe edit ya delete kar sakte ho
- Saari PPTs `ready-ppts.html` page par dikhti hain (homepage ka sunehra **Ready to Use PPT** button yahi kholta hai). Wahan filter, Add to Cart aur Buy Now hai
- **🔥 Kitne logon ne khareeda:** website ke paid orders apne aap gine jaate hain. WhatsApp / offline bikri ho to PPT edit karke "Pehle ki bikri" mein asli number daal do — dono jud kar card par dikhte hain


### Step 5B — PPT Themes upload karo
- Agar `uploads/themes/samples/` folder mein aapki 19 sample images hain, to install ke time wo themes apne aap lag jaati hain
- Admin → **🎨 Themes** → naam, rang (Dark/White), type, language chuno → **Slide images** mein ek theme ki kai slides ek saath chuno → **Save theme**
- Kisi theme par click karke aur slides jodo, ya "Hatao" tick karke slide hatao
- "Website par dikhao" tick hatao toh theme chhup jayegi
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
Admin → **Orders → Payment adhoora** → Razorpay Dashboard mein payment "Captured" check karo → Payment ID (`pay_...`) daal kar **Mark Paid**. Paid order mein **"📲 Link WhatsApp par bhejo"** button bhi hai.

---

## 🔒 Security (pehle se laga hua)
- Admin password encrypted, galat login par 15 min block (8 koshish)
- Har admin form par CSRF protection, 2 ghante baad auto logout
- File upload: sirf PDF/Word/Excel/Images, file ka asli content check hota hai, video/audio band
- PPT files aur customer files private folders mein — sirf valid link / admin login se milti hain
- Spam protection: hidden honeypot + har IP par limit
- `install.php` delete karna mat bhoolna

## 🛠️ Chhote badlaav
- **Naya subject / board option:** `admin/products.php` mein `SUBJECTS` / `BOARDS` (admin ke liye) **aur** `index.html` mein `SUBJECTS` / `FILTERS` — dono jagah same naam likho. `ready-ppts.html` ke filters apne aap PPTs se bante hain
- **Category naam:** `includes/bootstrap.php` mein `CATS`, `index.html` aur `ready-ppts.html` mein `CATEGORIES`
- **FAQ:** `index.html` mein `FAQS`

## 💡 Backup
hPanel → **Files → Backups** se weekly backup on rakho (database + files dono).
