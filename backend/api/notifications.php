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

// POST - Enviar notificación por email
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['to']) || !isset($data['subject']) || !isset($data['message'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'to, subject y message son requeridos']);
            exit;
        }

        $to = trim($data['to']);
        $subject = trim($data['subject']);
        $message = trim($data['message']);
        $fromName = $data['from_name'] ?? 'Chef Jonathan Buitrago';

        // Validar email
        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Email inválido']);
            exit;
        }

        // Cabeceras
        $headers = [
            'From: ' . $fromName . ' <noreply@chefjonathan.com>',
            'Reply-To: noreply@chefjonathan.com',
            'X-Mailer: PHP/' . phpversion(),
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8'
        ];

        // Enviar email
        $success = mail($to, $subject, nl2br($message), implode("\r\n", $headers));

        if ($success) {
            echo json_encode([
                'success' => true,
                'message' => 'Email enviado correctamente'
            ]);
        } else {
            // En XAMPP, mail() puede fallar si sendmail no está configurado
            echo json_encode([
                'success' => false,
                'message' => 'Error al enviar email. Verifica la configuración de sendmail en XAMPP.'
            ]);
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al enviar notificación']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['message' => 'Método no permitido']);
?>