<?php
/* Customer ki bheji file download (sirf admin) */
require __DIR__ . '/_inc.php';
require_login();
$r = (int)($_GET['r'] ?? 0);
$f = basename((string)($_GET['f'] ?? ''));
$path = ROOT . "/storage/requests/$r/$f";
if (!$r || $f === '' || !is_file($path)) { http_response_code(404); exit('File nahi mili.'); }
while (ob_get_level()) ob_end_clean();
$name = preg_replace('/^\d+-/', '', $f);
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . str_replace('"', '', $name) . '"; filename*=UTF-8\'\'' . rawurlencode($name));
header('Content-Length: ' . filesize($path));
header('X-Content-Type-Options: nosniff');
readfile($path);
