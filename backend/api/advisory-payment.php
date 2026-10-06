<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
if (ob_get_level() === 0) {
    ob_start();
}

require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    if (ob_get_length()) ob_clean();
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    if (ob_get_length()) ob_clean();
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit;
}

// Verificar que es admin
$stmt = $pdo->prepare('SELECT id, role FROM users WHERE id = ?');
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user || $user['role'] !== 'admin') {
    if (ob_get_length()) ob_clean();
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['id']) || !isset($data['payment_status'])) {
    if (ob_get_length()) ob_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

$id = (int)$data['id'];
$payment_status = trim($data['payment_status']);

if (!in_array($payment_status, ['paid', 'rejected', 'pending'], true)) {
    if (ob_get_length()) ob_clean();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Estado inválido']);
    exit;
}

try {
    // 1) Actualizar la advisory
    $stmt = $pdo->prepare('UPDATE advisories SET payment_status = ?, payment_date = NOW() WHERE id = ?');
    $stmt->execute([$payment_status, $id]);

    // 2) Si es aprobado/rechazado, actualizar status advisory
    if ($payment_status === 'paid') {
        $stmt = $pdo->prepare('UPDATE advisories SET status = ? WHERE id = ?');
        $stmt->execute(['confirmed', $id]);
    } elseif ($payment_status === 'rejected') {
        $stmt = $pdo->prepare('UPDATE advisories SET status = ? WHERE id = ?');
        $stmt->execute(['cancelled', $id]);
    }

    // 3) IMPORTANT: Si la advisory es para un CURSO y fue pagada,
    //    debemos crear/actualizar el registro en `registrations`
    //    para que `views/user/mis-servicios.html` se active.
    //    (El admin aprueba en advisories; el usuario ve cursos desde registrations.)
    if ($payment_status === 'paid') {
        try {
            $stmt = $pdo->prepare('SELECT service_type, advisory_service, event_name, price, user_id, created_at FROM advisories WHERE id = ?');
            $stmt->execute([$id]);
            $adv = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($adv && $adv['service_type'] === 'curso') {
                $clientId = (int)($adv['user_id'] ?? 0);
                if ($clientId > 0) {
                    // advisory_service guarda el título del curso (según assets/script.js)
                    $courseTitle = trim((string)($adv['advisory_service'] ?? ''));

                    // Buscar course_id por título exacto o por slug normalizado
                    $course_id = null;
                    if ($courseTitle !== '') {
                        $stmtCourse = $pdo->prepare('SELECT id FROM courses WHERE title = ? LIMIT 1');
                        $stmtCourse->execute([$courseTitle]);
                        $found = $stmtCourse->fetch(PDO::FETCH_ASSOC);
                        if ($found) {
                            $course_id = (int)$found['id'];
                        } else {
                            $normalizedService = strtolower(preg_replace('/[^a-z0-9]+/i', '_', trim($courseTitle)));
                            $stmtCourse = $pdo->prepare('SELECT id, title FROM courses');
                            $stmtCourse->execute();
                            $allCourses = $stmtCourse->fetchAll(PDO::FETCH_ASSOC);
                            foreach ($allCourses as $courseItem) {
                                $normalizedTitle = strtolower(preg_replace('/[^a-z0-9]+/i', '_', trim($courseItem['title'])));
                                if ($normalizedTitle === $normalizedService) {
                                    $course_id = (int)$courseItem['id'];
                                    break;
                                }
                            }
                        }
                    }

                    // Si no encontramos por título, no rompemos el flujo
                    if ($course_id) {
                        $course_price = isset($adv['price']) ? (float)$adv['price'] : null;

                        // Verificar si ya existe la inscripción para este usuario y curso
                        $stmtExist = $pdo->prepare('SELECT id FROM registrations WHERE client_id = ? AND course_id = ? LIMIT 1');
                        $stmtExist->execute([$clientId, $course_id]);
                        $existingRegistration = $stmtExist->fetch(PDO::FETCH_ASSOC);

                        if ($existingRegistration) {
                            $stmtUp = $pdo->prepare('UPDATE registrations SET payment_status = ?, payment_date = NOW(), status = ?, course_price = COALESCE(course_price, ?) WHERE id = ?');
                            $stmtUp->execute(['paid', 'confirmed', $course_price, $existingRegistration['id']]);
                        } else {
                            $stmtIns = $pdo->prepare('INSERT INTO registrations (client_id, course_id, course_price, status, payment_status, payment_date, registration_date) VALUES (?, ?, ?, ?, ?, NOW(), NOW())');
                            $stmtIns->execute([$clientId, $course_id, $course_price, 'confirmed', 'paid']);
                        }
                    }
                }
            }
        } catch (PDOException $inner) {
            // No bloquear la aprobación si la sincronización de registrations falla.
            // error_log('Error syncing registrations after advisory payment: ' . $inner->getMessage());
        }
    }

    if (ob_get_length()) ob_clean();
    echo json_encode(['success' => true, 'message' => 'Pago actualizado']);
} catch (PDOException $e) {
    if (ob_get_length()) ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar']);
}
?>