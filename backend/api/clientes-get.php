<?php
require_once __DIR__ . '/../cors.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

try {
    // "clients" fue reemplazada por users con rol user.
    $stmt = $pdo->query("SELECT id, name, email, phone, NULL AS address, created_at FROM users WHERE role = 'user' ORDER BY created_at DESC");
    $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $clients
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener clientes: ' . $e->getMessage()
    ]);
}
?>
