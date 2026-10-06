<?php
// my-events-get.php - Obtiene eventos del usuario actual
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config.php';

session_start();

$userId = $_SESSION['user_id'] ?? null;

if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit;
}

try {
    // Obtener eventos del usuario
    $stmt = $pdo->prepare(
        "SELECT id, name, email, phone, service_type, advisory_type, advisory_service, advisory_mode, 
                event_name, date, time, notes, status, price, num_persons, payment_status, payment_receipt, created_at
         FROM advisories 
         WHERE user_id = ? 
           AND service_type = 'evento'
         ORDER BY created_at DESC"
    );
    $stmt->execute([$userId]);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $events
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener eventos'
    ]);
}
?>