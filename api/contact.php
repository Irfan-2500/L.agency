<?php
/* Contact form message */
require dirname(__DIR__) . '/includes/bootstrap.php';
api_start();
rate_limit('contact', 5, 600);

$d = ['name' => clean($_POST['name'] ?? '', 120), 'email' => clean($_POST['email'] ?? '', 190), 'phone' => clean($_POST['phone'] ?? '', 30),
      'subject' => clean($_POST['subject'] ?? '', 150), 'message' => clean($_POST['message'] ?? '', 5000)];
if (mb_strlen($d['name']) < 2 || !valid_email($d['email']) || mb_strlen($d['message']) < 2) json_err('Please fill name, a valid email and message');

q('INSERT INTO messages (name,email,phone,subject,message,created_at) VALUES (?,?,?,?,?,?)', [$d['name'], $d['email'], $d['phone'], $d['subject'], $d['message'], now()]);
notify_admin('✉️ Naya message: ' . $d['subject'], $d);
json_out(['ok' => true]);
