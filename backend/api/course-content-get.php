<?php
// course-content-get.php - Obtiene contenido de curso verificando inscripción
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$course_id = isset($_GET['course_id']) ? intval($_GET['course_id']) : 0;

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

if (!$course_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'course_id requerido']);
    exit;
}

try {
    // Obtener info del curso
    $stmt = $pdo->prepare('SELECT id, title FROM courses WHERE id = ?');
    $stmt->execute([$course_id]);
    $course = $stmt->fetch();

    if (!$course) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Curso no encontrado']);
        exit;
    }

    // Verificar si el usuario está inscrito (pago aprobado)
    // registrations.client_id une con users.id según el JOIN en inscripciones.php
    $is_enrolled = false;
    if (isset($_SESSION['user_id'])) {
        $stmt = $pdo->prepare('
            SELECT id FROM registrations
            WHERE client_id = ?
            AND course_id = ?
            AND payment_status = "paid"
            AND status != "pending"
        

        ');


        $stmt->execute([$_SESSION['user_id'], $course_id]);
        $is_enrolled = $stmt->fetch() !== false;
    }

    // Obtener contenido del curso
    $userId = isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : 0;
    if ($userId) {
        ensureContentProgressTableExists();
    }

    $stmt = $pdo->prepare('
        SELECT cc.id, cc.title, cc.description, cc.content_type, cc.video_url, cc.duration, cc.order_index,
               CASE WHEN cp.id IS NOT NULL THEN 1 ELSE 0 END AS completed

        FROM course_content cc
        LEFT JOIN content_progress cp ON cc.id = cp.content_id AND cp.user_id = ?
        WHERE cc.course_id = ? AND cc.is_active = 1
        ORDER BY cc.order_index ASC, cc.id ASC
    ');
    $stmt->execute([$userId, $course_id]);
    $content = $stmt->fetchAll();

    $completedCount = 0;
    $totalCount = count($content);
    foreach ($content as &$item) {
        $item['completed'] = isset($item['completed']) && intval($item['completed']) === 1;
        if ($item['completed']) {
            $completedCount++;
        }
    }
    unset($item);

    // IMPORTANTE: evitar fuga de contenido/URL de video si NO está inscrito
    if (!$is_enrolled) {
        foreach ($content as &$item) {
            // Mantener solo metadata no sensible
            $item['video_url'] = null;
            unset($item['description']);
        }
        unset($item);
    }

    $progressPercent = $totalCount > 0 ? intval(round(($completedCount / $totalCount) * 100)) : 0;

    echo json_encode([
        'success' => true,
        'course' => $course,
        'is_enrolled' => $is_enrolled,
        'content' => $content,
        'completed_count' => $completedCount,
        'total_items' => $totalCount,
        'progress_percent' => $progressPercent
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al obtener contenido', 'debug' => $e->getMessage()]);
}
?>

