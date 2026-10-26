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
$me = function () {
    $phone = cust_phone();
    if ($phone === '') return ['ok' => true, 'loggedIn' => false, 'otp' => $GLOBALS['useOtp']];
    return ['ok' => true, 'loggedIn' => true, 'phone' => '******' . substr($phone, -4), 'items' => array_values(array_map(fn($p) => [
        'id' => $p['id'], 'title' => $p['title'], 'thumb' => $p['thumb'], 'orderId' => $p['order_id'], 'date' => $p['paid_at'],
        'url' => $p['has_file'] ? 'my-download.php?id=' . $p['id'] : ''], cust_purchases($phone)))];
};

$useOtp = !empty($CFG['sms']['otp']);
if ($action === 'me') json_out($me());

/* Sirf mobile number se login (OTP band ho tab): wahi number jo payment ke time diya tha */
if ($action === 'login') {
    if ($useOtp) json_err('OTP se login karein.');
    rate_limit('mobile-login', 10, 900);
    if (!empty($_POST['website'])) json_out(['ok' => true]);
    $phone = clean_phone($_POST['phone'] ?? '');
    if (!valid_phone($phone)) json_err('Sahi 10-digit mobile number likhiye.');
    if (!cust_purchases($phone)) json_err('Is number se koi purchase nahi mili. Wahi number daalein jo payment ke time diya tha.');
    session_regenerate_id(true);
    $_SESSION['cust_phone'] = $phone;
    json_out($me());
}

if ($action === 'logout') { $_SESSION = []; session_destroy(); json_out(['ok' => true]); }

if ($action === 'send') {
    rate_limit('otp-send', 6, 900);
    if (!empty($_POST['website'])) json_out(['ok' => true]);
    $phone = clean_phone($_POST['phone'] ?? '');
    if (!valid_phone($phone)) json_err('Sahi 10-digit mobile number likhiye.');
    $last = q("SELECT email FROM orders WHERE phone=? AND status IN ('paid','review') AND email<>'' ORDER BY id DESC LIMIT 1", [$phone])->fetch();
    if (!$last) json_err('Is number se koi purchase nahi mili. Wahi number daalein jo payment ke time diya tha.');
    $recent = (int)q('SELECT COUNT(*) FROM otps WHERE phone=? AND created_at > ?', [$phone, date('Y-m-d H:i:s', time() - 900)])->fetchColumn();
    if ($recent >= 3) json_err('Bahut baar OTP maanga gaya. 15 minute baad try karein.', 429);

    $code = (string)random_int(100000, 999999);
    q('DELETE FROM otps WHERE phone=? AND created_at < ?', [$phone, date('Y-m-d H:i:s', time() - 86400)]);
    q('INSERT INTO otps (phone, code_hash, attempts, expires_at, created_at) VALUES (?,?,0,?,?)', [$phone, password_hash($code, PASSWORD_DEFAULT), date('Y-m-d H:i:s', time() + 600), now()]);
    if (send_sms_otp($phone, $code)) json_out(['ok' => true, 'via' => 'sms', 'to' => '******' . substr($phone, -4)]);
    $sent = send_mail($last['email'], 'Your login OTP: ' . $code . ' — ' . $CFG['site']['name'],
        '<div style="font-family:Arial,sans-serif;font-size:15px"><p>Aapka My PPTs login OTP:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">' . $code
        . '</p><p style="color:#666">10 minute tak chalega. Ye OTP kisi ko na batayein.</p><p>— ' . e($CFG['site']['name']) . '</p></div>');
    if (!$sent) json_err('OTP bhej nahi paye. WhatsApp par contact karein.', 502);
    json_out(['ok' => true, 'via' => 'email', 'to' => $mask_email($last['email'])]);
}

if ($action === 'verify') {
    rate_limit('otp-verify', 20, 900);
    $phone = clean_phone($_POST['phone'] ?? '');
    $code = preg_replace('/\D/', '', (string)($_POST['otp'] ?? ''));
    $o = q('SELECT * FROM otps WHERE phone=? ORDER BY id DESC LIMIT 1', [$phone])->fetch();
    if (!$o || strtotime($o['expires_at']) < time()) json_err('OTP expire ho gaya. Naya OTP mangaiye.');
    if ((int)$o['attempts'] >= 5) json_err('Bahut galat koshish. Naya OTP mangaiye.');
    q('UPDATE otps SET attempts=attempts+1 WHERE id=?', [$o['id']]);
    if (strlen($code) !== 6 || !password_verify($code, $o['code_hash'])) json_err('OTP galat hai.');
    q('UPDATE otps SET expires_at=? WHERE id=?', [now(), $o['id']]);
    session_regenerate_id(true);
    $_SESSION['cust_phone'] = $phone;
    json_out($me());
}

json_err('Unknown action');
