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

if (!$data || !isset($data['name']) || !isset($data['email']) || !isset($data['reservationType']) || !isset($data['date'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Campos requeridos: nombre, email, tipo de reserva y fecha']);
    exit;
}

$name = trim($data['name']);
$email = trim($data['email']);
$phone = isset($data['phone']) ? trim($data['phone']) : '';
$idType = isset($data['idType']) ? trim($data['idType']) : '';
$idNumber = isset($data['idNumber']) ? trim($data['idNumber']) : '';
$reservationType = trim($data['reservationType']);
$courseId = isset($data['courseId']) ? intval($data['courseId']) : null;
$date = trim($data['date']);
$time = isset($data['time']) ? trim($data['time']) : '';
$notes = isset($data['notes']) ? trim($data['notes']) : '';
$user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;

if (empty($name) || empty($email) || empty($reservationType) || empty($date)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Los campos requeridos no pueden estar vacíos']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email no válido']);
    exit;
}

if (!in_array($reservationType, ['curso', 'asesoria', 'evento'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Tipo de reserva no válido']);
    exit;
}

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Formato de fecha inválido']);
    exit;
}

if ($idType === 'otro' && empty($idNumber)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Si especifica "otro" tipo de ID, debe ingresar el número']);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO reservations (user_id, name, email, phone, id_type, id_number, reservation_type, course_id, date, time, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $user_id,
        $name,
        $email,
        $phone,
        $idType ?: null,
        $idNumber ?: null,
        $reservationType,
        $courseId,
        $date,
        $time ?: null,
        $notes
    ]);

    $reservation_id = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'Reserva registrada exitosamente',
        'data' => [
            'id' => $reservation_id,
            'name' => $name,
            'email' => $email,
            'reservationType' => $reservationType,
            'date' => $date,
            'time' => $time,
            'status' => 'pending'
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor']);
}
?>
