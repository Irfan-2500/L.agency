<?php
require __DIR__ . '/_inc.php';
require_login();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    q('DELETE FROM messages WHERE id=?', [(int)($_POST['id'] ?? 0)]);
    flash('Message delete ho gaya.'); go('messages.php');
}
$rows = q('SELECT * FROM messages ORDER BY id DESC LIMIT 300')->fetchAll();
q('UPDATE messages SET is_read=1 WHERE is_read=0');
admin_header('Messages', 'messages');
if (!$rows) echo '<section class="card"><p class="muted">Abhi koi message nahi aaya.</p></section>';
foreach ($rows as $m): ?>
<section class="card req <?= $m['is_read'] ? '' : 'new' ?>">
  <div class="req-head"><b><?= e($m['subject'] ?: 'Message') ?></b><small><?= e(date('d M Y, h:i A', strtotime($m['created_at']))) ?></small></div>
  <p><?= e($m['name']) ?> · <a href="mailto:<?= e($m['email']) ?>"><?= e($m['email']) ?></a><?= $m['phone'] ? ' · ' . e($m['phone']) : '' ?></p>
  <p class="pre"><?= e($m['message']) ?></p>
  <form method="post" onsubmit="return confirm('Delete karein?')"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$m['id'] ?>"><button class="btn sm ghost">Delete</button></form>
</section>
<?php endforeach;
admin_footer();
