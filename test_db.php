<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/backend/config.php';

echo json_encode([
    'success' => true,
    'environment' => APP_ENV_LOCAL ? 'local' : 'production',
    'host' => $db_host,
    'user' => $db_user,
    'database' => $db_name,
    'charset' => $db_charset,
    'message' => 'Configuración de conexión centralizada cargada.'
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
