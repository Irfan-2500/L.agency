<?php
/* Website ka saara data ek saath: PPTs, reviews, themes aur settings */
require dirname(__DIR__) . '/includes/bootstrap.php';
api_start('GET');

$sales = sales_counts();
$products = array_map(fn($p) => product_public($p, $sales), q('SELECT * FROM products WHERE active=1 ORDER BY sort, id DESC')->fetchAll());
$reviews = array_map(fn($r) => ['name' => $r['name'], 'role' => $r['role'], 'deck' => $r['deck'], 'stars' => (int)$r['stars'], 'text' => $r['text']],
    q('SELECT * FROM reviews WHERE approved=1 ORDER BY id DESC LIMIT 30')->fetchAll());
$themes = array_map(function ($t) {
    $sl = json_decode((string)$t['slides'], true) ?: [];
    return ['id' => (int)$t['id'], 'name' => $t['name'], 'tone' => $t['tone'], 'type' => $t['type'], 'lang' => $t['lang'], 'img' => $sl[0] ?? '', 'slides' => $sl];
}, q('SELECT * FROM themes WHERE active=1 ORDER BY sort, id')->fetchAll());

json_out(['ok' => true, 'products' => $products, 'reviews' => $reviews, 'themes' => array_values(array_filter($themes, fn($t) => $t['img'])),
    'settings' => [
        'payments' => !empty($CFG['razorpay']['key_id']) && !empty($CFG['razorpay']['key_secret']),
        'whatsapp' => $CFG['site']['whatsapp'], 'phoneDisplay' => $CFG['site']['phone_display'], 'email' => $CFG['site']['email'],
        'maxFiles' => (int)$CFG['uploads']['max_files'], 'maxMB' => (int)$CFG['uploads']['max_mb'],
    ]]);
