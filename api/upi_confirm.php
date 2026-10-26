<?php
/* UPI checkout, step 2: customer ne pay kar diya, UTR / screenshot bheja. Admin verify karke link bhejega. */
require dirname(__DIR__) . '/includes/bootstrap.php';
api_start();
rate_limit('upi-confirm', 10, 600);

$id = (int)($_POST['orderId'] ?? 0);
$phone = clean_phone($_POST['phone'] ?? '');
$utr = strtoupper(preg_replace('/\s+/', '', clean($_POST['utr'] ?? '', 40)));
if (!preg_match('/^[A-Z0-9]{6,30}$/', $utr)) json_err('UPI Transaction ID / UTR sahi likhiye (12 digit number, payment app ki history mein milta hai).');

$o = q("SELECT * FROM orders WHERE id=? AND method='upi'", [$id])->fetch();
if (!$o || $o['phone'] !== $phone) json_err('Order nahi mila. Page refresh karke dobara try karein.', 404);
if ($o['status'] === 'paid') json_out(['ok' => true, 'status' => 'paid']);

$proof = $o['proof'];
$pf = files_list('proof');
if ($pf) {
    $f = $pf[0];
    $info = $f['error'] === UPLOAD_ERR_OK && $f['size'] <= 8 * 1048576 ? @getimagesize($f['tmp_name']) : false;
    $ext = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'][$info[2] ?? 0] ?? null;
    if (!$ext) json_err('Screenshot JPG/PNG image honi chahiye (8 MB tak).');
    if (!is_dir(ROOT . '/storage/proofs')) mkdir(ROOT . '/storage/proofs', 0755, true);
    $proof = rand_name($ext);
    move_uploaded_file($f['tmp_name'], ROOT . '/storage/proofs/' . $proof);
}
q("UPDATE orders SET status='review', utr=?, proof=? WHERE id=?", [$utr, $proof, $id]);
notify_admin('🔔 UPI payment check karo — Order #' . $id . ' — ₹' . ($o['amount'] / 100), ['Name' => $o['name'], 'Phone' => $o['phone'], 'Email' => $o['email'], 'UTR' => $utr, 'Screenshot' => $proof ? 'Haan' : 'Nahi']);
json_out(['ok' => true, 'status' => 'review', 'orderId' => $id]);
