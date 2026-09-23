<?php
require_once '../cors.php';
header('Content-Type: application/json; charset=utf-8');

// Los vendedores y comisiones se retiraron del modelo de negocio actual.
echo json_encode([
    'success' => true,
    'data' => [],
    'message' => 'El módulo de comisiones no está habilitado en esta versión.',
]);
?>
