<?php
/* UPI ID + QR code: customer checkout mein yahi dekhega */
require __DIR__ . '/_inc.php';
require_login();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    try {
        $id = trim(clean($_POST['upi_id'] ?? '', 120));
        if ($id !== '' && !valid_upi($id)) throw new RuntimeException('UPI ID sahi nahi lag rahi. Aisi dikhti hai: 9711069435@ybl');
        set_setting('upi_id', $id);
        set_setting('upi_name', clean($_POST['upi_name'] ?? '', 60));
        set_setting('upi_trust', empty($_POST['upi_trust']) ? '0' : '1');
        $qf = files_list('qr');
        if ($qf) set_setting('upi_qr', save_image($qf[0], 'uploads/payment'));
        elseif (!empty($_POST['remove_qr'])) set_setting('upi_qr', '');
        flash('UPI settings save ho gayi. ✓');
    } catch (RuntimeException $ex) { flash($ex->getMessage(), false); }
    go('settings.php');
}
$u = upi_config();
admin_header('UPI / QR Payment', 'settings');
?>
<form method="post" enctype="multipart/form-data" class="card form narrow"><?= csrf_field() ?>
  <p class="muted">Customer "Proceed to Pay" dabayega to yahi UPI ID aur QR dikhega. UPI ID daaloge to QR mein amount apne aap bhara hua aayega.</p>
  <label>UPI ID<input name="upi_id" value="<?= e($u['id']) ?>" placeholder="e.g. 9711069435@ybl"><small>PhonePe / GPay / Paytm app ki profile mein milti hai</small></label>
  <label>Naam (customer ke app mein dikhega)<input name="upi_name" value="<?= e($u['name']) ?>" maxlength="60"></label>
  <label>Apna QR code (photo)<input type="file" name="qr" accept="image/jpeg,image/png,image/webp"><small>Optional. UPI ID na ho, ya customer QR photo chahe, tab ye dikhega.</small></label>
  <?php if ($u['qr']): ?><div class="pv"><img src="../<?= e($u['qr']) ?>" alt="QR" style="aspect-ratio:auto;width:180px"><label class="check"><input type="checkbox" name="remove_qr" value="1"> QR hatao</label></div><?php endif; ?>
  <label class="check"><input type="checkbox" name="upi_trust" value="1"<?= upi_instant() ? ' checked' : '' ?>> ⚠️ UTR daalte hi bina check kiye PPT download karne do (risky)</label>
  <small><b>Tick mat lagaiye</b> jab tak zaroorat na ho: koi bhi fake ya purani UTR daal kar PPT le sakta hai. Bina tick: customer UTR daalega, aapko email aayega, aap Orders → "UPI check karo" mein ✓ Paid dabayenge, tab customer ko download link email ho jayega aur My PPTs mein download khul jayega. Bina check ke auto-download chahiye to Razorpay keys lagaiye.</small>
  <div class="actions"><button class="btn">💾 Save</button><a class="btn ghost" href="../ready-ppts.html" target="_blank">Checkout dekho</a></div>
</form>
<?php admin_footer();
