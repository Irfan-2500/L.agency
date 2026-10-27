<?php
require __DIR__ . '/_inc.php';
require_login();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $id = (int)($_POST['id'] ?? 0);
    if (($_POST['action'] ?? '') === 'delete') {
        foreach (glob(ROOT . "/storage/requests/$id/*") ?: [] as $f) @unlink($f);
        @rmdir(ROOT . "/storage/requests/$id");
        q('DELETE FROM requests WHERE id=?', [$id]);
        flash('Request delete ho gaya.');
    } else {
        q('UPDATE requests SET status=? WHERE id=?', [in_array($_POST['status'] ?? '', ['new', 'working', 'done'], true) ? $_POST['status'] : 'new', $id]);
        flash('Status update ho gaya.');
    }
    go('requests.php');
}
$rows = q('SELECT * FROM requests ORDER BY id DESC LIMIT 300')->fetchAll();
admin_header('Custom Requests', 'requests');
?>
<?php if (!$rows): ?><section class="card"><p class="muted">Abhi koi custom PPT request nahi aaya.</p></section><?php endif; ?>
<?php foreach ($rows as $r): $files = json_decode((string)$r['files'], true) ?: []; ?>
<section class="card req <?= e($r['status']) ?>">
  <div class="req-head"><b>#<?= (int)$r['id'] ?> · <?= e($r['topic']) ?></b><small><?= e(date('d M Y, h:i A', strtotime($r['created_at']))) ?> · <?= $r['source'] === 'order-page' ? 'PPT Order page' : 'Website popup' ?></small></div>
  <p><?= e($r['name']) ?> · <a href="https://wa.me/91<?= e($r['phone']) ?>" target="_blank" rel="noopener">WhatsApp <?= e($r['phone']) ?></a><?= $r['slides'] ? ' · ' . e($r['slides']) : '' ?><?= $r['language'] ? ' · ' . e($r['language']) : '' ?></p>
  <?php if ($r['requirements']): ?><p class="pre"><?= e($r['requirements']) ?></p><?php endif; ?>
  <?php if ($files): ?><div class="files"><?php foreach ($files as $f): ?><a href="file.php?r=<?= (int)$r['id'] ?>&f=<?= rawurlencode($f) ?>">📎 <?= e(preg_replace('/^\d+-/', '', $f)) ?></a><?php endforeach; ?></div><?php endif; ?>
  <div class="row"><form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$r['id'] ?>">
    <select name="status" onchange="this.form.submit()"><?php foreach (['new' => '🆕 Naya', 'working' => '⏳ Kaam chal raha', 'done' => '✓ Ho gaya'] as $k => $v): ?><option value="<?= $k ?>" <?= $r['status'] === $k ? 'selected' : '' ?>><?= $v ?></option><?php endforeach; ?></select></form>
    <form method="post" onsubmit="return confirm('Request aur uski files delete karni hain?')"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><input type="hidden" name="action" value="delete"><button class="btn sm ghost">Delete</button></form></div>
</section>
<?php endforeach;
admin_footer();
