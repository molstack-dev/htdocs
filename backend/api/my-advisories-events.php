<?php
// my-advisories-events.php - Devuelve asesorías y eventos del usuario actual
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
    // Obtener asesorías del usuario (tipo 'asesoria') que no tengan reembolso aprobado
    $stmt = $pdo->prepare(
        "SELECT 
            a.id,
            a.name,
            a.email,
            a.phone,
            a.service_type,
            a.advisory_type,
            a.advisory_service,
            a.advisory_mode,
            a.event_name,
            a.date,
            a.time,
            a.notes,
            a.status,
            a.price,
            a.num_persons,
            a.payment_status,
            a.payment_receipt,
            a.payment_method,
            a.created_at
         FROM advisories a
         LEFT JOIN refunds r ON (r.refundable_id = a.id AND r.type = 'advisory_asesoria')
         WHERE a.user_id = ? AND a.service_type = 'asesoria'
         AND (r.id IS NULL OR r.refund_status != 'approved')
         ORDER BY a.date ASC, a.time ASC"
    );
    $stmt->execute([$userId]);
    $advisories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Obtener eventos del usuario (tipo 'evento') que no tengan reembolso aprobado
    // Para eventos, buscamos la fecha en la tabla de cursos si está disponible
    $stmt = $pdo->prepare(
        "SELECT 
            a.id,
            a.name,
            a.email,
            a.phone,
            a.service_type,
            a.advisory_type,
            a.advisory_service,
            a.advisory_mode,
            a.event_name,
            CASE 
                WHEN c.event_date IS NOT NULL THEN c.event_date
                ELSE a.date
            END AS date,
            a.time,
            a.notes,
            a.status,
            a.price,
            a.num_persons,
            a.payment_status,
            a.payment_receipt,
            a.payment_method,
            a.created_at
         FROM advisories a
         LEFT JOIN refunds r ON (r.refundable_id = a.id AND r.type = 'advisory_evento')
         LEFT JOIN courses c ON (a.event_name = c.title OR a.advisory_service = c.title)
         WHERE a.user_id = ? AND a.service_type = 'evento'
         AND (r.id IS NULL OR r.refund_status != 'approved')
         ORDER BY a.date ASC, a.time ASC"
    );
    $stmt->execute([$userId]);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    respond(200, [
        'success' => true, 
        'advisories' => $advisories,
        'events' => $events
    ]);
} catch (Throwable $e) {
    error_log('Error en my-advisories-events.php: ' . $e->getMessage());
    respond(500, ['success' => false, 'message' => 'Error al obtener asesorías y eventos']);
}