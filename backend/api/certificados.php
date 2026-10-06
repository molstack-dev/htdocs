<?php
require_once __DIR__ . '/../cors.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) session_start();

function certificateResponse(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function isCertificateAdmin(PDO $pdo): bool {
    $userId = (int) ($_SESSION['user_id'] ?? 0);
    if (!$userId) return false;
    if (($_SESSION['user_role'] ?? $_SESSION['role'] ?? null) === 'admin') return true;
    $statement = $pdo->prepare('SELECT role FROM users WHERE id = ?');
    $statement->execute([$userId]);
    return $statement->fetchColumn() === 'admin';
}

function certificateRows(PDO $pdo, array $conditions = [], array $params = []): array {
    $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
    $statement = $pdo->prepare("SELECT
            c.id AS certificate_id, c.certificate_number, c.issue_date, c.expiry_date, c.is_valid, c.created_at,
            c.user_id, c.registration_id, c.advisory_id,
            COALESCE(c.service_type, CASE WHEN c.course_id IS NOT NULL THEN 'curso' END) AS service_type,
            c.is_group, u.name AS user_name, u.full_name AS user_full_name,
            u.id_type AS user_id_type, u.id_number AS user_id_number,
            COALESCE(NULLIF(c.holder_name, ''), u.full_name, u.name) AS holder_name,
            COALESCE(NULLIF(c.holder_id_type, ''), u.id_type) AS holder_id_type,
            COALESCE(NULLIF(c.holder_id_number, ''), u.id_number) AS holder_id_number,
            co.title AS course_title, co.duration AS course_duration,
            COALESCE(r.registration_date, c.issue_date) AS registration_date,
            COALESCE(r.registration_date, a.created_at, c.issue_date) AS completion_date,
            a.advisory_type, a.advisory_mode, a.num_persons, a.date AS event_date,
            CASE
                WHEN COALESCE(c.service_type, '') = 'evento' THEN COALESCE(a.event_name, a.advisory_service, 'Evento')
                WHEN COALESCE(c.service_type, '') = 'asesoria' THEN COALESCE(a.advisory_service, a.advisory_type, 'Asesoría')
                ELSE co.title
            END AS service_title
        FROM certificates c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN courses co ON c.course_id = co.id
        LEFT JOIN registrations r ON c.registration_id = r.id
        LEFT JOIN advisories a ON c.advisory_id = a.id
        {$where}
        ORDER BY c.issue_date DESC, c.id DESC");
    $statement->execute($params);
    return $statement->fetchAll(PDO::FETCH_ASSOC);
}

if (!isset($_SESSION['user_id'])) certificateResponse(401, ['success' => false, 'message' => 'No autenticado']);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $conditions = [];
    $params = [];
    $all = isset($_GET['all']) && $_GET['all'] === '1';
    if ($all) {
        if (!isCertificateAdmin($pdo)) certificateResponse(403, ['success' => false, 'message' => 'Acceso denegado']);
        if (isset($_GET['user_id']) && ctype_digit((string) $_GET['user_id'])) {
            $conditions[] = 'c.user_id = ?';
            $params[] = (int) $_GET['user_id'];
        }
    } else {
        $conditions[] = 'c.user_id = ?';
        $params[] = (int) $_SESSION['user_id'];
        $conditions[] = 'c.is_valid = 1';
    }
    if (isset($_GET['service_type']) && $_GET['service_type'] !== '') {
        $serviceType = trim((string) $_GET['service_type']);
        if (!in_array($serviceType, ['curso', 'asesoria', 'evento'], true)) certificateResponse(400, ['success' => false, 'message' => 'Tipo de servicio inválido']);
        $conditions[] = "COALESCE(c.service_type, CASE WHEN c.course_id IS NOT NULL THEN 'curso' END) = ?";
        $params[] = $serviceType;
    }
    certificateResponse(200, ['success' => true, 'data' => certificateRows($pdo, $conditions, $params)]);
}

if ($method === 'PUT') {
    if (!isCertificateAdmin($pdo)) certificateResponse(403, ['success' => false, 'message' => 'Acceso denegado']);
    $input = json_decode(file_get_contents('php://input'), true);
    $certificateId = (int) ($input['id'] ?? 0);
    if (!$certificateId || !isset($input['is_valid'])) certificateResponse(400, ['success' => false, 'message' => 'ID y estado requeridos']);
    $statement = $pdo->prepare('UPDATE certificates SET is_valid = ? WHERE id = ?');
    $statement->execute([(int) (bool) $input['is_valid'], $certificateId]);
    if (!$statement->rowCount()) certificateResponse(404, ['success' => false, 'message' => 'Certificado no encontrado']);
    certificateResponse(200, ['success' => true, 'message' => 'Estado del certificado actualizado']);
}

if ($method !== 'POST') certificateResponse(405, ['success' => false, 'message' => 'Método no permitido']);
if (!isCertificateAdmin($pdo)) certificateResponse(403, ['success' => false, 'message' => 'Solo un administrador puede emitir certificados manuales']);

$input = json_decode(file_get_contents('php://input'), true);
$userId = (int) ($input['user_id'] ?? 0);
$advisoryId = (int) ($input['advisory_id'] ?? 0);
$serviceType = trim((string) ($input['service_type'] ?? ''));
if (!$userId || !$advisoryId || !in_array($serviceType, ['asesoria', 'evento'], true)) {
    certificateResponse(400, ['success' => false, 'message' => 'Usuario, servicio y tipo de servicio válidos son requeridos']);
}

$userStatement = $pdo->prepare('SELECT id, name, full_name, id_type, id_number FROM users WHERE id = ?');
$userStatement->execute([$userId]);
$buyer = $userStatement->fetch(PDO::FETCH_ASSOC);
if (!$buyer) certificateResponse(404, ['success' => false, 'message' => 'Usuario no encontrado']);

$advisoryStatement = $pdo->prepare("SELECT id, num_persons FROM advisories WHERE id = ? AND user_id = ? AND service_type = ? AND status IN ('confirmed', 'completed') AND payment_status = 'paid'");
$advisoryStatement->execute([$advisoryId, $userId, $serviceType]);
if (!$advisoryStatement->fetch(PDO::FETCH_ASSOC)) {
    certificateResponse(400, ['success' => false, 'message' => 'El servicio debe pertenecer al usuario, estar aprobado y pagado']);
}

$expiryDate = !empty($input['expiry_date']) ? $input['expiry_date'] : null;
if ($expiryDate && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $expiryDate)) certificateResponse(400, ['success' => false, 'message' => 'Fecha de expiración inválida']);

$holders = [];
$participants = $input['participants'] ?? null;
if (is_array($participants)) {
    foreach ($participants as $participant) {
        $name = trim((string) ($participant['name'] ?? ''));
        if ($name === '') certificateResponse(400, ['success' => false, 'message' => 'Cada participante debe tener nombre']);
        $holders[] = ['name' => $name, 'id_type' => trim((string) ($participant['id_type'] ?? '')), 'id_number' => trim((string) ($participant['id_number'] ?? '')), 'is_group' => 1];
    }
    if (!$holders) certificateResponse(400, ['success' => false, 'message' => 'Agrega al menos un participante']);
    if (!empty($input['include_buyer'])) {
        $holders[] = ['name' => $buyer['full_name'] ?: $buyer['name'], 'id_type' => $buyer['id_type'] ?: '', 'id_number' => $buyer['id_number'] ?: '', 'is_group' => 1];
    }
} else {
    $recipientMode = $input['recipient_mode'] ?? 'self';
    if ($recipientMode === 'other') {
        $name = trim((string) ($input['recipient_name'] ?? ''));
        if ($name === '') certificateResponse(400, ['success' => false, 'message' => 'El nombre del beneficiario es requerido']);
        $holders[] = ['name' => $name, 'id_type' => trim((string) ($input['recipient_id_type'] ?? '')), 'id_number' => trim((string) ($input['recipient_id_number'] ?? '')), 'is_group' => 0];
    } else {
        $holders[] = ['name' => $buyer['full_name'] ?: $buyer['name'], 'id_type' => $buyer['id_type'] ?: '', 'id_number' => $buyer['id_number'] ?: '', 'is_group' => 0];
    }
}

try {
    $pdo->beginTransaction();
    $insert = $pdo->prepare("INSERT INTO certificates (user_id, course_id, registration_id, advisory_id, service_type, holder_name, holder_id_type, holder_id_number, is_group, certificate_number, issue_date, expiry_date, is_valid) VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1)");
    foreach ($holders as $holder) {
        $number = 'CERT-' . strtoupper(bin2hex(random_bytes(4))) . '-' . date('Y');
        $insert->execute([$userId, $advisoryId, $serviceType, $holder['name'], $holder['id_type'] ?: null, $holder['id_number'] ?: null, $holder['is_group'], $number, $expiryDate]);
    }
    $pdo->commit();
    certificateResponse(201, ['success' => true, 'message' => count($holders) === 1 ? 'Certificado emitido exitosamente' : 'Certificados emitidos exitosamente', 'issued' => count($holders)]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Error al emitir certificados: ' . $e->getMessage());
    certificateResponse(500, ['success' => false, 'message' => 'No se pudieron emitir los certificados']);
}
