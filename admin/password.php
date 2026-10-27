<?php
require __DIR__ . '/_inc.php';
require_login();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $a = q('SELECT * FROM admins WHERE id=?', [$_SESSION['admin_id']])->fetch();
    $new = (string)($_POST['new'] ?? '');
    if (!$a || !password_verify((string)($_POST['old'] ?? ''), $a['password_hash'])) flash('Purana password galat hai.', false);
    elseif (strlen($new) < 8) flash('Naya password kam se kam 8 characters ka rakho.', false);
    elseif ($new !== ($_POST['new2'] ?? '')) flash('Dono naye passwords match nahi kar rahe.', false);
    else { q('UPDATE admins SET password_hash=? WHERE id=?', [password_hash($new, PASSWORD_DEFAULT), $a['id']]); flash('Password badal gaya. ✓'); }
    go('password.php');
}
admin_header('Password badlo', 'password');
?>
<form method="post" class="card form narrow"><?= csrf_field() ?>
  <label>Purana password<input type="password" name="old" required autocomplete="current-password"></label>
  <label>Naya password (min 8)<input type="password" name="new" required minlength="8" autocomplete="new-password"></label>
  <label>Naya password dobara<input type="password" name="new2" required minlength="8" autocomplete="new-password"></label>
  <div class="actions"><button class="btn">Password badlo</button></div>
</form>
<?php admin_footer();
