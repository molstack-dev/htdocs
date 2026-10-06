<?php
require_once __DIR__ . '/backend/config.php';

$conn = $mysqli;
$result = $conn->query("SELECT id, title, image FROM courses");
echo "Cursos en BD:\n";
while ($row = $result->fetch_assoc()) {
    echo "ID {$row['id']}: {$row['title']}\n";
    echo "  Imagen: {$row['image']}\n";
}
$conn->close();
?>