<?php
// init_db.php - Inicializar la base de datos MySQL con todas las tablas

require_once 'config.php';

try {
    // Este inicializador es seguro de ejecutar más de una vez: crea y migra
    // tablas sin borrar usuarios, cursos, ventas ni demás información existente.

    // Parche determinista: asegurar esquema de refunds (aunque la tabla ya exista)
    try {
        $refundCols = $pdo->query("SHOW COLUMNS FROM refunds")->fetchAll(PDO::FETCH_COLUMN);
        if ($refundCols && !in_array('admin_receipt', $refundCols, true)) {
            $pdo->exec("ALTER TABLE refunds ADD COLUMN admin_receipt TEXT NULL");
        }
        if ($refundCols && in_array('admin_receipt', $refundCols, true)) {
            $pdo->exec("ALTER TABLE refunds MODIFY COLUMN admin_receipt LONGTEXT NULL");
        }
        $hasRefundStatus = $refundCols && in_array('refund_status', $refundCols, true);
        if ($hasRefundStatus) {
            $pdo->exec("ALTER TABLE refunds MODIFY COLUMN refund_status ENUM('pending','approved','rejected') DEFAULT 'pending'");
        }
        if ($refundCols && in_array('type', $refundCols, true)) {
            // Conserva el tipo histórico "advisory" y habilita los tipos
            // específicos usados por los flujos actuales de reembolso.
            $pdo->exec("ALTER TABLE refunds MODIFY COLUMN type ENUM('registration','advisory','advisory_course','advisory_asesoria','advisory_evento') NOT NULL");
        }
    } catch (Exception $e) {
        // si refunds aún no existe, lo ignoramos
    }

    // Crear tabla de recuperación de contraseñas
    $pdo->exec("CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(64) NOT NULL,
        expires DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Crear tabla de usuarios
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL COMMENT 'Alias / Username',
        full_name VARCHAR(255) DEFAULT NULL COMMENT 'Nombre completo real',
        id_type ENUM('Tarjeta de Identidad','Cédula de Ciudadanía','Cédula de Extranjería','Permiso por Protección Temporal (PPT)','Pasaporte','Otro') DEFAULT 'Cédula de Ciudadanía' COMMENT 'Tipo de documento',
        id_number VARCHAR(50) DEFAULT NULL COMMENT 'Número de documento',
        custom_doc_type VARCHAR(255) DEFAULT NULL COMMENT 'Tipo de documento personalizado cuando id_type es Otro',
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','user') NOT NULL DEFAULT 'user',
        security_question VARCHAR(255),
        security_answer VARCHAR(255),
        notify_email BOOLEAN DEFAULT TRUE,
        notify_whatsapp BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Migraciones aditivas para bases creadas por versiones anteriores.
    // Cada una se aplica solamente si la columna aún no existe.
    $userCols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    $userColumnMigrations = [
        'full_name' => "ALTER TABLE users ADD COLUMN full_name VARCHAR(255) DEFAULT NULL COMMENT 'Nombre completo real' AFTER name",
        'id_type' => "ALTER TABLE users ADD COLUMN id_type ENUM('Tarjeta de Identidad','Cédula de Ciudadanía','Cédula de Extranjería','Permiso por Protección Temporal (PPT)','Pasaporte','Otro') DEFAULT 'Cédula de Ciudadanía' COMMENT 'Tipo de documento' AFTER full_name",
        'id_number' => "ALTER TABLE users ADD COLUMN id_number VARCHAR(50) DEFAULT NULL COMMENT 'Número de documento' AFTER id_type",
        'custom_doc_type' => "ALTER TABLE users ADD COLUMN custom_doc_type VARCHAR(255) DEFAULT NULL COMMENT 'Tipo de documento personalizado cuando id_type es Otro' AFTER id_number",
        'phone' => "ALTER TABLE users ADD COLUMN phone VARCHAR(20) NOT NULL DEFAULT '' AFTER email",
        'security_question' => "ALTER TABLE users ADD COLUMN security_question VARCHAR(255) DEFAULT NULL AFTER role",
        'security_answer' => "ALTER TABLE users ADD COLUMN security_answer VARCHAR(255) DEFAULT NULL AFTER security_question",
        'notify_email' => "ALTER TABLE users ADD COLUMN notify_email BOOLEAN DEFAULT TRUE AFTER security_answer",
        'notify_whatsapp' => "ALTER TABLE users ADD COLUMN notify_whatsapp BOOLEAN DEFAULT FALSE AFTER notify_email",
    ];
    foreach ($userColumnMigrations as $column => $sql) {
        if (!in_array($column, $userCols, true)) {
            $pdo->exec($sql);
        }
    }

    // Migración para usuarios existentes: copiar name a full_name si está vacío
    try {
        $pdo->exec("UPDATE users SET full_name = name WHERE full_name IS NULL OR full_name = ''");
    } catch (Exception $e) {
        // Ignorar si la columna aún no existe
    }

    // Migración: agregar custom_doc_type a users si no existe (compatibilidad)
    $userCols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('custom_doc_type', $userCols)) {
        try {
            $pdo->exec("ALTER TABLE users ADD COLUMN custom_doc_type VARCHAR(255) DEFAULT NULL COMMENT 'Tipo de documento personalizado cuando id_type es Otro'");
        } catch (Exception $e) {
            // Ignorar si ya existe
        }
    }

    // Agregar columnas de notificación si no existen (para compatibilidad)
    $userCols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('notify_email', $userCols)) {
        try { $pdo->exec("ALTER TABLE users ADD COLUMN notify_email BOOLEAN DEFAULT TRUE"); } catch (Exception $e) {}
    }
    if (!in_array('notify_whatsapp', $userCols)) {
        try { $pdo->exec("ALTER TABLE users ADD COLUMN notify_whatsapp BOOLEAN DEFAULT FALSE"); } catch (Exception $e) {}
    }

    // Crear tabla de cursos
    $pdo->exec("CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        description_detail TEXT,
        price DECIMAL(10, 2) NOT NULL,
        duration VARCHAR(100),
        category VARCHAR(100),
        event_date DATE NULL,
        image MEDIUMTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Crear tabla de registros
    $pdo->exec("CREATE TABLE IF NOT EXISTS registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT,
        course_id INT,
        course_price DECIMAL(10,2),
        status ENUM('pending', 'confirmed', 'completed') DEFAULT 'pending',
        payment_status ENUM('pending', 'paid', 'rejected', 'refund_requested', 'refunded') DEFAULT 'pending',
        payment_receipt TEXT NOT NULL,
        payment_date DATETIME,
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Crear tabla de certificados
    $pdo->exec("CREATE TABLE IF NOT EXISTS certificates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NULL,
        registration_id INT,
        advisory_id INT NULL,
        service_type ENUM('curso','asesoria','evento') DEFAULT 'curso',
        holder_name VARCHAR(255) NULL,
        holder_id_type VARCHAR(255) NULL,
        holder_id_number VARCHAR(100) NULL,
        is_group BOOLEAN DEFAULT FALSE,
        certificate_number VARCHAR(50) UNIQUE NOT NULL,
        issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiry_date DATE NULL,
        is_valid BOOLEAN DEFAULT TRUE,
        pdf_path VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE SET NULL,
        INDEX idx_user_certificate (user_id),
        INDEX idx_course_certificate (course_id),
        INDEX idx_certificate_number (certificate_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Compatibilidad de certificados con cursos automáticos, asesorías,
    // eventos y compras grupales. Las columnas nuevas son opcionales para no
    // alterar los certificados emitidos por versiones anteriores.
    $certificateCols = $pdo->query("SHOW COLUMNS FROM certificates")->fetchAll(PDO::FETCH_COLUMN);
    $certificateMigrations = [
        'advisory_id' => "ALTER TABLE certificates ADD COLUMN advisory_id INT NULL AFTER registration_id",
        'service_type' => "ALTER TABLE certificates ADD COLUMN service_type ENUM('curso','asesoria','evento') DEFAULT 'curso' AFTER advisory_id",
        'holder_name' => "ALTER TABLE certificates ADD COLUMN holder_name VARCHAR(255) NULL AFTER service_type",
        'holder_id_type' => "ALTER TABLE certificates ADD COLUMN holder_id_type VARCHAR(255) NULL AFTER holder_name",
        'holder_id_number' => "ALTER TABLE certificates ADD COLUMN holder_id_number VARCHAR(100) NULL AFTER holder_id_type",
        'is_group' => "ALTER TABLE certificates ADD COLUMN is_group BOOLEAN DEFAULT FALSE AFTER holder_id_number",
    ];
    foreach ($certificateMigrations as $column => $sql) {
        if (!in_array($column, $certificateCols, true)) {
            $pdo->exec($sql);
        }
    }
    $pdo->exec("ALTER TABLE certificates MODIFY COLUMN course_id INT NULL");

    // Crear tabla de asesorías
    $pdo->exec("CREATE TABLE IF NOT EXISTS advisories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        service_type ENUM('asesoria', 'curso', 'evento') NOT NULL DEFAULT 'asesoria',
        advisory_type VARCHAR(50),
        advisory_service VARCHAR(255),
        advisory_mode VARCHAR(50),
        event_name VARCHAR(255),
        date DATE NULL,
        time TIME,
        notes TEXT,
        status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
        price DECIMAL(10, 2),
        num_persons INT DEFAULT 1,
        payment_status ENUM('pending', 'paid', 'rejected', 'refund_requested', 'refunded') DEFAULT 'pending',
        payment_receipt LONGTEXT,
        payment_date DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Agregar columnas nuevas si no existen
    $advisoryCols = $pdo->query("SHOW COLUMNS FROM advisories")->fetchAll(PDO::FETCH_COLUMN);
    $advisoryColMap = [
        'service_type' => "ALTER TABLE advisories ADD COLUMN service_type ENUM('asesoria', 'curso', 'evento') NOT NULL DEFAULT 'asesoria'",
        'advisory_type' => "ALTER TABLE advisories ADD COLUMN advisory_type VARCHAR(50)",
        'advisory_service' => "ALTER TABLE advisories ADD COLUMN advisory_service VARCHAR(255)",
        'advisory_mode' => "ALTER TABLE advisories ADD COLUMN advisory_mode VARCHAR(50)",
        'event_name' => "ALTER TABLE advisories ADD COLUMN event_name VARCHAR(255)",
        'payment_status' => "ALTER TABLE advisories ADD COLUMN payment_status ENUM('pending', 'paid', 'rejected', 'refund_requested', 'refunded') DEFAULT 'pending'",
        'payment_date' => "ALTER TABLE advisories ADD COLUMN payment_date DATETIME",
        'num_persons' => "ALTER TABLE advisories ADD COLUMN num_persons INT DEFAULT 1",
        'payment_method' => "ALTER TABLE advisories ADD COLUMN payment_method ENUM('nequi', 'bancolombia', 'daviplata', 'nu')",
    ];
    foreach ($advisoryColMap as $col => $sql) {
        if (!in_array($col, $advisoryCols)) {
            try { $pdo->exec($sql); } catch (Exception $e) {}
        }
    }
    if (!in_array('payment_receipt', $advisoryCols)) {
        try { $pdo->exec("ALTER TABLE advisories ADD COLUMN payment_receipt LONGTEXT"); } catch (Exception $e) {}
    } else {
        try { $pdo->exec("ALTER TABLE advisories MODIFY COLUMN payment_receipt LONGTEXT"); } catch (Exception $e) {}
    }

    // Agregar columnas de pago a registrations si no existen
    $regCols = $pdo->query("SHOW COLUMNS FROM registrations")->fetchAll(PDO::FETCH_COLUMN);
    $regColMap = [
        'payment_status' => "ALTER TABLE registrations ADD COLUMN payment_status ENUM('pending', 'paid', 'rejected', 'refund_requested', 'refunded') DEFAULT 'pending'",
        'payment_date' => "ALTER TABLE registrations ADD COLUMN payment_date DATETIME",
        'course_price' => "ALTER TABLE registrations ADD COLUMN course_price DECIMAL(10,2)",
        'payment_method' => "ALTER TABLE registrations ADD COLUMN payment_method ENUM('nequi', 'bancolombia', 'daviplata', 'nu')",
    ];
    foreach ($regColMap as $col => $sql) {
        if (!in_array($col, $regCols)) {
            try { $pdo->exec($sql); } catch (Exception $e) {}
        }
    }
    if (!in_array('payment_receipt', $regCols)) {
        try { $pdo->exec("ALTER TABLE registrations ADD COLUMN payment_receipt LONGTEXT"); } catch (Exception $e) {}
    } else {
        try { $pdo->exec("ALTER TABLE registrations MODIFY COLUMN payment_receipt LONGTEXT"); } catch (Exception $e) {}
    }

    // Crear tabla de reservas
    $pdo->exec("CREATE TABLE IF NOT EXISTS reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        id_type VARCHAR(50),
        id_number VARCHAR(100),
        reservation_type ENUM('curso', 'asesoria', 'evento') NOT NULL,
        course_id INT,
        advisory_id INT,
        event_id INT,
        date DATE NOT NULL,
        time TIME,
        notes TEXT,
        status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Tabla de reembolsos
    $pdo->exec("CREATE TABLE IF NOT EXISTS refunds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('registration','advisory','advisory_course','advisory_asesoria','advisory_evento') NOT NULL,
        refundable_id INT NOT NULL,
        service_title VARCHAR(255),
        service_name VARCHAR(255),
        amount DECIMAL(10,2),
        refund_status ENUM('pending','approved','rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME NULL,
        processed_by INT NULL,
        rejection_reason TEXT NULL,
        admin_receipt LONGTEXT NULL,
        INDEX idx_refund_status (refund_status),
        INDEX idx_refund_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Crear tabla de contenido de cursos
    $pdo->exec("CREATE TABLE IF NOT EXISTS course_content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content_type VARCHAR(50) DEFAULT 'video',
        video_url TEXT NOT NULL,
        duration VARCHAR(20),
        order_index INT DEFAULT 0,
        is_active INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        INDEX idx_course_content_course (course_id),
        INDEX idx_course_content_order (course_id, order_index)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Progreso de lecciones: se crea durante la inicialización para que el
    // curso no dependa de una creación de tabla en la primera petición.
    $pdo->exec("CREATE TABLE IF NOT EXISTS content_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        content_id INT NOT NULL,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY user_content_unique (user_id, course_id, content_id),
        INDEX idx_user_course (user_id, course_id),
        INDEX idx_content (course_id, content_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Tabla seed_meta
    $pdo->exec("CREATE TABLE IF NOT EXISTS seed_meta (
        `key` VARCHAR(100) PRIMARY KEY,
        `value` VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Agregar datos de ejemplo únicamente en tablas vacías. Nunca se borran ni
    // duplican los datos existentes de una instalación en uso.
    $usersCount = (int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $coursesCount = (int) $pdo->query("SELECT COUNT(*) FROM courses")->fetchColumn();
    $shouldSeedUsers = $usersCount === 0;
    $shouldSeedCourses = $coursesCount === 0;

    if ($shouldSeedUsers) {
    // Insertar usuarios de prueba
    $hashedPassword = password_hash('Admin@2026', PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (name, full_name, id_type, id_number, email, phone, password, role, security_question, security_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute(['Jonathan', 'jonathan buitrago', 'Cédula de Ciudadanía', '59384702', 'admin@chefjonathan.com', '3220000000', $hashedPassword, 'admin', '¿Cuál es tu postre favorito?', 'torta de chocolate']);

    $hashedPassword2 = password_hash('User@2026', PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (name, full_name, id_type, id_number, email, phone, password, role, security_question, security_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute(['Edwin', 'edwin alexander molina sanabria', 'Tarjeta de Identidad', '1032682086', 'edwinalex8712@gmail.com', '3508085470', $hashedPassword2, 'user', '¿Cuál es el nombre de tu primera mascota?', 'max']);
    }

    if ($shouldSeedCourses) {
    // Insertar cursos
    $img1Path = __DIR__ . '/../img/chef_jonathan_buitrago_post_12_5_2024_10_07_303366402308080947431.jpg';
    $img2Path = __DIR__ . '/../img/chef_jonathan_buitrago_post_12_9_2019_8_46_522131343889580551158.jpg';
    $img3Path = __DIR__ . '/../img/chef_jonathan_buitrago_post_29_12_2021_8_36_232739425447496136534.jpg';
    $img1 = file_exists($img1Path) ? base64_encode(file_get_contents($img1Path)) : null;
    $img2 = file_exists($img2Path) ? base64_encode(file_get_contents($img2Path)) : null;
    $img3 = file_exists($img3Path) ? base64_encode(file_get_contents($img3Path)) : null;

    $courses = [
        ['Cata de Cacao', 'Descubre los sabores y aromas del cacao en una experiencia única.', 'Explora los secretos del cacao en una cata sensorial.', 50000, '2 horas', 'eventos', '2026-08-03', $img1],
        ['Pastelería de Vanguardia', 'Técnicas modernas para crear postres sorprendentes.', 'Domina las últimas tendencias de la pastelería mundial.', 150000, '10 semanas', 'asesorias', null, $img2],
        ['Bombonería', 'Elabora bombones artesanales con acabados profesionales.', 'Aprende a crear bombones de chocolate con rellenos sofisticados.', 95000, '6 semanas', 'cursos', null, $img3],
    ];

    $stmt = $pdo->prepare("INSERT INTO courses (title, description, description_detail, price, duration, category, event_date, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($courses as $course) {
        $stmt->execute($course);
    }
    }

    // El contenido inicial se enlaza al curso por su título, nunca por una ID
    // fija que puede cambiar entre instalaciones.
    $bomboneria = $pdo->prepare("SELECT id FROM courses WHERE title = ? LIMIT 1");
    $bomboneria->execute(['Bombonería']);
    $bomboneriaId = $bomboneria->fetchColumn();
    $contentCount = (int) $pdo->query("SELECT COUNT(*) FROM course_content")->fetchColumn();
    if ($bomboneriaId && $contentCount === 0) {
        $contentVideos = [
            ['title' => 'Introducción a la Bombonería', 'description' => 'Aprende los fundamentos de la bombonería artesanal', 'video_url' => 'https://youtu.be/WHGVasGardA', 'duration' => '15 min', 'order_index' => 1],
            ['title' => 'Técnicas de Templado', 'description' => 'Domina el arte del templado del chocolate', 'video_url' => 'https://youtu.be/bRPpExRQaB4', 'duration' => '20 min', 'order_index' => 2]
        ];

        $stmtContent = $pdo->prepare("INSERT INTO course_content (course_id, title, description, video_url, duration, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)");
        foreach ($contentVideos as $video) {
            $stmtContent->execute([$bomboneriaId, $video['title'], $video['description'], $video['video_url'], $video['duration'], $video['order_index']]);
        }
    }

    if ($shouldSeedUsers || $shouldSeedCourses) {
        $pdo->prepare("INSERT INTO seed_meta (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE value=VALUES(value)")->execute(['initial_seed_done', '1']);
    }

    echo ($shouldSeedUsers || $shouldSeedCourses)
        ? "✓ Base de datos inicializada correctamente con datos de ejemplo.\n"
        : "✓ Esquema de base de datos verificado y actualizado sin modificar datos existentes.\n";

} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
