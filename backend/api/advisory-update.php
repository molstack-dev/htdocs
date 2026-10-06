<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, PATCH');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID requerido']);
    exit;
}

$id = intval($data['id']);
$userId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;

try {
    // Verificar que la solicitud existe y pertenece al usuario
    $check = $pdo->prepare('SELECT id FROM advisories WHERE id = ? AND user_id = ?');
    $check->execute([$id, $userId]);

    if (!$check->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Solicitud no encontrada']);
        exit;
    }

    // Construir la consulta de actualización dinámicamente
    $updates = [];
    $params = [];

    if (isset($data['status'])) {
        $status = trim($data['status']);
        $validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        if (in_array($status, $validStatuses)) {
            $updates[] = 'status = ?';
            $params[] = $status;
        }
    }

    if (isset($data['date'])) {
        $updates[] = 'date = ?';
        $params[] = $data['date'] ?: null;
    }

    if (isset($data['time'])) {
        $updates[] = 'time = ?';
        $params[] = $data['time'] ?: null;
    }

    if (isset($data['notes'])) {
        $updates[] = 'notes = ?';
        $params[] = $data['notes'];
    }

    if (isset($data['phone'])) {
        $updates[] = 'phone = ?';
        $params[] = trim($data['phone']);
    }

    if (isset($data['num_persons'])) {
        $updates[] = 'num_persons = ?';
        $params[] = intval($data['num_persons']);
    }

    if (isset($data['advisory_service'])) {
        $updates[] = 'advisory_service = ?';
        $params[] = trim($data['advisory_service']);
    }

    if (empty($updates)) {
        echo json_encode(['success' => false, 'message' => 'No hay campos para actualizar']);
        exit;
    }

    $params[] = $id;
    $params[] = $userId;

    $sql = "UPDATE advisories SET " . implode(', ', $updates) . " WHERE id = ? AND user_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode([
        'success' => true,
        'message' => 'Solicitud actualizada correctamente'
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $e->getMessage()]);
}
?>