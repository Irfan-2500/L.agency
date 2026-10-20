<?php
/* Secure download: sirf valid, expire na hua token hi file deta hai */
require __DIR__ . '/includes/bootstrap.php';

function dl_error(string $msg): void {
    global $CFG;
    http_response_code(403);
    $wa = 'https://wa.me/' . $CFG['site']['whatsapp'] . '?text=' . rawurlencode('Hi, my PPT download link is not working.');
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Download</title>'
       . '<body style="background:#07080c;color:#f4f5fb;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:20px">'
       . '<div><h2>⚠️ ' . e($msg) . '</h2><p style="color:#9aa1b8">Need help? We will send you a fresh link.</p>'
       . '<a href="' . e($wa) . '" style="display:inline-block;margin-top:12px;padding:12px 22px;border-radius:12px;background:#22c55e;color:#fff;text-decoration:none;font-weight:700">Chat on WhatsApp</a></div></body>';
    exit;
}

$t = preg_replace('/[^a-f0-9]/', '', (string)($_GET['t'] ?? ''));
if (strlen($t) !== 48) dl_error('Invalid download link');
$d = q('SELECT d.*, p.file_path, p.file_name, p.title FROM downloads d JOIN products p ON p.id=d.product_id JOIN orders o ON o.id=d.order_id WHERE d.token=? AND o.status=?', [$t, 'paid'])->fetch();
if (!$d) dl_error('Invalid download link');
if (strtotime($d['expires_at']) < time()) dl_error('This download link has expired');
if ((int)$d['count'] >= (int)$CFG['download']['max_downloads']) dl_error('Download limit reached for this link');

$path = ROOT . '/storage/ppt/' . basename((string)$d['file_path']);
if (!$d['file_path'] || !is_file($path)) dl_error('This file is being prepared — please contact us on WhatsApp');

q('UPDATE downloads SET count=count+1 WHERE id=?', [$d['id']]);
$name = $d['file_name'] ?: (preg_replace('/[^\w\- ]+/', '', $d['title']) . '.' . pathinfo($path, PATHINFO_EXTENSION));
while (ob_get_level()) ob_end_clean();
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . str_replace('"', '', $name) . '"; filename*=UTF-8\'\'' . rawurlencode($name));
header('Content-Length: ' . filesize($path));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');
readfile($path);
