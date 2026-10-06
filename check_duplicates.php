<?php
require_once __DIR__ . '/backend/config.php';

echo "Verificando duplicados en la base de datos...\n";

// Verificar duplicados en advisories
echo "\n--- Advisories ---\n";
$stmt = $pdo->prepare("
    SELECT a1.*, 
           (SELECT COUNT(*) FROM advisories a2 WHERE a2.user_id = a1.user_id AND a2.advisory_service = a1.advisory_service AND a2.price = a1.price AND a2.created_at = a1.created_at) as count
    FROM advisories a1
    WHERE (SELECT COUNT(*) FROM advisories a2 WHERE a2.user_id = a1.user_id AND a2.advisory_service = a1.advisory_service AND a2.price = a1.price AND a2.created_at = a1.created_at) > 1
    LIMIT 10
");
$stmt->execute();
$duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Duplicados en advisories: " . count($duplicates) . "\n";

// Verificar duplicados en registrations
echo "\n--- Registrations ---\n";
$stmt = $pdo->prepare("
    SELECT r1.*, c.title as course_title,
           (SELECT COUNT(*) FROM registrations r2 JOIN courses c2 ON r2.course_id = c2.id WHERE r2.client_id = r1.client_id AND c2.title = c.title AND r2.course_price = r1.course_price AND r2.registration_date = r1.registration_date) as count
    FROM registrations r1
    JOIN courses c ON r1.course_id = c.id
    WHERE (SELECT COUNT(*) FROM registrations r2 JOIN courses c2 ON r2.course_id = c2.id WHERE r2.client_id = r1.client_id AND c2.title = c.title AND r2.course_price = r1.course_price AND r2.registration_date = r1.registration_date) > 1
    LIMIT 10
");
$stmt->execute();
$duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Duplicados en registrations: " . count($duplicates) . "\n";

// Verificar entradas relacionadas entre advisories y registrations
echo "\n--- Relación entre advisories y registrations (posible duplicación cruzada) ---\n";
$stmt = $pdo->prepare("
    SELECT a.id as advisory_id, a.advisory_service, a.price as advisory_price, a.created_at as advisory_created,
           r.id as registration_id, c.title as course_title, r.course_price, r.registration_date
    FROM advisories a
    JOIN registrations r ON a.user_id = r.client_id
    JOIN courses c ON r.course_id = c.id
    WHERE a.advisory_service = c.title
      AND a.price = r.course_price
      AND DATE(a.created_at) = DATE(r.registration_date)
      AND a.service_type = 'curso'
    LIMIT 10
");
$stmt->execute();
$crossRefs = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Coincidencias entre advisories (tipo curso) y registrations: " . count($crossRefs) . "\n";

foreach ($crossRefs as $cr) {
    echo "  Advisory: {$cr['advisory_id']} - '{$cr['advisory_service']}' - \${$cr['advisory_price']}\n";
    echo "  Registration: {$cr['registration_id']} - '{$cr['course_title']}' - \${$cr['course_price']}\n";
    echo "  Dates: {$cr['advisory_created']} vs {$cr['registration_date']}\n\n";
}

echo "Verificación completada.\n";
?>