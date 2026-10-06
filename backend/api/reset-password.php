<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// POST - Resetear contraseña con token
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['token']) || !isset($data['password']) || !isset($data['confirm_password'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Token y contraseña son requeridos']);
            exit;
        }

        $token = trim($data['token']);
        $password = $data['password'];
        $confirmPassword = $data['confirm_password'];

        if ($password !== $confirmPassword) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Las contraseñas no coinciden']);
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

        $passwordErrors = validatePassword($password);
        if (count($passwordErrors) > 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $passwordErrors[0]]);
            exit;
        }

        // Verificar token en tabla password_resets
        $stmt = $pdo->prepare("SELECT email FROM password_resets WHERE token = ? AND used = FALSE AND expires > NOW() LIMIT 1");
        $stmt->execute([$token]);
        $reset = $stmt->fetch();

        if (!$reset) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Token inválido o expirado']);
            exit;
        }

        $email = $reset['email'];

        // Actualizar contraseña del usuario
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
        $stmt->execute([$hashedPassword, $email]);

        // Marcar token como usado
        $stmt = $pdo->prepare("UPDATE password_resets SET used = TRUE WHERE token = ?");
        $stmt->execute([$token]);

        echo json_encode([
            'success' => true,
            'message' => 'Contraseña actualizada correctamente'
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al restablecer contraseña']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['message' => 'Método no permitido']);
?>