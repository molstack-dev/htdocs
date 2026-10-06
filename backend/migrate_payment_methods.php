<?php
// migrate_payment_methods.php - Script para migrar la columna de métodos de pago a tablas existentes

require_once __DIR__ . '/config.php';

try {
    // Verificar si la columna payment_method ya existe en la tabla registrations
    $regCols = $pdo->query("SHOW COLUMNS FROM registrations")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('payment_method', $regCols)) {
        echo "Agregando columna payment_method a la tabla registrations...\n";
        $pdo->exec("ALTER TABLE registrations ADD COLUMN payment_method ENUM('nequi', 'bancolombia', 'daviplata', 'nu')");
        echo "Columna payment_method agregada a registrations.\n";
    } else {
        echo "La columna payment_method ya existe en registrations.\n";
    }

    // Verificar si la columna payment_method ya existe en la tabla advisories
    $advCols = $pdo->query("SHOW COLUMNS FROM advisories")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('payment_method', $advCols)) {
        echo "Agregando columna payment_method a la tabla advisories...\n";
        $pdo->exec("ALTER TABLE advisories ADD COLUMN payment_method ENUM('nequi', 'bancolombia', 'daviplata', 'nu')");
        echo "Columna payment_method agregada a advisories.\n";
    } else {
        echo "La columna payment_method ya existe en advisories.\n";
    }

    echo "Migración completada exitosamente.\n";
} catch (Exception $e) {
    echo "Error durante la migración: " . $e->getMessage() . "\n";
}
?>