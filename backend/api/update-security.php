<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
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

if (!isset($data['password']) || !isset($data['security_question']) || !isset($data['security_answer'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

$userId = $_SESSION['user_id'];
$password = trim($data['password']);
$securityQuestion = trim($data['security_question']);
$securityAnswer = trim($data['security_answer']);

if (empty($password) || empty($securityQuestion) || empty($securityAnswer)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Todos los campos son requeridos']);
    exit;
}

try {
    // Obtener usuario actual
    $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
        exit;
    }

    // Verificar contraseña
    if (!password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta']);
        exit;
    }

    // Actualizar pregunta y respuesta de seguridad
    $stmt = $pdo->prepare("UPDATE users SET security_question = ?, security_answer = ? WHERE id = ?");
    $stmt->execute([$securityQuestion, strtolower($securityAnswer), $userId]);

    echo json_encode(['success' => true, 'message' => 'Pregunta de seguridad actualizada exitosamente']);
    exit;

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor']);
    exit;
}
?>
