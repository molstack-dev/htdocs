<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../cors.php';
header('Access-Control-Allow-Methods: PUT, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['id']) || !isset($data['payment_receipt'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

$id = (int)$data['id'];
$receipt = trim($data['payment_receipt']);
$payment_method = isset($data['payment_method']) ? trim($data['payment_method']) : null;

// Validar método de pago si se proporciona
if ($payment_method && !in_array($payment_method, ['nequi', 'bancolombia', 'daviplata', 'nu'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Método de pago no válido']);
    exit;
}

if (empty($receipt)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Comprobante requerido']);
    exit;
}

try {
    // Verificar que la asesoría existe (sin importar user_id, porque puede haber sido creada sin sesión)
    $check = $pdo->prepare('SELECT id FROM advisories WHERE id = ?');
    $check->execute([$id]);

    if (!$check->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Asesoría no encontrada']);
        exit;
    }

    try {
        $pdo->exec('ALTER TABLE advisories MODIFY COLUMN payment_receipt LONGTEXT');
    } catch (Exception $e) {
        // Ignorar si la tabla no existe o ya está en el formato correcto.
    }

    // Actualizar con método de pago si se proporciona
    if ($payment_method) {
        $stmt = $pdo->prepare('UPDATE advisories SET payment_receipt = ?, payment_status = ?, payment_method = ? WHERE id = ?');
        $stmt->execute([$receipt, 'paid', $payment_method, $id]);
    } else {
        $stmt = $pdo->prepare('UPDATE advisories SET payment_receipt = ?, payment_status = ? WHERE id = ?');
        $stmt->execute([$receipt, 'paid', $id]);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Comprobante recibido. Te contactaremos pronto para confirmar tu pago.'
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al guardar comprobante']);
}
?>