<?php
require __DIR__ . '/_inc.php';
require_login();
/* "Paise kat gaye par link nahi mila": Razorpay dashboard mein Captured dekh kar yahan Mark Paid karo */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $o = q('SELECT * FROM orders WHERE id=?', [(int)($_POST['id'] ?? 0)])->fetch();
    $pid = clean($_POST['payment_id'] ?? '', 64);
    if (!$o) flash('Order nahi mila.', false);
    elseif (!preg_match('/^pay_[A-Za-z0-9]{6,}$/', $pid)) flash('Razorpay Payment ID likhiye (pay_ se shuru hota hai).', false);
    else { mark_order_paid($o, $pid); flash('Order #' . $o['id'] . ' paid ho gaya aur download links ban gaye. Customer ko email bhi bheja gaya hai; neeche se WhatsApp par bhi bhej sakte ho.'); go('orders.php?s=paid'); }
    go('orders.php?s=created');
}
$status = in_array($_GET['s'] ?? '', ['paid', 'created', 'all'], true) ? $_GET['s'] : 'paid';
$rows = $status === 'all' ? q('SELECT * FROM orders ORDER BY id DESC LIMIT 300')->fetchAll() : q('SELECT * FROM orders WHERE status=? ORDER BY id DESC LIMIT 300', [$status])->fetchAll();
$titles = array_column(q('SELECT id,title FROM products')->fetchAll(), 'title', 'id');
$links = [];
foreach (q("SELECT d.order_id, d.token, p.title FROM downloads d JOIN products p ON p.id=d.product_id")->fetchAll() as $d) $links[(int)$d['order_id']][] = $d['title'] . ': ' . site_url() . '/download.php?t=' . $d['token'];
admin_header('Orders', 'orders');
?>
<div class="tabs"><?php foreach (['paid' => '✓ Paid', 'created' => 'Payment adhoora', 'all' => 'Sab'] as $k => $v): ?><a href="?s=<?= $k ?>" class="<?= $status === $k ? 'on' : '' ?>"><?= $v ?></a><?php endforeach; ?></div>
<section class="card">
<?php if (!$rows): ?><p class="muted">Is list mein abhi koi order nahi hai.</p><?php else: ?>
<div class="tbl"><table><tr><th>#</th><th>Customer</th><th>PPTs</th><th>Amount</th><th>Status</th><th>Date</th></tr>
<?php foreach ($rows as $o): ?><tr><td><?= (int)$o['id'] ?></td>
<td><?= e($o['name']) ?><small><?= e($o['email']) ?></small><small><a href="https://wa.me/91<?= e($o['phone']) ?>" target="_blank" rel="noopener">WhatsApp <?= e($o['phone']) ?></a></small></td>
<td><?= e(implode(', ', array_map(fn($i) => $titles[$i] ?? "#$i", json_decode($o['items'], true) ?: []))) ?></td>
<td><?= inr($o['amount'] / 100) ?></td><td><span class="tag <?= $o['status'] === 'paid' ? 'ok' : '' ?>"><?= $o['status'] === 'paid' ? 'Paid' : 'Adhoora' ?></span><?php if ($o['rzp_payment_id']): ?><small><?= e($o['rzp_payment_id']) ?></small><?php endif; ?></td>
<td><?= e(date('d M Y, h:i A', strtotime($o['paid_at'] ?? $o['created_at']))) ?>
<?php if ($o['status'] === 'paid' && !empty($links[(int)$o['id']])): ?><small><a href="https://wa.me/91<?= e($o['phone']) ?>?text=<?= rawurlencode("Hi {$o['name']}, aapki PPT ka download link:\n" . implode("\n", $links[(int)$o['id']])) ?>" target="_blank" rel="noopener">📲 Link WhatsApp par bhejo</a></small>
<?php elseif ($o['status'] !== 'paid'): ?><form method="post" class="row"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$o['id'] ?>"><input name="payment_id" placeholder="pay_XXXX" style="width:130px;margin:0"><button class="btn sm ghost" onclick="return confirm('Razorpay mein ye payment Captured hai? Tabhi Mark Paid karein.')">Mark Paid</button></form><?php endif; ?></td></tr>
<?php endforeach; ?></table></div><?php endif; ?>
</section>
<?php admin_footer();
