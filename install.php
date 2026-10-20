<?php
/* =============================================================
   ONE-TIME INSTALLER
   config.php bharne ke baad browser mein  yourdomain.com/install.php  kholo.
   Install hone ke baad ye file apne aap lock ho jaati hai (phir bhi delete kar dena).
   ============================================================= */
require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/schema.php';

$msg = ''; $ok = false;
if (is_installed()) {
    $ok = true; $msg = 'Website already installed hai. Security ke liye install.php file delete kar do.';
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = clean($_POST['username'] ?? '', 60);
    $pass = (string)($_POST['password'] ?? '');
    if (!preg_match('/^[A-Za-z0-9_.@-]{3,60}$/', $user)) $msg = 'Username mein sirf letters, numbers, _ . @ - (3+ characters).';
    elseif (strlen($pass) < 8) $msg = 'Password kam se kam 8 characters ka rakho.';
    elseif ($pass !== ($_POST['password2'] ?? '')) $msg = 'Dono passwords match nahi kar rahe.';
    else {
        try {
            create_tables($CFG['db']['driver']);
            if (!q('SELECT COUNT(*) FROM admins')->fetchColumn()) {
                q('INSERT INTO admins (username,password_hash,created_at) VALUES (?,?,?)', [$user, password_hash($pass, PASSWORD_DEFAULT), now()]);
            }
            if (!empty($_POST['seed']) && !q('SELECT COUNT(*) FROM products')->fetchColumn()) seed_products();
            if (!empty($_POST['themes'])) seed_themes();
            foreach (['storage', 'storage/ppt', 'uploads/thumbs', 'uploads/requests'] as $d) if (!is_dir(ROOT . "/$d")) mkdir(ROOT . "/$d", 0755, true);
            file_put_contents(ROOT . '/storage/installed.lock', date('c'));
            $ok = true; $msg = 'Installation complete! 🎉 Ab install.php file delete kar do aur admin panel kholo.';
        } catch (Throwable $ex) {
            $msg = 'Database se connect nahi ho paya. config.php mein DB name, user aur password check karo. (' . $ex->getMessage() . ')';
        }
    }
}
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Install — Lakshay Agency</title><link rel="stylesheet" href="admin/admin.css"></head>
<body class="auth"><div class="auth-box">
<h1>⚙️ Website Setup</h1>
<?php if ($msg): ?><div class="alert <?= $ok ? 'ok' : 'bad' ?>"><?= e($msg) ?></div><?php endif; ?>
<?php if ($ok): ?>
  <a class="btn" href="admin/login.php">Open Admin Panel →</a> <a class="btn ghost" href="./">View Website</a>
<?php else: ?>
  <p class="muted">Admin panel ke liye username aur password banao.</p>
  <form method="post">
    <label>Admin Username<input name="username" required value="admin"></label>
    <label>Password (min 8)<input type="password" name="password" required minlength="8"></label>
    <label>Confirm Password<input type="password" name="password2" required minlength="8"></label>
    <label class="check"><input type="checkbox" name="themes" value="1" checked> Mere 19 PPT theme samples website par daal do</label>
    <label class="check"><input type="checkbox" name="seed" value="1"> 12 sample (demo) PPTs bhi daal do (baad mein edit/delete kar sakte ho)</label>
    <button class="btn">Install Now</button>
  </form>
<?php endif; ?>
</div></body></html>
