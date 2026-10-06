<?php
require_once __DIR__ . '/config.php';

try {
    // Verificar si la columna ya existe
    $check = $pdo->query("SHOW COLUMNS FROM advisories LIKE 'num_persons'");
    if ($check->fetch()) {
        echo "La columna num_persons ya existe.\n";
    } else {
        // Agregar la columna
        $pdo->exec("ALTER TABLE advisories ADD COLUMN num_persons INT DEFAULT 1 AFTER price");
        echo "Columna num_persons agregada exitosamente.\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
