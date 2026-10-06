<?php
// migrate_course_content.php - Ejecutar migración de course_content
// Solo necesita ejecutarse una vez

require_once __DIR__ . '/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Verificar admin
if (!isset($_SESSION['user_id'])) {
    die('Solo admin puede ejecutar migraciones');
}

$stmt = $pdo->prepare('SELECT role FROM users WHERE id = ?');
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();
if (!$user || $user['role'] !== 'admin') {
    die('Solo admin puede ejecutar migraciones');
}

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS course_content (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            content_type VARCHAR(50) DEFAULT 'video',
            video_url TEXT NOT NULL,

            duration VARCHAR(20),
            order_index INT DEFAULT 0,
            is_active INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            INDEX idx_course_content_course (course_id),
            INDEX idx_course_content_order (course_id, order_index)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    echo 'Tabla course_content creada correctamente';
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage();
}
?>
