<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE');
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

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['action']) || $data['action'] !== 'delete_account') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Acción no permitida']);
    exit;
}

$userId = $_SESSION['user_id'];
$email = $data['email'] ?? null;

// Validar que el email coincida (si viene). Si el front no lo envía,
// usamos la sesión como autorización para evitar fallos.
$stmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
    exit;
}

if ($email !== null && $email !== '') {
    if (strtolower($email) !== strtolower($user['email'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Email no coincide']);
        exit;
    }
}


// Eliminar inscripciones
$stmt = $pdo->prepare("DELETE FROM registrations WHERE client_id = ?");
$stmt->execute([$userId]);

// Eliminar asesorías
$stmt = $pdo->prepare("DELETE FROM advisories WHERE user_id = ?");
$stmt->execute([$userId]);

// Eliminar reservas
$stmt = $pdo->prepare("DELETE FROM reservations WHERE user_id = ?");
$stmt->execute([$userId]);

// Eliminar el usuario
$stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
$stmt->execute([$userId]);

// Destruir sesión
session_destroy();

echo json_encode(['success' => true, 'message' => 'Cuenta eliminada exitosamente']);
?>