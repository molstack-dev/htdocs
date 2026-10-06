<?php
// signed-token.php - Genera tokens de acceso tiempo-limitado para videos
// Similar a Bunny.net Stream Token API

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// === CONFIGURACIÓN DE TOKEN ===
define('TOKEN_SECRET', 'ChefJonathan_SecretKey_2026_Sha256'); // Cambiar en producción
define('TOKEN_EXPIRY_SECONDS', 300); // 5 minutos

/**
 * Genera token HMAC-SHA256 similar a Bunny.net
 *
 * @param string $videoId - ID del video en la plataforma
 * @param string $videoKey - Clave única del video (proporcionada por Bunny/Vimeo)
 * @param int $userId - ID del usuario para quien se genera
 * @return string Token签名
 */
function generateSignedToken(string $videoId, string $videoKey, int $userId): string {
    $expiry = time() + TOKEN_EXPIRY_SECONDS;
    $dataToSign = $videoId . $videoKey . $userId . $expiry;
    $signature = hash_hmac('sha256', $dataToSign, TOKEN_SECRET);

    return base64_encode($expiry . ':' . $signature);
}

/**
 * Verifica si un usuario está autenticado y activo
 *
 * @return array ['success' => bool, 'user_id' => int, 'error' => string]
 */
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

/**
 * Verifica si el usuario tiene acceso vigente al curso
 *
 * @param int $userId
 * @param int $courseId
 * @return bool
 */
function verifyCourseAccess(int $userId, int $courseId): bool {
    global $pdo;

    $stmt = $pdo->prepare('
        SELECT id FROM registrations
        WHERE client_id = ?
        AND course_id = ?
        AND payment_status = "paid"
        AND status IN ("confirmed", "completed")
    ');
    $stmt->execute([$userId, $courseId]);
    return $stmt->fetch() !== false;
}

// === ENDPOINT: Obtener URL tokenizada para video ===
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $courseId = isset($_GET['course_id']) ? intval($_GET['course_id']) : 0;
    $contentId = isset($_GET['content_id']) ? intval($_GET['content_id']) : 0;

    if (!$courseId && !$contentId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID requerido']);
        exit;
    }

    // 1. Verificar autenticación
    $auth = verifyAuthenticatedUser();
    if (!$auth['success']) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => $auth['error']]);
        exit;
    }

    // 2. Verificar acceso al curso
    if ($courseId && !verifyCourseAccess($auth['user_id'], $courseId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Sin acceso a este contenido']);
        exit;
    }

    // 3. Obtener datos del contenido
    global $pdo;
    try {
        if ($contentId) {
            $stmt = $pdo->prepare('
            SELECT cc.id, cc.course_id, cc.title, cc.video_url,
                       cc.duration, cc.order_index, c.title as course_title

                FROM course_content cc
                JOIN courses c ON cc.course_id = c.id
                WHERE cc.id = ? AND cc.is_active = 1
            ');
            $stmt->execute([$contentId]);
        } else {
            $stmt = $pdo->prepare('
                SELECT id, course_id, title, video_url, preview_url, duration, order_index
                FROM course_content
                WHERE course_id = ? AND is_active = 1
                ORDER BY order_index ASC
                LIMIT 1
            ');
            $stmt->execute([$courseId]);
        }

        $content = $stmt->fetch();

        if (!$content) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Contenido no encontrado']);
            exit;
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Error al obtener contenido']);
        exit;
    }

    // 4. Generar token signed (si es YouTube, usamos formato similar)
    $videoId = extractYouTubeId($content['video_url']);
    $videoKey = 'yt_' . $videoId; // Prefijo para YouTube

    // Para YouTube no listado: no necesitamos token server-side porque
    // YouTube no soporta tokenización. Usamos el verify del content-get.php
    // Pero simulamos el mismo patrón por si migramos a Vimeo/Bunny

    $signedToken = generateSignedToken($videoId ?: $content['id'], $videoKey, $auth['user_id']);
    $nextLesson = null;

    try {
        $stmtNext = $pdo->prepare('
            SELECT id, title
            FROM course_content
            WHERE course_id = ?
              AND is_active = 1
              AND order_index > ?
            ORDER BY order_index ASC
            LIMIT 1
        ');
        $stmtNext->execute([$content['course_id'], $content['order_index']]);
        $nextLesson = $stmtNext->fetch();
    } catch (PDOException $e) {
        $nextLesson = null;
    }

        echo json_encode([
            'success' => true,
            'data' => [
                'video_url' => $content['video_url'],
                'title' => $content['title'],
                'course_title' => $content['course_title'] ?? '',
                'duration' => $content['duration'],

            'token' => $signedToken,
            'expires_in' => TOKEN_EXPIRY_SECONDS,
            'video_id' => $videoId,
            'next_content_id' => $nextLesson['id'] ?? null,
            'next_content_title' => $nextLesson['title'] ?? null
        ]
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Método no permitido']);

/**
 * Extrae ID de YouTube de URL
 */
function extractYouTubeId(string $url): ?string {
    $patterns = [
        // watch?v=VIDEOID, youtu.be/VIDEOID, embed/VIDEOID
        '/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/',
        // /v/VIDEOID
        '/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/',
        // /shorts/VIDEOID (muy común para no listados)
        '/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/'
    ];
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $url, $match)) {
            return $match[1];
        }
    }
    return null;
}
?>
