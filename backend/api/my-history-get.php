<?php
// my-history-get.php - Combina historial de asesorías y cursos
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
    $history = [];

    // Obtener asesorías del usuario
    // Nota: Excluimos advisories que ya tienen un refund pendiente/aprobado para evitar duplicados en el historial.
    $stmt = $pdo->prepare("SELECT a.id, a.name, a.email, a.phone, a.service_type, a.advisory_type, a.advisory_service, a.advisory_mode, a.event_name, a.date, a.time, a.notes, a.status, a.price, a.num_persons, a.payment_status, a.payment_receipt, a.payment_method, a.created_at, 'advisory' as source
        FROM advisories a
        WHERE a.user_id = ?
          AND (a.service_type IS NULL OR a.service_type <> 'curso')
          AND NOT EXISTS (
              SELECT 1 FROM refunds rf
              WHERE rf.refundable_id = a.id
                AND rf.type IN ('advisory_asesoria','advisory_evento','advisory_course')
                AND rf.user_id = a.user_id
                AND rf.refund_status IN ('pending','approved')
          )
        ORDER BY a.created_at DESC");
    $stmt->execute([$userId]);
    $advisories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $history = array_merge($history, $advisories);


    // Obtener inscripciones a cursos del usuario
    // FIX doble fila: si existe un refund pendiente para esta registration, NO la mostramos en el historial base.
    $stmt = $pdo->prepare("SELECT r.id, r.client_id as user_id, r.course_id, c.title as course_title, r.course_price as price, r.status, r.payment_status, r.payment_receipt, r.registration_date as created_at, 'registration' as source
        FROM registrations r
        JOIN courses c ON r.course_id = c.id
        WHERE r.client_id = ?
          AND NOT EXISTS (
              SELECT 1
              FROM refunds rf
              WHERE rf.user_id = r.client_id
                AND rf.type = 'registration'
                AND rf.refundable_id = r.id
                AND rf.refund_status IN ('pending','approved')
          )
        ORDER BY r.registration_date DESC");
    $stmt->execute([$userId]);
    $registrations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $history = array_merge($history, $registrations);


    // Ordenar por fecha descendente
    usort($history, function($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });

    echo json_encode([
        'success' => true,
        'data' => $history
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener historial'
    ]);
}
?>
