<?php
/* Customer "My PPTs": mobile OTP se login, phir khareedi PPTs dobara download */
require dirname(__DIR__) . '/includes/bootstrap.php';
if (!is_installed()) json_err('Website abhi setup nahi hui hai.', 503);
// purani installation par bhi OTP table ban jaye
$sqlite = ($CFG['db']['driver'] ?? 'mysql') === 'sqlite';
db()->exec('CREATE TABLE IF NOT EXISTS otps (id ' . ($sqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT UNSIGNED AUTO_INCREMENT PRIMARY KEY')
    . ', phone VARCHAR(20) NOT NULL, code_hash VARCHAR(255) NOT NULL, attempts INT NOT NULL DEFAULT 0, expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL)'
    . ($sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'));
cust_start();

$action = $_SERVER['REQUEST_METHOD'] === 'POST' ? (string)($_POST['action'] ?? '') : 'me';
$mask_email = fn(string $m) => preg_replace('/^(.)(.*)(@.*)$/u', '$1***$3', $m);
$mask = fn(string $k) => str_contains($k, '@') ? $mask_email($k) : '******' . substr($k, -4);
/* Mobile number ya email: [key, otp table key] */
function ident(): array {
    $raw = trim((string)($_POST['id'] ?? $_POST['phone'] ?? ''));
    if (str_contains($raw, '@')) {
        $m = strtolower(clean($raw, 190));
        if (!valid_email($m)) json_err('सही ईमेल डालें। / Enter a valid email.');
        return [$m, 'e' . substr(sha1($m), 0, 19)];
    }
    $p = clean_phone($raw);
    if (!valid_phone($p)) json_err('सही मोबाइल नंबर या ईमेल डालें। / Enter a valid mobile or email.');
    return [$p, $p];
}
$notFound = 'इस मोबाइल / ईमेल से कोई खरीदारी नहीं मिली। वही डालें जो पेमेंट के समय भरा था। / No purchase found.';
$me = function () use ($mask) {
    $key = cust_phone();
    if ($key === '') return ['ok' => true, 'loggedIn' => false, 'otp' => $GLOBALS['useOtp']];
    return ['ok' => true, 'loggedIn' => true, 'phone' => $mask($key), 'items' => array_values(array_map(fn($p) => [
        'id' => $p['id'], 'title' => $p['title'], 'thumb' => $p['thumb'], 'orderId' => $p['order_id'], 'date' => $p['paid_at'],
        'url' => $p['has_file'] && !$p['pending'] ? 'my-download.php?id=' . $p['id'] : '', 'pending' => $p['pending']], cust_purchases($key)))];
};

$useOtp = !empty($CFG['sms']['otp']);
if ($action === 'me') json_out($me());

/* OTP band ho tab: sirf wahi mobile / email jo payment ke time diya tha */
if ($action === 'login') {
    if ($useOtp) json_err('OTP से login करें। / Login with OTP.');
    rate_limit('mobile-login', 10, 900);
    if (!empty($_POST['website'])) json_out(['ok' => true]);
    [$key] = ident();
    if (!cust_purchases($key)) json_err($notFound);
    cust_login($key);
    json_out($me());
}

if ($action === 'logout') { $_SESSION = []; session_destroy(); json_out(['ok' => true]); }

if ($action === 'send') {
    rate_limit('otp-send', 6, 900);
    if (!empty($_POST['website'])) json_out(['ok' => true]);
    [$key, $okey] = ident();
    $isEmail = str_contains($key, '@');
    if (!cust_purchases($key)) json_err($notFound);
    $to = $isEmail ? $key : (string)q("SELECT email FROM orders WHERE phone=? AND status IN ('paid','review') AND email<>'' ORDER BY id DESC LIMIT 1", [$key])->fetchColumn();
    $recent = (int)q('SELECT COUNT(*) FROM otps WHERE phone=? AND created_at > ?', [$okey, date('Y-m-d H:i:s', time() - 900)])->fetchColumn();
    if ($recent >= 3) json_err('बहुत बार OTP माँगा गया। 15 मिनट बाद try करें। / Too many tries, wait 15 min.', 429);

    $code = (string)random_int(100000, 999999);
    q('DELETE FROM otps WHERE phone=? AND created_at < ?', [$okey, date('Y-m-d H:i:s', time() - 86400)]);
    q('INSERT INTO otps (phone, code_hash, attempts, expires_at, created_at) VALUES (?,?,0,?,?)', [$okey, password_hash($code, PASSWORD_DEFAULT), date('Y-m-d H:i:s', time() + 600), now()]);
    if (!$isEmail && send_sms_otp($key, $code)) json_out(['ok' => true, 'via' => 'sms', 'to' => $mask($key)]);
    if ($to === '') json_err('इस नंबर के order में ईमेल नहीं है। WhatsApp पर संपर्क करें। / No email on this order.');
    $sent = send_mail($to, 'Your login OTP: ' . $code . ' — ' . $CFG['site']['name'],
        '<div style="font-family:Arial,sans-serif;font-size:15px"><p>Aapka My PPTs login OTP / Your login OTP:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">' . $code
        . '</p><p style="color:#666">10 minute tak chalega. Ye OTP kisi ko na batayein.</p><p>— ' . e($CFG['site']['name']) . '</p></div>');
    if (!$sent) json_err('OTP नहीं भेज पाए। WhatsApp पर संपर्क करें। / Could not send OTP.', 502);
    json_out(['ok' => true, 'via' => 'email', 'to' => $mask_email($to)]);
}

if ($action === 'verify') {
    rate_limit('otp-verify', 20, 900);
    [$key, $okey] = ident();
    $code = preg_replace('/\D/', '', (string)($_POST['otp'] ?? ''));
    $o = q('SELECT * FROM otps WHERE phone=? ORDER BY id DESC LIMIT 1', [$okey])->fetch();
    if (!$o || strtotime($o['expires_at']) < time()) json_err('OTP expire हो गया। नया OTP माँगें। / OTP expired.');
    if ((int)$o['attempts'] >= 5) json_err('बहुत बार गलत OTP। नया OTP माँगें। / Too many wrong tries.');
    q('UPDATE otps SET attempts=attempts+1 WHERE id=?', [$o['id']]);
    if (strlen($code) !== 6 || !password_verify($code, $o['code_hash'])) json_err('OTP गलत है। / Wrong OTP.');
    q('UPDATE otps SET expires_at=? WHERE id=?', [now(), $o['id']]);
    cust_login($key);
    json_out($me());
}

json_err('Unknown action');
