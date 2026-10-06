<?php
require_once __DIR__ . '/backend/config.php';

$conn = $mysqli;
echo "Conectando a $db_name...<br>";

// Corregir rutas de imagen
$conn->query("UPDATE courses SET image = REPLACE(image, 'img/', '../img/') WHERE image LIKE 'img/%'");

echo "Rutas actualizadas. Verificando:<br>";
$result = $conn->query("SELECT id, title, image FROM courses");
while ($row = $result->fetch_assoc()) {
    echo "ID {$row['id']}: {$row['title']}<br>";
    echo "&nbsp;&nbsp;Imagen: {$row['image']}<br>";
}

$conn->close();
echo "Listo!";
?>