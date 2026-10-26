<?php
/* =============================================================
   Har PHP file sabse pehle isko load karti hai: settings, database aur helper functions.
   Isko chhedne ki zarurat nahi.
   ============================================================= */
declare(strict_types=1);

define('ROOT', dirname(__DIR__));
$CFG = require ROOT . '/config.php';
date_default_timezone_set('Asia/Kolkata');
mb_internal_encoding('UTF-8');

/* ---------- DATABASE ---------- */
function db(): PDO {
    static $pdo = null;
    global $CFG;
    if ($pdo) return $pdo;
    $d = $CFG['db'];
    $opt = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false];
    if (($d['driver'] ?? 'mysql') === 'sqlite') {
        if (!is_dir(dirname($d['sqlite_path']))) mkdir(dirname($d['sqlite_path']), 0755, true);
        $pdo = new PDO('sqlite:' . $d['sqlite_path'], null, null, $opt);
        $pdo->exec('PRAGMA foreign_keys = ON');
    } else {
        $pdo = new PDO("mysql:host={$d['host']};dbname={$d['name']};charset=utf8mb4", $d['user'], $d['pass'], $opt);
    }
    return $pdo;
}
function q(string $sql, array $args = []): PDOStatement {
    $st = db()->prepare($sql);
    $st->execute($args);
    return $st;
}
function now(): string { return date('Y-m-d H:i:s'); }
function is_installed(): bool { return is_file(ROOT . '/storage/installed.lock'); }

/* ---------- TEXT HELPERS ---------- */
function e($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function clean($s, int $max = 255): string {
    $s = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string)$s) ?? '');
    return mb_substr($s, 0, $max);
}
function clean_phone($s): string {
    $d = preg_replace('/\D/', '', (string)$s);
    return preg_replace('/^(91|0)(?=\d{10}$)/', '', $d);
}
function valid_phone(string $p): bool { return (bool)preg_match('/^[6-9]\d{9}$/', $p); }
function valid_email(string $m): bool { return (bool)filter_var($m, FILTER_VALIDATE_EMAIL); }
function site_url(): string {
    global $CFG;
    if (!empty($CFG['site']['url'])) return rtrim($CFG['site']['url'], '/');
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    $dir = preg_replace('#/(api|admin)$#', '', $dir);
    return ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $dir;
}

/* ---------- JSON API HELPERS ---------- */
function json_out(array $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function json_err(string $msg, int $code = 400): void { json_out(['ok' => false, 'error' => $msg], $code); }
function api_start(string $method = 'POST'): void {
    if (!is_installed()) json_err('Website abhi setup nahi hui hai.', 503);
    if ($_SERVER['REQUEST_METHOD'] !== $method) json_err('Method not allowed', 405);
    // honeypot: bots ye chhupa hua field bhar dete hain
    if ($method === 'POST' && !empty($_POST['website'])) json_out(['ok' => true]);
}
/* Simple rate limit: ek IP se ek kaam ke liye limit (storage/ratelimit mein file).
   true = limit poori ho chuki. $record = false sirf check karta hai. */
function limit_hit(string $key, int $max, int $seconds, bool $record = true): bool {
    $dir = ROOT . '/storage/ratelimit';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $f = $dir . '/' . sha1($key . '|' . ($_SERVER['REMOTE_ADDR'] ?? '')) . '.json';
    $t = time();
    $hits = is_file($f) ? (json_decode((string)file_get_contents($f), true) ?: []) : [];
    $hits = array_values(array_filter($hits, fn($h) => $h > $t - $seconds));
    if (count($hits) >= $max) return true;
    if ($record) { $hits[] = $t; @file_put_contents($f, json_encode($hits), LOCK_EX); }
    return false;
}
function rate_limit(string $key, int $max, int $seconds): void {
    if (limit_hit($key, $max, $seconds)) json_err('Bahut zyada requests. Thodi der baad try karein.', 429);
}

/* ---------- SETTINGS (admin panel se badalne wali) ---------- */
function setting(string $name, string $default = ''): string {
    static $all = null;
    if ($all === null) {
        try { $all = array_column(q('SELECT name, value FROM settings')->fetchAll(), 'value', 'name'); } catch (Throwable $e) { $all = []; }
    }
    return isset($all[$name]) && $all[$name] !== '' ? (string)$all[$name] : $default;
}
function set_setting(string $name, string $value): void {
    q('DELETE FROM settings WHERE name=?', [$name]);
    q('INSERT INTO settings (name, value) VALUES (?, ?)', [$name, $value]);
}
/* UPI: admin setting > config.php */
function upi_config(): array {
    global $CFG;
    return ['id' => setting('upi_id', (string)($CFG['upi']['id'] ?? '')), 'name' => setting('upi_name', (string)($CFG['upi']['name'] ?? $CFG['site']['name'])), 'qr' => setting('upi_qr')];
}
function valid_upi(string $v): bool { return (bool)preg_match('/^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.]{1,64}$/', $v); }

/* ---------- PRODUCTS ---------- */
const CATS = ['edu' => 'Educational & Teaching PPTs', 'biz' => 'Business Presentations', 'mkt' => 'Marketing & Sales PPTs', 'anim' => 'Animated PPTs'];
function csv_list($s): array { return array_values(array_filter(array_map('trim', explode(',', (string)$s)), 'strlen')); }
/* Kitne logon ne khareeda: asli paid orders + admin ka "pehle ki sales" number */
function sales_counts(): array {
    $out = [];
    foreach (q("SELECT d.product_id, COUNT(DISTINCT d.order_id) n FROM downloads d JOIN orders o ON o.id=d.order_id WHERE o.status='paid' GROUP BY d.product_id")->fetchAll() as $r) {
        $out[(int)$r['product_id']] = (int)$r['n'];
    }
    return $out;
}
function product_public(array $p, array $sales): array {
    $prev = json_decode((string)($p['previews'] ?? ''), true) ?: [];
    return [
        'id' => (int)$p['id'], 'title' => $p['title'], 'desc' => $p['description'], 'cat' => $p['cat'],
        'price' => (int)$p['price'], 'mrp' => max((int)$p['mrp'], (int)$p['price']), 'slides' => (int)$p['slides'],
        'lang' => $p['lang'], 'theme' => $p['theme'], 'board' => csv_list($p['board']), 'level' => csv_list($p['level']) ?: ['Other'],
        'subject' => $p['subject'], 'anim' => (bool)$p['anim'], 'badge' => $p['badge'],
        'colors' => [$p['color1'] ?: '#8b2cff', $p['color2'] ?: '#06b6d4'],
        'thumb' => $p['thumb'] ?: '', 'previews' => $prev,
        'sales' => (int)$p['sales_base'] + ($sales[(int)$p['id']] ?? 0),
        'added' => strtotime((string)$p['created_at']) ?: 0,
    ];
}

/* Order ko paid mark karo, download links banao, customer + admin ko email. Links lauta deta hai. */
function mark_order_paid(array $o, string $paymentId): array {
    global $CFG;
    $fresh = false;
    if ($o['status'] !== 'paid') {
        db()->beginTransaction();
        q("UPDATE orders SET status='paid', rzp_payment_id=?, paid_at=? WHERE id=?", [$paymentId, now(), $o['id']]);
        $exp = date('Y-m-d H:i:s', time() + 86400 * (int)$CFG['download']['expiry_days']);
        foreach (json_decode($o['items'], true) ?: [] as $prod) {
            q('INSERT INTO downloads (order_id,product_id,token,count,expires_at,created_at) VALUES (?,?,?,0,?,?)', [$o['id'], (int)$prod, bin2hex(random_bytes(24)), $exp, now()]);
        }
        db()->commit();
        $fresh = true;
    }
    $links = array_map(fn($d) => ['title' => $d['title'], 'url' => site_url() . '/download.php?t=' . $d['token']],
        q('SELECT d.token, p.title FROM downloads d JOIN products p ON p.id=d.product_id WHERE d.order_id=?', [$o['id']])->fetchAll());
    if ($fresh) {
        $li = implode('', array_map(fn($l) => '<li style="margin:8px 0"><a href="' . e($l['url']) . '">' . e($l['title']) . ' — Download</a></li>', $links));
        send_mail($o['email'], 'Your PPT download — Order #' . $o['id'],
            '<div style="font-family:Arial,sans-serif;font-size:15px"><p>Hi ' . e($o['name']) . ',</p><p>Thank you for your order! Download your PPT here:</p><ul>' . $li
            . '</ul><p style="color:#666">Links ' . (int)$CFG['download']['expiry_days'] . ' din tak chalenge (max ' . (int)$CFG['download']['max_downloads'] . ' downloads).</p><p>— ' . e($CFG['site']['name']) . '</p></div>');
        notify_admin('💰 Naya paid order #' . $o['id'] . ' — ₹' . ($o['amount'] / 100), ['Name' => $o['name'], 'Email' => $o['email'], 'Phone' => $o['phone'], 'PPTs' => implode(', ', array_column($links, 'title'))]);
    }
    return $links;
}

/* Razorpay API call. [http code, json] */
function rzp_api(string $method, string $path, ?array $body = null): array {
    global $CFG;
    $ch = curl_init('https://api.razorpay.com/v1/' . $path);
    curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20,
        CURLOPT_USERPWD => $CFG['razorpay']['key_id'] . ':' . $CFG['razorpay']['key_secret'], CURLOPT_HTTPHEADER => ['Content-Type: application/json']]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $res = json_decode((string)curl_exec($ch), true);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, is_array($res) ? $res : []];
}

/* ---------- FILE UPLOAD HELPERS ---------- */
function upload_error_text(int $code): string {
    return [UPLOAD_ERR_INI_SIZE => 'File bahut badi hai (server limit).', UPLOAD_ERR_FORM_SIZE => 'File bahut badi hai.',
            UPLOAD_ERR_PARTIAL => 'File poori upload nahi hui.', UPLOAD_ERR_NO_FILE => 'Koi file nahi chuni.'][$code] ?? 'Upload fail ho gaya.';
}
function rand_name(string $ext): string { return bin2hex(random_bytes(10)) . '.' . strtolower($ext); }
/* Image save: sirf asli JPG/PNG/WEBP/GIF, public folder mein */
function save_image(array $f, string $dir): string {
    if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new RuntimeException(upload_error_text((int)$f['error']));
    if ($f['size'] > 15 * 1048576) throw new RuntimeException('Image 15 MB se chhoti honi chahiye.');
    $info = @getimagesize($f['tmp_name']);
    $ext = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'][$info[2] ?? 0] ?? null;
    if (!$ext) throw new RuntimeException('Sirf JPG, PNG, WEBP ya GIF image chalegi.');
    if (!is_dir(ROOT . "/$dir")) mkdir(ROOT . "/$dir", 0755, true);
    $name = rand_name($ext);
    if (!move_uploaded_file($f['tmp_name'], ROOT . "/$dir/$name")) throw new RuntimeException('Image save nahi hui. Folder permission check karein.');
    return "$dir/$name";
}
/* Normalise $_FILES['x'] (multiple) into a list */
function files_list(string $key): array {
    if (empty($_FILES[$key])) return [];
    $f = $_FILES[$key];
    if (!is_array($f['name'])) return $f['error'] === UPLOAD_ERR_NO_FILE ? [] : [$f];
    $out = [];
    foreach ($f['name'] as $i => $n) {
        if ($f['error'][$i] === UPLOAD_ERR_NO_FILE) continue;
        $out[] = ['name' => $n, 'type' => $f['type'][$i], 'tmp_name' => $f['tmp_name'][$i], 'error' => $f['error'][$i], 'size' => $f['size'][$i]];
    }
    return $out;
}

/* ---------- EMAIL ---------- */
function send_mail(string $to, string $subject, string $html): bool {
    global $CFG;
    if (!valid_email($to)) return false;
    $host = preg_replace('/^www\./', '', parse_url(site_url(), PHP_URL_HOST) ?: 'localhost');
    $from = $CFG['site']['mail_from'] ?: "noreply@$host";
    $headers = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n"
             . 'From: ' . mb_encode_mimeheader($CFG['site']['name']) . " <$from>\r\n"
             . 'Reply-To: ' . $CFG['site']['email'] . "\r\n";
    return @mail($to, mb_encode_mimeheader($subject), $html, $headers);
}
function notify_admin(string $subject, array $rows): void {
    global $CFG;
    $h = '<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px">';
    foreach ($rows as $k => $v) $h .= '<tr><td style="color:#666">' . e($k) . '</td><td><b>' . nl2br(e($v)) . '</b></td></tr>';
    send_mail($CFG['site']['admin_email'], $subject, $h . '</table><p><a href="' . e(site_url()) . '/admin/">Admin panel kholo</a></p>');
}
