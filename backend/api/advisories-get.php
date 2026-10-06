<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config.php';

try {
    $stmt = $pdo->query("SELECT a.id, u.name AS user_name, a.name AS client_name, a.email, a.phone, a.service_type, a.advisory_type, a.advisory_service, a.advisory_mode, a.event_name, a.date, a.time, a.notes, a.status, a.price, a.num_persons, a.payment_status, a.payment_receipt, a.payment_date, a.payment_method, a.created_at
        FROM advisories a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC");
    $advisories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $advisories
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener solicitudes: ' . $e->getMessage()
    ]);
}
?>