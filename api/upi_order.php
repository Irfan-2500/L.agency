<?php
/* UPI checkout, step 1: order banao (status 'created'), daam database se */
require dirname(__DIR__) . '/includes/bootstrap.php';
api_start();
rate_limit('upi-order', 15, 600);

$upi = upi_config();
if (!valid_upi($upi['id']) && !$upi['qr']) json_err('UPI payment abhi set nahi hai. WhatsApp par order karein.');

$name = clean($_POST['name'] ?? '', 120);
$email = clean($_POST['email'] ?? '', 190);
$phone = clean_phone($_POST['phone'] ?? '');
if ($name === '') $name = 'Customer';
if (!valid_email($email)) json_err('Please enter a valid email');
if (!valid_phone($phone)) json_err('Please enter a valid 10-digit mobile number');

$ids = array_values(array_unique(array_filter(array_map('intval', (array)json_decode((string)($_POST['items'] ?? '[]'), true)))));
if (!$ids || count($ids) > 50) json_err('Cart khaali hai.');
$in = implode(',', array_fill(0, count($ids), '?'));
$items = q("SELECT id, price FROM products WHERE active=1 AND id IN ($in)", $ids)->fetchAll();
if (count($items) !== count($ids)) json_err('Cart ki koi PPT ab available nahi hai. Page refresh karke dobara try karein.');
$total = array_sum(array_column($items, 'price'));
if ($total < 1) json_err('Order amount sahi nahi hai.');

q("INSERT INTO orders (name,email,phone,items,amount,status,method,created_at) VALUES (?,?,?,?,?,'created','upi',?)", [$name, $email, $phone, json_encode($ids), $total * 100, now()]);
$id = (int)db()->lastInsertId();
json_out(['ok' => true, 'orderId' => $id, 'amount' => $total, 'note' => 'LA' . $id, 'upi' => $upi]);
