<?php
/* Customer review — admin approve karne ke baad website par dikhta hai */
require dirname(__DIR__) . '/includes/bootstrap.php';
api_start();
rate_limit('review', 3, 3600);

$name = clean($_POST['name'] ?? '', 120);
$text = clean($_POST['text'] ?? '', 1000);
$stars = max(1, min(5, (int)($_POST['stars'] ?? 5)));
if (mb_strlen($name) < 2) json_err('Please enter your name');
if (mb_strlen($text) < 10) json_err('Please write at least a few words');

q('INSERT INTO reviews (name,role,deck,stars,text,approved,created_at) VALUES (?,?,?,?,?,0,?)', [$name, clean($_POST['role'] ?? '', 150), clean($_POST['deck'] ?? '', 200), $stars, $text, now()]);
notify_admin('⭐ Naya review (approve karna hai)', ['Name' => $name, 'Stars' => $stars, 'Review' => $text]);
json_out(['ok' => true]);
