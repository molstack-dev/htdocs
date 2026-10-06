<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Solo usuarios autenticados
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['notify_email']) || !isset($data['notify_whatsapp'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

$userId = $_SESSION['user_id'];
$notifyEmail = (bool)$data['notify_email'];
$notifyWhatsapp = (bool)$data['notify_whatsapp'];

try {
    // Actualizar preferencias de notificación
    $stmt = $pdo->prepare("UPDATE users SET notify_email = ?, notify_whatsapp = ? WHERE id = ?");
    $stmt->execute([$notifyEmail, $notifyWhatsapp, $userId]);

    echo json_encode(['success' => true, 'message' => 'Preferencias de notificación actualizadas exitosamente']);
    exit;

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor']);
    exit;
}
?>
