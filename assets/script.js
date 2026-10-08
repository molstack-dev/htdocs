// Conecta el frontend con la API PHP tanto en la raíz del dominio como dentro
// de una subcarpeta de XAMPP. La base se calcula desde este archivo, no desde
// el nombre del proyecto, para que también funcione si se renombra la carpeta.
(function() {
    function getProjectBase() {
        var script = document.currentScript;

        // document.currentScript no está disponible en algunos navegadores
        // cuando el código se ejecuta desde un bundle, por eso se deja un
        // respaldo que localiza el script global por su ruta.
        if (!script || !script.src) {
            var scripts = document.getElementsByTagName('script');
            for (var i = scripts.length - 1; i >= 0; i--) {
                if (/\/assets\/script\.js(?:\?.*)?$/.test(scripts[i].src || '')) {
                    script = scripts[i];
                    break;
                }
            }
        }

        if (!script || !script.src) return '';

        var scriptPath = new URL(script.src, window.location.origin).pathname;
        return scriptPath.replace(/\/assets\/script\.js$/, '');
    }

    window.resolveApiUrl = function(url) {
        if (typeof url === 'string') {
            var base = getProjectBase();
            if (base && url.startsWith('/backend/api/')) {
                return base + url;
            }
        }
        return url;
    };

    window.resolveProjectUrl = function(url) {
        var base = getProjectBase();
        return (base || '') + url;
    };

    if (typeof window !== 'undefined' && window.fetch) {
        var _originalFetch = window.fetch;
        window.fetch = function(resource, init) {
            if (typeof resource === 'string') {
                resource = window.resolveApiUrl(resource);
            } else if (resource && resource.url) {
                var base = getProjectBase();
                var apiRoot = window.location.origin + '/backend/api/';
                if (base && resource.url.startsWith(apiRoot)) {
                    var newUrl = window.location.origin + base + resource.url.slice(window.location.origin.length);
                    resource = new Request(newUrl, resource);
                }
            }
            return _originalFetch.call(this, resource, init);
        };
    }
})();

// Funciones globales - disponibles inmediatamente
window.showToast = function(message, type = 'success') {
    var container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-24 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(container);
    }
    var toast = document.createElement('div');
    toast.className = 'px-4 py-3 rounded-lg shadow-lg text-white text-sm ' + (type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-amber-600');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
};

// Diagnóstico no intrusivo: si la API o MySQL fallan, el usuario recibe un
// mensaje útil y la consola conserva el detalle técnico para soporte.
window.checkDatabaseConnection = async function() {
    try {
        var response = await fetch('/backend/api/health.php', {
            credentials: 'same-origin',
            cache: 'no-store'
        });
        var result = await response.json().catch(function() { return {}; });

        if (!response.ok || !result.success) {
            var reason = result.code === 'SCHEMA_INCOMPLETE'
                ? 'Faltan tablas en la base de datos.'
                : 'No se pudo conectar con la base de datos.';
            console.error('Diagnóstico API:', result);
            window.showToast(reason + ' Revisa la configuración del servidor.', 'error');
            return false;
        }

        console.info('API y base de datos conectadas.', result);
        return true;
    } catch (error) {
        console.error('No fue posible acceder a la API:', error);
        window.showToast('No se pudo contactar el servidor. Verifica Apache y MySQL.', 'error');
        return false;
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.checkDatabaseConnection, { once: true });
} else {
    window.checkDatabaseConnection();
}

window.loadMyAdvisories = async function() {
    var tbody = document.getElementById('solicitudes-tbody');
    if (!tbody) return;

    try {
        var email = null;
        if (typeof getCurrentUser === 'function') {
            var currentUser = getCurrentUser();
            if (currentUser && currentUser.email) {
                email = currentUser.email;
            }
        }
        if (!email) {
            email = localStorage.getItem('advisory_email');
        }

        var url = '/backend/api/my-advisories-get.php';
        if (email) {
            url += '?email=' + encodeURIComponent(email);
        }

        var response = await fetch(url, { credentials: 'include' });
        var result = await response.json();

        if (result.success && result.data.length > 0) {
            // Solo mostrar solicitudes pendientes
            var pending = result.data.filter(item => item.status === 'pending');

            if (pending.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-gray-400">No tienes solicitudes pendientes.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            pending.forEach(function(item) {
                var statusClass = item.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                    item.status === 'confirmed' ? 'bg-green-900 text-green-300' :
                    item.status === 'completed' ? 'bg-blue-900 text-blue-300' : 'bg-red-900 text-red-300';
                var statusLabel = item.status === 'pending' ? 'Pendiente' :
                    item.status === 'confirmed' ? 'Confirmado' :
                    item.status === 'completed' ? 'Completado' : 'Cancelado';

                // Formatear tipo de servicio
                var serviceTypeLabel = 'N/A';
                if (item.service_type === 'asesoria') {
                    serviceTypeLabel = item.advisory_type === 'asesoria_personal' ? 'Asesoría Personal' : 'Asesoría Negocio';
                } else if (item.service_type === 'curso') {
                    serviceTypeLabel = 'Curso';
                } else if (item.service_type === 'evento') {
                    serviceTypeLabel = 'Evento';
                }

                // Formatear nombre del servicio
                var serviceName = item.advisory_service || item.event_name || 'N/A';
                serviceName = serviceName.replace(/_/g, ' ');

                // Construir detalles completos
                var detalles = [];
                if (item.service_type === 'evento' && item.event_name) {
                    detalles.push('Evento: ' + item.event_name);
                } else if (item.advisory_service) {
                    detalles.push('Servicio: ' + item.advisory_service.replace(/_/g, ' '));
                }
                if (item.advisory_mode) detalles.push('Modalidad: ' + item.advisory_mode);
                if (item.price && item.price > 0) detalles.push('Precio: $' + Number(item.price).toLocaleString('es-CO'));
                if (item.date) detalles.push('Fecha: ' + new Date(item.date).toLocaleDateString('es-ES'));
                if (item.time) detalles.push('Hora: ' + item.time);
                if (item.num_persons > 1) detalles.push('Personas: ' + item.num_persons);
                if (item.payment_method) detalles.push('Método de pago: ' + item.payment_method.charAt(0).toUpperCase() + item.payment_method.slice(1));
                if (item.notes) detalles.push('Notas: ' + item.notes);
                var detallesCompletos = detalles.join('\n');

                var row = document.createElement('tr');
                var actionsHtml = '';
                if (item.status === 'pending') {
                    actionsHtml = '<button type="button" class="modificar-btn px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700" data-id="' + item.id + '" data-item=\'' + JSON.stringify(item).replace(/'/g, "&#39;") + '\'>Modificar</button>' +
                        '<button type="button" class="eliminar-btn px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700" data-id="' + item.id + '">Eliminar</button>';
                }
                var receiptBtn = item.payment_receipt ?
                    '<button type="button" class="ver-comprobante-btn px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700" data-receipt="' + item.payment_receipt + '">Ver Comprobante</button>' :
                    '<span class="text-gray-500 text-xs">Sin comprobante</span>';

                var emailAttr = item.email ? item.email.replace(/'/g, "&#39;") : '';

                row.className = 'border-b border-gray-700';
                row.innerHTML = '<td class="h-auto text-gray-400 text-sm">' + serviceTypeLabel + '</td>' +
                    '<td class="py-3 text-gray-400 text-sm">' + serviceName + '</td>' +
                    '<td class="py-3"><button type="button" class="ver-detalles-btn px-3 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700" data-detalles="' + encodeURIComponent(detallesCompletos) + '">Ver más</button></td>' +
                    '<td class="py-3"><span class="px-2 py-1 ' + statusClass + ' rounded-full text-xs">' + statusLabel + '</span></td>' +
                    '<td class="py-3">' + receiptBtn + '</td>' +
                    '<td class="py-3 flex gap-2">' + actionsHtml + '</td>';
                if (emailAttr) {
                    row.querySelector('.eliminar-btn')?.setAttribute('data-email', emailAttr);
                }
                tbody.appendChild(row);
            });

            // Agregar evento a los botones "Ver más"
            tbody.querySelectorAll('.ver-detalles-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var detalles = decodeURIComponent(this.getAttribute('data-detalles'));
                    var contentDiv = document.getElementById('detalles-solicitud-content');
                    var titleEl = document.getElementById('detalles-modal-title');
                    if (titleEl) titleEl.textContent = 'Detalles de la Solicitud';
                    if (contentDiv) {
                        var lines = detalles.split('\n');
                        contentDiv.innerHTML = lines.map(function(line) {
                            return '<div class="py-2 border-b border-gray-700 last:border-0">' + line + '</div>';
                        }).join('');
                    }
                    var modal = document.getElementById('detalles-solicitud-modal');
                    if (modal) modal.classList.remove('hidden');
                });
            });

            // Agregar evento a los botones "Ver Comprobante"
            tbody.querySelectorAll('.ver-comprobante-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var receipt = this.getAttribute('data-receipt');
                    var contentDiv = document.getElementById('comprobante-solicitud-content');
                    var titleEl = document.getElementById('comprobante-modal-title');
                    if (titleEl) titleEl.textContent = 'Comprobante de Pago';
                    if (contentDiv && receipt) {
                        contentDiv.innerHTML = '<div class="flex justify-center w-full pt-0 pb-1"><img src="' + receipt + '" alt="Comprobante" class="max-h-[45vh] w-auto max-w-[420px] object-contain rounded" /></div>';
                    }
                    var modal = document.getElementById('comprobante-solicitud-modal');
                    if (modal) {
                        // Habilitar el botón de descarga si existe
                        var downloadBtn = document.getElementById('download-inscription-receipt-btn');
                        if (downloadBtn) {
                            downloadBtn.classList.remove('hidden');
                            downloadBtn.disabled = false;
                        }
                        modal.classList.remove('hidden');
                    }
                });
            });

            // Agregar evento a los botones "Eliminar"
            tbody.querySelectorAll('.eliminar-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var id = this.getAttribute('data-id');
                    var email = this.getAttribute('data-email');
                    showDeleteConfirmation(id, email);
                });
            });

            // Agregar evento a los botones "Modificar"
            tbody.querySelectorAll('.modificar-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var itemData = JSON.parse(this.getAttribute('data-item').replace(/&#39;/g, "'"));
                    modificarSolicitud(itemData);
                });
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-gray-400">No tienes solicitudes registradas.</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-red-300">Error al cargar.</td></tr>';
    }
};

window.showCourseDetails = function(title, detail) {
    var modal = document.getElementById('courseDetailsModal');
    var titleEl = document.getElementById('courseTitle');
    var contentEl = document.getElementById('courseDetailsContent');
    if (!modal || !titleEl || !contentEl) return;
    titleEl.textContent = title;
    contentEl.innerHTML = '<p class="text-gray-300">' + (detail || 'Sin detalles disponibles.') + '</p>';
    modal.classList.remove('hidden');
};

window.closeCourseDetails = function() {
    var modal = document.getElementById('courseDetailsModal');
    if (modal) modal.classList.add('hidden');
};

window.closeDetallesModal = function() {
    var modal = document.getElementById('detalles-solicitud-modal');
    if (modal) modal.classList.add('hidden');
};

window.showDeleteConfirmation = function(id, email) {
    var modal = document.getElementById('delete-confirm-modal');
    if (!modal) return;
    modal.querySelector('#delete-confirm-email').value = '';
    modal.querySelector('#delete-confirm-instruction').textContent = email ? 'Escribe el correo ' + email + ' para confirmar la eliminación.' : 'Escribe el correo del usuario para confirmar la eliminación.';
    modal.dataset.deleteId = id;
    modal.dataset.deleteEmail = email || '';
    modal.classList.remove('hidden');
};

window.closeDeleteConfirmation = function() {
    var modal = document.getElementById('delete-confirm-modal');
    if (modal) modal.classList.add('hidden');
};

window.confirmDelete = function() {
    var modal = document.getElementById('delete-confirm-modal');
    if (!modal) return;
    var input = modal.querySelector('#delete-confirm-email');
    var expected = modal.dataset.deleteEmail || '';
    if (input.value.trim().toLowerCase() !== expected.toLowerCase()) {
        showToast('El correo no coincide. Escribe el correo exacto para continuar.', 'error');
        return;
    }
    var id = modal.dataset.deleteId;
    closeDeleteConfirmation();
    eliminarSolicitud(id);
};

// Función para eliminar una solicitud
async function eliminarSolicitud(id) {
    var email = localStorage.getItem('advisory_email') || '';
    try {
        var response = await fetch('/backend/api/advisory-delete.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, email: email })
        });
        var result = await response.json();
        if (result.success) {
            showToast('Solicitud eliminada correctamente', 'success');
            loadMyAdvisories();
        } else {
            showToast(result.message || 'Error al eliminar', 'error');
        }
    } catch (e) {
        showToast('Error al eliminar la solicitud', 'error');
    }
}

// Función para modificar una solicitud
window.modificarSolicitud = async function(item) {
    var modal = document.getElementById('detalles-solicitud-modal');
    if (modal) modal.classList.add('hidden');

    var editModal = document.getElementById('edit-solicitud-modal');
    if (!editModal) {
        var modalHtml = document.createElement('div');
        modalHtml.id = 'edit-solicitud-modal';
        modalHtml.className = 'hidden fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50';
        modalHtml.innerHTML = `
            <div class="bg-gray-800 p-6 rounded-xl max-w-lg mx-4 shadow-2xl border border-gray-700 w-full">
                <h3 class="text-xl font-semibold text-white mb-4 border-b border-gray-600 pb-3">Modificar Solicitud</h3>
                <div id="edit-solicitud-content" class="text-gray-300 space-y-4"></div>
                <div class="flex justify-end space-x-4 mt-6">
                    <button type="button" onclick="closeEditSolicitudModal()" class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600">Cancelar</button>
                    <button type="button" onclick="saveEditSolicitud()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalHtml);
        editModal = modalHtml;
    }

    window.currentEditSolicitud = item;
    var content = document.getElementById('edit-solicitud-content');
    var serviceType = item.service_type || 'asesoria';

    var horasOptions = `
        <option value="09:00" ${item.time === '09:00' ? 'selected' : ''}>09:00 AM</option>
        <option value="10:00" ${item.time === '10:00' ? 'selected' : ''}>10:00 AM</option>
        <option value="11:00" ${item.time === '11:00' ? 'selected' : ''}>11:00 AM</option>
        <option value="12:00" ${item.time === '12:00' ? 'selected' : ''}>12:00 PM</option>
        <option value="13:00" ${item.time === '13:00' ? 'selected' : ''}>01:00 PM</option>
        <option value="14:00" ${item.time === '14:00' ? 'selected' : ''}>02:00 PM</option>
        <option value="15:00" ${item.time === '15:00' ? 'selected' : ''}>03:00 PM</option>
        <option value="16:00" ${item.time === '16:00' ? 'selected' : ''}>04:00 PM</option>
        <option value="17:00" ${item.time === '17:00' ? 'selected' : ''}>05:00 PM</option>
        <option value="18:00" ${item.time === '18:00' ? 'selected' : ''}>06:00 PM</option>
    `;

    var coursesOptions = '';
    try {
        var coursesResp = await fetch('/backend/api/cursos-get.php');
        var coursesResult = await coursesResp.json();
        if (coursesResult.success && coursesResult.data) {
            coursesResult.data.forEach(function(course) {
                if (course.category === 'curso' || course.category === 'cursos') {
                    var selected = (item.advisory_service === course.title) ? 'selected' : '';
                    coursesOptions += '<option value="' + course.title + '" ' + selected + '>' + course.title + '</option>';
                }
            });
        }
    } catch (e) {
        coursesOptions = '<option value="' + (item.advisory_service || '') + '">' + (item.advisory_service || 'Sin curso') + '</option>';
    }

    var receiptStatus = item.payment_status || 'pending';
    var hasReceipt = item.payment_receipt && item.payment_receipt.length > 0;
    var receiptBadge = hasReceipt ? (receiptStatus === 'paid' ? '<span class="px-2 py-1 bg-green-600 text-white rounded text-xs">Comprobante cargado</span>' :
                        receiptStatus === 'rejected' ? '<span class="px-2 py-1 bg-red-600 text-white rounded text-xs">Rechazado</span>' :
                        '<span class="px-2 py-1 bg-yellow-600 text-white rounded text-xs">Comprobante cargado - Pendiente</span>') :
                        '<span class="px-2 py-1 bg-gray-600 text-white rounded text-xs">Sin comprobante</span>';

    var fieldsHtml = '';

    if (serviceType === 'asesoria') {
        fieldsHtml = `
            <div>
                <label class="block text-gray-400 text-sm mb-1">Fecha Deseada *</label>
                <input type="date" id="edit-date" value="${item.date || ''}" class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600" required>
            </div>
            <div>
                <label class="block text-gray-400 text-sm mb-1">Hora Preferida *</label>
                <select id="edit-time" class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600" required>
                    <option value="">Seleccionar hora</option>
                    ${horasOptions}
                </select>
            </div>
            <div>
                <label class="block text-gray-400 text-sm mb-1">Teléfono *</label>
                <input type="tel" id="edit-phone" value="${item.phone || ''}" class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600" placeholder="300 123 4567" required>
            </div>
            <div>
                <label class="block text-gray-400 text-sm mb-1">Comprobante de Pago</label>
                <div class="flex items-center gap-2 mb-2">${receiptBadge}</div>
                <input type="file" id="edit-receipt" accept="image/*" class="w-full text-gray-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-white file:bg-amber-600 hover:file:bg-amber-700">
                <p class="text-gray-500 text-xs mt-1">Adjunta captura de pantalla de la transacción</p>
            </div>
        `;
    } else if (serviceType === 'curso') {
        fieldsHtml = `
            <div>
                <label class="block text-gray-400 text-sm mb-1">Teléfono *</label>
                <input type="tel" id="edit-phone" value="${item.phone || ''}" class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600" placeholder="300 123 4567" required>
            </div>
            <div>
                <label class="block text-gray-400 text-sm mb-1">Comprobante de Pago</label>
                <div class="flex items-center gap-2 mb-2">${receiptBadge}</div>
                <input type="file" id="edit-receipt" accept="image/*" class="w-full text-gray-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-white file:bg-amber-600 hover:file:bg-amber-700">
                <p class="text-gray-500 text-xs mt-1">Adjunta captura de pantalla de la transacción</p>
            </div>
        `;
    } else if (serviceType === 'evento') {
        fieldsHtml = `
            <div>
                <label class="block text-gray-400 text-sm mb-1">Número de Personas *</label>
                <input type="number" id="edit-num-persons" value="${item.num_persons || 1}" min="1" max="50" class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600" required>
            </div>
            <div>
                <label class="block text-gray-400 text-sm mb-1">Teléfono *</label>
                <input type="tel" id="edit-phone" value="${item.phone || ''}" class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600" placeholder="300 123 4567" required>
            </div>
            <div>
                <label class="block text-gray-400 text-sm mb-1">Comprobante de Pago</label>
                <div class="flex items-center gap-2 mb-2">${receiptBadge}</div>
                <input type="file" id="edit-receipt" accept="image/*" class="w-full text-gray-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-white file:bg-amber-600 hover:file:bg-amber-700">
                <p class="text-gray-500 text-xs mt-1">Adjunta captura de pantalla de la transacción</p>
            </div>
        `;
    }

    content.innerHTML = `
        <div class="space-y-3">
            ${fieldsHtml}
            <div>
                <label class="block text-gray-400 text-sm mb-1">Notas</label>
                <textarea id="edit-notes" rows="3" class="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600">${item.notes || ''}</textarea>
            </div>
        </div>
    `;

    editModal.classList.remove('hidden');
};

window.closeEditSolicitudModal = function() {
    var modal = document.getElementById('edit-solicitud-modal');
    if (modal) modal.classList.add('hidden');
    window.currentEditSolicitud = null;
};

window.saveEditSolicitud = async function() {
    var item = window.currentEditSolicitud;
    if (!item) return;

    var serviceType = item.service_type || 'asesoria';
    var errors = [];

    // Validación según tipo de servicio
    if (serviceType === 'asesoria') {
        var date = document.getElementById('edit-date').value;
        var time = document.getElementById('edit-time').value;
        var phone = document.getElementById('edit-phone').value;
        if (!date) errors.push('La fecha es requerida');
        if (!time) errors.push('La hora es requerida');
        if (!phone) errors.push('El teléfono es requerido');
    } else if (serviceType === 'evento') {
        var numPersons = document.getElementById('edit-num-persons').value;
        var phone = document.getElementById('edit-phone').value;
        if (!numPersons || numPersons < 1) errors.push('El número de personas es requerido');
        if (!phone) errors.push('El teléfono es requerido');
    } else if (serviceType === 'curso') {
        var phone = document.getElementById('edit-phone').value;
        if (!phone) errors.push('El teléfono es requerido');
    }

    if (errors.length > 0) {
        showToast(errors.join('\n'), 'error');
        return;
    }

    var updateData = { id: item.id };

    if (serviceType === 'asesoria') {
        updateData.date = document.getElementById('edit-date').value;
        updateData.time = document.getElementById('edit-time').value;
        updateData.phone = document.getElementById('edit-phone').value;
    } else if (serviceType === 'evento') {
        updateData.num_persons = parseInt(document.getElementById('edit-num-persons').value) || 1;
        updateData.phone = document.getElementById('edit-phone').value;
    } else if (serviceType === 'curso') {
        updateData.phone = document.getElementById('edit-phone').value;
    }

    updateData.notes = document.getElementById('edit-notes').value;

    try {
        var response = await fetch('/backend/api/advisory-update.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        var result = await response.json();

        // Si hay comprobante de pago, subirlo
        var receiptInput = document.getElementById('edit-receipt');
        if (receiptInput && receiptInput.files.length > 0) {
            var file = receiptInput.files[0];
            var reader = new FileReader();
            reader.onload = async function(e) {
                var base64 = e.target.result;
                try {
                    var receiptResponse = await fetch('/backend/api/advisory-receipt.php', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: item.id,
                            payment_receipt: base64
                        })
                    });
                    var receiptResult = await receiptResponse.json();
                    if (receiptResult.success) {
                        showToast('Solicitud y comprobante actualizados', 'success');
                    }
                } catch (err) {
                    showToast('Error al subir comprobante', 'error');
                }
            };
            reader.readAsDataURL(file);
        }

        if (result.success) {
            showToast('Solicitud actualizada correctamente', 'success');
            closeEditSolicitudModal();
            loadMyAdvisories();
        } else {
            showToast(result.message || 'Error al actualizar', 'error');
        }
    } catch (e) {
        showToast('Error al guardar los cambios', 'error');
    }
};

// Cerrar modal de detalles al hacer clic fuera
document.addEventListener('click', function(e) {
    var modal = document.getElementById('detalles-solicitud-modal');
    if (modal && !modal.classList.contains('hidden') && e.target === modal) {
        modal.classList.add('hidden');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle for all pages
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // Formulario de edición de perfil
    const editProfileBtn = document.getElementById('edit-profile');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const actionButtons = document.getElementById('action-buttons');
    const profileForm = document.getElementById('profile-form');

    if (editProfileBtn && profileForm) {
        const profileInputs = profileForm.querySelectorAll('input');
        
        editProfileBtn.addEventListener('click', () => {
            profileInputs.forEach(input => input.disabled = false);
            actionButtons.classList.remove('hidden');
            editProfileBtn.classList.add('hidden');
        });
        
        cancelEditBtn.addEventListener('click', () => {
            profileInputs.forEach(input => input.disabled = true);
            actionButtons.classList.add('hidden');
            editProfileBtn.classList.remove('hidden');
            profileForm.reset();
        });
        
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Profile changes saved');
            profileInputs.forEach(input => input.disabled = true);
            actionButtons.classList.add('hidden');
            editProfileBtn.classList.remove('hidden');
        });
    }
    
    // Formulario de cambio de contraseña
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Password change requested');
            passwordForm.reset();
        });
    }

    // Formulario de asesoría - Verificar si agendar.js está cargado para evitar duplicación
    const advisoryForm = document.getElementById('advisory-form');
    const successMessage = document.getElementById('success-message');

    if (advisoryForm && successMessage && !window.agendarJsLoaded) {
        // Solo agregar el event listener si agendar.js NO está cargado
        advisoryForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Determinar el tipo de servicio según la categoría seleccionada
            let service = '';
            const serviceTypeBtns = document.querySelectorAll('.service-type-btn');
            let selectedType = 'asesoria';

            console.log('Formulario submit - botones encontrados:', serviceTypeBtns.length);

            serviceTypeBtns.forEach(btn => {
                if (btn.classList.contains('bg-purple-600')) {
                    selectedType = btn.getAttribute('data-type');
                }
            });

            // Obtener el valor del subtype según la categoría
            let numPersons = 1;
            let advisoryType = null;
            let advisoryService = null;
            let advisoryMode = null;
            let eventName = null;

            if (selectedType === 'asesoria') {
                advisoryType = document.getElementById('advisory-subtype')?.value;
                advisoryService = document.getElementById('advisory-service')?.value;
                advisoryMode = document.getElementById('advisory-mode')?.value;
                const fecha = document.getElementById('advisory-date')?.value;
                const hora = document.getElementById('advisory-time')?.value;

                // Validar número de personas si es negocio
                if (advisoryType === 'asesoria_negocio') {
                    numPersons = parseInt(document.getElementById('advisory-asesoria-persons')?.value) || 0;
                    if (numPersons < 1) {
                        showToast('Ingresa el número de personas para la asesoría de negocio', 'error');
                        return;
                    }
                }

                if (!advisoryType || !advisoryService || !advisoryMode || !fecha || !hora) {
                    showToast('Completa todos los campos de asesoría (incluyendo fecha y hora)', 'error');
                    return;
                }
                service = 'Asesoría ' + (advisoryType === 'asesoria_personal' ? 'Personal' : 'Negocio');
            } else if (selectedType === 'curso') {
                advisoryService = document.getElementById('advisory-course')?.value;
                if (!advisoryService) {
                    showToast('Selecciona un curso', 'error');
                    return;
                }
                service = 'Curso';
                numPersons = 1;
            } else if (selectedType === 'evento') {
                const personas = document.getElementById('advisory-event-persons')?.value;
                const eventSelect = document.getElementById('advisory-event');
                advisoryService = eventSelect?.value || '';
                eventName = eventSelect?.options[eventSelect.selectedIndex]?.textContent || '';

                if (!personas || personas < 1) {
                    showToast('Ingresa el número de personas', 'error');
                    return;
                }
                if (!advisoryService) {
                    showToast('Selecciona un evento', 'error');
                    return;
                }
                service = 'Evento';
                numPersons = parseInt(personas);
            }

            const date = document.getElementById('advisory-date')?.value;
            const time = document.getElementById('advisory-time')?.value;
            const notes = document.getElementById('advisory-details')?.value;

            // Obtener teléfono según el tipo de servicio
            let phone = '';
            if (selectedType === 'asesoria') {
                phone = document.getElementById('advisory-phone')?.value || '';
            } else if (selectedType === 'curso') {
                phone = document.getElementById('advisory-course-phone')?.value || '';
            } else if (selectedType === 'evento') {
                phone = document.getElementById('advisory-event-phone')?.value || '';
            }

            // Validar que el teléfono no esté vacío
            if (!phone.trim()) {
                showToast('Ingresa tu número de teléfono', 'error');
                return;
            }

            const user = getCurrentUser();

            // Obtener precio del select correspondiente
            let servicePrice = 0;
            if (selectedType === 'asesoria') {
                const sel = document.getElementById('advisory-service');
                servicePrice = sel?.options[sel.selectedIndex]?.dataset?.price || 0;
            } else if (selectedType === 'curso') {
                const sel = document.getElementById('advisory-course');
                servicePrice = sel?.options[sel.selectedIndex]?.dataset?.price || 0;
            } else if (selectedType === 'evento') {
                const sel = document.getElementById('advisory-event');
                servicePrice = sel?.options[sel.selectedIndex]?.dataset?.price || 0;
            }

            // Validar que el checkbox de términos esté marcado
            const termsCheckbox = document.getElementById('terms-checkbox');
            if (!termsCheckbox || !termsCheckbox.checked) {
                showToast('Debes aceptar los términos y condiciones', 'error');
                return;
            }

            try {
                // Guardar los datos del formulario para enviarlos después con el comprobante
                window.pendingFormData = {
                    name: user?.name || 'Usuario',
                    email: user?.email || '',
                    phone: phone,
                    service: service,
                    price: servicePrice,
                    date: date || '',
                    time: time || '',
                    notes: notes || '',
                    serviceType: selectedType,
                    numPersons: numPersons,
                    advisoryType: advisoryType,
                    advisoryService: advisoryService,
                    advisoryMode: advisoryMode,
                    eventName: eventName
                };

                // Mostrar modal de pago Nequi sin enviar datos aún
                const priceStr = '$' + Number(servicePrice).toLocaleString('es-CO');
                if (typeof openPaymentModal === 'function') {
                    openPaymentModal({
                        reference: selectedType === 'asesoria' ? 'ASES-' + Date.now() :
                                   selectedType === 'evento' ? 'EVT-' + Date.now() : 'PAGO-' + Date.now(),
                        price: priceStr,
                        service: service
                    });
                }
            } catch (error) {
                showToast('Error al procesar la solicitud', 'error');
            }
        });
    }

    // Reservation form functionality
    const reservationType = document.getElementById('reservation-type');
    const courseSelection = document.getElementById('course-selection');
    const advisorySelection = document.getElementById('advisory-selection');
    const eventSelection = document.getElementById('event-selection');

    if (reservationType) {
        reservationType.addEventListener('change', function() {
            if (this.value === 'curso') {
                courseSelection.style.display = 'block';
                advisorySelection.style.display = 'none';
                eventSelection.style.display = 'none';
            } else if (this.value === 'asesoria') {
                courseSelection.style.display = 'none';
                advisorySelection.style.display = 'block';
                eventSelection.style.display = 'none';
            } else if (this.value === 'evento') {
                courseSelection.style.display = 'none';
                advisorySelection.style.display = 'none';
                eventSelection.style.display = 'block';
            } else {
                courseSelection.style.display = 'none';
                advisorySelection.style.display = 'none';
                eventSelection.style.display = 'none';
            }
        });
    }

    const idTypeSelect = document.getElementById('reservation-idtype');
    const otherIdTypeContainer = document.getElementById('other-idtype-container');

    if (idTypeSelect) {
        idTypeSelect.addEventListener('change', function() {
            if (this.value === 'otro') {
                otherIdTypeContainer.style.display = 'block';
                document.getElementById('other-idtype').setAttribute('required', 'required');
            } else {
                otherIdTypeContainer.style.display = 'none';
                document.getElementById('other-idtype').removeAttribute('required');
            }
        });
    }
    
    const reservationForm = document.getElementById('reservation-form');
    if (reservationForm) {
        reservationForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const type = document.getElementById('reservation-type').value;
            const date = document.getElementById('reservation-date').value;
            const message = document.getElementById('reservation-message').value;
            const messageDisplay = document.getElementById('reservation-message-display');

            if (!type || !date) {
                showToast('Por favor, completa todos los campos requeridos.', 'error');
                return;
            }

            // Simulación de envío de reserva
            console.log('Reserva enviada:', { type, date, message });
            messageDisplay.classList.remove('hidden');
            setTimeout(() => {
                messageDisplay.classList.add('hidden');
                event.target.reset();
                if(courseSelection) courseSelection.style.display = 'none';
                if(advisorySelection) advisorySelection.style.display = 'none';
            }, 3000);
        });
    }

    // Scroll reveal animation
    function reveal() {
        const reveals = document.querySelectorAll('.reveal');
        for (let i = 0; i < reveals.length; i++) {
            const windowHeight = window.innerHeight;
            const elementTop = reveals[i].getBoundingClientRect().top;
            const elementVisible = 150;
            if (elementTop < windowHeight - elementVisible) {
                reveals[i].classList.add('active');
            } else {
                reveals[i].classList.remove('active');
            }
        }
    }

    window.addEventListener('scroll', reveal);
    reveal(); // Initial check

    // Manejar envío del formulario de registro
    // Nota: se usa una IIFE en lugar de un DOMContentLoaded anidado, porque
    // registrar un listener DOMContentLoaded dentro de otro callback que ya
    // se está ejecutando hace que el evento nunca vuelva a dispararse y el
    // handler del formulario de registro nunca se adjunte.
    (function() {
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            // Add event listener for document type select to show/hide custom field
            const registerIdTypeSelect = document.getElementById('register-id-type');
            const registerCustomDocContainer = document.getElementById('register-custom-doc-container');
            const registerCustomDocInput = document.getElementById('register-custom-doc');
            
            if (registerIdTypeSelect && registerCustomDocContainer) {
                registerIdTypeSelect.addEventListener('change', function() {
                    if (this.value === 'Otro') {
                        registerCustomDocContainer.style.display = 'block';
                    } else {
                        registerCustomDocContainer.style.display = 'none';
                        if (registerCustomDocInput) registerCustomDocInput.value = '';
                    }
                });
                
                // Initialize visibility based on current value
                if (registerIdTypeSelect.value === 'Otro') {
                    registerCustomDocContainer.style.display = 'block';
                } else {
                    registerCustomDocContainer.style.display = 'none';
                }
            }

            registerForm.addEventListener('submit', async function(e) {
                e.preventDefault();

                const name = document.getElementById('register-name').value;
                const full_name = document.getElementById('register-fullname') ? document.getElementById('register-fullname').value : name;
                const id_type_select = document.getElementById('register-id-type');
                const custom_doc_input = document.getElementById('register-custom-doc');
                
                // Determine the actual document type to send
                let id_type = id_type_select ? id_type_select.value : 'CC';
                let custom_doc_type = null;
                
                // If the selected option was 'Otro' and there's a custom value, use the custom value
                if (id_type_select && id_type_select.value === 'Otro' && custom_doc_input && custom_doc_input.value.trim() !== '') {
                    custom_doc_type = custom_doc_input.value.trim();
                }
                
                const id_number = document.getElementById('register-id-number') ? document.getElementById('register-id-number').value : '';
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;
                const security_question = document.getElementById('register-security-question').value;
                const security_answer = document.getElementById('register-security-answer').value;
                const register_phoneEl = document.getElementById('register-phone');
                let phone = '';
                if (register_phoneEl && register_phoneEl.value) {
                    phone = register_phoneEl.value;
                } else {
                    // Extraer el teléfono desde el placeholder si el input fue deshabilitado y no tiene value
                    const ph = register_phoneEl ? (register_phoneEl.getAttribute('placeholder') || '') : '';
                    // buscar el primer grupo de 10-15 dígitos
                    const m = ph.match(/\d{7,15}/);
                    phone = m ? m[0] : '';
                }

                
                const notify_email = document.getElementById('register-notify-email').checked;
                const notify_whatsapp = document.getElementById('register-notify-whatsapp').checked;


                // Validar términos en runtime (evita bypass si otro script dispara el submit)
                const terminosCheck = document.getElementById('register-terminos');
                if (terminosCheck && !terminosCheck.checked) {
                    showAlert('Debes aceptar los Términos y Condiciones', 'error');
                    return;
                }

                try {
                    const response = await fetch('/backend/api/register.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            name, 
                            full_name, 
                            id_type, 
                            id_number, 
                            custom_doc_type, 
                            email, 
                            password, 
                            phone, 
                            security_question, 
                            security_answer, 
                            notify_email, 
                            notify_whatsapp 
                        })
                    });

                    const result = await response.json();

                    if (response.ok && result.message && !result.error) {
                        showAlert('¡Registro exitoso! Por favor inicia sesión.', 'success');
                        registerForm.reset();
                        // Reset the custom document container visibility
                        if (registerCustomDocContainer) {
                            registerCustomDocContainer.style.display = 'none';
                        }
                        if (registerCustomDocInput) {
                            registerCustomDocInput.value = '';
                        }
                        
                        // Redirigir después de un breve delay (el login está en registro.html)
                        setTimeout(() => {
                            window.location.href = '/views/registro.html';
                        }, 2000);
                    } else {
                        showAlert(result.message || 'Error en el registro', 'error');
                    }
                } catch (error) {
                    console.error('Error en el registro:', error);
                    showAlert('Error de conexión con el servidor', 'error');
                }
            });
        }
    })();
    
    // Manejar envío del formulario de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
try {
const response = await fetch('/backend/api/login.php', {

                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert(`Bienvenido ${data.user.name}`, 'success');
                    // Guardar usuario en localStorage
                    setCurrentUser(data.user);
                    
                    // Redirigir según rol después de 1 segundo
                    setTimeout(() => {
                        // Si venimos a registro por intención de catálogo, volvemos al catálogo.
                        try {
                            var after = sessionStorage.getItem('redirectAfterLogin');
                            sessionStorage.removeItem('redirectAfterLogin');
                            if (after === 'catalogo') {
                                window.location.href = '/views/catalogo.html';
                                return;
                            }
                        } catch (e) {}
                        redirectToDashboard();
                    }, 1000);
                } else {
                    showAlert(data.message || 'Error al iniciar sesión', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('Error de conexión con el servidor', 'error');
            }
        });
    }
    
    // Mostrar nombre de usuario en el dashboard si está logueado
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        const user = getCurrentUser();
        if (user) {
            userNameElement.textContent = user.name;
        } else {
            // Si no hay usuario, redirigir al login
            window.location.href = '/views/registro.html';
        }
    }
    
    // Manejar botón de logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

   
    // Funcionalidad de FAQ (acordeón)
    // Compatible con páginas que tengan estructura button.faq-question + div.faq-answer.hidden
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        // Evita doble-binding en caso de recargas parciales
        if (question._bbFaqBound) return;
        question._bbFaqBound = true;

        question.addEventListener('click', function() {
            if (typeof window.toggleFAQ === 'function') {
                window.toggleFAQ(this);
            }
        });
    });




    // Funcionalidad del modal de detalles del curso
    window.showCourseDetails = function(courseName, descriptionDetail) {
        // Mostrar el modal
        document.getElementById('courseTitle').textContent = courseName;
        document.getElementById('courseDetailsContent').textContent = descriptionDetail || "Descripción detallada no disponible.";
        document.getElementById('courseDetailsModal').classList.remove('hidden');
    };
    
    window.closeCourseDetails = function() {
        document.getElementById('courseDetailsModal').classList.add('hidden');
    };

    // Cerrar el modal al hacer clic fuera del contenido
    const courseDetailsModal = document.getElementById('courseDetailsModal');
    if (courseDetailsModal) {
        courseDetailsModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeCourseDetails();
            }
        });
    }
    
    // Efecto de scroll solo para el header
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

});

// Funcionalidad para ocultar/mostrar el header al hacer scroll
let lastScrollTop = 0;
const header = document.querySelector('.header-hidden');

if (header) {
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling hacia abajo
            header.classList.add('scrolled-down');
        } else if (scrollTop < lastScrollTop && scrollTop <= 100) {
            // Scrolling hacia arriba o cerca del top
            header.classList.remove('scrolled-down');
        } else if (scrollTop < lastScrollTop && scrollTop > 100) {
            // Scrolling hacia arriba
            header.classList.remove('scrolled-down');
        }
        
        lastScrollTop = scrollTop;
    });
}

// Función para alternar menú móvil
function toggleMobileMenu() {
    // Manejar el menú móvil nuevo (estilo admin)
    const adminDropdown = document.getElementById('adminDropdown');
    const header = document.getElementById('mainHeader');
    
    if (adminDropdown) {
        if (adminDropdown.classList.contains('open')) {
            adminDropdown.classList.remove('open');
            // Remover clase del header si es necesario
            if(header) {
                header.classList.remove('with-open-dropdown');
            }
        } else {
            adminDropdown.classList.add('open');
            // Añadir clase al header para cambiar las esquinas
            if(header) {
                header.classList.add('with-open-dropdown');
            }
        }
    }
    
    // Manejar el menú móvil antiguo por compatibilidad
    const oldMenu = document.getElementById('mobile-menu');
    if (oldMenu) {
        oldMenu.classList.toggle('hidden');
    }
}

// Función para mostrar alertas (usa toasts para consistencia)
    if (menu) {
        menu.classList.toggle('hidden');
    }


// Función para mostrar alertas (usa toasts para consistencia)
function showAlert(message, type = 'success') {
    showToast(message, type);
}

// Función para obtener datos del usuario desde localStorage
function getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// Función para guardar datos del usuario en localStorage
function setCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

// Función para cerrar sesión
function logout() {
    try {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('redirectAfterLogin');
    } catch (error) {
        console.error('No se pudo limpiar el almacenamiento local:', error);
    }

    try {
        fetch('/backend/api/logout.php', {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            keepalive: true
        }).catch(function(error) {
            console.error('No se pudo cerrar la sesión en el servidor:', error);
        });
    } catch (error) {
        console.error('No se pudo cerrar la sesión en el servidor:', error);
    }

    var homeUrl = typeof window.resolveProjectUrl === 'function'
        ? window.resolveProjectUrl('/?i=1')
        : '/?i=1';
    window.location.replace(homeUrl);
}

// Función para redirigir según rol del usuario
function redirectToDashboard() {

    // Si existe el modal de inscripción en esta página, exponer funciones globales.
    // (Usadas por views/catalogo.html y assets/catalog-courses.js)
    window.showInscriptionModal = function(courseName, coursePrice) {
        var user = getCurrentUser();
        if (!user) {
            // Guardar intención y redirigir al login/registro
            try { sessionStorage.setItem('redirectAfterLogin', 'catalogo'); } catch (e) {}
            window.location.href = '/views/registro.html';
            return;
        }
        var modal = document.getElementById('inscriptionModal');
        var nameEl = document.getElementById('inscriptionCourseName');
        var priceEl = document.getElementById('inscriptionCoursePrice');
        var whatsappEl = document.getElementById('whatsappInscription');
        if (!modal || !nameEl || !priceEl || !whatsappEl) return;

        nameEl.textContent = courseName;
        priceEl.textContent = coursePrice;

        var message = `Hola Chef Jonathan, quiero inscribirme en el curso: ${courseName} (${coursePrice}). Adjunto comprobante de pago.`;
        whatsappEl.href = `https://wa.me/573229452346?text=${encodeURIComponent(message)}`;

        modal.classList.remove('hidden');
    };

    window.closeInscriptionModal = function() {
        var modal = document.getElementById('inscriptionModal');
        if (modal) modal.classList.add('hidden');
    };

    const user = getCurrentUser();
    if (user) {
        switch(user.role) {
            case 'admin':
                window.location.href = '/views/admin/admin.html';
                break;
            case 'user':
                window.location.href = '/views/user/user.html';
                break;
            default:
                window.location.href = '/?i=1';
        }
    }
}

// Función para toggle de FAQ
function toggleFAQ(button) {
    // Mantener compatibilidad con páginas viejas que usan onclick="toggleFAQ(this)".
    // En `views/informacion.html` la estructura es: button.faq-question + div.faq-answer

    const answer = button && button.nextElementSibling ? button.nextElementSibling : null;
    const icon = button ? button.querySelector('svg') : null;
    if (!answer) return;

    const willOpen = answer.classList.contains('hidden');

    // Cerrar todas las demás respuestas
    document.querySelectorAll('.faq-answer').forEach(ans => {
        if (ans !== answer) ans.classList.add('hidden');
    });

    // Abrir/cerrar la actual
    answer.classList.toggle('hidden');

    // Actualizar aria-expanded
    const allQuestions = document.querySelectorAll('.faq-question');
    allQuestions.forEach(btn => {
        btn.setAttribute('aria-expanded', (btn === button && willOpen) ? 'true' : 'false');
    });

    // Rotar el icono
    document.querySelectorAll('.faq-question svg').forEach(ic => {
        if (ic !== icon) ic.classList.remove('rotate-180');
    });
    if (icon) icon.classList.toggle('rotate-180');
}


// Funciones de paginación globales para tablas

// Variables para la paginación global
let globalCurrentPage = {};
const recordsPerPage = 10;
let globalTableData = {};

// Función global de paginación para tablas
window.initializeTablePagination = function(tableName, data, renderFunction) {
  if (!globalCurrentPage[tableName]) {
    globalCurrentPage[tableName] = 1;
  }
  
  globalTableData[tableName] = data;
  const totalPages = Math.ceil(data.length / recordsPerPage);
  
  // Asegurarse de que la página actual esté dentro de los límites
  if (globalCurrentPage[tableName] > totalPages && totalPages > 0) {
    globalCurrentPage[tableName] = totalPages;
  }
  if (globalCurrentPage[tableName] < 1) {
    globalCurrentPage[tableName] = 1;
  }
  
  // Calcular índices para la página actual
  const startIndex = (globalCurrentPage[tableName] - 1) * recordsPerPage;
  const endIndex = Math.min(startIndex + recordsPerPage, data.length);
  const pageData = data.slice(startIndex, endIndex);

  // Renderizar los datos de la página actual
  renderFunction(pageData);

  // Actualizar controles de paginación
  updatePaginationControls(tableName, totalPages, globalCurrentPage[tableName]);
};

// Función para actualizar los controles de paginación
function updatePaginationControls(tableName, totalPages, currentPage) {
  const tableId = `${tableName}-tbody`;
  const containerId = `${tableName}-pagination-controls`;
  const pageInfoId = `${tableName}-pagination-info`;
  const pageNumbersId = `${tableName}-page-numbers`;
  const prevButtonId = `${tableName}-prev-page`;
  const nextButtonId = `${tableName}-next-page`;
  
  const pageInfo = document.getElementById(pageInfoId);
  const pageNumbers = document.getElementById(pageNumbersId);
  const prevButton = document.getElementById(prevButtonId);
  const nextButton = document.getElementById(nextButtonId);
  
  if (!pageInfo || !pageNumbers || !prevButton || !nextButton) return;
  
  // Actualizar información de paginación
  if (totalPages > 0) {
    pageInfo.textContent = `Mostrando ${((currentPage - 1) * recordsPerPage) + 1}-${Math.min(currentPage * recordsPerPage, globalTableData[tableName].length)} de ${globalTableData[tableName].length} registros`;
  } else {
    pageInfo.textContent = 'No hay registros para mostrar';
  }
  
  // Actualizar botones de navegación
  prevButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages || totalPages === 0;
  
  // Generar números de página
  let pageLinks = '';
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    if (i === currentPage) {
      pageLinks += `<span class="mx-1 px-4 py-2 bg-purple-600 text-white rounded inline-flex items-center justify-center" style="min-height: 40px; min-width: 40px;">${i}</span>`;
    } else {
      pageLinks += `<button class="mx-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 inline-flex items-center justify-center" style="min-height: 40px; min-width: 40px;" onclick="changePage('${tableName}', ${i})">${i}</button>`;
    }
  }
  
  pageNumbers.innerHTML = pageLinks;
}

// Función para cambiar de página
window.changePage = function(tableName, page) {
  globalCurrentPage[tableName] = page;
  const renderFunctionName = `render${tableName.charAt(0).toUpperCase() + tableName.slice(1)}Table`;
  const renderFunction = window[renderFunctionName];
  
  if (typeof renderFunction === 'function') {
    initializeTablePagination(tableName, globalTableData[tableName], renderFunction);
  }
};

// Función para ir a la página siguiente
window.nextPage = function(tableName) {
  const totalPages = Math.ceil(globalTableData[tableName].length / recordsPerPage);
  if (globalCurrentPage[tableName] < totalPages) {
    changePage(tableName, globalCurrentPage[tableName] + 1);
  }
};

// Función para ir a la página anterior
window.prevPage = function(tableName) {
  if (globalCurrentPage[tableName] > 1) {
    changePage(tableName, globalCurrentPage[tableName] - 1);
  }
};

// Función para inicializar controles de paginación en una tabla específica
window.setupPaginationControls = function(tableName) {
  const prevButtonId = `${tableName}-prev-page`;
  const nextButtonId = `${tableName}-next-page`;
  
  const prevButton = document.getElementById(prevButtonId);
  const nextButton = document.getElementById(nextButtonId);
  
  if (prevButton) {
    prevButton.addEventListener('click', function() {
      prevPage(tableName);
    });
  }
  
  if (nextButton) {
    nextButton.addEventListener('click', function() {
      nextPage(tableName);
    });
  }
};

// --- Header icons tooltip (unificado) ---
// Usa los mismos labels que aparecen en el header de `views/user/perfil.html`.
// Se activa en hover para links del header y del mobile-menu.
(function(){
    try{
        const tooltipStyleId = 'bb-header-tooltip-style';
        if(!document.getElementById(tooltipStyleId)){
            const st = document.createElement('style');
            st.id = tooltipStyleId;
            st.textContent = [
                '.bb-tooltip{position:relative;}',

                '.bb-tooltip::after{content:attr(data-tooltip);position:absolute;left:50%;transform:translateX(-50%);bottom:100%;margin-bottom:10px;background:rgba(37, 35, 63, 0.95);color:#fff;padding:6px 10px;border-radius:8px;font-size:12px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s ease;}',


                '.bb-tooltip:hover::after{opacity:1;}',

                '.bb-tooltip svg{display:block;}'
            ].join('\n');
            document.head.appendChild(st);
        }

        // Mapa por href (se compara terminación para que funcione con rutas relativas)
        const map = [
            { href: 'user.html', label: 'Panel' },
            { href: 'mis-servicios.html', label: 'Servicios' },
            { href: 'historial.html', label: 'Historial' },
            { href: 'certificados.html', label: 'Certificados' },
            { href: 'agendar.html', label: 'Compras' },
            { href: 'perfil.html', label: 'Perfil' },
            { href: 'javascript:void(0)', label: 'Cerrar sesión' },
            { href: 'informacion.html', label: 'Información' },
            { href: 'registro.html', label: 'Inicio de Sesión' },
            { href: 'catalogo.html', label: 'Catálogo' },
            { href: 'admin-usuarios.html', label: 'Usuarios' },
            { href: 'admin-inscripciones.html', label: 'Inscripciones' },
            { href: 'admin-servicios.html', label: 'Servicios' },
            { href: 'admin-reembolsos.html', label: 'Reembolsos' },
            { href: 'admin-certificados.html', label: 'Certificados' },
        ];

        function applyTooltips(container){
            if(!container) return;
            const links = container.querySelectorAll('a[href]');
            links.forEach(a=>{
                const href = (a.getAttribute('href')||'').split('?')[0].split('#')[0].trim();
                const m = map.find(x=>href.endsWith(x.href));
                if(!m) return;
                a.dataset.tooltip = m.label;
                a.classList.add('bb-tooltip');
            });
        }

        document.addEventListener('DOMContentLoaded', ()=>{
            applyTooltips(document.querySelector('header nav'));
            applyTooltips(document.getElementById('mobile-menu'));
        });

        // también intentar aplicar inmediatamente (por si el script corre tarde)
        applyTooltips(document.querySelector('header nav'));
        applyTooltips(document.getElementById('mobile-menu'));
    }catch(e){
        // no romper la app
        console.error(e);
    }
})();


// --- Dynamic table renderers for clients, sales and users ---
(function(){
    const STORAGE_KEY = 'chef_localDB_v1';

    function loadLocalDB(){
        try{
            const raw = localStorage.getItem(STORAGE_KEY);
            if(!raw) return { users: [], clients: [], sales: [], visits: [], services: [], inscriptions: [] };
            return JSON.parse(raw);
        }catch(e){
            console.error('Error parseando localDB:', e);
            return { users: [], clients: [], sales: [], visits: [], services: [], inscriptions: [] };
        }
    }

    function formatDate(iso){
        if(!iso) return '';
        try{ const d = new Date(iso); return d.toLocaleString(); }catch(e){ return iso; }
    }

    function renderUsers(){
        const tbody = document.getElementById('users-tbody');
        if(!tbody) return;
        const db = loadLocalDB();
        tbody.innerHTML = '';
        db.users.slice().reverse().forEach(u => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-800';
            tr.innerHTML = `
                <td class="py-3 text-gray-400 text-sm">${u.id || ''}</td>
                <td class="py-3 text-white text-sm">${escapeHtml(u.name || '')}</td>
                <td class="py-3 text-gray-400 text-sm">${escapeHtml(u.email || '')}</td>
                <td class="py-3 text-gray-400 text-sm">${formatDate(u.createdAt)}</td>
                <td class="py-3"><span class="px-2 py-1 bg-green-900 text-green-300 rounded-full text-xs">Activo</span></td>
                <td class="py-3">
                    <div class="flex space-x-1">
                        <button data-id="${u.id}" class="btn-edit-user px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs">Editar</button>
                        <button data-id="${u.id}" class="btn-delete-user px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs">Eliminar</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderClients(){
        const tbody = document.getElementById('clients-tbody');
        if(!tbody) return;
        const db = loadLocalDB();
        tbody.innerHTML = '';
        db.clients.slice().reverse().forEach(c => {
            const tr = document.createElement('tr');
            tr.className = 'border-t border-gray-700';
            const interestsArr = Array.isArray(c.interests) ? c.interests : (c.interests ? String(c.interests).split(',') : []);
            const chips = interestsArr.map(i => `<span class="px-2 py-1 bg-purple-900 text-purple-300 rounded-full text-xs">${escapeHtml(i)}</span>`).join(' ');
            tr.innerHTML = `
                <td class="p-4 text-gray-300">${c.id || ''}</td>
                <td class="p-4 text-white">${escapeHtml(c.name || '')}</td>
                <td class="p-4 text-gray-300">${escapeHtml(c.email || '')}</td>
                <td class="p-4 text-gray-300">${escapeHtml(c.phone || '')}</td>
                <td class="p-4 text-gray-300">${escapeHtml(c.city || '')}</td>
                <td class="p-4"><div class="flex flex-wrap gap-2">${chips}</div></td>
                <td class="p-4"><div class="flex space-x-2"><button data-id="${c.id}" class="btn-view-client text-amber-500 hover:text-amber-400">Ver</button><button data-id="${c.id}" class="btn-edit-client text-purple-500 hover:text-purple-400">Editar</button><button data-id="${c.id}" class="btn-delete-client text-red-500 hover:text-red-400">Eliminar</button></div></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderSales(){
        const tbody = document.getElementById('sales-tbody');
        if(!tbody) return;
        const db = loadLocalDB();
        tbody.innerHTML = '';
        db.sales.slice().reverse().forEach(s => {
            const tr = document.createElement('tr');
            tr.className = 'border-t border-gray-700';
            tr.innerHTML = `
                <td class="p-4 text-gray-300">${s.id || ''}</td>
                <td class="p-4 text-gray-300">${formatDate(s.createdAt)}</td>
                <td class="p-4 text-white">${escapeHtml(s.client || '')}</td>
                <td class="p-4 text-gray-300">${escapeHtml(s.service || '')}</td>
                <td class="p-4 text-green-500">${s.amount ? ('$' + Number(s.amount).toLocaleString('es-CO')) : ''}</td>
                <td class="p-4"><span class="px-2 py-1 bg-green-900 text-green-300 rounded-full text-sm">Completada</span></td>
                <td class="p-4"><div class="flex space-x-2"><button data-id="${s.id}" class="btn-view-sale text-amber-500 hover:text-amber-400">Ver</button><button data-id="${s.id}" class="btn-edit-sale text-purple-500 hover:text-purple-400">Editar</button><button data-id="${s.id}" class="btn-delete-sale text-red-500 hover:text-red-400">Eliminar</button></div></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function escapeHtml(str){
        if(!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Polling localStorage for changes and re-render tables when needed
    let lastSnapshot = '';
    function pollAndRender(){
        // Skip polling on admin pages to avoid conflicts with admin-tables.js
        if (window.location.pathname.includes('/admin/')) return;
        
        const raw = localStorage.getItem(STORAGE_KEY) || '';
        if(raw !== lastSnapshot){
            lastSnapshot = raw;
            try{ renderUsers(); }catch(e){}
            try{ renderClients(); }catch(e){}
            try{ renderSales(); }catch(e){}
        }
    }

    // Start polling every 1s
    setInterval(pollAndRender, 1000);
    // Initial render
    pollAndRender();

})();
// --- Immediate save helpers and form handlers (attach safely) ---
(function(){
    const STORAGE_KEY = 'chef_localDB_v1';

    function loadLocalDB(){
        try{ const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : { users: [], clients: [], sales: [], visits: [], services: [], inscriptions: [] }; }catch(e){ return { users: [], clients: [], sales: [], visits: [], services: [], inscriptions: [] }; }
    }

    function saveLocalDB(db){
        try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }catch(e){ console.error('Error saving localDB', e); }
    }

    function ensureCollections(db){
        db.users = Array.isArray(db.users) ? db.users : [];
        db.clients = Array.isArray(db.clients) ? db.clients : [];
        db.sales = Array.isArray(db.sales) ? db.sales : [];
        db.visits = Array.isArray(db.visits) ? db.visits : [];
        db.services = Array.isArray(db.services) ? db.services : [];
        db.inscriptions = Array.isArray(db.inscriptions) ? db.inscriptions : [];
    }

    function formatCurrency(value){
        if(value === undefined || value === null || value === '') return '';
        const num = Number(value);
        if(isNaN(num)) return escapeHtml(String(value));
        return '$' + num.toLocaleString('es-CO');
    }

    function attachFormHandlers(){
        // Create user
        const userForm = document.getElementById('create-user-form');
        if(userForm && !userForm._bound && !window.location.pathname.includes('/admin-usuarios')){
            userForm.addEventListener('submit', function(e){
                e.preventDefault();
                const name = document.getElementById('user-name') ? document.getElementById('user-name').value.trim() : '';
                const email = document.getElementById('user-email') ? document.getElementById('user-email').value.trim() : '';
                const password = document.getElementById('user-password') ? document.getElementById('user-password').value : '';
                const db = loadLocalDB(); ensureCollections(db);
                const obj = { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, name, email, password, createdAt: new Date().toISOString() };
                db.users = db.users || [];
                db.users.push(obj);
                saveLocalDB(db);
                console.log('Formulario (create-user-form) guardado en colección: users', obj);
                try{ if(typeof renderUsers === 'function') renderUsers(); }catch(e){}
                userForm.reset();
            });
            userForm._bound = true;
        }

        // New client
        const clientForm = document.getElementById('new-client-form');
        if(clientForm && !clientForm._bound){
            clientForm.addEventListener('submit', function(e){
                e.preventDefault();
                const name = document.getElementById('client-name') ? document.getElementById('client-name').value.trim() : '';
                const email = document.getElementById('client-email') ? document.getElementById('client-email').value.trim() : '';
                const phone = document.getElementById('client-phone') ? document.getElementById('client-phone').value.trim() : '';
                const city = document.getElementById('client-city') ? document.getElementById('client-city').value.trim() : '';
                const notes = document.getElementById('client-notes') ? document.getElementById('client-notes').value.trim() : '';
                // interests checkboxes
                const interestEls = document.querySelectorAll('input[name="interests"]');
                const interests = [];
                interestEls.forEach(i => { if(i.checked) interests.push(i.value); });

                const db = loadLocalDB(); ensureCollections(db);
                const obj = { id: Date.now(), name, email, phone, city, interests, notes, createdAt: new Date().toISOString() };
                db.clients = db.clients || [];
                db.clients.push(obj);
                saveLocalDB(db);
                console.log('Formulario (new-client-form) guardado en colección: clients', obj);
                try{ if(typeof renderClients === 'function') renderClients(); }catch(e){}
                clientForm.reset();
            });
            clientForm._bound = true;
        }

        // New sale
        const saleForm = document.getElementById('new-sale-form');
        if(saleForm && !saleForm._bound){
            saleForm.addEventListener('submit', function(e){
                e.preventDefault();
                const client = document.getElementById('sale-client') ? document.getElementById('sale-client').value.trim() : '';
                const service = document.getElementById('sale-service') ? document.getElementById('sale-service').value : '';
                const amount = document.getElementById('sale-amount') ? document.getElementById('sale-amount').value : '';
                const paymentMethod = document.getElementById('sale-payment') ? document.getElementById('sale-payment').value : '';
                const notes = document.getElementById('sale-notes') ? document.getElementById('sale-notes').value.trim() : '';

                const db = loadLocalDB(); ensureCollections(db);
                const obj = { id: Date.now(), client, service, amount, paymentMethod, notes, createdAt: new Date().toISOString() };
                db.sales = db.sales || [];
                db.sales.push(obj);
                saveLocalDB(db);
                console.log('Formulario (new-sale-form) guardado en colección: sales', obj);
                try{ if(typeof renderSales === 'function') renderSales(); }catch(e){}
                saleForm.reset();
            });
            saleForm._bound = true;
        }
    }

    // --- Validation helpers ---
    function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'')); }
    function isPhone(v){ return /^[0-9+\s-]{7,20}$/.test(String(v||'')); }
    function isNumeric(v){ return !isNaN(Number(v)) && v !== ''; }

    // --- Edit/Delete event delegation ---
    document.addEventListener('click', function(e){
        const t = e.target;

        // Users
        if(t.matches('.btn-edit-user')){
            const id = t.getAttribute('data-id');
            const db = loadLocalDB(); if(!db) return;
            const idx = (db.users||[]).findIndex(x => String(x.id) === String(id));
            if(idx === -1) return showToast('Usuario no encontrado', 'error');
            const user = db.users[idx];
            const name = prompt('Nombre:', user.name || '');
            if(name === null) return;
            const email = prompt('Email:', user.email || '');
            if(email === null) return;
            if(!name.trim()){ return showToast('El nombre es requerido', 'error'); }
            if(!isEmail(email)){ return showToast('Email no válido', 'error'); }
            user.name = name.trim(); user.email = email.trim(); user.updatedAt = new Date().toISOString();
            db.users[idx] = user; saveLocalDB(db); try{ renderUsers(); }catch(e){}
            return;
        }
        if(t.matches('.btn-delete-user')){
            const id = t.getAttribute('data-id');
            if(!confirm('Eliminar usuario?')) return;
            const db = loadLocalDB(); db.users = (db.users||[]).filter(x => String(x.id) !== String(id)); saveLocalDB(db); try{ renderUsers(); }catch(e){}
            return;
        }

        // Clients
        if(t.matches('.btn-edit-client')){
            const id = t.getAttribute('data-id');
            const db = loadLocalDB();
            const idx = (db.clients||[]).findIndex(x => String(x.id) === String(id));
            if(idx===-1) return showToast('Cliente no encontrado', 'error');

            const client = db.clients[idx];
            const name = prompt('Nombre:', client.name||'');
            if(name===null) return;
            if(!name.trim()) return showToast('Nombre requerido', 'error');

            const email = prompt('Email:', client.email||'');
            if(email===null) return;
            if(email && !isEmail(email)) return showToast('Email no válido', 'error');

            const phone = prompt('Teléfono:', client.phone||'');
            if(phone===null) return;
            if(phone && !isPhone(phone)) return showToast('Teléfono no válido', 'error');

            client.name = name.trim();
            client.email = email.trim();
            client.phone = phone.trim();
            client.updatedAt = new Date().toISOString();
            db.clients[idx]=client;
            saveLocalDB(db);
            try{ renderClients(); }catch(e){}
            return;
        }
        if(t.matches('.btn-delete-client')){
            const id = t.getAttribute('data-id');
            if(!confirm('Eliminar cliente?')) return;
            const db = loadLocalDB();
            db.clients = (db.clients||[]).filter(x => String(x.id)!==String(id));
            saveLocalDB(db);
            try{ renderClients(); }catch(e){}
            return;
        }

        // Sales
        if(t.matches('.btn-edit-sale')){
            const id = t.getAttribute('data-id');
            const db = loadLocalDB();
            const idx = (db.sales||[]).findIndex(x => String(x.id) === String(id));
            if(idx===-1) return showToast('Venta no encontrada', 'error');

            const sale = db.sales[idx];
            const client = prompt('Cliente:', sale.client||'');
            if(client===null) return;
            if(!client.trim()) return showToast('Cliente requerido', 'error');

            const service = prompt('Servicio:', sale.service||'');
            if(service===null) return;
            const amount = prompt('Monto:', sale.amount||'');
            if(amount===null) return;
            if(amount && !isNumeric(amount)) return showToast('Monto inválido', 'error');

            sale.client = client.trim();
            sale.service = service.trim();
            sale.amount = amount;
            sale.updatedAt = new Date().toISOString();
            db.sales[idx]=sale;
            saveLocalDB(db);
            try{ renderSales(); }catch(e){}
            return;
        }
        if(t.matches('.btn-delete-sale')){
            const id = t.getAttribute('data-id');
            if(!confirm('Eliminar venta?')) return;
            const db = loadLocalDB();
            db.sales = (db.sales||[]).filter(x => String(x.id)!==String(id));
            saveLocalDB(db);
            try{ renderSales(); }catch(e){}
            return;
        }
    });

    // Attach now and also on DOMContentLoaded to be safe
    try{ attachFormHandlers(); }catch(e){}
document.addEventListener && document.addEventListener('DOMContentLoaded', attachFormHandlers);

    // Set greeting name placeholders (admin/user pages)
    (function setGreetingNames(){
        try {
            var user = getCurrentUser();
            var name = (user && user.name) ? user.name : 'Usuario';

            var map = [
                { id: 'user-greeting-name' },
                { id: 'admin-greeting-name' }
            ];

            map.forEach(function(item){
                var el = document.getElementById(item.id);
                if (el) el.textContent = name;
            });
        } catch (e) {
            // no-op
        }
    })();

    // Enhance render functions to use formatting helpers if available

    // (They live in the other IIFE scope; we rely on those names existing)

})();
