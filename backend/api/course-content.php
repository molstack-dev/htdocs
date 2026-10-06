<?php
// course-content.php - CRUD para contenido de cursos (admin)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verificar admin
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit;
}

$stmt = $pdo->prepare('SELECT role FROM users WHERE id = ?');
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();
if (!$user || $user['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Solo admin']);
    exit;
}

// GET - Listar contenido de un curso
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $course_id = isset($_GET['course_id']) ? intval($_GET['course_id']) : 0;

    if (!$course_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'course_id requerido']);
        exit;
    }

    $stmt = $pdo->prepare('
        SELECT id, course_id, title, description, content_type, video_url, duration, order_index, is_active, created_at
        FROM course_content
        WHERE course_id = ?
        ORDER BY order_index ASC, id ASC
    ');
    $stmt->execute([$course_id]);
    $content = $stmt->fetchAll();


    echo json_encode(['success' => true, 'data' => $content]);
    exit;
}

// POST - Crear contenido
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $required = ['course_id', 'title', 'video_url'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Campo requerido: $field"]);
            exit;
        }
    }

    $stmt = $pdo->prepare('
        INSERT INTO course_content (course_id, title, description, content_type, video_url, duration, order_index, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        intval($data['course_id']),
        trim($data['title']),
        $data['description'] ?? '',
        $data['content_type'] ?? 'video',
        trim($data['video_url']),
        $data['duration'] ?? '',
        intval($data['order_index'] ?? 0),
        intval($data['is_active'] ?? 1)
    ]);

    echo json_encode(['success' => true, 'message' => 'Contenido creado', 'id' => $pdo->lastInsertId()]);
    exit;
}

// PUT - Actualizar contenido
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id requerido']);
        exit;
    }

    $id = intval($data['id']);
    $fields = [];
    $values = [];

    $updatable = ['title', 'description', 'content_type', 'video_url', 'duration', 'order_index', 'is_active'];
    foreach ($updatable as $field) {
        if (isset($data[$field])) {
            $fields[] = "$field = ?";
            $values[] = $field === 'order_index' || $field === 'is_active' ? intval($data[$field]) : trim($data[$field]);
        }
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No hay campos para actualizar']);
        exit;
    }

    $values[] = $id;
    $sql = 'UPDATE course_content SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);

    echo json_encode(['success' => true, 'message' => 'Contenido actualizado']);
    exit;
}

// DELETE - Eliminar contenido
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'id requerido']);
        exit;
    }

    $stmt = $pdo->prepare('DELETE FROM course_content WHERE id = ?');
    $stmt->execute([intval($data['id'])]);

    echo json_encode(['success' => true, 'message' => 'Contenido eliminado']);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Método no permitido']);
?>
