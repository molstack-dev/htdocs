<?php
// refund-process.php - Procesar reembolsos en tabla exclusiva refunds
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

if (!isset($_SESSION['user_id'])) {
    respond(401, ['success' => false, 'message' => 'No autenticado']);
}

// Admin
if (($_SESSION['role'] ?? null) !== 'admin') {
    $stmtRole = $pdo->prepare('SELECT role FROM users WHERE id = ? LIMIT 1');
    $stmtRole->execute([(int)$_SESSION['user_id']]);
    $row = $stmtRole->fetch(PDO::FETCH_ASSOC);
    if (!$row || $row['role'] !== 'admin') {
        respond(401, ['success' => false, 'message' => 'No autorizado']);
    }
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['id']) || !isset($data['action']) || !isset($data['type'])) {
    respond(400, ['success' => false, 'message' => 'Datos incompletos']);
}

$refundId = (int)$data['id'];
$type = trim((string)$data['type']);
$action = trim((string)$data['action']);

if (!in_array($type, ['registration', 'advisory_course', 'advisory_asesoria', 'advisory_evento'], true)) {
    respond(400, ['success' => false, 'message' => 'Tipo inválido']);
}
if (!in_array($action, ['approve', 'reject'], true)) {
    respond(400, ['success' => false, 'message' => 'Acción inválida']);
}

try {
    $pdo->beginTransaction();

    // bloquear refund
    $stmt = $pdo->prepare('SELECT * FROM refunds WHERE id = ? FOR UPDATE');
    $stmt->execute([$refundId]);
    $refund = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$refund) {
        $pdo->rollBack();
        respond(404, ['success' => false, 'message' => 'Solicitud no encontrada']);
    }

    if ($refund['refund_status'] !== 'pending') {
        $pdo->rollBack();
        respond(400, ['success' => false, 'message' => 'La solicitud ya fue procesada']);
    }

    if ($action === 'approve') {
        // Admin puede enviar un comprobante (base64/texto) en admin_receipt
        $adminReceipt = null;
        if (isset($data['admin_receipt'])) {
            $adminReceipt = trim((string)$data['admin_receipt']);
            if ($adminReceipt === '') $adminReceipt = null;
            
            // Validar tamaño del archivo base64
            if ($adminReceipt && strlen($adminReceipt) > 16000000) { // Limitar a 16MB para LONGTEXT
                $pdo->rollBack();
                respond(400, ['success' => false, 'message' => 'El archivo es demasiado grande. Máximo 16MB permitido.']);
            }
        }

        $upd = $pdo->prepare("UPDATE refunds SET refund_status = 'approved', processed_at = NOW(), processed_by = ?, admin_receipt = ? WHERE id = ?");
        $upd->execute([(int)$_SESSION['user_id'], $adminReceipt, $refundId]);

        // Actualizar enrollment/payment real según type
        if ($type === 'registration') {
            $upd2 = $pdo->prepare("UPDATE registrations SET status = 'confirmed', payment_status = 'refunded' WHERE id = ?");
            $upd2->execute([(int)$refund['refundable_id']]);
        } elseif ($type === 'advisory_course') {
            $upd2 = $pdo->prepare("UPDATE advisories SET status = 'cancelled', payment_status = 'refunded' WHERE id = ? AND service_type = 'curso'");
            $upd2->execute([(int)$refund['refundable_id']]);

            // Buscar y actualizar registros relacionados en la tabla registrations
            $stmtAdv = $pdo->prepare("SELECT user_id, advisory_service FROM advisories WHERE id = ?");
            $stmtAdv->execute([(int)$refund['refundable_id']]);
            $advisory = $stmtAdv->fetch(PDO::FETCH_ASSOC);

            if ($advisory && $advisory['advisory_service']) {
                $stmtCourse = $pdo->prepare("SELECT id FROM courses WHERE title = ? LIMIT 1");
                $stmtCourse->execute([$advisory['advisory_service']]);
                $course = $stmtCourse->fetch(PDO::FETCH_ASSOC);

                if ($course) {
                    $updReg = $pdo->prepare("UPDATE registrations SET payment_status = 'refunded', status = 'cancelled' WHERE client_id = ? AND course_id = ?");
                    $updReg->execute([(int)$advisory['user_id'], (int)$course['id']]);
                }
            }
        } else {
            // advisory_asesoria o advisory_evento
            $serviceTypeMap = [
                'advisory_asesoria' => 'asesoria',
                'advisory_evento' => 'evento'
            ];
            $svcType = $serviceTypeMap[$type] ?? 'asesoria';
            $upd2 = $pdo->prepare("UPDATE advisories SET status = 'cancelled', payment_status = 'refunded' WHERE id = ? AND service_type = ?");
            $upd2->execute([(int)$refund['refundable_id'], $svcType]);
        }

        $pdo->commit();
        respond(200, ['success' => true, 'message' => 'Reembolso aprobado']);
    }

    // reject
    $rejectionReason = null;
    if (isset($data['rejection_reason'])) {
        $rejectionReason = trim((string)$data['rejection_reason']);
        if ($rejectionReason === '') $rejectionReason = null;
    }

    $upd = $pdo->prepare(
        "UPDATE refunds SET refund_status = 'rejected', processed_at = NOW(), processed_by = ?, rejection_reason = ? WHERE id = ?"
    );
    $upd->execute([(int)$_SESSION['user_id'], $rejectionReason, $refundId]);

    if ($type === 'registration') {
        $upd2 = $pdo->prepare("UPDATE registrations SET payment_status = 'paid' WHERE id = ?");
        $upd2->execute([(int)$refund['refundable_id']]);
    } elseif ($type === 'advisory_course') {
        $upd2 = $pdo->prepare("UPDATE advisories SET payment_status = 'paid' WHERE id = ? AND service_type='curso'");
        $upd2->execute([(int)$refund['refundable_id']]);

        $stmtAdv = $pdo->prepare("SELECT user_id, advisory_service FROM advisories WHERE id = ?");
        $stmtAdv->execute([(int)$refund['refundable_id']]);
        $advisory = $stmtAdv->fetch(PDO::FETCH_ASSOC);

        if ($advisory && $advisory['advisory_service']) {
            $stmtCourse = $pdo->prepare("SELECT id FROM courses WHERE title = ? LIMIT 1");
            $stmtCourse->execute([$advisory['advisory_service']]);
            $course = $stmtCourse->fetch(PDO::FETCH_ASSOC);

            if ($course) {
                $updReg = $pdo->prepare("UPDATE registrations SET payment_status = 'paid', status = 'confirmed' WHERE client_id = ? AND course_id = ?");
                $updReg->execute([(int)$advisory['user_id'], (int)$course['id']]);
            }
        }
    } else {
        // advisory_asesoria o advisory_evento
        $serviceTypeMap = [
            'advisory_asesoria' => 'asesoria',
            'advisory_evento' => 'evento'
        ];
        $svcType = $serviceTypeMap[$type] ?? 'asesoria';
        $upd2 = $pdo->prepare("UPDATE advisories SET payment_status = 'paid' WHERE id = ? AND service_type = ?");
        $upd2->execute([(int)$refund['refundable_id'], $svcType]);
    }

    $pdo->commit();
    respond(200, ['success' => true, 'message' => 'Reembolso rechazado']);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Error PDO en refund-process.php: ' . $e->getMessage() . ' | Code: ' . $e->getCode());
    respond(500, ['success' => false, 'message' => 'Error en la base de datos: ' . $e->getMessage()]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Error en refund-process.php: ' . $e->getMessage());
    respond(500, ['success' => false, 'message' => 'Error interno']);
}
?>