<?php
/* Ready PPTs: upload, edit, delete. Ye PPTs "Ready to Use PPT" page aur homepage shop mein dikhti hain. */
require __DIR__ . '/_inc.php';
require_login();

const PPT_EXT = ['pptx', 'ppt', 'pdf', 'zip'];
const BOARDS = ['CBSE', 'ICSE', 'State Board', 'University', 'Competitive Exams', 'Corporate'];
const SUBJECTS = ['Hindi','English','Urdu','Sanskrit','Mathematics','Science','Physics','Chemistry','Biology','EVS (Environmental Studies)','Environmental Science',
  'Social Science','History','Geography','Political Science / Civics','Economics','Sociology','Psychology','Philosophy','Computer Science','Information Technology',
  'Artificial Intelligence','Engineering','Medical / Nursing','Pharmacy','Agriculture','Accountancy','Business Studies','Business','Finance','Marketing','Management','Law',
  'General Knowledge','Moral Science / Value Education','Art & Craft','Music','Physical Education','Home Science','Yoga','Religious Studies','Other'];
$LEVELS = array_merge(array_map(fn($i) => "Class $i", range(1, 12)), ['Other']);

/* ---------- SAVE / DELETE ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $id = (int)($_POST['id'] ?? 0);
    $old = $id ? q('SELECT * FROM products WHERE id=?', [$id])->fetch() : null;

    if (($_POST['action'] ?? '') === 'delete' && $old) {
        q('DELETE FROM products WHERE id=?', [$id]);
        // file tab tak rakho jab tak kisi order ka download link hai
        if ($old['file_path'] && !q('SELECT COUNT(*) FROM downloads WHERE product_id=?', [$id])->fetchColumn()) @unlink(ROOT . '/storage/ppt/' . basename($old['file_path']));
        flash('PPT delete ho gayi.'); go('products.php');
    }
    if (($_POST['action'] ?? '') === 'toggle' && $old) {
        q('UPDATE products SET active=? WHERE id=?', [$old['active'] ? 0 : 1, $id]);
        flash($old['active'] ? 'PPT website se chhupa di gayi.' : 'PPT website par dikh rahi hai.'); go('products.php');
    }

    try {
        $title = clean($_POST['title'] ?? '', 200);
        $price = (int)($_POST['price'] ?? 0);
        if ($title === '') throw new RuntimeException('PPT ka naam likhiye.');
        if ($price < 1) throw new RuntimeException('Price kam se kam ₹1 hona chahiye.');
        $pick = fn(string $k, array $allowed) => implode(',', array_values(array_intersect((array)($_POST[$k] ?? []), $allowed)));
        $hex = fn(string $k, string $def) => preg_match('/^#[0-9a-fA-F]{6}$/', (string)($_POST[$k] ?? '')) ? $_POST[$k] : $def;
        $row = [
            'title' => $title, 'description' => clean($_POST['description'] ?? '', 2000),
            'cat' => array_key_exists($_POST['cat'] ?? '', CATS) ? $_POST['cat'] : 'edu',
            'price' => $price, 'mrp' => max($price, (int)($_POST['mrp'] ?? 0)), 'slides' => max(0, (int)($_POST['slides'] ?? 0)),
            'lang' => in_array($_POST['lang'] ?? '', ['Hindi', 'English', 'Both'], true) ? $_POST['lang'] : 'English',
            'theme' => ($_POST['theme'] ?? '') === 'Light' ? 'Light' : 'Dark',
            'board' => $pick('board', BOARDS), 'level' => $pick('level', $LEVELS) ?: 'Other',
            'subject' => in_array($_POST['subject'] ?? '', SUBJECTS, true) ? $_POST['subject'] : 'Other',
            'anim' => empty($_POST['anim']) ? 0 : 1,
            'badge' => in_array($_POST['badge'] ?? '', ['best', 'new', 'feat'], true) ? $_POST['badge'] : '',
            'color1' => $hex('color1', '#8b2cff'), 'color2' => $hex('color2', '#06b6d4'),
            'sales_base' => max(0, (int)($_POST['sales_base'] ?? 0)), 'active' => empty($_POST['active']) ? 0 : 1, 'sort' => (int)($_POST['sort'] ?? 0),
        ];

        // preview images: purani rakho (jo remove nahi ki), nayi jodo
        $prev = json_decode((string)($old['previews'] ?? '[]'), true) ?: [];
        $remove = (array)($_POST['remove_prev'] ?? []);
        $prev = array_values(array_filter($prev, fn($p) => !in_array($p, $remove, true)));
        foreach (files_list('previews') as $f) $prev[] = save_image($f, 'uploads/previews');
        $prev = array_slice($prev, 0, 12);
        $row['previews'] = json_encode($prev);

        $thumb = $old['thumb'] ?? '';
        $tf = files_list('thumb');
        if ($tf) $thumb = save_image($tf[0], 'uploads/thumbs');
        elseif (!empty($_POST['remove_thumb'])) $thumb = '';
        if ($thumb === '' || in_array($thumb, $remove, true)) $thumb = $prev[0] ?? '';
        $row['thumb'] = $thumb;

        // asli PPT file (sirf payment ke baad download hoti hai)
        $row['file_path'] = $old['file_path'] ?? '';
        $row['file_name'] = $old['file_name'] ?? '';
        $pf = files_list('file');
        if ($pf) {
            $f = $pf[0];
            if ($f['error'] !== UPLOAD_ERR_OK) throw new RuntimeException('PPT file: ' . upload_error_text((int)$f['error']));
            $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, PPT_EXT, true)) throw new RuntimeException('PPT file sirf .pptx, .ppt, .pdf ya .zip ho sakti hai.');
            if (!is_dir(ROOT . '/storage/ppt')) mkdir(ROOT . '/storage/ppt', 0755, true);
            $name = rand_name($ext);
            if (!move_uploaded_file($f['tmp_name'], ROOT . "/storage/ppt/$name")) throw new RuntimeException('PPT file save nahi hui.');
            $row['file_path'] = $name;
            $row['file_name'] = mb_substr(preg_replace('/[^\p{L}\p{N}\-_. ()]+/u', '_', basename($f['name'])), -150);
        }

        if ($old) {
            $set = implode(',', array_map(fn($k) => "$k=?", array_keys($row)));
            q("UPDATE products SET $set WHERE id=?", [...array_values($row), $id]);
            flash('PPT save ho gayi. ✓');
        } else {
            $row['created_at'] = now();
            q('INSERT INTO products (' . implode(',', array_keys($row)) . ') VALUES (' . implode(',', array_fill(0, count($row), '?')) . ')', array_values($row));
            $id = (int)db()->lastInsertId();
            flash('Nayi PPT website par aa gayi. ✓');
        }
        go('products.php?edit=' . $id);
    } catch (RuntimeException $ex) {
        flash($ex->getMessage(), false);
        go('products.php?edit=' . ($id ?: 'new'));
    }
}

$sales = sales_counts();
$edit = $_GET['edit'] ?? null;

/* ---------- FORM ---------- */
if ($edit !== null) {
    $p = $edit === 'new' ? null : q('SELECT * FROM products WHERE id=?', [(int)$edit])->fetch();
    if ($edit !== 'new' && !$p) go('products.php');
    $p ??= ['id' => 0, 'title' => '', 'description' => '', 'cat' => 'edu', 'price' => '', 'mrp' => '', 'slides' => '', 'lang' => 'English', 'theme' => 'Dark',
            'board' => 'CBSE', 'level' => '', 'subject' => '', 'anim' => 0, 'badge' => 'new', 'color1' => '#8b2cff', 'color2' => '#06b6d4',
            'thumb' => '', 'previews' => '[]', 'file_path' => '', 'file_name' => '', 'sales_base' => 0, 'active' => 1, 'sort' => 0];
    $prev = json_decode((string)$p['previews'], true) ?: [];
    $boards = csv_list($p['board']); $levels = csv_list($p['level']);
    admin_header($p['id'] ? 'PPT edit karo' : 'Nayi PPT upload karo', 'products');
    ?>
    <p><a href="products.php">← Saari PPTs</a></p>
    <form method="post" enctype="multipart/form-data" class="card form">
      <?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>">
      <div class="grid2">
        <label class="span2">PPT ka naam *<input name="title" required maxlength="200" value="<?= e($p['title']) ?>" placeholder="e.g. Photosynthesis — Class 10 Science"></label>
        <label class="span2">Short description<textarea name="description" maxlength="2000" rows="3" placeholder="PPT mein kya-kya hai, 1-2 line mein"><?= e($p['description']) ?></textarea></label>
        <label>Price (₹) *<input type="number" name="price" min="1" required value="<?= e($p['price']) ?>"></label>
        <label>MRP / kata hua daam (₹)<input type="number" name="mrp" min="0" value="<?= e($p['mrp']) ?>"><small>Price se zyada ho to "Save X%" dikhega</small></label>
        <label>Slides kitni hain<input type="number" name="slides" min="0" value="<?= e($p['slides']) ?>"></label>
        <label>Category<select name="cat"><?php foreach (CATS as $k => $v): ?><option value="<?= $k ?>" <?= $p['cat'] === $k ? 'selected' : '' ?>><?= e($v) ?></option><?php endforeach; ?></select></label>
        <label>Language<select name="lang"><?php foreach (['Hindi' => 'Hindi', 'English' => 'English', 'Both' => 'Hindi + English'] as $k => $v): ?><option value="<?= $k ?>" <?= $p['lang'] === $k ? 'selected' : '' ?>><?= $v ?></option><?php endforeach; ?></select></label>
        <label>Theme<select name="theme"><option value="Dark" <?= $p['theme'] === 'Dark' ? 'selected' : '' ?>>🌙 Dark</option><option value="Light" <?= $p['theme'] === 'Light' ? 'selected' : '' ?>>☀️ Light</option></select></label>
        <label>Subject<select name="subject"><option value="">— Chuniye —</option><?php foreach (SUBJECTS as $s): ?><option <?= $p['subject'] === $s ? 'selected' : '' ?>><?= e($s) ?></option><?php endforeach; ?></select></label>
        <label>Tag<select name="badge"><?php foreach (['' => 'Koi nahi', 'best' => 'Best Seller', 'new' => 'New Arrival', 'feat' => 'Featured'] as $k => $v): ?><option value="<?= $k ?>" <?= $p['badge'] === $k ? 'selected' : '' ?>><?= $v ?></option><?php endforeach; ?></select></label>
        <fieldset class="span2"><legend>Board / Exam</legend><div class="checks"><?php foreach (BOARDS as $b): ?><label class="check"><input type="checkbox" name="board[]" value="<?= e($b) ?>" <?= in_array($b, $boards, true) ? 'checked' : '' ?>><?= e($b) ?></label><?php endforeach; ?></div></fieldset>
        <fieldset class="span2"><legend>Class / Level</legend><div class="checks"><?php foreach ($LEVELS as $l): ?><label class="check"><input type="checkbox" name="level[]" value="<?= e($l) ?>" <?= in_array($l, $levels, true) ? 'checked' : '' ?>><?= e($l) ?></label><?php endforeach; ?></div></fieldset>
        <label class="check"><input type="checkbox" name="anim" value="1" <?= $p['anim'] ? 'checked' : '' ?>> Animated PPT hai</label>
        <label class="check"><input type="checkbox" name="active" value="1" <?= $p['active'] ? 'checked' : '' ?>> Website par dikhao</label>
      </div>

      <h3>📷 Photos</h3>
      <div class="grid2">
        <label>Cover photo (card par dikhegi)<input type="file" name="thumb" accept="image/jpeg,image/png,image/webp,image/gif">
          <small>Khaali chhodoge to pehli preview photo cover banegi. 16:9 size best hai.</small></label>
        <?php if ($p['thumb']): ?><div class="pv"><img src="../<?= e($p['thumb']) ?>" alt=""><label class="check"><input type="checkbox" name="remove_thumb" value="1"> Cover hatao</label></div><?php endif; ?>
        <label class="span2">Preview slides (ek saath kai photos chun sakte ho)<input type="file" name="previews[]" multiple accept="image/jpeg,image/png,image/webp,image/gif">
          <small>Customer "Preview" dabane par ye slides dekhega. Max 12.</small></label>
      </div>
      <?php if ($prev): ?><div class="pv-row"><?php foreach ($prev as $im): ?>
        <div class="pv"><img src="../<?= e($im) ?>" alt=""><label class="check"><input type="checkbox" name="remove_prev[]" value="<?= e($im) ?>"> Hatao</label></div>
      <?php endforeach; ?></div><?php endif; ?>
      <div class="grid2">
        <label>Card ka rang 1 (photo na ho tab)<input type="color" name="color1" value="<?= e($p['color1']) ?>"></label>
        <label>Card ka rang 2<input type="color" name="color2" value="<?= e($p['color2']) ?>"></label>
      </div>

      <h3>📦 PPT file (customer ko payment ke baad milegi)</h3>
      <label>PPT file (.pptx / .ppt / .pdf / .zip)<input type="file" name="file" accept=".pptx,.ppt,.pdf,.zip">
        <small><?= $p['file_path'] ? '✓ Abhi ki file: <b>' . e($p['file_name']) . '</b>. Nayi chunoge to purani badal jayegi.' : '⚠ Abhi koi file nahi hai. Bina file ke customer ko download nahi milega.' ?></small></label>

      <h3>🔥 Kitne logon ne khareeda</h3>
      <div class="grid2">
        <label>Website se paid orders<input value="<?= (int)($sales[(int)$p['id']] ?? 0) ?>" disabled><small>Ye apne aap badhta hai</small></label>
        <label>Pehle ki bikri (WhatsApp / offline)<input type="number" name="sales_base" min="0" value="<?= (int)$p['sales_base'] ?>"><small>Sirf asli bikri ka number daalein. Dono jud kar card par dikhenge.</small></label>
        <label>Order (chhota number pehle dikhega)<input type="number" name="sort" value="<?= (int)$p['sort'] ?>"></label>
      </div>
      <div class="actions"><button class="btn">💾 Save PPT</button><a class="btn ghost" href="products.php">Cancel</a></div>
    </form>
    <?php if ($p['id']): ?>
    <form method="post" onsubmit="return confirm('Ye PPT pakka delete karni hai?')" class="danger"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><input type="hidden" name="action" value="delete"><button class="btn red">🗑 PPT delete karo</button></form>
    <?php endif;
    admin_footer();
    exit;
}

/* ---------- LIST ---------- */
$list = q('SELECT * FROM products ORDER BY sort, id DESC')->fetchAll();
admin_header('Ready PPTs', 'products');
?>
<div class="quick"><a class="btn" href="products.php?edit=new">+ Nayi PPT upload karo</a><a class="btn ghost" href="../ready-ppts.html" target="_blank">🌐 Ready PPTs page dekho</a></div>
<?php if (!$list): ?><section class="card"><p class="muted">Abhi koi PPT nahi hai. "Nayi PPT upload karo" dabaiye.</p></section><?php else: ?>
<div class="plist"><?php foreach ($list as $p): $s = (int)$p['sales_base'] + ($sales[(int)$p['id']] ?? 0); ?>
  <div class="pitem <?= $p['active'] ? '' : 'off' ?>">
    <a href="?edit=<?= (int)$p['id'] ?>" class="pthumb" style="background:<?= $p['thumb'] ? 'url(\'../' . e($p['thumb']) . '\') center/cover' : 'linear-gradient(135deg,' . e($p['color1']) . ',' . e($p['color2']) . ')' ?>"></a>
    <div class="pinfo"><a href="?edit=<?= (int)$p['id'] ?>"><b><?= e($p['title']) ?></b></a>
      <small><?= inr($p['price']) ?><?= $p['mrp'] > $p['price'] ? ' <s>' . inr($p['mrp']) . '</s>' : '' ?> · <?= (int)$p['slides'] ?> slides · <?= e($p['lang'] === 'Both' ? 'Hindi + English' : $p['lang']) ?> · 🔥 <?= $s ?> baar khareedi gayi</small>
      <small><?= $p['file_path'] ? '✓ File uploaded' : '<span class="warn">⚠ PPT file nahi hai</span>' ?><?= $p['active'] ? '' : ' · <span class="warn">Chhupi hui</span>' ?></small></div>
    <div class="pact"><a class="btn sm ghost" href="?edit=<?= (int)$p['id'] ?>">Edit</a>
      <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><input type="hidden" name="action" value="toggle"><button class="btn sm ghost"><?= $p['active'] ? 'Chhupao' : 'Dikhao' ?></button></form></div>
  </div>
<?php endforeach; ?></div><?php endif;
admin_footer();
