<?php
echo "=== DIAGNÓSTICO DEL SISTEMA ===\n\n";

echo "1. PHP CLI Information:\n";
echo "   - PHP Version: " . phpversion() . "\n";
echo "   - Loaded ini: " . (php_ini_loaded_file() ?: "NONE (CLI uses default)") . "\n";
echo "   - Extension dir: " . ini_get('extension_dir') . "\n\n";

echo "2. Extensiones Disponibles en PHP CLI:\n";
$extensions = get_loaded_extensions();
$dbExtensions = array_filter($extensions, function($e) {
    return strpos(strtolower($e), 'mysql') !== false || 
           strpos(strtolower($e), 'pdo') !== false ||
           strpos(strtolower($e), 'sqlite') !== false;
});
if (empty($dbExtensions)) {
    echo "   ❌ NO hay extensiones de base de datos disponibles\n";
} else {
    foreach ($dbExtensions as $ext) {
        echo "   ✓ $ext\n";
    }
}
echo "\n";

echo "3. SOLUCIONES RECOMENDADAS:\n\n";

echo "⭐ OPCIÓN A: Usar Apache + PHP de XAMPP (MEJOR)\n";
echo "   ✓ Las extensiones MySQL ya están configuradas en Apache\n";
echo "   ✓ Pasos:\n";
echo "     1. Abrir XAMPP Control Panel\n";
echo "     2. Hacer click en 'Start' para Apache\n";
echo "     3. Ir a: http://localhost/\n";
echo "     4. Ejecutar: http://localhost/backend/init_db.php\n";
echo "     5. Probar login: http://localhost/views/registro.html\n\n";

echo "OPCIÓN B: Usar el servidor PHP Built-in (para desarrollo)\n";
echo "   php -S localhost:8000 -t .\n";
echo "   ⚠️ Pero necesitarías MySQLi/PDO funcionando (mismo problema)\n\n";

echo "OPCIÓN C: Instalar extensiones en PHP CLI\n";
echo "   ✓ Requiere reinstalar XAMPP o configurar extensiones\n";
echo "   ✓ Más complicado\n\n";

?>

