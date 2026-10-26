<?php
require __DIR__ . '/_inc.php';
if (!empty($_SESSION['admin_id'])) go('index.php');
$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    if (limit_hit('admin-login', 8, 900, false)) $err = 'Bahut galat koshishein. 15 minute baad try karein.';
    else {
        $a = q('SELECT * FROM admins WHERE username=?', [clean($_POST['username'] ?? '', 60)])->fetch();
        if ($a && password_verify((string)($_POST['password'] ?? ''), $a['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION = ['admin_id' => (int)$a['id'], 'admin_user' => $a['username'], 'seen' => time()];
            go('index.php');
        }
        limit_hit('admin-login', 8, 900);
        $err = 'Username ya password galat hai.';
    }
}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Admin Login — Lakshay Agency</title><link rel="stylesheet" href="admin.css"></head>
<body class="auth"><div class="auth-box">
<h1>🔐 Admin Login</h1>
<?php if ($err): ?><div class="alert bad"><?= e($err) ?></div><?php endif; ?>
<form method="post"><?= csrf_field() ?>
  <label>Username<input name="username" required autofocus autocomplete="username"></label>
  <label>Password<input type="password" name="password" required autocomplete="current-password"></label>
  <button class="btn">Login</button>
</form>
</div></body></html>
