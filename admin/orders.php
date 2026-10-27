<?php
require __DIR__ . '/_inc.php';
require_login();
/* UPI orders: customer ki UTR apne bank / UPI app mein check karke "Paid" karo.
   Razorpay: "paise kat gaye par link nahi mila" ho to dashboard mein Captured dekh kar Payment ID se Mark Paid. */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $o = q('SELECT * FROM orders WHERE id=?', [(int)($_POST['id'] ?? 0)])->fetch();
    if (!$o) { flash('Order nahi mila.', false); go('orders.php'); }
    if (($_POST['action'] ?? '') === 'reject') {
        q("UPDATE orders SET status='rejected' WHERE id=?", [$o['id']]);
        flash('Order #' . $o['id'] . ' reject kar diya, uske download links band ho gaye. Customer ko WhatsApp par wajah bata dein.');
        go('orders.php?s=review');
    }
    $pid = strtoupper(clean($_POST['payment_id'] ?? '', 64));
    if ($o['method'] === 'upi' && $pid === '') $pid = $o['utr'];
    if (!preg_match('/^(PAY_[A-Z0-9]{6,}|[A-Z0-9]{6,30})$/', $pid)) { flash('Payment ID / UTR likhiye.', false); go('orders.php?s=' . $o['status']); }
    mark_order_paid($o, str_starts_with($pid, 'PAY_') ? 'pay_' . substr($pid, 4) : $pid);
    flash('Order #' . $o['id'] . ' paid ho gaya aur download links ban gaye. Customer ko email bhi bheja gaya hai; neeche se WhatsApp par bhi bhej sakte ho.');
    go('orders.php?s=paid');
}
$review = (int)q("SELECT COUNT(*) FROM orders WHERE status='review'")->fetchColumn();
$tabs = ['review' => '🔔 UPI check karo' . ($review ? " ($review)" : ''), 'paid' => '✓ Paid', 'created' => 'Payment adhoora', 'rejected' => 'Reject kiye', 'all' => 'Sab'];
$status = array_key_exists($_GET['s'] ?? '', $tabs) ? $_GET['s'] : ($review ? 'review' : 'paid');
$rows = $status === 'all' ? q('SELECT * FROM orders ORDER BY id DESC LIMIT 300')->fetchAll() : q('SELECT * FROM orders WHERE status=? ORDER BY id DESC LIMIT 300', [$status])->fetchAll();
$titles = array_column(q('SELECT id,title FROM products')->fetchAll(), 'title', 'id');
$links = [];
foreach (q("SELECT d.order_id, d.token, p.title FROM downloads d JOIN products p ON p.id=d.product_id")->fetchAll() as $d) $links[(int)$d['order_id']][] = $d['title'] . ': ' . site_url() . '/download.php?t=' . $d['token'];
$label = ['paid' => ['ok', 'Paid'], 'review' => ['', 'UPI check karo'], 'created' => ['', 'Adhoora'], 'rejected' => ['bad', 'Reject']];
admin_header('Orders', 'orders');
?>
<div class="tabs"><?php foreach ($tabs as $k => $v): ?><a href="?s=<?= $k ?>" class="<?= $status === $k ? 'on' : '' ?>"><?= e($v) ?></a><?php endforeach; ?></div>
<?php if ($status === 'review'): ?><p class="muted" style="margin-bottom:12px">Apne UPI app / bank statement mein UTR aur amount milao. Paise aa gaye hon tabhi <b>✓ Paid</b> dabao — customer ko download link turant email ho jayega.</p><?php endif; ?>
<section class="card">
<?php if (!$rows): ?><p class="muted">Is list mein abhi koi order nahi hai.</p><?php else: ?>
<div class="tbl"><table><tr><th>#</th><th>Customer</th><th>PPTs</th><th>Amount</th><th>Payment</th><th>Date / Action</th></tr>
<?php foreach ($rows as $o): [$cls, $txt] = $label[$o['status']] ?? ['', $o['status']]; ?><tr><td><?= (int)$o['id'] ?></td>
<td><?= e($o['name']) ?><small><?= e($o['email']) ?></small><small><a href="https://wa.me/91<?= e($o['phone']) ?>" target="_blank" rel="noopener">WhatsApp <?= e($o['phone']) ?></a></small></td>
<td><?= e(implode(', ', array_map(fn($i) => $titles[$i] ?? "#$i", json_decode($o['items'], true) ?: []))) ?></td>
<td><b><?= inr($o['amount'] / 100) ?></b></td>
<td><span class="tag <?= $cls ?>"><?= e($txt) ?></span><small><?= ['upi' => 'UPI ID (UTR)', 'qr' => 'Razorpay QR'][$o['method']] ?? 'Razorpay' ?></small>
  <?php if ($o['utr']): ?><small>UTR: <b><?= e($o['utr']) ?></b></small><?php if (!utr_date_ok($o['utr'], $o['created_at'])): ?><small style="color:#f59e0b">⚠️ UTR ki date order se match nahi karti. Purani payment ki ho sakti hai, dhyan se check karein.</small><?php endif; endif; ?>
  <?php if ($o['proof']): ?><small><a href="proof.php?o=<?= (int)$o['id'] ?>" target="_blank">🧾 Screenshot dekho</a></small><?php endif; ?>
  <?php if ($o['rzp_payment_id'] && $o['rzp_payment_id'] !== $o['utr']): ?><small><?= e($o['rzp_payment_id']) ?></small><?php endif; ?></td>
<td><?= e(date('d M Y, h:i A', strtotime($o['paid_at'] ?? $o['created_at']))) ?>
<?php if ($o['status'] === 'paid' && !empty($links[(int)$o['id']])): ?><small><a href="https://wa.me/91<?= e($o['phone']) ?>?text=<?= rawurlencode("Hi {$o['name']}, aapki PPT ka download link:\n" . implode("\n", $links[(int)$o['id']])) ?>" target="_blank" rel="noopener">📲 Link WhatsApp par bhejo</a></small>
<?php elseif ($o['status'] === 'review'): ?><div class="row">
  <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$o['id'] ?>"><button class="btn sm" onclick="return confirm('UTR <?= e($o['utr']) ?> ke <?= inr($o['amount'] / 100) ?> aapke account mein aa gaye?')">✓ Paid</button></form>
  <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$o['id'] ?>"><input type="hidden" name="action" value="reject"><button class="btn sm ghost" onclick="return confirm('Reject karna hai?')">✕ Reject</button></form></div>
<?php elseif ($o['status'] !== 'paid'): ?><form method="post" class="row"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$o['id'] ?>"><input name="payment_id" placeholder="<?= $o['method'] === 'upi' ? 'UTR' : 'pay_XXXX' ?>" style="width:130px;margin:0"><button class="btn sm ghost" onclick="return confirm('Payment pakka aa gaya? Tabhi Mark Paid karein.')">Mark Paid</button></form><?php endif; ?></td></tr>
<?php endforeach; ?></table></div><?php endif; ?>
</section>
<?php admin_footer();
