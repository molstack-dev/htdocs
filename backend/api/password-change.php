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

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

// El front de perfil.js solo envía currentPassword y newPassword (no confirmPassword)
// y valida el match del lado cliente.
if (!$data || !isset($data['currentPassword']) || !isset($data['newPassword'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Todos los campos son requeridos']);
    exit;
}

$currentPassword = $data['currentPassword'];
$newPassword = $data['newPassword'];
$confirmPassword = isset($data['confirmPassword']) ? $data['confirmPassword'] : null;


// Cuando confirmPassword no viene desde el front (perfil.js), no debe bloquear el cambio.
if (empty($currentPassword) || empty($newPassword)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Los campos no pueden estar vacíos']);
    exit;
}

if ($confirmPassword !== null && $newPassword !== $confirmPassword) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Las contraseñas nuevas no coinciden']);
    exit;
}


// Validar fortaleza de contraseña
function validatePassword($password) {
    $errors = [];

    if (strlen($password) < 8) {
        $errors[] = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!preg_match('/[A-Z]/', $password)) {
        $errors[] = 'La contraseña debe tener al menos una mayúscula';
    }

    if (!preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)) {
        $errors[] = 'La contraseña debe tener al menos un carácter especial';
    }

    // Verificar secuencias numéricas (más de 2 números consecutivos)
    if (preg_match_all('/\d+/', $password, $matches)) {
        foreach ($matches[0] as $numSeq) {
            $len = strlen($numSeq);
            if ($len > 2) {
                $isSequence = true;
                for ($i = 0; $i < $len - 1; $i++) {
                    $diff = intval($numSeq[$i + 1]) - intval($numSeq[$i]);
                    if ($i === 0) {
                        $expectedDiff = $diff;
                    } elseif ($diff !== $expectedDiff || abs($diff) !== 1) {
                        $isSequence = false;
                        break;
                    }
                }
                if ($isSequence && abs($expectedDiff) === 1) {
                    $errors[] = 'La contraseña no puede contener secuencias numéricas (123, 456, 789)';
                    break;
                }
            }
        }
    }

    return $errors;
}

$passwordErrors = validatePassword($newPassword);
if (count($passwordErrors) > 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $passwordErrors[0]]);
    exit;
}

try {
    // Obtener usuario actual con su contraseña hasheada
    $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($currentPassword, $user['password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Contraseña actual incorrecta']);
        exit;
    }

    // Actualizar la contraseña
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->execute([$hashedPassword, $_SESSION['user_id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Contraseña actualizada exitosamente'
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor']);
}
?>
