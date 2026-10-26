<?php
/* Checkout: database ke daam se total banata hai aur Razorpay order create karta hai */
require dirname(__DIR__) . '/includes/bootstrap.php';
api_start();
rate_limit('order', 15, 600);

$rz = $CFG['razorpay'];
if (empty($rz['key_id']) || empty($rz['key_secret'])) json_err('Online payment abhi available nahi hai. WhatsApp par order karein.');

$name = clean($_POST['name'] ?? '', 120);
$email = clean($_POST['email'] ?? '', 190);
$phone = clean_phone($_POST['phone'] ?? '');
if (mb_strlen($name) < 2) json_err('Please enter your name');
if (!valid_email($email)) json_err('Please enter a valid email');
if (!valid_phone($phone)) json_err('Please enter a valid 10-digit mobile number');

$ids = array_values(array_unique(array_filter(array_map('intval', (array)json_decode((string)($_POST['items'] ?? '[]'), true)))));
if (!$ids || count($ids) > 50) json_err('Cart khaali hai.');
$in = implode(',', array_fill(0, count($ids), '?'));
$items = q("SELECT id, title, price FROM products WHERE active=1 AND id IN ($in)", $ids)->fetchAll();
if (count($items) !== count($ids)) json_err('Cart ki koi PPT ab available nahi hai. Page refresh karke dobara try karein.');
$total = array_sum(array_column($items, 'price'));
if ($total < 1) json_err('Order amount sahi nahi hai.');

q('INSERT INTO orders (name,email,phone,items,amount,status,created_at) VALUES (?,?,?,?,?,?,?)', [$name, $email, $phone, json_encode($ids), $total * 100, 'created', now()]);
$orderId = (int)db()->lastInsertId();

$ch = curl_init('https://api.razorpay.com/v1/orders');
curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20,
    CURLOPT_USERPWD => $rz['key_id'] . ':' . $rz['key_secret'], CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['amount' => $total * 100, 'currency' => 'INR', 'receipt' => 'LA-' . $orderId, 'notes' => ['order_id' => $orderId]])]);
$res = json_decode((string)curl_exec($ch), true);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if ($code !== 200 || empty($res['id'])) json_err('Payment start nahi ho paya. Thodi der baad try karein.', 502);

q('UPDATE orders SET rzp_order_id=? WHERE id=?', [$res['id'], $orderId]);
json_out(['ok' => true, 'key' => $rz['key_id'], 'amount' => $total * 100, 'name' => $CFG['site']['name'], 'rzpOrderId' => $res['id'],
    'prefill' => ['name' => $name, 'email' => $email, 'contact' => '+91' . $phone]]);
