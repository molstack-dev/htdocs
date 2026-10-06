<?php
// refund-request.php - Solicitar reembolso creando registro en tabla exclusiva refunds
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
$id = (int)$data['id'];
$userId = (int)$_SESSION['user_id'];

if (!in_array($type, ['registration', 'advisory_course', 'advisory_asesoria', 'advisory_evento'], true)) {
    respond(400, ['success' => false, 'message' => 'Tipo inválido']);
}

try {
    $pdo->beginTransaction();

    // Verificar elegibilidad y llenar datos de servicio
    if ($type === 'registration') {
        $stmt = $pdo->prepare(
            "SELECT r.id, r.client_id, r.registration_date, r.status, r.payment_status, c.title, r.course_price
             FROM registrations r
             JOIN courses c ON r.course_id = c.id
             WHERE r.id = ? AND r.client_id = ?
             LIMIT 1 FOR UPDATE"
        );
        $stmt->execute([$id, $userId]);
        $rec = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$rec) {
            $pdo->rollBack();
            error_log('[refund-request] not-found registration: id=' . $id . ' userId=' . $userId);
            respond(404, ['success' => false, 'message' => 'Inscripción no encontrada']);
        }

        if (!in_array($rec['status'], ['confirmed', 'completed'], true)) {
            $pdo->rollBack();
            respond(400, ['success' => false, 'message' => 'No se puede solicitar reembolso para este estado']);
        }

        if ($rec['payment_status'] === 'refund_requested' || $rec['payment_status'] === 'refunded') {
            $pdo->rollBack();
            respond(400, ['success' => false, 'message' => 'Ya existe una solicitud de reembolso en curso']);
        }

        $daysSince = (time() - strtotime($rec['registration_date'])) / 86400;
        if ($daysSince > 7) {
            $pdo->rollBack();
            error_log('[refund-request] expired registration refund: id=' . $id . ' daysSince=' . $daysSince);
            respond(400, ['success' => false, 'message' => 'El período de 7 días para reembolso ha expirado']);
        }

        $serviceTitle = $rec['title'] ?? 'Curso';
        $amount = $rec['course_price'] ?? null;

    } elseif (in_array($type, ['advisory_course', 'advisory_asesoria', 'advisory_evento'], true)) {
        // Extraer service_type del tipo
        $serviceTypeMap = [
            'advisory_course' => 'curso',
            'advisory_asesoria' => 'asesoria',
            'advisory_evento' => 'evento'
        ];
        $serviceType = $serviceTypeMap[$type];

        // advisory (curso, asesoría, evento)
        $stmt = $pdo->prepare(
            "SELECT a.id, a.user_id, a.created_at, a.status, a.payment_status, a.service_type, a.advisory_service, a.event_name, a.price
             FROM advisories a
             WHERE a.id = ? AND a.user_id = ? AND a.service_type = ?
             LIMIT 1 FOR UPDATE"
        );
        $stmt->execute([$id, $userId, $serviceType]);
        $rec = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$rec) {
            $pdo->rollBack();
            error_log('[refund-request] not-found advisory: type=' . $type . ' serviceType=' . $serviceType . ' id=' . $id . ' userId=' . $userId);
            respond(404, ['success' => false, 'message' => ucfirst($serviceType) . ' no encontrada']);
        }

        if (!in_array($rec['status'], ['confirmed', 'completed'], true)) {
            $pdo->rollBack();
            error_log('[refund-request] advisory bad status: type=' . $type . ' id=' . $id . ' userId=' . $userId . ' status=' . (string)$rec['status']);
            respond(400, ['success' => false, 'message' => 'No se puede solicitar reembolso para este estado']);
        }

        if ($rec['payment_status'] === 'refund_requested' || $rec['payment_status'] === 'refunded') {
            $pdo->rollBack();
            error_log('[refund-request] advisory refund in progress: type=' . $type . ' id=' . $id . ' userId=' . $userId . ' payment_status=' . (string)$rec['payment_status']);
            respond(400, ['success' => false, 'message' => 'Ya existe una solicitud de reembolso en curso']);
        }

        $daysSince = (time() - strtotime($rec['created_at'])) / 86400;
        if ($daysSince > 7) {
            $pdo->rollBack();
            error_log('[refund-request] expired advisory refund: type=' . $type . ' serviceType=' . $serviceType . ' id=' . $id . ' userId=' . $userId . ' daysSince=' . $daysSince);
            respond(400, ['success' => false, 'message' => 'El período de 7 días para reembolso ha expirado']);
        }

        // Usar event_name para eventos, advisory_service para otros
        if ($serviceType === 'evento') {
            $serviceTitle = $rec['event_name'] ? str_replace('_', ' ', $rec['event_name']) : 'Evento';
        } else {
            $serviceTitle = $rec['advisory_service'] ? str_replace('_', ' ', $rec['advisory_service']) : ucfirst($serviceType);
        }
        $amount = $rec['price'] ?? null;
    }

    // Idempotencia con refunds
    $stmt = $pdo->prepare(
        "SELECT id FROM refunds WHERE type = ? AND refundable_id = ? AND user_id = ? AND refund_status = 'pending' LIMIT 1"
    );
    $stmt->execute([$type, $id, $userId]);
    if ($stmt->fetch()) {
        $pdo->rollBack();
        respond(400, ['success' => false, 'message' => 'Ya existe una solicitud de reembolso en curso']);
    }

    // Insert
    $ins = $pdo->prepare(
        "INSERT INTO refunds (user_id, type, refundable_id, service_title, service_name, amount, refund_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())"
    );
    $ins->execute([$userId, $type, $id, $serviceTitle, null, $amount]);

    $pdo->commit();

    respond(200, ['success' => true, 'message' => 'Solicitud de reembolso enviada']);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[refund-request] Exception: ' . $e->getMessage() . ' | type=' . ($type ?? 'null') . ' id=' . ($id ?? 'null') . ' userId=' . ($userId ?? 'null'));
    respond(500, [
        'success' => false,
        'message' => 'No se pudo solicitar el reembolso',
        'debug' => $e->getMessage(),
        'type' => $type ?? null,
        'id' => $id ?? null,
        'rawData' => $data ?? null
    ]);
}
?>