<?php
// get-advisory-details.php - Devuelve los detalles de una asesoría o evento específico
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Incluir la configuración de la base de datos
require_once __DIR__ . '/../config.php';

// Iniciar sesión para acceder a las variables de sesión
session_start();

/**
 * Función para responder con código HTTP y payload JSON
 * @param int $code Código de respuesta HTTP
 * @param array $payload Datos a devolver en formato JSON
 */
function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

// Verificar si el usuario está autenticado
if (!isset($_SESSION['user_id'])) {
    respond(401, ['success' => false, 'message' => 'No autenticado']);
}

// Obtener y validar los parámetros
$userId = (int)$_SESSION['user_id'];
$id = (int)($_GET['id'] ?? 0);
$type = $_GET['type'] ?? '';

if (!$id || !in_array($type, ['asesoria', 'evento'])) {
    respond(400, ['success' => false, 'message' => 'ID o tipo inválido']);
}

try {
    // Consultar detalles de la asesoría o evento
    if ($type === 'evento') {
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
                CASE
                    WHEN c.event_time IS NOT NULL THEN c.event_time
                    ELSE a.time
                END AS time,
                a.notes,
                a.status,
                a.price,
                a.num_persons,
                a.payment_status,
                a.payment_receipt,
                a.payment_method,
                a.created_at
             FROM advisories a
             LEFT JOIN courses c ON (
                a.event_name = c.title
                OR a.advisory_service = c.title
                OR LOWER(REPLACE(c.title, ' ', '_')) = LOWER(COALESCE(a.event_name, a.advisory_service))
             )
             WHERE a.user_id = ? AND a.id = ? AND a.service_type = ?
             LIMIT 1"
        );
        $stmt->execute([$userId, $id, $type]);
        $advisory = $stmt->fetch(PDO::FETCH_ASSOC);
    } else {
        // Para asesorías normales, usamos la fecha directamente de la tabla advisories
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
             WHERE a.user_id = ? AND a.id = ? AND a.service_type = ?
             LIMIT 1"
        );
        $stmt->execute([$userId, $id, $type]);
        $advisory = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Verificar si se encontró la asesoría o evento
    if (!$advisory) {
        respond(404, ['success' => false, 'message' => 'Asesoría o evento no encontrado']);
    }

    // Devolver la respuesta exitosa con los datos de la asesoría
    respond(200, [
        'success' => true,
        'advisory' => $advisory
    ]);
} catch (Throwable $e) {
    // Registrar y devolver un error en caso de excepción
    error_log('Error en get-advisory-details.php: ' . $e->getMessage());
    respond(500, ['success' => false, 'message' => 'Error al obtener detalles']);
}
