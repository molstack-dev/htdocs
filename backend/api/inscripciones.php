<?php
require_once __DIR__ . '/../cors.php';
header('Content-Type: application/json');

require_once __DIR__ . '/../config.php';

// Iniciar sesión si no está iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function jsonResponse($statusCode, $payload) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

function requireSessionAdmin() {
    // Permitir creación de inscripciones sin sesión (cliente puede no estar autenticado)
    $stmt = $GLOBALS['pdo']->prepare('SELECT id, role FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || $user['role'] !== 'admin') {
        jsonResponse(403, ['success'=>false, 'message'=>'Forbidden']);
    }
}

// Función para emitir un certificado automáticamente
function emitCertificate(int $userId, int $courseId, int $registrationId): bool {
    global $pdo;
    
    try {
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

$method = $_SERVER['REQUEST_METHOD'];

// GET: listar (admin todas, user las suyas)
if ($method === 'GET') {
    // filtros opcionales
    $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
    $status = isset($_GET['status']) ? trim($_GET['status']) : null;
    $date_start = isset($_GET['date_start']) && $_GET['date_start'] !== '' ? $_GET['date_start'] : null;
    $date_end = isset($_GET['date_end']) && $_GET['date_end'] !== '' ? $_GET['date_end'] : null;

    if (!isset($_SESSION['user_id'])) {
        // sin sesión: sólo listado público no aplica en este módulo
        // devolvemos vacío para no romper UI
        echo json_encode(['success'=>true, 'data'=>[]]);
        exit;
    }

    $stmtRole = $pdo->prepare('SELECT id, role FROM users WHERE id = ?');
    $stmtRole->execute([$_SESSION['user_id']]);
    $me = $stmtRole->fetch(PDO::FETCH_ASSOC);

    $params = [];
    $where = [];

    // Admin: puede recibir user_id
    if ($me && $me['role'] === 'admin') {
        if ($user_id) {
            $where[] = 'r.client_id = ?';
            $params[] = $user_id;
        }
    } else {
        // User: sólo sus registros
        $where[] = 'r.client_id = ?';
        $params[] = $_SESSION['user_id'];
        // Un curso con reembolso aprobado deja de ser un servicio activo.
        $where[] = "r.payment_status <> 'refunded'";
        $where[] = "NOT EXISTS (
            SELECT 1 FROM refunds rf
            WHERE rf.type = 'registration'
              AND rf.refundable_id = r.id
              AND rf.refund_status = 'approved'
        )";
    }

    if ($status) {
        $where[] = 'r.status = ?';
        $params[] = $status;
    }

    if ($date_start && $date_end) {
        $where[] = 'r.registration_date BETWEEN ? AND ?';
        $params[] = $date_start.' 00:00:00';
        $params[] = $date_end.' 23:59:59';
    }

    $whereSql = $where ? ('WHERE '.implode(' AND ', $where)) : '';

    $sql = "
        SELECT
            r.id,
            r.course_id,
            u.name AS user_name,
            u.email AS user_email,
            c.title AS course_title,
            r.course_price,
            r.status,
            r.payment_status,
            r.payment_receipt,
            r.payment_date,
            r.registration_date
        FROM registrations r
        JOIN users u ON r.client_id = u.id
        JOIN courses c ON r.course_id = c.id
        $whereSql
        ORDER BY r.registration_date DESC
    ";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success'=>true, 'data'=>$rows]);
    } catch (PDOException $e) {
        jsonResponse(500, ['success'=>false, 'message'=>'Error al obtener inscripciones: '.$e->getMessage()]);
    }

    exit;
}

// POST: crear inscripción (admin) o desde cliente
if ($method === 'POST') {
    // Verificar si es para subir comprobante de pago
    if (isset($_POST['action']) && $_POST['action'] === 'upload_receipt') {
        requireSessionAdmin();

        $id = isset($_POST['id']) ? (int)$_POST['id'] : null;
        $payment_status = isset($_POST['payment_status']) ? trim($_POST['payment_status']) : 'paid';

        if (!$id) {
            jsonResponse(400, ['success'=>false, 'message'=>'ID requerido']);
        }

        if (!in_array($payment_status, ['paid', 'rejected'], true)) {
            jsonResponse(400, ['success'=>false, 'message'=>'Estado de pago inválido']);
        }

        try {
            $stmt = $pdo->prepare('UPDATE registrations SET payment_status = ?, payment_date = NOW() WHERE id = ?');
            $stmt->execute([$payment_status, $id]);

            // Si es rechazado, volver a pending
            if ($payment_status === 'rejected') {
                $stmt = $pdo->prepare('UPDATE registrations SET status = ?, payment_status = ? WHERE id = ?');
                $stmt->execute(['pending', 'rejected', $id]);
            }

            echo json_encode(['success'=>true, 'message'=>'Pago actualizado']);
        } catch (PDOException $e) {
            jsonResponse(500, ['success'=>false, 'message'=>'Error al actualizar pago']);
        }
        exit;
    }

    // Verificar si es para registrar inscripción con comprobante
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data) {
        jsonResponse(400, ['success'=>false, 'message'=>'Datos incompletos']);
    }

    $course_id = isset($data['course_id']) ? (int)$data['course_id'] : null;
    $payment_status = isset($data['payment_status']) ? trim($data['payment_status']) : 'pending';
    $course_price = isset($data['course_price']) ? floatval($data['course_price']) : null;

    // Si no se envía course_id, intentar mapearlo desde el campo 'service' (título o slug)
    if (!$course_id && !empty($data['service'])) {
        $service = trim($data['service']);
        try {
            // Intentar búsqueda por título exacto
            $stmtCourse = $pdo->prepare('SELECT id FROM courses WHERE title = ? LIMIT 1');
            $stmtCourse->execute([$service]);
            $found = $stmtCourse->fetch(PDO::FETCH_ASSOC);
            if ($found) {
                $course_id = (int)$found['id'];
            } else {
                // Si no hay coincidencia exacta, normalizar y comparar slugs
                $stmtCourse = $pdo->prepare('SELECT id, title FROM courses');
                $stmtCourse->execute();
                $all = $stmtCourse->fetchAll(PDO::FETCH_ASSOC);
                $s_norm = strtolower(preg_replace('/\s+/', '_', $service));
                foreach ($all as $c) {
                    $c_norm = strtolower(preg_replace('/\s+/', '_', trim($c['title'])));
                    if ($c_norm === $s_norm) {
                        $course_id = (int)$c['id'];
                        break;
                    }
                }
            }
        } catch (Exception $e) {
            // No interrumpir flujo, seguiremos validando course_id más abajo
        }
    }

    // En el proyecto PHP inicial, inscripciones usan status: pending/confirmed/completed
    $valid = ['pending','confirmed','completed'];
    if (!in_array($payment_status, $valid, true)) {
        $payment_status = 'pending';
    }

    $client_id = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;

    if (!$course_id) {
        jsonResponse(400, ['success'=>false, 'message'=>'course_id requerido']);
    }

    // Soportar cupos_disponibles si existe; si no, igual se inserta
    try {
        // insertar
        $insert = $pdo->prepare('INSERT INTO registrations (client_id, course_id, course_price, status, registration_date) VALUES (?, ?, ?, ?, NOW())');
        // Si client_id es NULL, pasar NULL para permitir inscripciones anónimas
        $insert->execute([$client_id, $course_id, $course_price, $payment_status]);
        $id = $pdo->lastInsertId();

        // intentar descontar cupos_disponibles si la columna existe
        try {
            $pdo->query('SELECT cupos_disponibles FROM courses LIMIT 1');
            $upd = $pdo->prepare('UPDATE courses SET cupos_disponibles = GREATEST(cupos_disponibles - 1, 0) WHERE id = ?');
            $upd->execute([$course_id]);
        } catch (Exception $ignore) {
            // columna no existe, no hacemos nada
        }

        // Si se crea con estado 'completed', emitir certificado automáticamente
        if ($payment_status === 'completed' && $client_id) {
            $certificateIssued = emitCertificate($client_id, $course_id, $id);
            
            if (!$certificateIssued) {
                error_log('Error al emitir certificado para la inscripción ' . $id);
            }
        }

        // Respuesta consistente con advisory-registration.php (data.id)
        echo json_encode(['success'=>true, 'data'=>['id'=>$id]]);
    } catch (PDOException $e) {
        // por ejemplo: curso/foreign key inválido
        jsonResponse(500, ['success'=>false, 'message'=>'Error al crear inscripción: '.$e->getMessage()]);
    }

    exit;
}

// PUT: actualizar estado inscripción (admin) o subir comprobante (user)
if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data || !isset($data['id'])) {
        jsonResponse(400, ['success'=>false, 'message'=>'Datos incompletos']);
    }

    $id = (int)$data['id'];

    // Si viene payment_receipt (base64), el usuario está subiendo su comprobante
    if (isset($data['payment_receipt'])) {
        $receipt = trim($data['payment_receipt']);
        $payment_method = isset($data['payment_method']) ? trim($data['payment_method']) : null;
        
        // Validar método de pago si se proporciona
        if ($payment_method && !in_array($payment_method, ['nequi', 'bancolombia', 'daviplata', 'nu'])) {
            jsonResponse(400, ['success'=>false, 'message'=>'Método de pago no válido']);
        }
        
        if (!empty($receipt)) {
            try {
                try {
                    $pdo->exec('ALTER TABLE registrations MODIFY COLUMN payment_receipt LONGTEXT');
                } catch (Exception $e) {
                    // Ignorar si ya está adaptado o si la tabla aún no existe.
                }

                // Actualizar con método de pago si se proporciona
                if ($payment_method) {
                    $stmt = $pdo->prepare('UPDATE registrations SET payment_receipt = ?, payment_status = ?, payment_method = ? WHERE id = ?');
                    $stmt->execute([$receipt, 'paid', $payment_method, $id]);
                } else {
                    $stmt = $pdo->prepare('UPDATE registrations SET payment_receipt = ?, payment_status = ? WHERE id = ?');
                    $stmt->execute([$receipt, 'paid', $id]);
                }
                
                echo json_encode(['success'=>true, 'message'=>'Comprobante recibido, en espera de verificación']);
            } catch (PDOException $e) {
                jsonResponse(500, ['success'=>false, 'message'=>'Error al guardar comprobante']);
            }
            exit;
        }
    }

    // Admin: actualizar estado de inscripción
    requireSessionAdmin();

    if (!isset($data['status'])) {
        jsonResponse(400, ['success'=>false, 'message'=>'Datos incompletos']);
    }

    $status = trim($data['status']);
    $valid = ['pending','confirmed','completed'];
    if (!in_array($status, $valid, true)) {
        jsonResponse(400, ['success'=>false, 'message'=>'status inválido']);
    }

    try {
        // Si se está cambiando a estado 'completed', emitir certificado
        if ($status === 'completed') {
            // Primero obtenemos los datos de la inscripción antes de actualizar
            $regStmt = $pdo->prepare('SELECT client_id, course_id FROM registrations WHERE id = ?');
            $regStmt->execute([$id]);
            $registration = $regStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($registration && $registration['client_id'] && $registration['course_id']) {
                $stmt = $pdo->prepare('UPDATE registrations SET status = ? WHERE id = ?');
                $stmt->execute([$status, $id]);
                
                // Emitir certificado automáticamente
                $certificateIssued = emitCertificate($registration['client_id'], $registration['course_id'], $id);
                
                if (!$certificateIssued) {
                    error_log('Error al emitir certificado para la inscripción ' . $id);
                }
                
                echo json_encode(['success'=>true]);
                exit;
            }
        }
        
        $stmt = $pdo->prepare('UPDATE registrations SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);
        echo json_encode(['success'=>true]);
    } catch (PDOException $e) {
        jsonResponse(500, ['success'=>false, 'message'=>'Error al actualizar inscripción: '.$e->getMessage()]);
    }
    exit;
}

// DELETE: cancelar inscripción (admin) => status CANCELADA no existe en schema (en registrations es pending/confirmed/completed)
// Para no romper esquema, mapeamos a 'pending' y/o simplemente 'pending'.
if ($method === 'DELETE') {
    requireSessionAdmin();

    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data || !isset($data['id'])) {
        jsonResponse(400, ['success'=>false, 'message'=>'id requerido']);
    }

    $id = (int)$data['id'];

    try {
        $stmt = $pdo->prepare('UPDATE registrations SET status = ? WHERE id = ?');
        // Cancelar => pending (proyecto actual no tiene CANCELADA en registrations)
        $stmt->execute(['pending', $id]);
        echo json_encode(['success'=>true]);
    } catch (PDOException $e) {
        jsonResponse(500, ['success'=>false, 'message'=>'Error al cancelar inscripción: '.$e->getMessage()]);
    }
    exit;
}

jsonResponse(405, ['success'=>false, 'message'=>'Método no permitido']);
