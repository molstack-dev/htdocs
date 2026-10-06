<?php
require __DIR__ . '/backend/config.php';
$tables = ['users', 'courses', 'registrations', 'clients'];

foreach ($tables as $table) {
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM $table");
        $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        echo "Tabla $table: $count registros\n";
    } catch (Exception $e) {
        echo "Tabla $table: Error - " . $e->getMessage() . "\n";
    }
}
?>