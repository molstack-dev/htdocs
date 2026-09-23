<?php
require_once '../cors.php';
header('Content-Type: application/json');

require_once '../config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        // Compatibilidad de lectura con la API antigua: los clientes actuales
        // son los usuarios con rol user.
        $stmt = $pdo->query("SELECT id, name, email, phone, NULL AS address, created_at FROM users WHERE role = 'user' ORDER BY created_at DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Error interno del servidor']);
    }
    exit;
}

http_response_code(410);
echo json_encode([
    'success' => false,
    'message' => 'La entidad clients fue reemplazada por users. Usa /backend/api/users.php para administrar usuarios.',
]);
?>
