<?php
// content-progress.php - Marca lecciones completadas y consulta progreso real por curso
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function ensureContentProgressTableExists() {
    global $pdo;
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS content_progress (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            course_id INT NOT NULL,
            content_id INT NOT NULL,
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY user_content_unique (user_id, course_id, content_id),
            INDEX idx_user_course (user_id, course_id),
            INDEX idx_content (course_id, content_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
}

function ensureCertificatesTableExists() {
    global $pdo;
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS certificates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            course_id INT NULL,
            registration_id INT,
            advisory_id INT NULL,
            service_type ENUM("curso","asesoria","evento") DEFAULT "curso",
            holder_name VARCHAR(255) NULL,
            holder_id_type VARCHAR(255) NULL,
            holder_id_number VARCHAR(100) NULL,
            is_group BOOLEAN DEFAULT FALSE,
            certificate_number VARCHAR(50) UNIQUE NOT NULL,
            issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expiry_date DATE NULL,
            is_valid BOOLEAN DEFAULT TRUE,
            pdf_path VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE SET NULL,
            INDEX idx_user_certificate (user_id),
            INDEX idx_course_certificate (course_id),
            INDEX idx_certificate_number (certificate_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
}

function verifyAuthenticatedUser(): array {
    global $pdo;

    if (!isset($_SESSION['user_id'])) {
        return ['success' => false, 'error' => 'Sesión no iniciada'];
    }

    try {
        $stmt = $pdo->prepare('SELECT id FROM users WHERE id = ?');
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();

        if (!$user) {
            return ['success' => false, 'error' => 'Usuario no encontrado'];
        }

        return ['success' => true, 'user_id' => $user['id']];
    } catch (PDOException $e) {
        return ['success' => false, 'error' => 'Error de base de datos'];
    }
}

function verifyCourseAccess(int $userId, int $courseId): bool {
    global $pdo;
    $stmt = $pdo->prepare('SELECT id FROM registrations WHERE client_id = ? AND course_id = ? AND payment_status = "paid" AND status != "pending"');
    $stmt->execute([$userId, $courseId]);
    return $stmt->fetch() !== false;
}

function getCourseProgress(int $userId, int $courseId): array {
    global $pdo;
    ensureContentProgressTableExists();

    $stmtTotal = $pdo->prepare('SELECT COUNT(*) as total FROM course_content WHERE course_id = ? AND is_active = 1');
    $stmtTotal->execute([$courseId]);
    $total = intval($stmtTotal->fetchColumn() ?: 0);

    $stmtCompleted = $pdo->prepare('SELECT content_id FROM content_progress WHERE user_id = ? AND course_id = ?');
    $stmtCompleted->execute([$userId, $courseId]);
    $completedIds = $stmtCompleted->fetchAll(PDO::FETCH_COLUMN);
    $completedCount = count($completedIds);
    $progressPercent = $total > 0 ? intval(round(($completedCount / $total) * 100)) : 0;

    return [
        'total_items' => $total,
        'completed_count' => $completedCount,
        'completed_content_ids' => $completedIds,
        'progress_percent' => $progressPercent
    ];
}

// Función para emitir un certificado automáticamente
function emitCertificate(int $userId, int $courseId, int $registrationId): bool {
    global $pdo;
    
    try {
        ensureCertificatesTableExists();
        
        // Verificar si ya existe un certificado para esta combinación usuario-curso
        $checkStmt = $pdo->prepare('SELECT id FROM certificates WHERE user_id = ? AND course_id = ? AND registration_id = ?');
        $checkStmt->execute([$userId, $courseId, $registrationId]);
        if ($checkStmt->fetch()) {
            // Ya existe un certificado para esta inscripción
            return true;
        }
        
        // Generar número único de certificado
        $certificate_number = 'CERT-' . strtoupper(substr(uniqid(), -8)) . '-' . date('Y');
        
        // Insertar el certificado
        $stmt = $pdo->prepare("
            INSERT INTO certificates (user_id, course_id, registration_id, certificate_number, issue_date, is_valid)
            VALUES (?, ?, ?, ?, NOW(), 1)
        ");
        
        return $stmt->execute([$userId, $courseId, $registrationId, $certificate_number]);
    } catch (PDOException $e) {
        error_log('Error al emitir certificado: ' . $e->getMessage());
        return false;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $courseId = isset($body['course_id']) ? intval($body['course_id']) : 0;
    $contentId = isset($body['content_id']) ? intval($body['content_id']) : 0;

    if (!$courseId || !$contentId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'course_id y content_id son requeridos']);
        exit;
    }

    $auth = verifyAuthenticatedUser();
    if (!$auth['success']) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => $auth['error']]);
        exit;
    }

    if (!verifyCourseAccess($auth['user_id'], $courseId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Sin acceso a este curso']);
        exit;
    }

    try {
        $stmtContent = $pdo->prepare('SELECT id FROM course_content WHERE id = ? AND course_id = ? AND is_active = 1 LIMIT 1');
        $stmtContent->execute([$contentId, $courseId]);
        if (!$stmtContent->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Contenido no encontrado']);
            exit;
        }

        ensureContentProgressTableExists();
        $stmt = $pdo->prepare('INSERT IGNORE INTO content_progress (user_id, course_id, content_id) VALUES (?, ?, ?)');
        $stmt->execute([$auth['user_id'], $courseId, $contentId]);

        $progress = getCourseProgress($auth['user_id'], $courseId);

        if ($progress['total_items'] > 0 && $progress['completed_count'] === $progress['total_items']) {
            $stmtUpdate = $pdo->prepare('UPDATE registrations SET status = "completed" WHERE client_id = ? AND course_id = ? AND payment_status = "paid" AND status != "completed"');
            $stmtUpdate->execute([$auth['user_id'], $courseId]);

            // Verificar si la actualización fue efectiva
            if ($stmtUpdate->rowCount() > 0) {
                // Obtener el ID de la inscripción para emitir el certificado
                $regStmt = $pdo->prepare('SELECT id FROM registrations WHERE client_id = ? AND course_id = ?');
                $regStmt->execute([$auth['user_id'], $courseId]);
                $registration = $regStmt->fetch();

                if ($registration) {
                    // Emitir certificado automáticamente
                    $certificateIssued = emitCertificate($auth['user_id'], $courseId, $registration['id']);

                    if (!$certificateIssued) {
                        error_log('Error al emitir certificado para el usuario ' . $auth['user_id'] . ' y curso ' . $courseId);
                    }
                }
            }
        }

        echo json_encode(array_merge(['success' => true], $progress));
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error al registrar el progreso']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $courseId = isset($_GET['course_id']) ? intval($_GET['course_id']) : 0;
    if (!$courseId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'course_id requerido']);
        exit;
    }

    $auth = verifyAuthenticatedUser();
    if (!$auth['success']) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => $auth['error']]);
        exit;
    }

    if (!verifyCourseAccess($auth['user_id'], $courseId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Sin acceso a este curso']);
        exit;
    }

    try {
        $progress = getCourseProgress($auth['user_id'], $courseId);
        echo json_encode(array_merge(['success' => true], $progress));
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error al obtener progreso']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Método no permitido']);
