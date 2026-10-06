<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config.php';

session_start();

$userId = $_SESSION['user_id'] ?? null;
$email = isset($_GET['email']) ? trim($_GET['email']) : null;

if (!$userId && !$email) {
    echo json_encode([
        'success' => false,
        'message' => 'No autenticado'
    ]);
    exit;
}

try {
    if ($userId) {
        $userEmail = $_SESSION['user_email'] ?? '';
        $stmt = $pdo->prepare("SELECT a.id, a.name, a.email, a.phone, a.service_type, a.advisory_type, a.advisory_service, a.advisory_mode, a.event_name, a.date, a.time, a.notes, a.status, a.price, a.num_persons, a.payment_status, a.payment_receipt, a.payment_method, a.created_at
            FROM advisories a
            WHERE a.user_id = ? OR (? != '' AND a.email = ?)
            ORDER BY a.created_at DESC");
        $stmt->execute([$userId, $userEmail, $userEmail]);
    } else {
        $stmt = $pdo->prepare("SELECT a.id, a.name, a.email, a.phone, a.service_type, a.advisory_type, a.advisory_service, a.advisory_mode, a.event_name, a.date, a.time, a.notes, a.status, a.price, a.num_persons, a.payment_status, a.payment_receipt, a.payment_method, a.created_at
            FROM advisories a
            WHERE a.email = ?
            ORDER BY a.created_at DESC");
        $stmt->execute([$email]);
    }
    $advisories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $advisories
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener solicitudes'
    ]);
}
?>