<?php
// add_custom_doc_type_column.php - Add custom_doc_type column to users table

require_once __DIR__ . '/config.php';

try {
    // Check if custom_doc_type column exists
    $columns = $pdo->query("SHOW COLUMNS FROM users LIKE 'custom_doc_type'")->fetchAll();
    
    if (empty($columns)) {
        // Add the custom_doc_type column
        $pdo->exec("ALTER TABLE users ADD COLUMN custom_doc_type VARCHAR(255) DEFAULT NULL COMMENT 'Custom document type when id_type is Otro'");
        echo "Column 'custom_doc_type' added to 'users' table successfully.\n";
    } else {
        echo "Column 'custom_doc_type' already exists in 'users' table.\n";
    }
    
    // Also add to reservations table if needed
    $reservationColumns = $pdo->query("SHOW COLUMNS FROM reservations LIKE 'custom_doc_type'")->fetchAll();
    
    if (empty($reservationColumns)) {
        $pdo->exec("ALTER TABLE reservations ADD COLUMN custom_doc_type VARCHAR(255) DEFAULT NULL COMMENT 'Custom document type when id_type is Otro'");
        echo "Column 'custom_doc_type' added to 'reservations' table successfully.\n";
    } else {
        echo "Column 'custom_doc_type' already exists in 'reservations' table.\n";
    }

    echo "Migration completed successfully!\n";
} catch (Exception $e) {
    echo "Error during migration: " . $e->getMessage() . "\n";
}
?>