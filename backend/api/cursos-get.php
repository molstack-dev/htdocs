<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config.php';

function getImageMimeType($imageData) {
    if (preg_match('/^\xff\xd8\xff/', $imageData)) return 'image/jpeg';
    if (preg_match('/^\x89PNG/', $imageData)) return 'image/png';
    if (preg_match('/^GIF8/', $imageData)) return 'image/gif';
    if (preg_match('/^RIFF.*WEBP/', $imageData)) return 'image/webp';
    return 'image/jpeg';
}

try {
    $stmt = $pdo->query("SELECT id, title, description, description_detail, price, duration, category, event_date, image, created_at FROM courses ORDER BY created_at DESC");
    $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Convertir imágenes base64 a data URLs (o dejar URL tal cual si existe)
    foreach ($courses as &$course) {
        if ($course['image']) {
            if (strpos($course['image'], 'http://') === 0 || strpos($course['image'], 'https://') === 0) {
                // Es una URL, devolver tal cual
                continue;
            }
            // Es base64, convertir a data URL
            $mimeType = getImageMimeType($course['image']);
            $course['image'] = 'data:' . $mimeType . ';base64,' . $course['image'];
        }
    }
    unset($course);

    echo json_encode([
        'success' => true,
        'data' => $courses
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener cursos'
    ]);
}
?>