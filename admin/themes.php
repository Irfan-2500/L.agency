<?php
/* PPT Themes gallery: har theme ki kai slide images */
require __DIR__ . '/_inc.php';
require_login();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $id = (int)($_POST['id'] ?? 0);
    $old = $id ? q('SELECT * FROM themes WHERE id=?', [$id])->fetch() : null;
    if (($_POST['action'] ?? '') === 'delete' && $old) {
        q('DELETE FROM themes WHERE id=?', [$id]);
        flash('Theme delete ho gayi.'); go('themes.php');
    }
    try {
        $name = clean($_POST['name'] ?? '', 150);
        if ($name === '') throw new RuntimeException('Theme ka naam likhiye.');
        $slides = json_decode((string)($old['slides'] ?? '[]'), true) ?: [];
        $slides = array_values(array_diff($slides, (array)($_POST['remove'] ?? [])));
        foreach (files_list('images') as $f) $slides[] = save_image($f, 'uploads/themes');
        if (!$slides) throw new RuntimeException('Kam se kam ek slide image chuniye.');
        $row = [$name, ($_POST['tone'] ?? '') === 'White' ? 'White' : 'Dark',
            in_array($_POST['type'] ?? '', ['Questions', 'Theory', 'Theory + Questions', 'Screenshot'], true) ? $_POST['type'] : 'Theory',
            in_array($_POST['lang'] ?? '', ['Hindi', 'English', 'Both'], true) ? $_POST['lang'] : 'English',
            json_encode(array_slice($slides, 0, 20)), empty($_POST['active']) ? 0 : 1, (int)($_POST['sort'] ?? 0)];
        if ($old) q('UPDATE themes SET name=?,tone=?,type=?,lang=?,slides=?,active=?,sort=? WHERE id=?', [...$row, $id]);
        else q('INSERT INTO themes (name,tone,type,lang,slides,active,sort,created_at) VALUES (?,?,?,?,?,?,?,?)', [...$row, now()]);
        flash('Theme save ho gayi. ✓');
    } catch (RuntimeException $ex) { flash($ex->getMessage(), false); }
    go('themes.php' . ($id ? "?edit=$id" : ''));
}
$edit = isset($_GET['edit']) ? q('SELECT * FROM themes WHERE id=?', [(int)$_GET['edit']])->fetch() : null;
$t = $edit ?: ['id' => 0, 'name' => '', 'tone' => 'Dark', 'type' => 'Theory', 'lang' => 'English', 'slides' => '[]', 'active' => 1, 'sort' => 0];
$list = q('SELECT * FROM themes ORDER BY sort, id')->fetchAll();
admin_header('Themes', 'themes');
?>
<form method="post" enctype="multipart/form-data" class="card form"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$t['id'] ?>">
  <h2><?= $t['id'] ? 'Theme edit karo' : 'Nayi theme jodo' ?></h2>
  <div class="grid2">
    <label class="span2">Theme ka naam *<input name="name" required value="<?= e($t['name']) ?>" placeholder="e.g. Royal Blue Science"></label>
    <label>Rang<select name="tone"><option value="Dark" <?= $t['tone'] === 'Dark' ? 'selected' : '' ?>>🌙 Dark</option><option value="White" <?= $t['tone'] === 'White' ? 'selected' : '' ?>>☀️ White</option></select></label>
    <label>Type<select name="type"><?php foreach (['Questions', 'Theory', 'Theory + Questions', 'Screenshot'] as $v): ?><option <?= $t['type'] === $v ? 'selected' : '' ?>><?= $v ?></option><?php endforeach; ?></select></label>
    <label>Language<select name="lang"><?php foreach (['Hindi' => 'Hindi', 'English' => 'English', 'Both' => 'Hindi + English'] as $k => $v): ?><option value="<?= $k ?>" <?= $t['lang'] === $k ? 'selected' : '' ?>><?= $v ?></option><?php endforeach; ?></select></label>
    <label>Order<input type="number" name="sort" value="<?= (int)$t['sort'] ?>"></label>
    <label class="span2">Slide images (ek saath kai chun sakte ho)<input type="file" name="images[]" multiple accept="image/jpeg,image/png,image/webp,image/gif"></label>
    <label class="check"><input type="checkbox" name="active" value="1" <?= $t['active'] ? 'checked' : '' ?>> Website par dikhao</label>
  </div>
  <?php if ($sl = json_decode((string)$t['slides'], true)): ?><div class="pv-row"><?php foreach ($sl as $im): ?><div class="pv"><img src="../<?= e($im) ?>" alt=""><label class="check"><input type="checkbox" name="remove[]" value="<?= e($im) ?>"> Hatao</label></div><?php endforeach; ?></div><?php endif; ?>
  <div class="actions"><button class="btn">💾 Save theme</button><?php if ($t['id']): ?><a class="btn ghost" href="themes.php">+ Nayi theme</a><?php endif; ?></div>
</form>
<?php if ($t['id']): ?><form method="post" onsubmit="return confirm('Theme delete karni hai?')" class="danger"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$t['id'] ?>"><input type="hidden" name="action" value="delete"><button class="btn red">🗑 Theme delete karo</button></form><?php endif; ?>
<div class="plist"><?php foreach ($list as $th): $sl = json_decode((string)$th['slides'], true) ?: []; ?>
  <div class="pitem <?= $th['active'] ? '' : 'off' ?>"><a class="pthumb" href="?edit=<?= (int)$th['id'] ?>" style="background:url('../<?= e($sl[0] ?? '') ?>') center/cover"></a>
    <div class="pinfo"><a href="?edit=<?= (int)$th['id'] ?>"><b><?= e($th['name']) ?></b></a><small><?= e($th['tone']) ?> · <?= e($th['type']) ?> · <?= count($sl) ?> slides</small></div></div>
<?php endforeach; ?></div>
<?php admin_footer();
