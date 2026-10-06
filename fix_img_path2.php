<?php
require_once __DIR__ . '/backend/config.php';

$conn = $mysqli;
$conn->query("UPDATE courses SET image = REPLACE(image, '../img/', '../../img/') WHERE image LIKE '../img/%'");

$result = $conn->query("SELECT id, title, image FROM courses");
while ($row = $result->fetch_assoc()) {
    echo "{$row['id']}: {$row['image']}\n";
}
$conn->close();
echo "Listo";
?>