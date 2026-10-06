<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config.php';

try {
    $stmt = $pdo->query("SELECT r.id, u.name AS user_name, u.email AS user_email, c.title AS course_title, r.course_price, r.status, r.payment_status, r.payment_receipt, r.payment_date, r.payment_method, r.registration_date
        FROM registrations r
        JOIN users u ON r.client_id = u.id
        JOIN courses c ON r.course_id = c.id
        ORDER BY r.registration_date DESC");
    $inscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $inscriptions
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener inscripciones'
    ]);
}
?>