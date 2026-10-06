<?php
// refund-cancel.php - Usuario cancela una solicitud de reembolso (refund_status: rejected)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['success' => false, 'message' => 'Método no permitido']);
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['id']) || !isset($data['type'])) {
    respond(400, ['success' => false, 'message' => 'Datos incompletos']);
}

if (!isset($_SESSION['user_id'])) {
    respond(401, ['success' => false, 'message' => 'Debe iniciar sesión']);
}

$type = trim((string)$data['type']);
$refundId = (int)$data['id'];
$userId = (int)$_SESSION['user_id'];

if (!in_array($type, ['registration', 'advisory_course', 'advisory_asesoria', 'advisory_evento'], true)) {
    respond(400, ['success' => false, 'message' => 'Tipo inválido']);
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        'SELECT id, refund_status, refundable_id FROM refunds WHERE id = ? AND user_id = ? AND type = ? FOR UPDATE'
    );
    $stmt->execute([$refundId, $userId, $type]);
    $refund = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$refund) {
        $pdo->rollBack();
        respond(404, ['success' => false, 'message' => 'Solicitud no encontrada']);
    }

    if ($refund['refund_status'] !== 'pending') {
        $pdo->rollBack();
        respond(400, ['success' => false, 'message' => 'La solicitud ya fue procesada']);
    }

    // Cancelamos: marcamos rejected (mantenemos historial, no se reembolsa)
    $upd = $pdo->prepare(
        "UPDATE refunds SET refund_status = 'rejected', processed_at = NOW(), processed_by = ? WHERE id = ?"
    );
    $upd->execute([$userId, $refundId]);

    // Revertir estado real según type (para dejar consistente)
    if ($type === 'registration') {
        // mantenemos pago activo: paid
        $upd2 = $pdo->prepare("UPDATE registrations SET payment_status = 'paid' WHERE id = ?");
        $upd2->execute([(int)$refund['refundable_id']]);
    } else {
        // Para todos los tipos de advisory
        $upd2 = $pdo->prepare("UPDATE advisories SET payment_status = 'paid' WHERE id = ?");
        $upd2->execute([(int)$refund['refundable_id']]);
    }

    $pdo->commit();
    respond(200, ['success' => true, 'message' => 'Solicitud de reembolso cancelada']);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Error en refund-cancel.php: ' . $e->getMessage());
    respond(500, ['success' => false, 'message' => 'Error interno']);
}

