<?php
require_once __DIR__ . '/backend/config.php';

header('Content-Type: application/json');

$stmt = $pdo->query("SELECT * FROM courses ORDER BY created_at DESC");
$courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'success' => true,
    'data' => $courses
], JSON_PRETTY_PRINT);
?>