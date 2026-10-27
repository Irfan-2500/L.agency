<?php
/* Custom PPT request (homepage popup + "PPT Order Now" page) */
require dirname(__DIR__) . '/includes/bootstrap.php';
api_start();
rate_limit('request', 8, 3600);

const REQ_EXT = ['pdf','doc','docx','xls','xlsx','csv','jpg','jpeg','png','webp','gif'];
$name = clean($_POST['name'] ?? '', 120);
$phone = clean_phone($_POST['phone'] ?? '');
$topic = clean($_POST['topic'] ?? '', 200);
if (mb_strlen($name) < 2) json_err('Please enter your name');
if (!valid_phone($phone)) json_err('Please enter a valid 10-digit mobile number');
if ($topic === '') json_err('Please enter the subject or topic');

$direct = files_list('files');
$maxMB = (int)$CFG['uploads']['max_mb'];
if (count($direct) > (int)$CFG['uploads']['max_files']) json_err('Maximum ' . (int)$CFG['uploads']['max_files'] . ' files allowed');
foreach ($direct as $f) {
    if ($f['error'] !== UPLOAD_ERR_OK) json_err('"' . clean($f['name'], 100) . '" — ' . upload_error_text((int)$f['error']));
    if ($f['size'] > $maxMB * 1048576) json_err('"' . clean($f['name'], 100) . "\" — file is larger than $maxMB MB");
    if (!in_array(strtolower(pathinfo($f['name'], PATHINFO_EXTENSION)), REQ_EXT, true)) json_err('"' . clean($f['name'], 100) . '" — only PDF, Word, Excel & image files allowed');
}
$chunked = array_values(array_filter((array)json_decode((string)($_POST['uploads'] ?? '[]'), true), fn($u) => is_string($u) && preg_match('/^[a-f0-9]{32}$/', $u)));

q('INSERT INTO requests (source,name,phone,topic,slides,language,requirements,files,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
  [clean($_POST['source'] ?? 'website', 30), $name, $phone, $topic, clean($_POST['slides'] ?? '', 40), clean($_POST['language'] ?? '', 40), clean($_POST['requirements'] ?? '', 5000), '[]', now()]);
$rid = (int)db()->lastInsertId();
$dir = ROOT . "/storage/requests/$rid";
$saved = [];
foreach ($direct as $f) {
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $n = preg_replace('/[^\p{L}\p{N}\-_. ()]+/u', '_', basename($f['name']));
    $n = count($saved) . '-' . ltrim(mb_substr($n, -100), '.');
    if (move_uploaded_file($f['tmp_name'], "$dir/$n")) $saved[] = $n;
}
foreach (array_slice($chunked, 0, 10) as $u) {
    $src = ROOT . "/storage/uploads/$u";
    foreach (glob("$src/*") ?: [] as $file) {
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $n = count($saved) . '-' . basename($file);
        if (rename($file, "$dir/$n")) $saved[] = $n;
    }
    @rmdir($src);
}
q('UPDATE requests SET files=? WHERE id=?', [json_encode($saved, JSON_UNESCAPED_UNICODE), $rid]);
notify_admin('📝 Naya PPT request #' . $rid . ' — ' . $topic, ['Name' => $name, 'Phone' => $phone, 'Topic' => $topic,
    'Slides' => $_POST['slides'] ?? '', 'Language' => $_POST['language'] ?? '', 'Details' => $_POST['requirements'] ?? '', 'Files' => count($saved)]);
json_out(['ok' => true, 'id' => $rid]);
