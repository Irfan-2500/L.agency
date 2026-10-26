<?php
require __DIR__ . '/_inc.php';
require_login();
$stats = [
    ['🗂️', 'Ready PPTs', (int)q('SELECT COUNT(*) FROM products WHERE active=1')->fetchColumn(), 'products.php'],
    ['💳', 'Paid orders', (int)q("SELECT COUNT(*) FROM orders WHERE status='paid'")->fetchColumn(), 'orders.php'],
    ['💰', 'Total kamai', inr((int)q("SELECT COALESCE(SUM(amount),0) FROM orders WHERE status='paid'")->fetchColumn() / 100), 'orders.php'],
    ['📝', 'Naye requests', (int)q("SELECT COUNT(*) FROM requests WHERE status='new'")->fetchColumn(), 'requests.php'],
];
$recent = q("SELECT * FROM orders WHERE status='paid' ORDER BY id DESC LIMIT 8")->fetchAll();
$titles = array_column(q('SELECT id,title FROM products')->fetchAll(), 'title', 'id');
admin_header('Dashboard', 'index');
?>
<div class="stats"><?php foreach ($stats as [$ic, $l, $v, $href]): ?>
  <a class="stat" href="<?= $href ?>"><span><?= $ic ?></span><b><?= e($v) ?></b><small><?= e($l) ?></small></a>
<?php endforeach; ?></div>
<div class="quick"><a class="btn" href="products.php?edit=new">+ Nayi PPT upload karo</a><a class="btn ghost" href="themes.php">+ Theme images daalo</a></div>
<section class="card"><h2>Haal ke paid orders</h2>
<?php if (!$recent): ?><p class="muted">Abhi koi paid order nahi hai. Jaise hi koi PPT khareedega, yahan dikhega.</p>
<?php else: ?><div class="tbl"><table><tr><th>#</th><th>Customer</th><th>PPTs</th><th>Amount</th><th>Date</th></tr>
<?php foreach ($recent as $o): ?><tr><td><?= (int)$o['id'] ?></td><td><?= e($o['name']) ?><small><?= e($o['phone']) ?></small></td>
<td><?= e(implode(', ', array_map(fn($i) => $titles[$i] ?? "#$i", json_decode($o['items'], true) ?: []))) ?></td><td><?= inr($o['amount'] / 100) ?></td><td><?= e(date('d M, h:i A', strtotime($o['paid_at'] ?? $o['created_at']))) ?></td></tr>
<?php endforeach; ?></table></div><?php endif; ?>
</section>
<?php admin_footer();
