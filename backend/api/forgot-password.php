<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// POST - Verificar email y mostrar pregunta de seguridad
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        // Paso 1: Recibir email y devolver pregunta
        if (isset($data['email']) && !isset($data['security_answer'])) {
            $email = trim($data['email']);

            if (empty($email)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Email es requerido']);
                exit;
            }

            // Buscar usuario por email
            $stmt = $pdo->prepare('SELECT id, name, security_question FROM users WHERE email = ?');
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Este correo no tiene una cuenta asociada'
                ]);
                exit;
            }

            echo json_encode([
                'success' => true,
                'step' => 'question',
                'user_id' => $user['id'],
                'user_name' => $user['name'],
                'security_question' => $user['security_question']
            ]);
            exit;
        }

        // Paso 2: Verificar respuesta y permitir cambiar contraseña
        if (isset($data['user_id']) && isset($data['security_answer']) && isset($data['new_password'])) {
            $userId = intval($data['user_id']);
            $securityAnswer = trim($data['security_answer']);
            $newPassword = $data['new_password'];

            if (empty($securityAnswer) || empty($newPassword)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Todos los campos son requeridos']);
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

            // Verificar respuesta de seguridad
            $stmt = $pdo->prepare('SELECT security_answer FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

            if (!$user || strtolower($user['security_answer']) !== strtolower($securityAnswer)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Respuesta incorrecta']);
                exit;
            }

            // Actualizar contraseña
            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
            $stmt->execute([$hashedPassword, $userId]);

            echo json_encode([
                'success' => true,
                'message' => 'Contraseña actualizada correctamente'
            ]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Datos incompletos']);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al procesar solicitud']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['message' => 'Método no permitido']);
?>