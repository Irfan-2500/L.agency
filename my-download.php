<?php
/* My PPTs: login kiya customer apni khareedi PPT kabhi bhi dobara download kare */
require __DIR__ . '/includes/bootstrap.php';
$phone = cust_phone();
if ($phone === '') { header('Location: account.html'); exit; }
if (limit_hit('my-dl', 40, 3600)) { http_response_code(429); exit('Bahut zyada downloads. Thodi der baad try karein.'); }
$id = (int)($_GET['id'] ?? 0);
$mine = cust_purchases($phone);
if (!isset($mine[$id]) || !$mine[$id]['has_file'] || $mine[$id]['pending']) { http_response_code(404); exit('Ye PPT aapke account mein nahi hai.'); }
stream_ppt(q('SELECT title, file_path, file_name FROM products WHERE id=?', [$id])->fetch());
