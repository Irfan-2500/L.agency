<?php
/* QR checkout: order + Razorpay ka single-use UPI QR (amount fixed). Payment aate hi qr_status.php download khol deta hai. */
require dirname(__DIR__) . '/includes/bootstrap.php';
api_start();
rate_limit('qr', 15, 600);

$rz = $CFG['razorpay'];
if (empty($rz['key_id']) || empty($rz['key_secret'])) json_err('Online payment abhi available nahi hai.');

$name = clean($_POST['name'] ?? '', 120);
$email = clean($_POST['email'] ?? '', 190);
$phone = clean_phone($_POST['phone'] ?? '');
if (mb_strlen($name) < 2) json_err('Please enter your name');
if ($email !== '' && !valid_email($email)) json_err('Please enter a valid email');
if (!valid_phone($phone)) json_err('Please enter a valid 10-digit mobile number');

$ids = array_values(array_unique(array_filter(array_map('intval', (array)json_decode((string)($_POST['items'] ?? '[]'), true)))));
if (!$ids || count($ids) > 50) json_err('Cart khaali hai.');
$in = implode(',', array_fill(0, count($ids), '?'));
$items = q("SELECT id, price FROM products WHERE active=1 AND id IN ($in)", $ids)->fetchAll();
if (count($items) !== count($ids)) json_err('Cart ki koi PPT ab available nahi hai. Page refresh karke dobara try karein.');
$total = array_sum(array_column($items, 'price'));
if ($total < 1) json_err('Order amount sahi nahi hai.');

q("INSERT INTO orders (name,email,phone,items,amount,status,method,created_at) VALUES (?,?,?,?,?,'created','qr',?)", [$name, $email, $phone, json_encode($ids), $total * 100, now()]);
$id = (int)db()->lastInsertId();

[$code, $res] = rzp_api('POST', 'payments/qr_codes', ['type' => 'upi_qr', 'name' => mb_substr($CFG['site']['name'], 0, 40), 'usage' => 'single_use',
    'fixed_amount' => true, 'payment_amount' => $total * 100, 'description' => 'Order #' . $id, 'close_by' => time() + 30 * 60, 'notes' => ['order_id' => $id]]);
if ($code !== 200 || empty($res['id']) || empty($res['image_url'])) json_err('QR nahi ban paya. PhonePe / GPay / Paytm button se pay karein.', 502);

q('UPDATE orders SET rzp_order_id=? WHERE id=?', [$res['id'], $id]);
json_out(['ok' => true, 'orderId' => $id, 'amount' => $total, 'image' => $res['image_url']]);
