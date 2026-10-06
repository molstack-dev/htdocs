<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config.php';

// Iniciar sesión si no está iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Obtener usuario actual
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action'])) {
    try {
        switch ($_GET['action']) {
            case 'get_current_user':
                if (!isset($_SESSION['user_id'])) {
                    http_response_code(401);
                    echo json_encode(['error' => 'No autorizado']);
                    exit;
                }
                
                $stmt = $pdo->prepare("
                    SELECT id, name, full_name, id_type, custom_doc_type, id_number, email, phone, role, 
                           security_question, security_answer, notify_email, notify_whatsapp, created_at 
                    FROM users 
                    WHERE id = ?
                ");
                $stmt->execute([$_SESSION['user_id']]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($user) {
                    // Solo exponer campos necesarios para el cliente
                    echo json_encode([
                        'id' => $user['id'],
                        'name' => $user['name'],
                        'full_name' => $user['full_name'],
                        'id_type' => $user['id_type'],
                        'custom_doc_type' => $user['custom_doc_type'],  // Include custom document type
                        'id_number' => $user['id_number'],
                        'email' => $user['email'],
                        'phone' => $user['phone'],
                        'role' => $user['role'],
                        'notify_email' => $user['notify_email'],
                        'notify_whatsapp' => $user['notify_whatsapp']
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Usuario no encontrado']);
                }
                break;
            case 'get_users':
                $stmt = $pdo->query("
                    SELECT id, name, full_name, id_type, custom_doc_type, id_number, email, phone, role, created_at 
                    FROM users 
                    ORDER BY created_at DESC
                ");
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Enviar respuesta
                echo json_encode(array_map(function($user) {
                    return [
                        'id' => $user['id'],
                        'name' => $user['name'],
                        'full_name' => $user['full_name'],
                        'id_type' => $user['id_type'],
                        'custom_doc_type' => $user['custom_doc_type'],  // Include custom document type
                        'id_number' => $user['id_number'],
                        'email' => $user['email'],
                        'phone' => $user['phone'],
                        'role' => $user['role'],
                        'created_at' => $user['created_at']
                    ];
                }, $users));
                break;
            default:
                http_response_code(400);
                echo json_encode(['error' => 'Acción no válida']);
                break;
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error interno del servidor']);
    }
    exit;
}

// Listar todos los usuarios
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, name, full_name, id_type, id_number, email, role, created_at FROM users ORDER BY created_at DESC");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($users);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['message' => 'Error interno del servidor']);
    }
    exit;
}

// Crear o actualizar usuario (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['action'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Acción no especificada']);
            exit;
        }

        // Crear usuario
        if ($data['action'] === 'create_user') {
            $required = ['name', 'full_name', 'email', 'password', 'security_question', 'security_answer', 'phone', 'notify_email', 'notify_whatsapp'];
            foreach ($required as $f) {
                if (!isset($data[$f])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
                    exit;
                }
            }

            $name = trim($data['name']);
            $full_name = isset($data['full_name']) ? trim($data['full_name']) : '';
            $id_type = isset($data['id_type']) ? trim($data['id_type']) : '';
            $id_number = isset($data['id_number']) ? trim($data['id_number']) : '';
            $custom_doc_type = isset($data['custom_doc_type']) ? trim($data['custom_doc_type']) : '';
            $email = trim($data['email']);
            $password = (string)$data['password'];
            $role = isset($data['role']) ? trim($data['role']) : 'user';

            $security_question = trim($data['security_question']);
            $security_answer = trim($data['security_answer']);
            $phoneRaw = (string)$data['phone'];

            $notify_email = isset($data['notify_email']) ? (bool)$data['notify_email'] : true;
            $notify_whatsapp = isset($data['notify_whatsapp']) ? (bool)$data['notify_whatsapp'] : false;

            // Validate document type
            $validIdTypes = ['Tarjeta de Identidad', 'Cédula de Ciudadanía', 'Cédula de Extranjería', 'Permiso por Protección Temporal (PPT)', 'Pasaporte', 'Otro'];
            if ($id_type !== '' && !in_array($id_type, $validIdTypes, true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Tipo de documento no válido']);
                exit;
            }

            if ($name === '' || $full_name === '' || $email === '' || $password === '' || $security_question === '' || $security_answer === '' || $phoneRaw === '' || $role === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Todos los campos son requeridos']);
                exit;
            }

            if (!preg_match('/^[\p{L}\s]+$/u', $full_name)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'El nombre completo solo puede contener letras y espacios']);
                exit;
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Email inválido']);
                exit;
            }

            $phone = preg_replace('/\D+/', '', $phoneRaw);
            if (empty($phone)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Teléfono inválido']);
                exit;
            }

            $validRoles = ['admin', 'user'];
            if (!in_array($role, $validRoles, true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Rol no válido']);
                exit;
            }

            // Validar fortaleza de contraseña
            $errors = [];
            if (strlen($password) < 8) $errors[] = 'La contraseña debe tener al menos 8 caracteres';
            if (!preg_match('/[A-Z]/', $password)) $errors[] = 'La contraseña debe tener al menos una mayúscula';
            if (!preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)) $errors[] = 'La contraseña debe tener al menos un carácter especial';
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
            if (count($errors) > 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => $errors[0]]);
                exit;
            }

            // Verificar que el usuario no exista
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'El usuario ya existe']);
                exit;
            }

            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            $stmt = $pdo->prepare(
                "INSERT INTO users (name, full_name, id_type, id_number, custom_doc_type, email, phone, password, role, security_question, security_answer, notify_email, notify_whatsapp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );

            $stmt->execute([
                $name,
                $full_name,
                $id_type,
                $id_number,
                $custom_doc_type,  // Add custom document type
                $email,
                $phone,
                $hashedPassword,
                $role,
                $security_question,
                strtolower($security_answer),
                $notify_email,
                $notify_whatsapp
            ]);

            echo json_encode(['success' => true, 'message' => 'Usuario registrado exitosamente']);
            exit;
        }


        // Actualizar usuario
        if ($data['action'] === 'update_user') {
            if (!isset($data['id']) || !isset($data['name']) || !isset($data['email'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
                exit;
            }

            $id = $data['id'];
            $name = trim($data['name']);
            $full_name = isset($data['full_name']) ? trim($data['full_name']) : '';
            $id_type = isset($data['id_type']) ? trim($data['id_type']) : '';
            $id_number = isset($data['id_number']) ? trim($data['id_number']) : '';
            $custom_doc_type = isset($data['custom_doc_type']) ? trim($data['custom_doc_type']) : '';
            $email = trim($data['email']);
            $role = isset($data['role']) ? trim($data['role']) : 'user';

            // Validar rol
            $validRoles = ['admin', 'user'];
            if (!in_array($role, $validRoles, true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Rol no válido']);
                exit;
            }

            // Validar tipo de documento
            $validIdTypes = ['Tarjeta de Identidad', 'Cédula de Ciudadanía', 'Cédula de Extranjería', 'Permiso por Protección Temporal (PPT)', 'Pasaporte', 'Otro'];
            if ($id_type !== '' && !in_array($id_type, $validIdTypes, true)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Tipo de documento no válido']);
                exit;
            }

            // Verificar que el email no exista en otro usuario
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
            $stmt->execute([$email, $id]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'El email ya existe']);
                exit;
            }

            // Actualizar el usuario
            $stmt = $pdo->prepare("UPDATE users SET name = ?, full_name = ?, id_type = ?, id_number = ?, custom_doc_type = ?, email = ?, role = ? WHERE id = ?");
            $stmt->execute([$name, $full_name, $id_type, $id_number, $custom_doc_type, $email, $role, $id]);

            echo json_encode(['success' => true, 'message' => 'Usuario actualizado exitosamente']);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Acción no válida']);
        exit;

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error interno del servidor']);
    }
    exit;
}

// Eliminar usuario (DELETE)
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['action'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Acción no especificada']);
            exit;
        }

        // Eliminar cuenta propia
        if ($data['action'] === 'delete_account') {
            if (!isset($data['email'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Email requerido']);
                exit;
            }
            
            $email = trim($data['email']);
            
            // Verificar que el usuario actual sea quien solicita la eliminación
            if (!isset($_SESSION['user_id'])) {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'No autenticado']);
                exit;
            }
            
            // Verificar que el email coincida
            $stmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user || strtolower($user['email']) !== strtolower($email)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Email no coincide']);
                exit;
            }
            
            // Eliminar la cuenta
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            
            // Destruir sesión
            session_destroy();
            
            echo json_encode(['success' => true, 'message' => 'Cuenta eliminada exitosamente']);
            exit;
        }

        // Eliminar usuario por ID (admin)
        if ($data['action'] === 'delete_user') {
            if (!isset($data['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID requerido']);
                exit;
            }

            $id = $data['id'];

            // Eliminar el usuario
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);

            echo json_encode(['success' => true, 'message' => 'Usuario eliminado exitosamente']);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Acción no válida']);
        exit;

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error interno del servidor: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['message' => 'Método no permitido']);
?>
