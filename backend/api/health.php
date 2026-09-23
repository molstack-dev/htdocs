<?php
require_once '../cors.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../config.php';

// Estado público mínimo para diagnosticar la instalación desde el frontend.
// No expone credenciales, consultas ni datos de usuarios.
$requiredSchema = [
    'users' => ['id', 'name', 'full_name', 'id_type', 'id_number', 'custom_doc_type', 'email', 'phone', 'password', 'role'],
    'courses' => ['id', 'title', 'description', 'description_detail', 'price', 'duration', 'category', 'event_date', 'image'],
    'registrations' => ['id', 'client_id', 'course_id', 'course_price', 'status', 'payment_status', 'payment_receipt', 'payment_method'],
    'advisories' => ['id', 'user_id', 'service_type', 'status', 'payment_status', 'payment_receipt', 'payment_method', 'num_persons'],
    'refunds' => ['id', 'user_id', 'type', 'refundable_id', 'refund_status', 'admin_receipt'],
    'course_content' => ['id', 'course_id', 'title', 'content_type', 'video_url', 'is_active'],
    'certificates' => ['id', 'user_id', 'course_id', 'registration_id', 'certificate_number'],
    'content_progress' => ['id', 'user_id', 'course_id', 'content_id', 'completed_at'],
];
$requiredTables = array_keys($requiredSchema);

try {
    $placeholders = implode(',', array_fill(0, count($requiredTables), '?'));
    $statement = $pdo->prepare(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ({$placeholders})"
    );
    $statement->execute($requiredTables);
    $availableTables = $statement->fetchAll(PDO::FETCH_COLUMN);
    $missingTables = array_values(array_diff($requiredTables, $availableTables));

    if ($missingTables) {
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'code' => 'SCHEMA_INCOMPLETE',
            'message' => 'La base de datos está conectada, pero faltan tablas.',
            'missing_tables' => $missingTables,
        ]);
        exit;
    }

    $missingColumns = [];
    foreach ($requiredSchema as $table => $columns) {
        $tableColumns = $pdo->query("SHOW COLUMNS FROM `{$table}`")->fetchAll(PDO::FETCH_COLUMN);
        $absent = array_values(array_diff($columns, $tableColumns));
        if ($absent) {
            $missingColumns[$table] = $absent;
        }
    }
    if ($missingColumns) {
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'code' => 'SCHEMA_INCOMPLETE',
            'message' => 'La base de datos está conectada, pero faltan columnas requeridas.',
            'missing_columns' => $missingColumns,
        ]);
        exit;
    }

    $coursesCount = (int) $pdo->query('SELECT COUNT(*) FROM courses')->fetchColumn();
    echo json_encode([
        'success' => true,
        'database' => 'connected',
        'schema' => 'ready',
        'courses_count' => $coursesCount,
    ]);
} catch (Throwable $e) {
    http_response_code(503);
    echo json_encode([
        'success' => false,
        'code' => 'DATABASE_UNAVAILABLE',
        'message' => 'No fue posible verificar la base de datos.',
    ]);
}
