<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// GET - Listar cursos
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, title, description, description_detail, price, duration, category, event_date, event_time, image, created_at FROM courses ORDER BY created_at DESC");
        $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

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
    exit;
}

// POST - Crear o actualizar curso
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $id = isset($_POST['id']) ? intval($_POST['id']) : null;
        $title = isset($_POST['title']) ? trim($_POST['title']) : '';
        $description = isset($_POST['description']) ? trim($_POST['description']) : '';
        $descriptionDetail = isset($_POST['description_detail']) ? trim($_POST['description_detail']) : '';
        $category = isset($_POST['category']) ? trim($_POST['category']) : 'cursos';
        $duration = isset($_POST['duration']) ? trim($_POST['duration']) : '';
        $price = isset($_POST['price']) ? floatval($_POST['price']) : 0;
        $event_date = isset($_POST['event_date']) ? trim($_POST['event_date']) : null;
        $event_time = isset($_POST['event_time']) ? trim($_POST['event_time']) : null;
        $imageUrl = isset($_POST['image_url']) ? trim($_POST['image_url']) : '';

        if (empty($title) || $price <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Título y precio son requeridos']);
            exit;
        }

            // Manejar imagen - guardar como base64 en BD
        $imageData = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $imageData = base64_encode(file_get_contents($_FILES['image']['tmp_name']));
        }

        // Normalizar event_date (solo aplica para eventos)
        $event_date_normalized = null;
        $event_time_normalized = null;
        if ($category === 'eventos' && !empty($event_date)) {
            // input date => YYYY-MM-DD
            $event_date_normalized = $event_date;
            $event_time_normalized = $event_time ?: null;
        }

        if ($id) {
            // Actualizar curso existente
            if ($imageData) {
                $stmt = $pdo->prepare("UPDATE courses SET title = ?, description = ?, description_detail = ?, category = ?, duration = ?, price = ?, event_date = ?, event_time = ?, image = ? WHERE id = ?");
                $stmt->execute([$title, $description, $descriptionDetail, $category, $duration, $price, $event_date_normalized, $event_time_normalized, $imageData, $id]);
            } else {
                $stmt = $pdo->prepare("UPDATE courses SET title = ?, description = ?, description_detail = ?, category = ?, duration = ?, price = ?, event_date = ?, event_time = ? WHERE id = ?");
                $stmt->execute([$title, $description, $descriptionDetail, $category, $duration, $price, $event_date_normalized, $event_time_normalized, $id]);
            }

            echo json_encode(['success' => true, 'message' => 'Curso actualizado correctamente']);
        } else {
            $stmt = $pdo->prepare("INSERT INTO courses (title, description, description_detail, category, duration, price, event_date, event_time, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$title, $description, $descriptionDetail, $category, $duration, $price, $event_date_normalized, $event_time_normalized, $imageData]);

            echo json_encode(['success' => true, 'message' => 'Curso creado correctamente']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al procesar solicitud']);
    }
    exit;
}

// DELETE - Eliminar curso
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID requerido']);
            exit;
        }

        $id = intval($data['id']);

        // Eliminar curso
        $stmt = $pdo->prepare("DELETE FROM courses WHERE id = ?");
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'message' => 'Curso eliminado correctamente']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al eliminar curso']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['message' => 'Método no permitido']);
?>
