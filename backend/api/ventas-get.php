<?php
require_once '../cors.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../config.php';

try {
    // Las ventas actuales son inscripciones pagadas; sales ya no existe.
    $stmt = $pdo->query("
        SELECT 
            r.id,
            u.name AS client_name,
            co.title AS course_title,
            COALESCE(r.course_price, co.price) AS amount,
            r.registration_date AS date
        FROM registrations r
        JOIN users u ON r.client_id = u.id
        JOIN courses co ON r.course_id = co.id
        WHERE r.payment_status = 'paid'
        ORDER BY r.registration_date DESC
    ");
    $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $sales
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener ventas: ' . $e->getMessage()
    ]);
}
?>
