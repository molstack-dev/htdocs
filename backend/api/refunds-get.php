<?php
// refunds-get.php - Listar solicitudes de reembolso en tabla exclusiva refunds
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config.php';

session_start();

function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    respond(401, ['success' => false, 'message' => 'No autenticado']);
}

// Validar admin (por sesión)
if (($_SESSION['role'] ?? null) !== 'admin') {
    $stmtRole = $pdo->prepare('SELECT role FROM users WHERE id = ? LIMIT 1');
    $stmtRole->execute([(int)$_SESSION['user_id']]);
    $row = $stmtRole->fetch(PDO::FETCH_ASSOC);
    if (!$row || $row['role'] !== 'admin') {
        respond(401, ['success' => false, 'message' => 'No autorizado']);
    }
}

try {
    // Pendientes
    $stmt = $pdo->prepare(
        "SELECT 
            rf.id,
            rf.type,
            rf.created_at,
            u.name AS client_name,
            u.email AS client_email,
            rf.refund_status AS payment_status,
            rf.amount AS price,
            rf.service_title AS service_title,
            rf.service_name AS service_name
         FROM refunds rf
         JOIN users u ON rf.user_id = u.id
         WHERE rf.refund_status = 'pending'
         ORDER BY rf.created_at DESC"
    );
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $data = [];
    foreach ($rows as $r) {
        $data[] = [
            'id' => (int)$r['id'],
            'type' => $r['type'],
            'created_at' => $r['created_at'],
            'client_name' => $r['client_name'],
            'client_email' => $r['client_email'],
            'service_title' => $r['service_title'],
            'service_name' => $r['service_name'],
            'price' => $r['price'],
            'payment_status' => $r['payment_status'],
        ];
    }

    respond(200, ['success' => true, 'data' => $data]);
} catch (Exception $e) {
    error_log('Error en refunds-get.php: ' . $e->getMessage());
    respond(500, ['success' => false, 'message' => 'Error al obtener reembolsos']);
}

