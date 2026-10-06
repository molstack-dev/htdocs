<?php
require_once __DIR__ . '/../cors.php';
header('Content-Type: application/json; charset=utf-8');

http_response_code(410);
echo json_encode([
    'success' => false,
    'message' => 'Esta ruta fue reemplazada por /backend/api/refund-request.php.',
]);
?>
