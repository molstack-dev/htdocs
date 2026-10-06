<?php
require_once __DIR__ . '/config.php';

try {
    // Modificar la columna date para permitir nulos
    $pdo->exec("ALTER TABLE advisories MODIFY COLUMN date DATE NULL");
    echo "✓ Columna 'date' modificada a nullable\n";
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}
?>