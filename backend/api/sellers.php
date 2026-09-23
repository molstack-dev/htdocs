<?php
require_once '../cors.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    echo json_encode([]);
    exit;
}

http_response_code(410);
echo json_encode(['success' => false, 'message' => 'El rol vendedor fue retirado del sistema.']);
?>
