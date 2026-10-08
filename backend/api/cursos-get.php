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
    $stmt = $pdo->query("SELECT id, title, description, description_detail, price, duration, category, event_date, event_time, image, created_at FROM courses ORDER BY created_at DESC");
    $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Verificar si el usuario es administrador
    $isAdmin = false;
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin') {
        $isAdmin = true;
    }

    // Si no es administrador, filtrar eventos pasados
    if (!$isAdmin) {
        $currentDateTime = new DateTime();
        $filteredCourses = [];
        
        foreach ($courses as $course) {
            // Si no es un evento, mantenerlo
            if ($course['category'] !== 'eventos' && $course['category'] !== 'evento') {
                $filteredCourses[] = $course;
            } else {
                // Si es un evento, verificar si la fecha ya pasó
                if ($course['event_date']) {
                    $eventDateTime = new DateTime($course['event_date'] . ' ' . ($course['event_time'] ?: '00:00:00'));
                    if ($eventDateTime >= $currentDateTime) {
                        // Solo agregar si la fecha del evento es hoy o en el futuro
                        $filteredCourses[] = $course;
                    }
                } else {
                    // Si no tiene fecha de evento definida, no se considera válido como evento
                    $filteredCourses[] = $course;
                }
            }
        }
        $courses = $filteredCourses;
    } else {
        // Para administradores, agregar un campo que indique si el evento está vencido
        $currentDateTime = new DateTime();
        foreach ($courses as &$course) {
            if (($course['category'] === 'eventos' || $course['category'] === 'evento') && $course['event_date']) {
                $eventDateTime = new DateTime($course['event_date'] . ' ' . ($course['event_time'] ?: '00:00:00'));
                $course['is_expired'] = $eventDateTime < $currentDateTime;
            } else {
                $course['is_expired'] = false;
            }
        }
        unset($course);
    }

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