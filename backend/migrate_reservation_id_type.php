<?php
// migrate_reservation_id_type.php - Migrar la columna id_type en la tabla reservations para usar ENUM consistente

require_once __DIR__ . '/config.php';

try {
    // Verificar si la tabla reservations existe
    $stmt = $pdo->query("SHOW TABLES LIKE 'reservations'");
    if (!$stmt->rowCount()) {
        echo "La tabla reservations no existe, no se requiere migración\n";
        exit(0);
    }

    // Verificar si la columna id_type existe
    $stmt = $pdo->query("SHOW COLUMNS FROM reservations LIKE 'id_type'");
    if (!$stmt->rowCount()) {
        echo "La columna id_type no existe en reservations, no se requiere migración\n";
        exit(0);
    }

    // Obtener información actual de la columna id_type
    $columnInfo = $pdo->query("SHOW COLUMNS FROM reservations LIKE 'id_type'")->fetch(PDO::FETCH_ASSOC);

    // Verificar si la columna ya es del tipo ENUM correcto
    if (strpos($columnInfo['Type'], 'enum') !== false && strpos($columnInfo['Type'], 'Tarjeta de Identidad') !== false) {
        echo "La columna id_type ya tiene el tipo ENUM correcto\n";
        exit(0);
    }

    // Realizar la migración - cambiar a ENUM con las opciones correctas
    $pdo->exec("ALTER TABLE reservations MODIFY COLUMN id_type ENUM('Tarjeta de Identidad','Cédula de Ciudadanía','Cédula de Extranjería','Permiso por Protección Temporal (PPT)','Pasaporte','Otro')");

    echo "Migración completada: La columna id_type en la tabla reservations ahora usa ENUM con las opciones correctas\n";

} catch (Exception $e) {
    echo "Error durante la migración: " . $e->getMessage() . "\n";
    exit(1);
}
?>