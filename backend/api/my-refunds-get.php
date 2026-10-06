<?php
// my-refunds-get.php - Devuelve reembolsos del usuario actual (tabla refunds)
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

$userId = (int)$_SESSION['user_id'];

try {
    $stmt = $pdo->prepare(
        "SELECT
            rf.id,
            rf.type,
            rf.created_at,
            rf.refund_status,
            rf.service_title,
            rf.service_name,
            rf.amount AS price,
            rf.refundable_id,
            rf.admin_receipt AS admin_receipt,
            rf.rejection_reason AS rejection_reason
         FROM refunds rf
         WHERE rf.user_id = ? AND rf.refund_status IN ('pending','approved','rejected')
         ORDER BY rf.created_at DESC"
    );

    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $data = [];
    foreach ($rows as $r) {
        $data[] = [
            'id' => (int)$r['id'],
            'type' => $r['type'],
            'created_at' => $r['created_at'],
            'refund_status' => $r['refund_status'],
            'service_title' => $r['service_title'],
            'service_name' => $r['service_name'],
            'price' => $r['price'],
            'refundable_id' => $r['refundable_id'],
            'admin_receipt' => $r['admin_receipt'],
            'rejection_reason' => $r['rejection_reason']
        ];
    }

    respond(200, ['success' => true, 'data' => $data]);
} catch (Throwable $e) {
    error_log('Error en my-refunds-get.php: ' . $e->getMessage());
    respond(500, ['success' => false, 'message' => 'Error al obtener reembolsos']);
}
?>