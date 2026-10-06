<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

$id = (int)$data['id'];
$email = isset($data['email']) ? trim($data['email']) : null;
$userId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;

if (!$userId && !$email) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit;
}

try {
    // Permitir borrado completo a admins
    $currentRole = $_SESSION['user_role'] ?? null;

    if ($currentRole === 'admin') {
        // Usar DELETE directo (evita incompatibilidades con rowCount en wrappers)
        $pdo->exec('DELETE FROM advisories WHERE id = ' . (int)$id);
        echo json_encode(['success' => true, 'message' => 'Solicitud eliminada correctamente']);
        exit;
    }


    // Usuario normal: verificar por user_id/email
    if ($userId) {
        $check = $pdo->prepare('SELECT id FROM advisories WHERE id = ? AND user_id = ?');
        $check->execute([$id, $userId]);
    } else {
        $check = $pdo->prepare('SELECT id FROM advisories WHERE id = ? AND email = ?');
        $check->execute([$id, $email]);
    }

    $row = $check->fetch();
    if (!$row) {
        echo json_encode(['success' => false, 'message' => 'Solicitud no encontrada']);
        exit;
    }

    if ($userId) {
        $stmt = $pdo->prepare('DELETE FROM advisories WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
    } else {
        $stmt = $pdo->prepare('DELETE FROM advisories WHERE id = ? AND email = ?');
        $stmt->execute([$id, $email]);
    }

    echo json_encode(['success' => true, 'message' => 'Solicitud eliminada correctamente']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al eliminar', 'debug' => $e->getMessage()]);
}
?>


