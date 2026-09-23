<?php
require_once '../cors.php';
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'success' => true,
    'data' => [],
    'message' => 'El rol vendedor fue retirado del sistema.',
]);
?>
