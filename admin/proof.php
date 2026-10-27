<?php
/* Customer ka payment screenshot (sirf admin) */
require __DIR__ . '/_inc.php';
require_login();
$o = q('SELECT proof FROM orders WHERE id=?', [(int)($_GET['o'] ?? 0)])->fetch();
$path = $o && $o['proof'] ? ROOT . '/storage/proofs/' . basename($o['proof']) : '';
if (!$path || !is_file($path)) { http_response_code(404); exit('Screenshot nahi mila.'); }
header('Content-Type: ' . (['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][pathinfo($path, PATHINFO_EXTENSION)] ?? 'application/octet-stream'));
header('Content-Length: ' . filesize($path));
header('X-Content-Type-Options: nosniff');
readfile($path);
