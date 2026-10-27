<?php
/* "PPT Order Now" page ki badi files (1 GB tak) tukdon (chunks) mein aati hain.
   Files storage/ folder mein rehti hain, jo browser se nahi khulta. */
require dirname(__DIR__) . '/includes/bootstrap.php';

/* Tukde ka size: 5 MB, ya server ki upload limit chhoti ho to usse thoda kam */
function ini_bytes(string $v): int {
    $n = (int)$v;
    return match (strtolower(substr(trim($v), -1))) { 'g' => $n * 1073741824, 'm' => $n * 1048576, 'k' => $n * 1024, default => $n };
}
$lim = min(ini_bytes((string)ini_get('upload_max_filesize')) ?: PHP_INT_MAX, ini_bytes((string)ini_get('post_max_size')) ?: PHP_INT_MAX);
define('CHUNK', max(262144, min(5 * 1048576, $lim - 65536)));
const UP_EXT = ['jpg','jpeg','png','webp','gif','heic','pdf','doc','docx','xls','xlsx','csv','ppt','pptx','txt','zip','rar','7z'];
$max = (int)$CFG['uploads']['order_max_mb'] * 1048576;

if ($_SERVER['REQUEST_METHOD'] === 'GET') json_out(['ok' => true, 'max' => $max, 'chunk' => CHUNK]);
api_start();
rate_limit('upload', 2500, 3600);

// 1 din purani adhoori / bina order wali uploads hata do
if (random_int(1, 50) === 1) {
    foreach (array_merge(glob(ROOT . '/storage/tmp/*') ?: [], glob(ROOT . '/storage/uploads/*') ?: []) as $old) {
        if (is_dir($old) && filemtime($old) < time() - 86400) { array_map('unlink', glob("$old/*") ?: []); @rmdir($old); }
    }
}

$id = (string)($_POST['upload_id'] ?? '');
$index = (int)($_POST['index'] ?? -1);
$total = (int)($_POST['total'] ?? 0);
$size = (int)($_POST['size'] ?? 0);
$name = safe_file_name((string)($_POST['name'] ?? ''));
if (!preg_match('/^[a-f0-9]{32}$/', $id)) json_err('Upload id galat hai.');
if (!in_array(strtolower(pathinfo($name, PATHINFO_EXTENSION)), UP_EXT, true)) json_err('Ye file type allowed nahi hai.');
if ($size < 1 || $size > $max) json_err('File 1 GB se chhoti honi chahiye.');
if ($total !== max(1, (int)ceil($size / CHUNK)) || $index < 0 || $index >= $total) json_err('Upload data galat hai.');
$f = $_FILES['chunk'] ?? null;
if (!$f || $f['error'] !== UPLOAD_ERR_OK) json_err(upload_error_text((int)($f['error'] ?? UPLOAD_ERR_NO_FILE)), 500);

$dir = ROOT . "/storage/tmp/$id";
if (!is_dir($dir)) mkdir($dir, 0755, true);
$metaF = "$dir/meta.json";
$meta = is_file($metaF) ? json_decode((string)file_get_contents($metaF), true) : ['name' => $name, 'size' => $size, 'total' => $total, 'next' => 0, 'time' => time()];
if ($meta['size'] !== $size || $meta['total'] !== $total) json_err('Upload data badal gaya. File dobara add karein.');
if ($index !== $meta['next']) json_out(['ok' => false, 'error' => 'out of order', 'next' => $meta['next']], 409);

$expect = $index === $total - 1 ? $size - CHUNK * ($total - 1) : CHUNK;
if ((int)$f['size'] !== $expect) json_err('Chunk size galat hai. Dobara try karein.', 500);
$out = fopen("$dir/data.part", $index === 0 ? 'wb' : 'ab');
$in = fopen($f['tmp_name'], 'rb');
stream_copy_to_stream($in, $out);
fclose($in); fclose($out);
$meta['next'] = $index + 1;
file_put_contents($metaF, json_encode($meta), LOCK_EX);

if ($meta['next'] === $total) {
    clearstatcache();
    if (filesize("$dir/data.part") !== $size) json_err('File poori nahi aayi. Dobara add karein.', 500);
    $final = ROOT . "/storage/uploads/$id";
    if (!is_dir($final)) mkdir($final, 0755, true);
    rename("$dir/data.part", "$final/" . $meta['name']);
    @unlink($metaF); @rmdir($dir);
}
json_out(['ok' => true, 'next' => $meta['next']]);

function safe_file_name(string $n): string {
    $n = basename(str_replace('\\', '/', $n));
    $n = preg_replace('/[^\p{L}\p{N}\-_. ()]+/u', '_', $n) ?? 'file';
    $n = ltrim($n, '.');
    return mb_substr($n !== '' ? $n : 'file', -120);
}
