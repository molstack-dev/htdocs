<?php
// migrate_refunds_admin_receipt.php - Migrar el campo admin_receipt a LONGTEXT
require_once __DIR__ . '/config.php';

echo "Iniciando migración de campo admin_receipt a LONGTEXT...\n";

try {
    // Verificar si la tabla refunds existe
    $checkTable = $pdo->prepare("SHOW TABLES LIKE 'refunds'");
    $checkTable->execute();
    
    if ($checkTable->rowCount() == 0) {
        echo "La tabla refunds no existe. No se requiere migración.\n";
        exit(0);
    }
    
    // Verificar si la columna admin_receipt existe
    $checkColumn = $pdo->prepare("SHOW COLUMNS FROM refunds LIKE 'admin_receipt'");
    $checkColumn->execute();
    
    if ($checkColumn->rowCount() == 0) {
        echo "La columna admin_receipt no existe. No se requiere migración.\n";
        exit(0);
    }
    
    // Verificar el tipo actual de la columna
    $columnInfo = $checkColumn->fetch(PDO::FETCH_ASSOC);
    $currentType = strtoupper($columnInfo['Type']);
    
    if ($currentType === 'LONGTEXT') {
        echo "La columna admin_receipt ya es de tipo LONGTEXT. No se requiere migración.\n";
        exit(0);
    }
    
    echo "Tipo actual de admin_receipt: $currentType\n";
    echo "Modificando la columna a LONGTEXT...\n";
    
    // Modificar la columna a LONGTEXT
    $alterStmt = $pdo->prepare("ALTER TABLE refunds MODIFY COLUMN admin_receipt LONGTEXT NULL");
    $alterStmt->execute();
    
    echo "¡Migración completada exitosamente!\n";
    echo "La columna admin_receipt ahora es de tipo LONGTEXT.\n";
    
} catch (Exception $e) {
    echo "Error durante la migración: " . $e->getMessage() . "\n";
    exit(1);
}
?>