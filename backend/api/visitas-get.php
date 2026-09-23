<?php
require_once '../cors.php';
header('Content-Type: application/json; charset=utf-8');

// El modelo actual no registra visitas. Se conserva una respuesta estable para
// instalaciones que aún consultan esta ruta, sin depender de una tabla obsoleta.
echo json_encode([
    'success' => true,
    'data' => [],
    'message' => 'El registro de visitas ya no forma parte del sistema actual.',
]);
?>
