<?php
/* Admin panel ka common code: login check, CSRF, layout */
require dirname(__DIR__) . '/includes/bootstrap.php';

if (!is_installed()) { header('Location: ../install.php'); exit; }
session_name('la_admin');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off']);
session_start();
header('X-Frame-Options: DENY');
header('Cache-Control: no-store');

function require_login(): void {
    if (empty($_SESSION['admin_id']) || ($_SESSION['seen'] ?? 0) < time() - 7200) { $_SESSION = []; header('Location: login.php'); exit; }
    $_SESSION['seen'] = time();
}
function csrf_token(): string { return $_SESSION['csrf'] ??= bin2hex(random_bytes(16)); }
function csrf_field(): string { return '<input type="hidden" name="csrf" value="' . csrf_token() . '">'; }
function check_csrf(): void {
    if (!hash_equals(csrf_token(), (string)($_POST['csrf'] ?? ''))) { http_response_code(400); exit('Session expire ho gaya. Page refresh karke dobara try karein.'); }
}
function flash(?string $msg = null, bool $ok = true) {
    if ($msg !== null) { $_SESSION['flash'] = [$msg, $ok]; return null; }
    $f = $_SESSION['flash'] ?? null; unset($_SESSION['flash']); return $f;
}
function go(string $url): void { header("Location: $url"); exit; }
function inr($n): string { return '₹' . number_format((float)$n); }

function admin_header(string $title, string $active): void {
    $nav = ['index' => ['🏠', 'Dashboard'], 'products' => ['🗂️', 'Ready PPTs'], 'orders' => ['💳', 'Orders'], 'requests' => ['📝', 'Custom Requests'],
            'themes' => ['🎨', 'Themes'], 'reviews' => ['⭐', 'Reviews'], 'messages' => ['✉️', 'Messages'], 'password' => ['🔐', 'Password']];
    $newReq = (int)q("SELECT COUNT(*) FROM requests WHERE status='new'")->fetchColumn();
    $newRev = (int)q('SELECT COUNT(*) FROM reviews WHERE approved=0')->fetchColumn();
    $newMsg = (int)q('SELECT COUNT(*) FROM messages WHERE is_read=0')->fetchColumn();
    $badge = ['requests' => $newReq, 'reviews' => $newRev, 'messages' => $newMsg];
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'
       . '<title>' . e($title) . ' — Admin</title><link rel="stylesheet" href="admin.css"></head><body><div class="shell"><aside class="side" id="side">'
       . '<a class="brand" href="index.php"><b>Lakshay</b> Admin</a><nav>';
    foreach ($nav as $k => [$ic, $label]) {
        $b = !empty($badge[$k]) ? '<em>' . $badge[$k] . '</em>' : '';
        echo '<a href="' . $k . '.php" class="' . ($k === $active ? 'on' : '') . '"><span>' . $ic . '</span>' . $label . $b . '</a>';
    }
    echo '</nav><div class="side-foot"><a href="../" target="_blank">🌐 Website dekho</a><a href="logout.php">↩ Logout</a></div></aside>'
       . '<main><header class="top"><button class="menu" onclick="document.getElementById(\'side\').classList.toggle(\'open\')" aria-label="Menu">☰</button><h1>' . e($title) . '</h1></header>';
    if ($f = flash()) echo '<div class="alert ' . ($f[1] ? 'ok' : 'bad') . '">' . e($f[0]) . '</div>';
}
function admin_footer(): void { echo '</main></div></body></html>'; }
