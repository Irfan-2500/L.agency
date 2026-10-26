<?php
/* =============================================================
   ⚙️  LAKSHAY AGENCY — SETTINGS
   Sirf is file mein apni details bharo. Baaki code chhedne ki zarurat nahi.
   ============================================================= */

return [

    // ---------- 1. DATABASE (Hostinger > Databases > MySQL Databases) ----------
    'db' => [
        'driver' => getenv('LA_DB_DRIVER') ?: 'mysql',   // 'mysql' rehne do
        'host'   => 'localhost',
        'name'   => 'u123456789_lakshay',   // Database name
        'user'   => 'u123456789_admin',     // Database username
        'pass'   => 'YOUR_DB_PASSWORD',     // Database password
        'sqlite_path' => __DIR__ . '/storage/dev.sqlite', // sirf testing ke liye
    ],

    // ---------- 2. WEBSITE / CONTACT ----------
    'site' => [
        'name'          => 'Lakshay Agency',
        'url'           => '',                      // e.g. https://lakshayagency.com (khaali = auto)
        'whatsapp'      => '919711069435',          // country code ke saath, bina + aur space
        'phone_display' => '+91 97110 69435',
        'email'         => 'Mdirfan7216@gmail.com',   // website par dikhega (customer isi par reply karega)
        'admin_email'   => 'Mdirfan7216@gmail.com',   // naye order / request ki khabar yahan aayegi
        'mail_from'     => '',   // emails bhejne wala address — Hostinger par bana hua, jaise noreply@yourdomain.com (khaali = noreply@aapka-domain)
    ],

    // ---------- 3. RAZORPAY (dashboard.razorpay.com > Account & Settings > API Keys) ----------
    // Pehle "Test Mode" keys daal kar check karo, phir "Live Mode" keys lagao.
    // Khaali chhodoge toh online payment band rahega (Buy Now par "not available" dikhega).
    'razorpay' => [
        'key_id'     => '',   // rzp_test_xxxxx  ya  rzp_live_xxxxx
        'key_secret' => '',
    ],

    // ---------- 3B. UPI (QR code se seedha payment) ----------
    // Admin panel → "UPI / QR" se bhi badal sakte ho. Wahan bhari value yahan wali se upar maani jaati hai.
    'upi' => [
        'id'   => '',   // aapki UPI ID, jaise 9711069435@ybl
        'name' => 'Lakshay Agency',   // customer ke app mein ye naam dikhega
    ],

    // ---------- 4. DOWNLOAD LINK RULES ----------
    'download' => [
        'expiry_days'   => 7,   // link kitne din chalega
        'max_downloads' => 5,   // ek link se kitni baar download ho sakta hai
    ],

    // ---------- 5. CUSTOMER FILE UPLOAD RULES ----------
    'uploads' => [
        'max_mb'    => 10,
        'max_files' => 5,
        'order_max_mb' => 1024,   // "PPT Order Now" page par ek file ka max size (1 GB)
    ],
];
