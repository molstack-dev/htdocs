<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Usuario no autenticado']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['name']) || !isset($data['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nombre y email requeridos']);
    exit;
}

$user_id = $_SESSION['user_id'];
$name = trim($data['name']);
$full_name = isset($data['full_name']) ? trim($data['full_name']) : '';
$id_type = isset($data['id_type']) ? trim($data['id_type']) : '';
$custom_doc_type = isset($data['custom_doc_type']) ? trim($data['custom_doc_type']) : null;
$id_number = isset($data['id_number']) ? trim($data['id_number']) : '';
$email = trim($data['email']);
$phone = isset($data['phone']) ? trim($data['phone']) : '';
$city = isset($data['city']) ? trim($data['city']) : '';

if (empty($name) || empty($email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nombre y email no pueden estar vacíos']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email no válido']);
    exit;
}

// Validar tipo de documento
$validIdTypes = ['Tarjeta de Identidad', 'Cédula de Ciudadanía', 'Cédula de Extranjería', 'Permiso por Protección Temporal (PPT)', 'Pasaporte', 'Otro'];
if (!empty($id_type) && !in_array($id_type, $validIdTypes, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Tipo de documento no válido']);
    exit;
}

try {
    // Verificar que el email no esté en uso por otro usuario
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
    $stmt->execute([$email, $user_id]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'El email ya está en uso']);
        exit;
    }

    // Actualizar el perfil
    // Campos opcionales (para no romper el guardado cuando el front solo envía name/email)
    $securityQuestion = isset($data['security_question']) ? trim($data['security_question']) : null;

    // Compatibilidad con typo antiguo en el frontend/back
    $securityAnswer = null;
    if (isset($data['security_answer'])) {
        $securityAnswer = trim($data['security_answer']);
    } elseif (isset($data['sequirity_answer'])) {
        $securityAnswer = trim($data['sequirity_answer']);
    }

    // Actualizar el perfil preservando seguridad si el cliente no envía esos campos
    if ($securityQuestion === null && $securityAnswer === null) {
        // Si no hay datos de pregunta/respuesta de seguridad
        if ($id_type === 'Otro' && !empty($custom_doc_type)) {
            // Si el tipo de documento es 'Otro' y se proporciona un tipo personalizado
            $stmt = $pdo->prepare("UPDATE users SET name = ?, full_name = ?, id_type = ?, custom_doc_type = ?, id_number = ?, email = ? WHERE id = ?");
            $stmt->execute([$name, $full_name, $id_type, $custom_doc_type, $id_number, $email, $user_id]);
        } else {
            // En otros casos, actualizar sin el campo de documento personalizado
            $stmt = $pdo->prepare("UPDATE users SET name = ?, full_name = ?, id_type = ?, custom_doc_type = NULL, id_number = ?, email = ? WHERE id = ?");
            $stmt->execute([$name, $full_name, $id_type, $id_number, $email, $user_id]);
        }
    } else {
        // Si hay datos de pregunta/respuesta de seguridad
        if ($id_type === 'Otro' && !empty($custom_doc_type)) {
            // Si el tipo de documento es 'Otro' y se proporciona un tipo personalizado
            $stmt = $pdo->prepare("UPDATE users SET name = ?, full_name = ?, id_type = ?, custom_doc_type = ?, id_number = ?, email = ?, security_question = ?, security_answer = ? WHERE id = ?");
            $stmt->execute([
                $name,
                $full_name,
                $id_type,
                $custom_doc_type,
                $id_number,
                $email,
                $securityQuestion ?? '',
                $securityAnswer ?? '',
                $user_id
            ]);
        } else {
            // Si el tipo de documento no es 'Otro' o no se proporciona un tipo personalizado
            $stmt = $pdo->prepare("UPDATE users SET name = ?, full_name = ?, id_type = ?, custom_doc_type = NULL, id_number = ?, email = ?, security_question = ?, security_answer = ? WHERE id = ?");
            $stmt->execute([
                $name,
                $full_name,
                $id_type,
                $id_number,
                $email,
                $securityQuestion ?? '',
                $securityAnswer ?? '',
                $user_id
            ]);
        }
    }

    // Actualizar la sesión
    $_SESSION['user_name'] = $name;
    $_SESSION['user_email'] = $email;
    $_SESSION['user_full_name'] = $full_name;
    $_SESSION['user_id_type'] = $id_type;
    
    if ($id_type === 'Otro' && !empty($custom_doc_type)) {
        $_SESSION['user_custom_doc_type'] = $custom_doc_type;
    } else if (isset($_SESSION['user_custom_doc_type'])) {
        unset($_SESSION['user_custom_doc_type']);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Perfil actualizado exitosamente',
        'user' => [
            'id' => $user_id,
            'name' => $name,
            'full_name' => $full_name,
            'id_type' => $id_type,
            'custom_doc_type' => $id_type === 'Otro' && !empty($custom_doc_type) ? $custom_doc_type : null,
            'id_number' => $id_number,
            'email' => $email,
            'phone' => $phone,
            'city' => $city
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno del servidor']);
}
?>
