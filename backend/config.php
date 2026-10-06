<?php
// Configuración centralizada de MySQL para local XAMPP y producción InfinityFree.
// Nunca uses credenciales reales en el repositorio; en producción queda el placeholder.
define('BASE_PATH', dirname(__DIR__));

function is_local_environment(): bool {
    $serverName = strtolower($_SERVER['SERVER_NAME'] ?? $_SERVER['HTTP_HOST'] ?? '');
    return $serverName === '' || $serverName === 'localhost' || $serverName === '127.0.0.1' || strpos($serverName, 'localhost') !== false;
}

define('APP_ENV_LOCAL', is_local_environment());

function get_db_config(): array {
    if (APP_ENV_LOCAL) {
        return [
            'host' => '127.0.0.1',
            'port' => 3306,
            'user' => 'root',
            'pass' => '',
            'name' => 'if0_43089123_chef_jonathan',
            'charset' => 'utf8mb4',
        ];
    }

    return [
        'host' => 'sql211.infinityfree.com',
        'port' => 3306,
        'user' => 'if0_43089123',
        'pass' => 'molstack2026',
        'name' => 'if0_43089123_chef_jonathan',
        'charset' => 'utf8mb4',
    ];
}

$db_config = get_db_config();
$db_host = $db_config['host'];
$db_user = $db_config['user'];
$db_pass = $db_config['pass'];
$db_name = $db_config['name'];
$db_port = $db_config['port'];
$db_charset = $db_config['charset'];

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name, $db_port);
    $mysqli->set_charset($db_charset);
} catch (Throwable $e) {
    error_log('MySQL connection failed: ' . $e->getMessage());

    if (APP_ENV_LOCAL) {
        throw $e;
    }

    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }

    echo json_encode([
        'success' => false,
        'message' => 'No se pudo conectar a la base de datos.'
    ]);
    exit;
}

$db_options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $dsn = "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset={$db_charset}";
    $pdo = new PDO($dsn, $db_user, $db_pass, $db_options);
} catch (Throwable $e) {
    error_log('PDO connection failed: ' . $e->getMessage());

    if (APP_ENV_LOCAL) {
        throw $e;
    }

    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }

    echo json_encode([
        'success' => false,
        'message' => 'La base de datos no está disponible en este momento.'
    ]);
    exit;
}
?>
