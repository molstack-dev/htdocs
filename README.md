# Chef Jonathan Buitrago — Sistema web (Local PHP/MySQL)

## Qué es
Plataforma web de ventas online para cursos y asesorías de pastelería.
- **Frontend:** HTML/CSS/JS (Tailwind)
- **Backend (local):** PHP + MySQL (XAMPP)
- **Estructura:** `views/`, `assets/`, `backend/`

> Importante: Funciona con **Apache + PHP de XAMPP** (no PHP CLI).

---

## Roles
- **Admin** - Panel de administración (usuarios, inscripciones, servicios)
- **User** - Panel de usuario (catálogo, perfil, inscripciones)

---

## Requisitos
1. **PHP 8.x**
2. **MySQL o MariaDB**
3. **Servidor web** (Apache/XAMPP o el servidor integrado de PHP)
4. Navegador.

### Extensiones PHP necesarias
Asegúrate de que estén instaladas y cargadas:
- `pdo`
- `pdo_mysql`
- `mysqli`
- `mysqlnd`

### Fedora / Linux
Si estás en Fedora o un sistema similar, instala lo siguiente:
```bash
sudo dnf install -y php php-cli php-pdo php-mysqlnd mariadb-server
```

Si quieres usar Apache además:
```bash
sudo dnf install -y httpd
sudo systemctl enable --now httpd mariadb
```

Comprueba que todo esté listo:
```bash
php -v
php -m | grep -Ei 'pdo|mysql|mysqli'
php /opt/lampp/htdocs/Chef-Jonathan-Buitrago/check_requirements.php
```
Si no ves `PDO`, `pdo_mysql` o `mysqlnd`, vuelve a instalar los paquetes anteriores.

### XAMPP (Linux/Windows)
Si usas XAMPP, comprueba que la versión de PHP de XAMPP tenga PDO/MySQL habilitado:
```bash
/opt/lampp/bin/php -m | grep -Ei 'pdo|mysql|mysqli'
```
Si no aparece nada, instala o reinstala los módulos de XAMPP o usa la versión de PHP del sistema con los paquetes de Fedora indicados arriba.

---

## Instalación / Inicialización (local)
### Opción 1: XAMPP (Windows o Linux)
- Inicia Apache y MySQL desde XAMPP.
- Abre:
  - `http://localhost/Chef-Jonathan-Buitrago/backend/init_db.php`
  - `http://localhost/Chef-Jonathan-Buitrago/backend/seed.php`
- Luego entra en:
  - `http://localhost/Chef-Jonathan-Buitrago/`

### Opción 2: PHP integrado (Linux/Fedora)
Desde la carpeta del proyecto:
```bash
php -S 0.0.0.0:8000
```
Y luego abre:
- `http://localhost:8000/`

### Paso 2: Inicializa la base de datos
Abre:
- `http://localhost/Chef-Jonathan-Buitrago/backend/init_db.php`

Deberías ver un mensaje ✓ de inicialización. Ese script ya crea tablas, usuarios y datos iniciales.

### Paso 3: Abre la app
- `http://localhost/Chef-Jonathan-Buitrago/` o `http://localhost:8000/`

---

## Credenciales de prueba
- **Admin**
  - Email: `admin@chefjonathan.com`
  - Password: `Admin@2026`
- **Usuario**
  - Email: `edwinalex8712@gmail.com`
  - Password: `User@2026`

---

## Estructura de vistas
```
views/
├── admin/
│   ├── admin.html          # Dashboard admin
│   ├── admin-usuarios.html # Gestión de usuarios
│   ├── admin-inscripciones.html # Gestión de inscripciones
│   └── admin-servicios.html # Gestión de servicios (cursos)
├── user/
│   ├── user.html           # Dashboard usuario
│   ├── perfil.html         # Perfil del usuario
│   ├── mis-servicios.html     # Cursos inscritos
│   ├── historial.html      # Historial
│   ├── certificados.html   # Certificados
│   └── agendar.html        # Agendar asesoría
├── catalogo.html           # Catálogo de cursos
├── registro.html           # Registro / Login
└── informacion.html        # Información
```

---

## Flujo de inscripción
### Catálogo (usuario)
En `views/catalogo.html` los cursos se renderizan desde:
- `assets/catalog-courses.js`

El botón **Inscribirse** abre modal con link a WhatsApp para confirmar pago.

### Admin — Inscripciones
Página:
- `views/admin/admin-inscripciones.html`

Formulario conectado a:
- `backend/api/inscripciones.php`

La acción **POST** inserta en la tabla:
- **`registrations`**

Archivo JS del formulario:
- `assets/admin-inscripciones-form.js`

---

## Endpoints backend
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/backend/api/register.php` | Registro de usuario |
| POST | `/backend/api/login.php` | Login |
| GET | `/backend/api/usuarios-get.php` | Listar usuarios |
| GET/POST/PUT/DELETE | `/backend/api/users.php` | CRUD usuarios |
| GET | `/backend/api/cursos-get.php` | Listar cursos |
| GET/POST/PUT/DELETE | `/backend/api/inscripciones.php` | CRUD inscripciones |
| POST | `/backend/api/profile-update.php` | Actualizar perfil |
| POST | `/backend/api/password-change.php` | Cambiar contraseña |
| POST | `/backend/api/advisory-registration.php` | Registrar asesoría |
| POST | `/backend/api/reservation-registration.php` | Registrar reserva |
| GET/POST/PUT/DELETE | `/backend/api/clients.php` | CRUD clientes |

---

## Notas de compatibilidad / fallos comunes
### No usar PHP CLI
Si ejecutas `php -S` sin Apache en XAMPP, pueden aparecer errores por falta de drivers (MySQLi/PDO).

### Consultar logs
Si algo falla:
- Consola del navegador (F12)
- Logs de XAMPP (`C:\xampp\apache\logs\error.log`)

---

## Últimos cambios
- **Eliminación de Seller:** El rol "vendedor" fue eliminado completamente. Solo existen admin/user.
- Modal de inscripción con WhatsApp para confirmar pago.
- Greeting name personalizado en dashboards.
