<?php
require_once __DIR__ . '/../cors.php';
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Método no permitido']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$required = ['name', 'full_name', 'id_type', 'id_number', 'email', 'password', 'security_question', 'security_answer', 'phone', 'notify_email', 'notify_whatsapp'];
foreach ($required as $f) {
    if (!isset($data[$f])) {
        http_response_code(400);
        echo json_encode(['message' => 'Datos incompletos']);
        exit;
    }
}

$name = trim($data['name']);
$full_name = trim($data['full_name']);
$id_type = trim($data['id_type']);
$id_number = trim($data['id_number']);
$email = trim($data['email']);
$password = (string)$data['password'];
$security_question = trim($data['security_question']);
$security_answer = trim($data['security_answer']);
$phoneRaw = (string)$data['phone'];

// Handle custom_doc_type which may not always be present
$custom_doc_type = isset($data['custom_doc_type']) ? trim($data['custom_doc_type']) : null;

$notify_email = isset($data['notify_email']) ? (bool)$data['notify_email'] : true;
$notify_whatsapp = isset($data['notify_whatsapp']) ? (bool)$data['notify_whatsapp'] : false;

if (empty($name) || empty($full_name) || empty($id_number) || empty($email) || empty($password) || empty($security_question) || empty($security_answer) || empty($phoneRaw)) {
    http_response_code(400);
    echo json_encode(['message' => 'Todos los campos son requeridos']);
    exit;
}

// Validar tipo de documento
$validIdTypes = ['Tarjeta de Identidad', 'Cédula de Ciudadanía', 'Cédula de Extranjería', 'Permiso por Protección Temporal (PPT)', 'Pasaporte', 'Otro'];
if (!in_array($id_type, $validIdTypes, true)) {
    http_response_code(400);
    echo json_encode(['message' => 'Tipo de documento no válido']);
    exit;
}

// Validar custom_doc_type si el tipo de documento es "Otro"
if ($id_type === 'Otro' && (!$custom_doc_type || empty($custom_doc_type))) {
    http_response_code(400);
    echo json_encode(['message' => 'Debe especificar el tipo de documento cuando selecciona "Otro"']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['message' => 'Email inválido']);
    exit;
}

// Teléfono: solo num
$phone = preg_replace('/\D+/', '', $phoneRaw);
if (empty($phone)) {
    http_response_code(400);
    echo json_encode(['message' => 'Teléfono inválido']);
    exit;
}

// Validar fortaleza de contraseña
function validatePassword(string $password): array {
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
                $expectedDiff = null;
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

                if ($isSequence && $expectedDiff !== null && abs($expectedDiff) === 1) {
                    $errors[] = 'La contraseña no puede contener secuencias numéricas (123, 456, 789)';
                    break;
                }
            }
        }
    }

    return $errors;
}

$passwordErrors = validatePassword($password);
if (count($passwordErrors) > 0) {
    http_response_code(400);
    echo json_encode(['message' => $passwordErrors[0]]);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode(['message' => 'El usuario ya existe']);
        exit;
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // phone se guarda en users.phone
    $stmt = $pdo->prepare(
        "INSERT INTO users (name, full_name, id_type, id_number, custom_doc_type, email, phone, password, role, security_question, security_answer, notify_email, notify_whatsapp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, ?, ?, ?)"
    );

    $stmt->execute([
        $name,
        $full_name,
        $id_type,
        $id_number,
        $custom_doc_type,
        $email,
        $phone,
        $hashedPassword,
        $security_question,
        strtolower($security_answer),
        $notify_email,
        $notify_whatsapp
    ]);

    $userId = $pdo->lastInsertId();

    echo json_encode([
        'message' => 'Usuario registrado exitosamente',
        'user' => [
            'id' => $userId,
            'name' => $name,
            'full_name' => $full_name,
            'id_type' => $id_type,
            'id_number' => $id_number,
            'email' => $email,
            'role' => 'user'
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Error interno del servidor']);
}
?>
