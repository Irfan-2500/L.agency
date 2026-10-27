<?php
require __DIR__ . '/_inc.php';
require_login();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $id = (int)($_POST['id'] ?? 0);
    match ($_POST['action'] ?? '') {
        'approve' => q('UPDATE reviews SET approved=1 WHERE id=?', [$id]),
        'hide' => q('UPDATE reviews SET approved=0 WHERE id=?', [$id]),
        'delete' => q('DELETE FROM reviews WHERE id=?', [$id]),
        default => null,
    };
    flash('Review update ho gaya.'); go('reviews.php');
}
$rows = q('SELECT * FROM reviews ORDER BY approved, id DESC LIMIT 300')->fetchAll();
admin_header('Reviews', 'reviews');
if (!$rows) echo '<section class="card"><p class="muted">Abhi koi review nahi aaya.</p></section>';
foreach ($rows as $r): ?>
<section class="card req <?= $r['approved'] ? 'done' : 'new' ?>">
  <div class="req-head"><b><?= str_repeat('★', (int)$r['stars']) ?> <?= e($r['name']) ?></b><small><?= $r['approved'] ? '✓ Website par dikh raha' : '⏳ Approve karna baaki' ?> · <?= e(date('d M Y', strtotime($r['created_at']))) ?></small></div>
  <?php if ($r['role'] || $r['deck']): ?><p class="muted"><?= e($r['role']) ?><?= $r['deck'] ? ' · Deck: ' . e($r['deck']) : '' ?></p><?php endif; ?>
  <p class="pre"><?= e($r['text']) ?></p>
  <div class="row"><?php foreach ($r['approved'] ? ['hide' => 'Chhupao'] : ['approve' => '✓ Approve karo'] as $a => $l): ?>
    <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><input type="hidden" name="action" value="<?= $a ?>"><button class="btn sm <?= $a === 'approve' ? '' : 'ghost' ?>"><?= $l ?></button></form><?php endforeach; ?>
    <form method="post" onsubmit="return confirm('Delete karein?')"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><input type="hidden" name="action" value="delete"><button class="btn sm ghost">Delete</button></form></div>
</section>
<?php endforeach;
admin_footer();
