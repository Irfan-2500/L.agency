<?php
/* Payment ke baad: Razorpay signature check, order paid, download links banana */
require dirname(__DIR__) . '/includes/bootstrap.php';
api_start();
rate_limit('verify', 30, 600);

$oid = clean($_POST['razorpay_order_id'] ?? '', 64);
$pid = clean($_POST['razorpay_payment_id'] ?? '', 64);
$sig = clean($_POST['razorpay_signature'] ?? '', 128);
if (!$oid || !$pid || !$sig) json_err('Payment details missing.');

$expected = hash_hmac('sha256', "$oid|$pid", (string)$CFG['razorpay']['key_secret']);
if (!hash_equals($expected, $sig)) json_err('Payment verify nahi hua. Agar paise kate hain to WhatsApp par batayein.');

$o = q('SELECT * FROM orders WHERE rzp_order_id=?', [$oid])->fetch();
if (!$o) json_err('Order nahi mila.', 404);

$links = mark_order_paid($o, $pid);
json_out(['ok' => true, 'orderId' => (int)$o['id'], 'email' => $o['email'], 'links' => $links]);
