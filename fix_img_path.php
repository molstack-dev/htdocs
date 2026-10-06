<?php
require_once __DIR__ . '/backend/config.php';

$conn = $mysqli;
$conn->query("UPDATE courses SET image = CONCAT('../', image) WHERE image LIKE 'img/%'");

echo "Rutas corregidas a '../img/...'\n";
$result = $conn->query("SELECT id, title, image FROM courses");
while ($row = $result->fetch_assoc()) {
    echo "ID {$row['id']}: {$row['image']}\n";
}

$conn->close();
?>