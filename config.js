/* =====================================================================
   ⚙️ LAKSHAY AGENCY — WEBSITE SETTINGS (Vercel)
   Orders aapke paas aise aate hain:
     1) orderUrl laga ho  → Google Sheet + Drive (files) + email   (SETUP-GUIDE Step B)
     2) warna             → seedha aapke Gmail par (FormSubmit)    (SETUP-GUIDE Step A — sirf ek baar "Activate")
     3) dono na chalein   → customer ko WhatsApp button
   ===================================================================== */
window.LA_CONFIG = {
  backend: "google",

  // Google Apps Script ka "Web app URL" (…/exec) — optional. Khaali = orders sirf email par.
  orderUrl: "https://script.google.com/macros/s/AKfycbxFBXZWpNRMohfEHCgr95BzbNiES1zQQbl7aY6Ov2zXscpEvxeFOFL7FftMlb6DNSVm/exec",

  emailOrders: true,                 // order ki saari details is email par aayengi
  email: "Mdirfan7216@gmail.com",

  whatsapp: "919711069435",          // country code ke saath, bina + aur space
  phoneDisplay: "+91 97110 69435"
};
