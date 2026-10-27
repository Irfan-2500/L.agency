<?php
require __DIR__ . '/_inc.php';
$_SESSION = [];
session_destroy();
go('login.php');
