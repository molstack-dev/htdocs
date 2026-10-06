<?php
require_once __DIR__ . '/backend/config.php';

// Actualizar precios de cursos existentes
$updates = [
    'Cata de Cacao' => 50000,
    'Pastelería de Vanguardia' => 150000,
    'Bombonería' => 95000,
    'Asesoría Personal' => 80000,
    'Asesoría para Negocio' => 150000,
];

$stmt = $pdo->prepare("UPDATE courses SET price = ? WHERE title = ?");
foreach ($updates as $title => $price) {
    $stmt->execute([$price, $title]);
    echo "Updated: $title = $price\n";
}

// Verificar
$stmt = $pdo->query("SELECT id, title, price, category FROM courses ORDER BY id");
$courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "\n=== Cursos en BD ===\n";
foreach ($courses as $c) {
    echo "ID: {$c['id']} | {$c['title']} | Price: {$c['price']} | Category: {$c['category']}\n";
}
?>