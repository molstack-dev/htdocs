<?php
// config.php - Configuración usando PDO (compatible con Windows/Linux/macOS)
//
// Soporta configuración por variables de entorno (getenv) y mantiene defaults
// para compatibilidad con tu setup actual (XAMPP local).

// Rutas (por ahora no se usa, pero queda listo si necesitas paths base)
// $BASE_DIR = __DIR__;


// MySQL / PDO (defaults actuales)
$db_host = getenv('DB_HOST') !== false ? getenv('DB_HOST') : '127.0.0.1';
$db_user = getenv('DB_USER') !== false ? getenv('DB_USER') : 'root';
$db_pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
$db_name = getenv('DB_NAME') !== false ? getenv('DB_NAME') : 'chef_jonathan';
$db_port = getenv('DB_PORT') !== false ? getenv('DB_PORT') : '3306';

// Solo el entorno local con root sin contraseña crea una BD inexistente.
// En hosting, DB_AUTO_CREATE=0 evita exigir el privilegio global CREATE DATABASE
// en cada petición de la API.
$db_auto_create = getenv('DB_AUTO_CREATE');
if ($db_auto_create === false) {
    $db_auto_create = ($db_host === '127.0.0.1' || $db_host === 'localhost') && $db_user === 'root' && $db_pass === '';
} else {
    $db_auto_create = filter_var($db_auto_create, FILTER_VALIDATE_BOOLEAN);
}

// Opcional: charset (por defecto utf8mb4)
$db_charset = getenv('DB_CHARSET') !== false ? getenv('DB_CHARSET') : 'utf8mb4';

// Opcional: collation
$db_collation = getenv('DB_COLLATION') !== false ? getenv('DB_COLLATION') : 'utf8mb4_unicode_ci';

// Opcional: driver/flags
$db_options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    // La API se conecta directamente a su BD. Así funciona con usuarios de
    // hosting que solo tienen permisos sobre esa BD, no privilegios globales.
    $databaseName = str_replace('`', '``', $db_name);
    $dsn = "mysql:host={$db_host};port={$db_port};dbname={$databaseName};charset={$db_charset}";

    try {
        $pdo = new PDO($dsn, $db_user, $db_pass, $db_options);
    } catch (PDOException $connectionError) {
        // En XAMPP local se mantiene la comodidad de crear una BD inexistente.
        // El esquema y los datos se crean de forma explícita desde init_db.php.
        if (!$db_auto_create || !str_contains($connectionError->getMessage(), 'Unknown database')) {
            throw $connectionError;
        }

        $serverDsn = "mysql:host={$db_host};port={$db_port};charset={$db_charset}";
        $serverPdo = new PDO($serverDsn, $db_user, $db_pass, $db_options);
        $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `{$databaseName}` CHARACTER SET {$db_charset} COLLATE {$db_collation}");
        $pdo = new PDO($dsn, $db_user, $db_pass, $db_options);
    }

} catch (Throwable $e) {
    // Si se consulta desde endpoints web, devolvemos JSON para que no reviente el frontend.
    // Si se usa desde CLI, igual se ve el error.
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode(["error" => "Error de conexión: " . $e->getMessage()]));
}
?>
