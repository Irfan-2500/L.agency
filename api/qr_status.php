<?php
/* QR checkout: page har kuch second mein poochta hai "payment aaya?". Aaya toh order paid + download links. */
require dirname(__DIR__) . '/includes/bootstrap.php';
api_start();
rate_limit('qr-status', 400, 1800);

$id = (int)($_POST['orderId'] ?? 0);
$phone = clean_phone($_POST['phone'] ?? '');
$o = q("SELECT * FROM orders WHERE id=? AND method='qr'", [$id])->fetch();
if (!$o || $o['phone'] !== $phone) json_err('Order nahi mila.', 404);

if ($o['status'] !== 'paid') {
    [$code, $res] = rzp_api('GET', 'payments/qr_codes/' . rawurlencode($o['rzp_order_id']) . '/payments');
    $pay = null;
    foreach ($code === 200 ? ($res['items'] ?? []) : [] as $p) {
        if (($p['status'] ?? '') === 'captured' && (int)($p['amount'] ?? 0) === (int)$o['amount']) { $pay = $p; break; }
    }
    if (!$pay) json_out(['ok' => true, 'paid' => false]);
    $links = mark_order_paid($o, (string)$pay['id']);
} else {
    $links = mark_order_paid($o, (string)$o['rzp_payment_id']);
}
json_out(['ok' => true, 'paid' => true, 'orderId' => (int)$o['id'], 'email' => $o['email'], 'links' => $links]);
