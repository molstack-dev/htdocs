// Funciones para cargar datos en las tablas admin

let allUsers = []; // Variable global para almacenar usuarios

// Notificaciones toast (reemplaza alerts)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `px-4 py-3 rounded-lg shadow-lg text-white text-sm animate-fade-in ${
        type === 'success' ? 'bg-green-600' :
        type === 'error' ? 'bg-red-600' :
        'bg-amber-600'
    }`;

    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('animate-fade-in');
        toast.classList.add('animate-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Toggle password visibility
function togglePassword(inputId) {
    const passwordField = document.getElementById(inputId);
    const iconSpan = passwordField.parentNode.querySelector('.password-toggle i');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        iconSpan.classList.remove('fa-eye');
        iconSpan.classList.add('fa-eye-slash');
    } else {
        passwordField.type = 'password';
        iconSpan.classList.remove('fa-eye-slash');
        iconSpan.classList.add('fa-eye');
    }
}

function setupUserEmailSearch() {
    const input = document.getElementById('user-email-search');
    const clearBtn = document.getElementById('user-email-search-clear');
    const tbody = document.getElementById('users-tbody');

    if (!input || !tbody || !clearBtn) return;

    const normalize = (v) => String(v || '').trim().toLowerCase();

    function renderFiltered(email) {
        const value = normalize(email);
        const rows = Array.from(tbody.querySelectorAll('tr[data-user-email]'));
        const showAll = value === '';

        rows.forEach((row) => {
            const rowEmail = normalize(row.getAttribute('data-user-email'));
            row.style.display = showAll || rowEmail.includes(value) ? '' : 'none';
        });
    }

    input.addEventListener('input', () => renderFiltered(input.value));
    clearBtn.addEventListener('click', () => {
        input.value = '';
        renderFiltered('');
    });
}

async function loadUsers() {
    try {
const response = await fetch('/backend/api/usuarios-get.php');
        const result = await response.json();
        
        
        if (result.success && result.data.length > 0) {
            allUsers = result.data; // Almacenar usuarios globalmente
            const tbody = document.getElementById('users-tbody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            result.data.forEach((user, index) => {
                const row = document.createElement('tr');
                row.className = 'border-b border-gray-800';
                row.setAttribute('data-user-email', user.email || '');
                row.innerHTML = `
                    <td class="py-3 text-gray-400 text-sm">${String(user.id).padStart(3, '0')}</td>
                    <td class="py-3 text-white text-sm">${user.name}</td>
                    <td class="py-3 text-gray-400 text-sm">${user.full_name || user.name}</td>
                    <td class="py-3 text-gray-400 text-sm">${user.id_type || 'CC'} ${user.id_number || ''}</td>
                    <td class="py-3 text-gray-400 text-sm">${user.email}</td>
                    <td class="py-3 text-gray-400 text-sm">${user.role || 'user'}</td>
                    <td class="py-3 text-gray-400 text-sm">${new Date(user.created_at).toLocaleDateString('es-ES')}</td>
                    <td class="py-3">
                        <div class="flex space-x-1">
                            <button type="button" class="edit-btn px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs" data-user-id="${user.id}">Modificar</button>
                            <button type="button" class="delete-btn px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs" data-user-id="${user.id}">Eliminar</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            allUsers = []; // Limpiar si no hay datos
            const tbody = document.getElementById('users-tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-gray-400">No hay usuarios registrados.</td></tr>';
            }
        }
    } catch (error) {
        allUsers = []; // Limpiar en error
        const tbody = document.getElementById('users-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-red-300">Error al cargar usuarios.</td></tr>';
        }
    }
}

async function loadInscriptions() {
    try {
        const response = await fetch('/backend/api/inscripciones-get.php');
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            const tbody = document.querySelector('table tbody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            result.data.forEach((inscription, index) => {
                const row = document.createElement('tr');
                row.className = 'border-b border-gray-800';
                const statusClass = inscription.status === 'pending' ? 'bg-yellow-900 text-yellow-300' : 
                                inscription.status === 'confirmed' ? 'bg-green-900 text-green-300' : 
                                'bg-red-900 text-red-300';
                const statusLabel = inscription.status === 'pending' ? 'Pendiente' : 
                                inscription.status === 'confirmed' ? 'Confirmado' : 'Completado';
                
                row.innerHTML = `
                    <td class="py-3 text-gray-400 text-sm">${String(inscription.id).padStart(3, '0')}</td>
                    <td class="py-3 text-white text-sm">${inscription.user_name}</td>
                    <td class="py-3 text-gray-400 text-sm">${inscription.course_title}</td>
                    <td class="py-3 text-gray-400 text-sm">${new Date(inscription.registration_date).toLocaleDateString('es-ES')}</td>
                    <td class="py-3">
                        <span class="px-2 py-1 ${statusClass} rounded-full text-xs">${statusLabel}</span>
                    </td>
                    <td class="py-3">
                        <div class="flex space-x-1">
                            <button class="px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs">Modificar</button>
                            <button class="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs">Cancelar</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error cargando inscripciones:', error);
    }
}

let allCourses = [];

function syncEditEventDateVisibility(existing = null) {
    const select = document.getElementById('edit-service-category');
    const container = document.getElementById('edit-event-date-container');
    const input = document.getElementById('edit-event_date');

    if (!select || !container || !input) return;

    const isEventos = String(select.value).toLowerCase() === 'eventos';
    container.style.display = isEventos ? 'block' : 'none';
    input.required = isEventos;

    if (!isEventos) {
        input.value = '';
        return;
    }

    if (existing && existing.event_date) {
        input.value = String(existing.event_date);
    } else if (!input.value) {
        input.value = '';
    }
}

window.syncEditEventDateVisibility = syncEditEventDateVisibility;

async function loadCourses() {
    try {
        const response = await fetch('/backend/api/cursos-get.php');
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            allCourses = result.data.map((course) => ({
                ...course,
                event_date: course.event_date ?? course.eventDate ?? ''
            }));
            const tbody = document.getElementById('courses-tbody');
            if (!tbody) return;

            tbody.innerHTML = '';
            result.data.forEach((course) => {
                const row = document.createElement('tr');
                row.className = 'border-b border-gray-800';
                row.innerHTML = `
                    <td class="py-3 text-gray-400 text-sm">${String(course.id).padStart(3, '0')}</td>
                    <td class="py-3">
                        ${course.image ? '<img src="' + course.image + '" class="w-16 h-16 object-cover rounded">' : '<div class="w-16 h-16 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">Sin img</div>'}
                    </td>
                    <td class="py-3 text-white text-sm">${course.title}</td>
                    <td class="py-3 text-gray-400 text-sm capitalize">${course.category || 'cursos'}</td>
                    <td class="py-3 text-amber-500 font-semibold text-sm">$${Number(course.price).toLocaleString('es-ES')}</td>
                    <td class="py-3">
                        <div class="flex space-x-1">
                            <button type="button" class="edit-course-btn px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs" data-course-id="${course.id}">Modificar</button>
                            <button type="button" class="delete-course-btn px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs" data-course-id="${course.id}">Eliminar</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error cargando cursos:', error);
    }
}

// === CREAR CURSO ===
function setupCreateCourseForm() {
    const form = document.getElementById('create-service-form');
    if (!form || form._bound) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('course-title').value.trim();
        const description = document.getElementById('course-description').value.trim();
        const descriptionDetail = document.getElementById('course-description-detail').value.trim();
        const category = document.getElementById('course-category').value;
        const duration = document.getElementById('course-duration').value.trim();
        const price = document.getElementById('course-price').value;
        const imageInput = document.getElementById('course-image');
        const eventDateInput = document.getElementById('event_date');
        const event_date = eventDateInput ? eventDateInput.value : '';

        if (!title) {
            showToast('El título es requerido', 'error');
            return;
        }
        if (!price || parseFloat(price) <= 0) {
            showToast('El precio debe ser mayor a 0', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('description_detail', descriptionDetail);
        formData.append('category', category);
        formData.append('duration', duration);
        formData.append('price', price);
        if (category === 'eventos' && event_date) {
            formData.append('event_date', event_date);
        }
        if (imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        try {
            const response = await fetch('/backend/api/courses.php', { method: 'POST', body: formData });
            const result = await response.json();

            if (result.success) {
                showToast('Curso creado exitosamente');
                form.reset();
                await loadCourses();
            } else {
                showToast(result.message || 'No se pudo crear', 'error');
            }
        } catch (error) {
            showToast('Error al procesar la solicitud', 'error');
        }
    });

    form._bound = true;
}

// === MODALES ===
function openEditCourseModal(course) {
    const modal = document.getElementById('edit-service-modal');
    if (!modal) return;
    document.getElementById('edit-service-id').value = course.id;
    document.getElementById('edit-service-title').value = course.title;
    document.getElementById('edit-service-description').value = course.description || '';
    document.getElementById('edit-service-description-detail').value = course.description_detail || '';
    document.getElementById('edit-service-category').value = course.category || 'cursos';
    document.getElementById('edit-service-duration').value = course.duration || '';
    document.getElementById('edit-service-price').value = course.price;
    document.getElementById('edit-event_date').value = course.event_date || course.eventDate || '';

    syncEditEventDateVisibility(course);

    // Guardar imagen actual en campo oculto
    let currentImageInput = document.getElementById('edit-service-current-image');
    if (!currentImageInput) {
        currentImageInput = document.createElement('input');
        currentImageInput.type = 'hidden';
        currentImageInput.id = 'edit-service-current-image';
        currentImageInput.name = 'image_url';
        modal.querySelector('form').appendChild(currentImageInput);
    }
    currentImageInput.value = course.image || '';

    // Mostrar preview de imagen actual
    const preview = document.getElementById('edit-service-image-preview');
    if (course.image && preview) {
        preview.innerHTML = '<img src="' + course.image + '" class="max-h-full max-w-full object-contain">';
    } else if (preview) {
        preview.innerHTML = '<span class="text-gray-500 text-xs">Sin imagen</span>';
    }

    modal.classList.remove('hidden');
}

function openDeleteCourseModal(course) {
    const modal = document.getElementById('delete-service-modal');
    if (!modal) return;
    document.getElementById('delete-service-id').value = course.id;
    document.getElementById('delete-service-title').textContent = course.title;
    modal.classList.remove('hidden');
}

function setupEditCourseModal() {
    // Idempotencia global para evitar que el listener quede sin registrar
    if (window._editCourseModalBound) return;
    window._editCourseModalBound = true;

    const modal = document.getElementById('edit-service-modal');
    const form = document.getElementById('edit-service-form');
    const cancelBtn = document.getElementById('cancel-edit-service');
    if (!modal || !form || !cancelBtn) return;

    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    const categorySelect = document.getElementById('edit-service-category');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => syncEditEventDateVisibility());
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-service-id').value;
        const title = document.getElementById('edit-service-title').value.trim();
        const description = document.getElementById('edit-service-description').value.trim();
        const descriptionDetail = document.getElementById('edit-service-description-detail').value.trim();
        const category = document.getElementById('edit-service-category').value;
        const duration = document.getElementById('edit-service-duration').value.trim();
        const price = document.getElementById('edit-service-price').value;
        const imageInput = document.getElementById('edit-service-image');
        const eventDateInput = document.getElementById('edit-event_date');
        const eventDate = eventDateInput ? eventDateInput.value : '';

        if (!title) { showToast('El título es requerido', 'error'); return; }
        if (!price || parseFloat(price) <= 0) { showToast('El precio debe ser mayor a 0', 'error'); return; }
        if (category === 'eventos' && !eventDate) { showToast('La fecha del evento es requerida', 'error'); return; }

        const formData = new FormData();
        formData.append('id', id);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('description_detail', descriptionDetail);
        formData.append('category', category);
        formData.append('duration', duration);
        formData.append('price', price);

        // Conservar imagen actual si no se selecciona una nueva
        const currentImage = document.getElementById('edit-service-current-image');
        if (currentImage && currentImage.value) {
            formData.append('image_url', currentImage.value);
        }

        if (category === 'eventos' && eventDate) {
            formData.append('event_date', eventDate);
        }

        if (imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        try {
            const response = await fetch('/backend/api/courses.php', { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                showToast('Curso actualizado');
                modal.classList.add('hidden');
                await loadCourses();
            } else {
                showToast(result.message || 'No se pudo actualizar', 'error');
            }
        } catch (error) {
            showToast('Error al procesar', 'error');
        }
    });

    modal._bound = true;
}

function setupDeleteCourseModal() {
    // Idempotencia global
    if (window._deleteCourseModalBound) return;
    window._deleteCourseModalBound = true;

    const modal = document.getElementById('delete-service-modal');
    const cancelBtn = document.getElementById('cancel-delete-service');
    const confirmBtn = document.getElementById('confirm-delete-service');
    if (!modal || !cancelBtn || !confirmBtn) return;


    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    confirmBtn.addEventListener('click', async () => {
        const id = document.getElementById('delete-service-id').value;
        try {
            const response = await fetch('/backend/api/courses.php', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const result = await response.json();
            if (result.success) {
                showToast('Curso eliminado');
                modal.classList.add('hidden');
                await loadCourses();
            } else {
                showToast(result.message || 'No se pudo eliminar', 'error');
            }
        } catch (error) {
            showToast('Error al procesar', 'error');
        }
    });

    modal._bound = true;
}

function setupCourseTableDelegation() {
    const tbody = document.getElementById('courses-tbody');
    if (!tbody || tbody._delegated) return;

    tbody.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-course-btn')) {
            const id = target.getAttribute('data-course-id');
            const course = allCourses.find(c => String(c.id) === String(id));
            if (course) {
                openEditCourseModal({
                    ...course,
                    event_date: course.event_date ?? course.eventDate ?? ''
                });
            } else {
                // Fallback: si allCourses no coincide/está vacío, cargamos por request
                fetch('/backend/api/courses.php?id=' + encodeURIComponent(id))
                    .then(r => r.json())
                    .then(res => {
                        const c = res?.data ?? res?.course ?? null;
                        if (c) openEditCourseModal({
                            ...c,
                            event_date: c.event_date ?? c.eventDate ?? ''
                        });
                        else showToast('No se pudo cargar el curso para editar', 'error');
                    })
                    .catch(() => showToast('Error al cargar curso para editar', 'error'));
            }
        } else if (target.classList.contains('delete-course-btn')) {
            const id = target.getAttribute('data-course-id');
            const course = allCourses.find(c => String(c.id) === String(id));
            if (course) {
                openDeleteCourseModal(course);
            } else {
                fetch('/backend/api/courses.php?id=' + encodeURIComponent(id))
                    .then(r => r.json())
                    .then(res => {
                        const c = res?.data ?? res?.course ?? null;
                        if (c) openDeleteCourseModal(c);
                        else showToast('No se pudo cargar el curso para eliminar', 'error');
                    })
                    .catch(() => showToast('Error al cargar curso para eliminar', 'error'));
            }
        }

    });

    tbody._delegated = true;
}

// Funciones para gestión de usuarios
function setupCreateUserForm() {
    const createForm = document.getElementById('create-user-form');
    const fullNameInput = document.getElementById('user-fullname');
    if (!createForm || createForm._bound) return;

    if (fullNameInput) {
        fullNameInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^\p{L}\s]/gu, '');
        });
    }

    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('user-name').value.trim();
        const full_name = document.getElementById('user-fullname') ? document.getElementById('user-fullname').value.trim() : name;
        const id_type_select = document.getElementById('user-id-type');
        const custom_doc_input = document.getElementById('user-custom-doc');
        
        // Determine the actual document type to send
        let id_type = id_type_select ? id_type_select.value : 'CC';
        let custom_doc_type = null;
        
        // If the selected option was 'Otro' and there's a custom value, use the custom value
        if (id_type_select && id_type_select.value === 'Otro' && custom_doc_input && custom_doc_input.value.trim() !== '') {
            custom_doc_type = custom_doc_input.value.trim();
        }
        
        const id_number = document.getElementById('user-id-number') ? document.getElementById('user-id-number').value.trim() : '';
        const email = document.getElementById('user-email').value.trim();
        const role = document.getElementById('user-role').value;
        const password = document.getElementById('user-password').value;

        console.log('[admin-tables] create-user submit', { name, full_name, id_type, custom_doc_type, id_number, email, role });


        if (!name || !full_name || !id_number || !email || !password) {
            showToast('Completa todos los campos requeridos.', 'error');
            return;
        }

        if (!/^[\p{L}\s]+$/u.test(full_name)) {
            showToast('El nombre completo solo puede contener letras y espacios.', 'error');
            return;
        }

        try {
            const response = await fetch('/backend/api/users.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'create_user',
                    name,
                    full_name,
                    id_type,
                    id_number,
                    custom_doc_type: custom_doc_input && custom_doc_input.value.trim() !== '' ? custom_doc_input.value.trim() : null,
                    email,
                    role,
                    password,
                    // Campos requeridos por register.php (para que admin-usuarios cree bien)
                    phone: document.getElementById('user-phone')?.value || '',
                    security_question: document.getElementById('user-security-question')?.value || '',
                    security_answer: document.getElementById('user-security-answer')?.value || '',
                    notify_email: document.getElementById('user-notify-email')?.checked ? 1 : 0,
                    notify_whatsapp: document.getElementById('user-notify-whatsapp')?.checked ? 1 : 0,
                }),
            });
            // Compatibilidad: si el backend espera el contrato de register.php
            // (security_question/security_answer/phone/notificaciones), enviar ese contrato.
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`create_user endpoint falló con estado ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                showToast('Usuario creado exitosamente');
                createForm.reset();
                // Reset the custom document container visibility
                const customDocContainer = document.getElementById('custom-doc-container');
                if(customDocContainer) customDocContainer.style.display = 'none';
                const customInput = document.getElementById('user-custom-doc');
                if(customInput) customInput.value = '';
                await loadUsers();
            } else {
                showToast(result.message || 'No se pudo crear el usuario', 'error');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            showToast('Error al procesar la solicitud: ' + error.message, 'error');
        }
    });

    createForm._bound = true;
}

function setupEditModal() {
    const editModal = document.getElementById('edit-user-modal');
    const editForm = document.getElementById('edit-user-form');
    const cancelEditBtn = document.getElementById('cancel-edit-user');
    if (!editModal || !editForm || !cancelEditBtn || editModal._bound) return;

    cancelEditBtn.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userId = document.getElementById('edit-user-id').value;
        const name = document.getElementById('edit-user-name').value.trim();
        const email = document.getElementById('edit-user-email').value.trim();
        const role = document.getElementById('edit-user-role').value;

        // Get document type fields
        const idTypeSelect = document.getElementById('edit-user-id-type');
        const customDocInput = document.getElementById('edit-user-custom-doc');
        const idNumberInput = document.getElementById('edit-user-id-number');

        let id_type = idTypeSelect ? idTypeSelect.value : 'CC';
        let custom_doc_type = null;

        if (idTypeSelect && idTypeSelect.value === 'Otro' && customDocInput && customDocInput.value.trim() !== '') {
            custom_doc_type = customDocInput.value.trim();
        }

        const id_number = idNumberInput ? idNumberInput.value.trim() : '';

        if (!name || !email) {
            showToast('Completa nombre y email para actualizar el usuario.', 'error');
            return;
        }

        try {
            const response = await fetch('/backend/api/users.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'update_user',
                    id: userId,
                    name,
                    email,
                    role,
                    id_type,
                    id_number,
                    custom_doc_type,
                }),
            });

            const result = await response.json();
            if (result.success) {
                showToast('Usuario actualizado exitosamente');
                editModal.classList.add('hidden');
                await loadUsers();
            } else {
                showToast(result.message || 'No se pudo actualizar el usuario', 'error');
            }
        } catch (error) {
            showToast('Error al procesar la solicitud', 'error');
        }
    });

    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.classList.add('hidden');
        }
    });

    editModal._bound = true;
}

function setupDeleteModal() {
    const deleteModal = document.getElementById('delete-user-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-user');
    const confirmDeleteBtn = document.getElementById('confirm-delete-user');

    if (!deleteModal || !cancelDeleteBtn || !confirmDeleteBtn || deleteModal._bound) return;

    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        const userId = document.getElementById('delete-user-id').value;
        if (!userId) return;

        try {
            const response = await fetch('/backend/api/users.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'delete_user',
                    id: userId,
                }),
            });

            const result = await response.json();
            if (result.success) {
                showToast('Usuario eliminado exitosamente');
                deleteModal.classList.add('hidden');
                await loadUsers();
            } else {
                showToast(result.message || 'No se pudo eliminar el usuario', 'error');
            }
        } catch (error) {
            showToast('Error al procesar la solicitud', 'error');
        }
    });

    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            deleteModal.classList.add('hidden');
        }
    });

    deleteModal._bound = true;
}

function openEditModal(user) {
    const editModal = document.getElementById('edit-user-modal');
    if (!editModal) return;

    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-name').value = user.name;
    document.getElementById('edit-user-email').value = user.email;
    
    // Set document type
    const idTypeSelect = document.getElementById('edit-user-id-type');
    const customDocContainer = document.getElementById('edit-custom-doc-container');
    const customDocInput = document.getElementById('edit-user-custom-doc');
    const idNumberInput = document.getElementById('edit-user-id-number');
    
    if (idTypeSelect) {
        // Check if user.id_type is a custom value not in the dropdown
        const standardTypes = ['Tarjeta de Identidad', 'Cédula de Ciudadanía', 'Cédula de Extranjería', 'Permiso por Protección Temporal (PPT)', 'Pasaporte', 'Otro'];
        const userDocType = user.id_type || 'Cédula de Ciudadanía';
        const userCustomDocType = user.custom_doc_type || null;
        
        if (standardTypes.includes(userDocType) && userDocType !== 'Otro') {
            // Standard type that's not 'Otro'
            idTypeSelect.value = userDocType;
            if (customDocContainer) customDocContainer.style.display = 'none';
            if (customDocInput) customDocInput.value = '';
        } else if (userDocType === 'Otro' || userCustomDocType) {
            // 'Otro' with custom type
            idTypeSelect.value = 'Otro';
            if (customDocContainer) customDocContainer.style.display = 'block';
            if (customDocInput) customDocInput.value = userCustomDocType || userDocType;
        } else {
            // Unknown type - treat as standard
            idTypeSelect.value = userDocType;
            if (customDocContainer) customDocContainer.style.display = 'none';
            if (customDocInput) customDocInput.value = '';
        }
    }
    
    if (idNumberInput) {
        idNumberInput.value = user.id_number || '';
    }
    
    document.getElementById('edit-user-role').value = user.role || 'user';
    editModal.classList.remove('hidden');
}

function openDeleteModal(user) {
    const deleteModal = document.getElementById('delete-user-modal');
    if (!deleteModal) return;

    document.getElementById('delete-user-id').value = user.id;
    document.getElementById('delete-user-name').textContent = user.name;
    deleteModal.classList.remove('hidden');
}

function setupUserTableDelegation() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody || tbody._delegated) return;

    tbody.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-btn')) {
            const userId = target.getAttribute('data-user-id');
            const user = allUsers.find(u => String(u.id) === String(userId));
            if (user) openEditModal(user);
        } else if (target.classList.contains('delete-btn')) {
            const userId = target.getAttribute('data-user-id');
            const user = allUsers.find(u => String(u.id) === String(userId));
            if (user) openDeleteModal(user);
        }
    });

    tbody._delegated = true;
}


// ===== FUNCIONES PARA INSCRIPCIONES (admin-inscripciones) =====
let allInscriptions = [];

// ===== FUNCIONES PARA SOLICITUDES DE SERVICIO (asesorías) =====
let allAdvisories = [];
let currentServiceFilter = 'all';

function getServiceTypeLabel(item) {
    if (!item) return 'N/A';

    // Usar las nuevas columnas separadas si existen
    const type = item.service_type || item.advisory_type || '';

    if (type === 'asesoria' || item.advisory_type) {
        const tipo = item.advisory_type === 'asesoria_personal' ? 'Personal' : 'Negocio';
        const servicio = item.advisory_service ? item.advisory_service.replace(/_/g, ' ') : '';
        const modalidad = item.advisory_mode || '';
        return tipo + (servicio ? ' - ' + servicio : '') + (modalidad ? ' - ' + modalidad : '');
    }

    if (type === 'curso' || item.advisory_service?.startsWith('curso')) {
        return 'Curso: ' + (item.advisory_service ? item.advisory_service.replace(/_/g, ' ') : '');
    }

    if (type === 'evento' || item.event_name) {
        return 'Evento: ' + (item.event_name || item.advisory_service || '');
    }

    // Fallback para formato legacy
    const service = item.service || item.advisory_service || '';
    if (service.includes('|')) {
        const parts = service.split('|');
        return parts.map(p => p.replace(/_/g, ' ')).join(' - ');
    }

    if (service.startsWith('asesoria_')) {
        if (service === 'asesoria_personal') return 'Asesoría Personal';
        if (service === 'asesoria_negocio') return 'Asesoría para Negocio';
        if (service === 'asesoria_evento') return 'Asesoría para Evento';
        return 'Asesoría';
    }
    if (service === 'curso') return 'Curso';
    if (service === 'cata') return 'Cata de Cacao';
    if (service === 'bomba') return 'Bombonería';
    return service;
}

function getServiceCategory(item) {
    if (!item) return 'other';

    // Usar las nuevas columnas separadas si existen
    const type = item.service_type || item.advisory_type || '';

    if (type === 'asesoria' || item.advisory_type?.includes('asesoria')) {
        return 'asesoria';
    }
    if (type === 'curso') {
        return 'curso';
    }
    if (type === 'evento') {
        return 'evento';
    }

    // Fallback para formato legacy
    const service = item.service || item.advisory_service || '';

    if (service.includes('asesoria_personal') || service.includes('asesoria_negocio')) {
        return 'asesoria';
    }
    if (service.includes('asesoria')) return 'asesoria';
    if (service.includes('evento_personal') || service.includes('evento_negocio')) {
        return 'evento';
    }
    if (service.startsWith('cata') || service.includes('cata')) return 'cata';
    if (service.startsWith('bomboneria') || service.includes('bomboneria') || service === 'bomba') return 'bomba';

    // Por título del curso
    const lowerService = service.toLowerCase();
    if (lowerService.includes('asesoria')) return 'asesoria';
    if (lowerService.includes('cata')) return 'cata';
    if (lowerService.includes('bomboneria') || lowerService.includes('bomba')) return 'bomba';
    if (lowerService.includes('curso') || lowerService.includes('pasteleria')) return 'curso';

    return 'other';
}

function updateAdvisoriesHeader(filter) {
    const header = document.getElementById('advisories-header');
    if (!header) return;

    let headerHtml = `
        <th class="pb-3 text-gray-300">ID</th>
        <th class="pb-3 text-gray-300">Usuario</th>
        <th class="pb-3 text-gray-300">Email</th>
        <th class="pb-3 text-gray-300">Teléfono</th>
    `;

    if (filter === 'asesoria') {
        headerHtml += `
            <th class="pb-3 text-gray-300">Tipo de Asesoría</th>
            <th class="pb-3 text-gray-300">Precio</th>
            <th class="pb-3 text-gray-300">Pago</th>
            <th class="pb-3 text-gray-300">Fecha</th>
            <th class="pb-3 text-gray-300">Hora</th>
        `;
    } else if (filter === 'curso') {
        headerHtml += `
            <th class="pb-3 text-gray-300">Servicio</th>
            <th class="pb-3 text-gray-300">Fecha</th>
            <th class="pb-3 text-gray-300">Hora</th>
        `;
    } else if (filter === 'cata') {
        headerHtml += `
            <th class="pb-3 text-gray-300">Servicio</th>
            <th class="pb-3 text-gray-300">Fecha</th>
            <th class="pb-3 text-gray-300">Hora</th>
        `;
    } else if (filter === 'bomba') {
        headerHtml += `
            <th class="pb-3 text-gray-300">Servicio</th>
            <th class="pb-3 text-gray-300">Fecha</th>
            <th class="pb-3 text-gray-300">Hora</th>
        `;
    } else {
        headerHtml += `
            <th class="pb-3 text-gray-300">Tipo</th>
            <th class="pb-3 text-gray-300">Fecha</th>
            <th class="pb-3 text-gray-300">Hora</th>
        `;
    }

    headerHtml += `
        <th class="pb-3 text-gray-300">Estado</th>
        <th class="pb-3 text-gray-300">Acción</th>
    `;

    header.innerHTML = headerHtml;
}

async function loadAdvisories(filter = 'all') {
    try {
        const response = await fetch('/backend/api/advisories-get.php');
        const result = await response.json();
        const tbody = document.getElementById('advisories-tbody');
        if (!tbody) return;

        updateAdvisoriesHeader(filter);

        if (result.success && result.data.length > 0) {
            allAdvisories = result.data;

            // Filtrar por categoría
            let filtered = result.data;
            if (filter !== 'all') {
                filtered = result.data.filter(item => {
                    const category = getServiceCategory(item.service);
                    return category === filter;
                });
            }

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" class="py-6 text-center text-gray-400">No hay solicitudes en esta categoría.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            filtered.forEach((advisory) => {
                const statusClass = advisory.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                    advisory.status === 'confirmed' ? 'bg-green-900 text-green-300' :
                    advisory.status === 'completed' ? 'bg-blue-900 text-blue-300' : 'bg-red-900 text-red-300';
                const statusLabel = advisory.status === 'pending' ? 'Pendiente' :
                    advisory.status === 'confirmed' ? 'Confirmado' :
                    advisory.status === 'completed' ? 'Completado' : 'Cancelado';

                const paymentStatusClass = advisory.payment_status === 'paid' ? 'bg-green-900 text-green-300' :
                    advisory.payment_status === 'rejected' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300';
                const paymentStatusLabel = advisory.payment_status === 'paid' ? 'Pagado' :
                    advisory.payment_status === 'rejected' ? 'Rechazado' : 'Pendiente';

                const priceStr = advisory.price ? '$' + Number(advisory.price).toLocaleString('es-CO') : 'N/A';
                const receiptBtn = advisory.payment_receipt ?
                    '<button type="button" class="view-advisory-receipt-btn px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs mb-1" data-receipt="' + advisory.payment_receipt + '">Ver Comprobante</button>' : '';

                const typeLabel = getServiceTypeLabel(advisory);

                let rowCells = '';
                if (filter === 'asesoria') {
                    rowCells = `
                        <td class="py-3 text-gray-400 text-sm">${typeLabel}</td>
                        <td class="py-3 text-gray-400 text-sm">${priceStr}</td>
                        <td class="py-3">
                            <span class="px-2 py-1 ${paymentStatusClass} rounded-full text-xs">${paymentStatusLabel}</span>
                        </td>
                        <td class="py-3 text-gray-400 text-sm">${advisory.date ? new Date(advisory.date).toLocaleDateString('es-ES') : 'N/A'}</td>
                        <td class="py-3 text-gray-400 text-sm">${advisory.time || 'N/A'}</td>
                    `;
                } else if (filter === 'curso' || filter === 'cata' || filter === 'bomba') {
                    rowCells = `
                        <td class="py-3 text-gray-400 text-sm">${typeLabel}</td>
                        <td class="py-3 text-gray-400 text-sm">${advisory.date ? new Date(advisory.date).toLocaleDateString('es-ES') : 'N/A'}</td>
                        <td class="py-3 text-gray-400 text-sm">${advisory.time || 'N/A'}</td>
                    `;
                } else {
                    rowCells = `
                        <td class="py-3 text-gray-400 text-sm">${typeLabel}</td>
                        <td class="py-3 text-gray-400 text-sm">${advisory.date ? new Date(advisory.date).toLocaleDateString('es-ES') : 'N/A'}</td>
                        <td class="py-3 text-gray-400 text-sm">${advisory.time || 'N/A'}</td>
                    `;
                }

                const row = document.createElement('tr');
                row.className = 'border-b border-gray-800';
                row.innerHTML = `
                    <td class="py-3 text-gray-400 text-sm">${String(advisory.id).padStart(3, '0')}</td>
                    <td class="py-3 text-white text-sm">${advisory.user_name || advisory.client_name || 'N/A'}</td>
                    <td class="py-3 text-gray-400 text-sm">${advisory.email}</td>
                    <td class="py-3 text-gray-400 text-sm">${advisory.phone || 'N/A'}</td>
                    ${rowCells}
                    <td class="py-3">
                        <span class="px-2 py-1 ${statusClass} rounded-full text-xs">${statusLabel}</span>
                    </td>
                    <td class="py-3">
                        <div class="flex flex-col space-y-1">
                            ${receiptBtn}
                            ${filter === 'asesoria' ? `
                                <button type="button" class="advisory-payment-btn px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs" data-id="${advisory.id}" data-status="paid">Aprobar Pago</button>
                                <button type="button" class="advisory-payment-btn px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs" data-id="${advisory.id}" data-status="rejected">Rechazar</button>
                            ` : `
                                <select class="advisory-status-select bg-gray-700 text-white text-xs rounded px-1" data-advisory-id="${advisory.id}">
                                    <option value="pending" ${advisory.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                                    <option value="confirmed" ${advisory.status === 'confirmed' ? 'selected' : ''}>Confirmado</option>
                                    <option value="completed" ${advisory.status === 'completed' ? 'selected' : ''}>Completado</option>
                                    <option value="cancelled" ${advisory.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                                </select>
                            `}
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            allAdvisories = [];
            tbody.innerHTML = '<tr><td colspan="10" class="py-6 text-center text-gray-400">No hay solicitudes de servicio.</td></tr>';
        }
    } catch (error) {
        const tbody = document.getElementById('advisories-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="10" class="py-6 text-center text-red-300">Error al cargar solicitudes.</td></tr>';
        }
    }
}

function setupAdvisoriesDelegation() {
    const tbody = document.getElementById('advisories-tbody');
    if (!tbody || tbody._delegated) return;

    // Configurar botones de filtro
    const filterBtns = document.querySelectorAll('.service-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const filter = btn.getAttribute('data-filter');
            currentServiceFilter = filter;

            // Actualizar estilos de botones
            filterBtns.forEach(b => {
                b.classList.remove('bg-purple-600');
                b.classList.add('bg-gray-700');
            });
            btn.classList.remove('bg-gray-700');
            btn.classList.add('bg-purple-600');

            await loadAdvisories(filter);
        });
    });

    tbody.addEventListener('click', async (e) => {
        // Ver comprobante de asesoría
        if (e.target.classList.contains('view-advisory-receipt-btn')) {
            const receipt = e.target.getAttribute('data-receipt');
            if (receipt) {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50';
                modal.innerHTML = `
                    <div class="bg-gray-800 p-4 rounded-lg max-w-2xl">
                        <img src="${receipt}" alt="Comprobante de pago" class="max-w-full max-h-[80vh] rounded">
                        <button onclick="this.closest('.fixed').remove()" class="mt-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 w-full">Cerrar</button>
                    </div>
                `;
                document.body.appendChild(modal);
            }
        }

        // Botones de pago de asesoría
        if (e.target.classList.contains('advisory-payment-btn')) {
            const id = e.target.getAttribute('data-id');
            const status = e.target.getAttribute('data-status');

            try {
                const response = await fetch('/backend/api/advisory-payment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, payment_status: status })
                });
                const result = await response.json();
                if (result.success) {
                    showToast(status === 'paid' ? 'Pago aprobado' : 'Pago rechazado');
                    await loadAdvisories(currentServiceFilter);
                } else {
                    showToast(result.message || 'Error', 'error');
                }
            } catch (error) {
                showToast('Error al actualizar pago', 'error');
            }
        }
    });

    tbody.addEventListener('change', async (e) => {
        if (e.target.classList.contains('advisory-status-select')) {
            const id = e.target.getAttribute('data-advisory-id');
            const status = e.target.value;

            try {
                const response = await fetch('/backend/api/advisory-update.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, status })
                });
                const result = await response.json();
                if (result.success) {
                    showToast('Estado actualizado');
                } else {
                    showToast(result.message || 'Error al actualizar', 'error');
                    await loadAdvisories(currentServiceFilter);
                }
            } catch (error) {
                showToast('Error al actualizar estado', 'error');
                await loadAdvisories(currentServiceFilter);
            }
        }
    });

    tbody._delegated = true;
}

async function loadInscriptionList() {
    try {
        const response = await fetch('/backend/api/inscripciones-get.php');
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            allInscriptions = result.data;
            const tbody = document.getElementById('inscriptions-tbody');
            if (!tbody) return;

            tbody.innerHTML = '';
            result.data.forEach((inscription) => {
                const statusClass = inscription.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                    inscription.status === 'confirmed' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300';
                const statusLabel = inscription.status === 'pending' ? 'Pendiente' :
                    inscription.status === 'confirmed' ? 'Confirmado' : 'Completado';

                const paymentStatusClass = inscription.payment_status === 'paid' ? 'bg-green-900 text-green-300' :
                    inscription.payment_status === 'rejected' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300';
                const paymentStatusLabel = inscription.payment_status === 'paid' ? 'Pagado' :
                    inscription.payment_status === 'rejected' ? 'Rechazado' : 'Pendiente';

                const receiptBtn = inscription.payment_receipt ?
                    '<button type="button" class="view-receipt-btn px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs" data-receipt="' + inscription.payment_receipt + '">Ver Comprobante</button>' : '';

                const priceStr = '$' + Number(inscription.course_price || 0).toLocaleString('es-CO');

                const row = document.createElement('tr');
                row.className = 'border-b border-gray-800';
                row.innerHTML = `
                    <td class="py-3 text-gray-400 text-sm">${String(inscription.id).padStart(3, '0')}</td>
                    <td class="py-3 text-white text-sm">${inscription.user_name || inscription.client_name || 'N/A'}</td>
                    <td class="py-3 text-gray-400 text-sm">${inscription.user_email || 'N/A'}</td>
                    <td class="py-3 text-gray-400 text-sm">${inscription.course_title || 'N/A'}</td>
                    <td class="py-3 text-gray-400 text-sm">${priceStr}</td>
                    <td class="py-3">
                        <span class="px-2 py-1 ${paymentStatusClass} rounded-full text-xs">${paymentStatusLabel}</span>
                    </td>
                    <td class="py-3 text-gray-400 text-sm">${new Date(inscription.registration_date).toLocaleDateString('es-ES')}</td>
                    <td class="py-3">
                        <span class="px-2 py-1 ${statusClass} rounded-full text-xs">${statusLabel}</span>
                    </td>
                    <td class="py-3">
                        <div class="flex space-x-1">
                            ${receiptBtn}
                            <button type="button" class="confirm-payment-btn px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs" data-inscription-id="${inscription.id}" data-payment-status="paid">Aprobar</button>
                            <button type="button" class="reject-payment-btn px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs" data-inscription-id="${inscription.id}" data-payment-status="rejected">Rechazar</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });

            // Configurar eventos para los botones de comprobante y pago
            setupInscriptionDelegation();
        } else {
            allInscriptions = [];
            const tbody = document.getElementById('inscriptions-tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="9" class="py-6 text-center text-gray-400">No hay inscripciones.</td></tr>';
            }
        }
    } catch (error) {
        const tbody = document.getElementById('inscriptions-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" class="py-6 text-center text-red-300">Error al cargar.</td></tr>';
        }
    }
}

function setupInscriptionDelegation() {
    const tbody = document.getElementById('inscriptions-tbody');
    if (!tbody || tbody._inscriptionDelegated) return;

    tbody.addEventListener('click', async function(e) {
        // Ver comprobante
        if (e.target.classList.contains('view-receipt-btn')) {
            const receipt = e.target.getAttribute('data-receipt');
            if (receipt) {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50';
                modal.innerHTML = `
                    <div class="bg-gray-800 p-4 rounded-lg max-w-2xl">
                        <img src="${receipt}" alt="Comprobante de pago" class="max-w-full max-h-[80vh] rounded">
                        <button onclick="this.closest('.fixed').remove()" class="mt-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 w-full">Cerrar</button>
                    </div>
                `;
                document.body.appendChild(modal);
            }
        }

        // Aprobar o rechazar pago
        if (e.target.classList.contains('confirm-payment-btn') || e.target.classList.contains('reject-payment-btn')) {
            const id = e.target.getAttribute('data-inscription-id');
            const status = e.target.getAttribute('data-payment-status');

            try {
                const response = await fetch('/backend/api/inscripciones.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'action=upload_receipt&id=' + id + '&payment_status=' + status
                });
                const result = await response.json();
                if (result.success) {
                    showToast(status === 'paid' ? 'Pago aprobado' : 'Pago rechazado');
                    loadInscriptionList();
                } else {
                    showToast(result.message || 'Error', 'error');
                }
            } catch (error) {
                showToast('Error al actualizar pago', 'error');
            }
        }
    });

    tbody._inscriptionDelegated = true;
}

// ===== Gestión de Contenido de Cursos =====
async function loadCourseContentOptions() {
    const select = document.getElementById('content-course-select');
    const filterSelect = document.getElementById('content-filter-select');
    if (!select && !filterSelect) return;

    try {
        const response = await fetch('/backend/api/courses.php');
        const result = await response.json();

        // Asegurar SOLO cursos.
        const raw = (result && result.success && Array.isArray(result.data)) ? result.data : [];
        const cursos = raw.filter(c => c && c.id != null && typeof c.title === 'string' && String(c.category || '').toLowerCase() === 'cursos');

        const cursosFallback = raw.filter(c => c && c.id != null && typeof c.title === 'string' && (
            String(c.category || '').toLowerCase() === 'curso' ||
            String(c.category || '').toLowerCase() === 'cursos'
        ));
        const cursosFinal = cursos.length > 0 ? cursos : cursosFallback;

        const seen = new Set();
        const cursosUnicos = [];
        for (const c of cursosFinal) {
            const id = String(c.id);
            if (seen.has(id)) continue;
            seen.add(id);
            cursosUnicos.push(c);
        }

        const cursosOrdenados = cursosUnicos.sort((a, b) => {
            const ta = (a.title || '').toString().toLowerCase();
            const tb = (b.title || '').toString().toLowerCase();
            if (ta < tb) return -1;
            if (ta > tb) return 1;
            return Number(a.id) - Number(b.id);
        });

        const populate = (element) => {
            if (!element) return;
            element.innerHTML = '<option value="">Selecciona un curso</option>';
            cursosOrdenados.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = course.title;
                element.appendChild(option);
            });
        };

        populate(select);
        populate(filterSelect);
    } catch (error) {
        console.error('Error cargando cursos:', error);
    }
}

async function loadCourseContent(courseId) {
    const container = document.getElementById('course-content-list');
    if (!container || !courseId) {
        if (typeof window.courseContentById === 'object') window.courseContentById = {};
        
        if (container) container.innerHTML = '<p class="text-gray-400 text-center py-6">Selecciona un curso para ver su contenido</p>';
        return;
    }

    container.innerHTML = '<p class="text-gray-400 text-center py-6">Cargando contenido...</p>';

    try {
        const response = await fetch('/backend/api/course-content.php?course_id=' + courseId);
        const result = await response.json();

        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            container.innerHTML = '';
            // Reset para evitar IDs mezclados entre cursos
            window.courseContentById = {};


            result.data.forEach(content => {
                // Guardar referencia para que el modal de editar pueda llenar campos
                window.courseContentById[String(content.id)] = content;
                const item = document.createElement('div');
                item.className = 'bg-gray-700 p-3 rounded-lg flex items-start gap-3';
                item.innerHTML = `
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <span class="text-amber-500 font-semibold">#${content.order_index}</span>
                            <h6 class="text-white font-medium">${content.title}</h6>
                        </div>
                        <p class="text-gray-400 text-sm mt-1">${content.description || 'Sin descripción'}</p>
                        <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            ${content.duration ? '<span>⏱ ' + content.duration + '</span>' : ''}
                            <span class="${content.is_active ? 'text-green-400' : 'text-red-400'}">${content.is_active ? '● Activo' : '○ Inactivo'}</span>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1">
                        <button class="edit-content-btn text-blue-400 hover:text-blue-300 text-xs" data-id="${content.id}" title="Editar">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button class="delete-content-btn text-red-400 hover:text-red-300 text-xs" data-id="${content.id}" title="Eliminar">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                `;
                container.appendChild(item);
            });
        } else {
            container.innerHTML = '<p class="text-gray-400 text-center py-6">Este curso aún no tiene contenido. Agrega el primer video.</p>';
        }
    } catch (error) {
        container.innerHTML = '<p class="text-red-400 text-center py-6">Error al cargar contenido</p>';
    }
}

async function saveCourseContent(action, data) {
    try {
        // course-content.php soporta: POST(create), PUT(update), DELETE(delete)
        const method = action === 'create' ? 'POST' : (action === 'update' ? 'PUT' : 'DELETE');
        const response = await fetch('/backend/api/course-content.php', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        // Si hay error HTTP, el backend puede no devolver JSON (evita romper por throw)
        const raw = await response.text();
        try {
            return JSON.parse(raw);
        } catch (e) {
            return { success: false, message: `Error HTTP ${response.status}: ${raw}` };
        }
    } catch (error) {
        return { success: false, message: 'Error de conexión' };
    }
}


function setupCourseContentManagement() {
    // Evitar inicialización doble (duplica opciones y listeners)
    if (window._courseContentManagementBound) return;
    window._courseContentManagementBound = true;

    loadCourseContentOptions();

    const courseSelect = document.getElementById('content-course-select');
    const addBtn = document.getElementById('add-content-btn');

    const filterSelect = document.getElementById('content-filter-select');

    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            if (this.value) {
                loadCourseContent(this.value);
            } else {
                document.getElementById('course-content-list').innerHTML = '<p class="text-gray-400 text-center py-6">Selecciona un curso para ver su contenido</p>';
            }
        });
    }

    if (addBtn) {
        addBtn.addEventListener('click', async function() {
            const courseId = document.getElementById('content-course-select').value;
            const title = document.getElementById('content-title').value.trim();
            const description = document.getElementById('content-description').value.trim();
            const videoUrl = document.getElementById('content-video-url').value.trim();
            const duration = document.getElementById('content-duration').value.trim();
            const orderIndex = document.getElementById('content-order').value;
            const filterSelect = document.getElementById('content-filter-select');

            if (!courseId) {
                showToast('Selecciona un curso', 'error');
                return;
            }
            if (!title || !videoUrl) {
                showToast('Título y URL del video son obligatorios', 'error');
                return;
            }

            const result = await saveCourseContent('create', {
                action: 'create',
                course_id: courseId,
                title: title,
                description: description,
                video_url: videoUrl,
                preview_url: null,
                duration: duration || null,
                order_index: orderIndex || 0
            });

            if (result.success) {
                showToast('Contenido agregado exitosamente');
                document.getElementById('content-title').value = '';
                document.getElementById('content-description').value = '';
                document.getElementById('content-video-url').value = '';
                document.getElementById('content-duration').value = '';
                document.getElementById('content-order').value = '';
                if (filterSelect && filterSelect.value === courseId) {
                    loadCourseContent(courseId);
                }
            } else {
                showToast(result.message || 'Error al guardar', 'error');
            }
        });
    }

    const contentList = document.getElementById('course-content-list');
    if (contentList) {
        contentList.addEventListener('click', async function(e) {
                const editBtn = e.target.closest('.edit-content-btn');
            const deleteBtn = e.target.closest('.delete-content-btn');

            if (editBtn || deleteBtn) {
                const id = (editBtn || deleteBtn).getAttribute('data-id');
                const courseId = document.getElementById('content-course-select').value;

                    if (deleteBtn) {
                        // Mostrar modal de confirmación (modal reusable en admin)
                        const modal = document.getElementById('delete-confirm-admin-modal');
                        const msg = document.getElementById('delete-confirm-admin-message');
                        const cancelBtn = document.getElementById('delete-confirm-admin-cancel');
                        const confirmBtn = document.getElementById('delete-confirm-admin-confirm');

                        if (modal && cancelBtn && confirmBtn) {
                            if (msg) msg.textContent = '¿Seguro que deseas eliminar esta lección?';
                            modal.classList.remove('hidden');

                            // Asegurar idempotencia del handler del confirm
                            confirmBtn.replaceWith(confirmBtn.cloneNode(true));
                            const confirmBtn2 = document.getElementById('delete-confirm-admin-confirm');

                            const finalConfirm = async () => {
                                confirmBtn2.disabled = true;
                                const result = await saveCourseContent('delete', { action: 'delete', id: id });
                                if (result.success) {
                                    showToast('Contenido eliminado');
                                    modal.classList.add('hidden');
                                    loadCourseContent(courseId);
                                } else {
                                    showToast(result.message || 'Error', 'error');
                                    confirmBtn2.disabled = false;
                                }
                            };

                            confirmBtn2.addEventListener('click', finalConfirm, { once: true });
                            cancelBtn.addEventListener('click', () => modal.classList.add('hidden'), { once: true });
                            modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.classList.add('hidden'); }, { once: true });

                        } else {
                            // Fallback: si no existe modal, eliminar directo
                            const result = await saveCourseContent('delete', { action: 'delete', id: id });
                            if (result.success) {
                                showToast('Contenido eliminado');
                                loadCourseContent(courseId);
                            } else {
                                showToast(result.message || 'Error', 'error');
                            }
                        }
                } else if (editBtn) {
                    // course-content.php no soporta GET ?id=...
                    // Usamos el listado actual para obtener los datos por id.
                    const d = (typeof window.courseContentById === 'object' && window.courseContentById) ? window.courseContentById[id] : null;
                    if (d) {
                        // Abrir modal de edición directamente
                        const modal = document.getElementById('edit-content-admin-modal');
                        if (!modal) {
                            // Fallback: si no existe el modal, usar los inputs inline
                            document.getElementById('content-title').value = d.title || '';
                            document.getElementById('content-description').value = d.description || '';
                            document.getElementById('content-video-url').value = d.video_url || '';
                            document.getElementById('content-preview-url').value = d.preview_url || '';
                            document.getElementById('content-duration').value = d.duration || '';
                            document.getElementById('content-order').value = d.order_index || '';

                            const addBtn = document.getElementById('add-content-btn');
                            addBtn.textContent = 'Actualizar Contenido';
                            addBtn.onclick = async function() {
                                const updateResult = await saveCourseContent('update', {
                                    action: 'update',
                                    id: id,
                                    title: document.getElementById('content-title').value.trim(),
                                    description: document.getElementById('content-description').value.trim(),
                                    video_url: document.getElementById('content-video-url').value.trim(),
                                    preview_url: document.getElementById('content-preview-url').value.trim() || null,
                                    duration: document.getElementById('content-duration').value.trim() || null,
                                    order_index: document.getElementById('content-order').value || 0,
                                    is_active: d.is_active
                                });
                                if (updateResult.success) {
                                    showToast('Contenido actualizado');
                                    addBtn.textContent = 'Agregar Contenido';
                                    addBtn.onclick = null;
                                    setupCourseContentManagement();
                                    loadCourseContent(courseId);
                                } else {
                                    showToast(updateResult.message || 'Error', 'error');
                                }
                            };
                            return;
                        }

                        // Llenar formulario del modal
                        document.getElementById('edit-content-id').value = id;
                        document.getElementById('edit-content-title').value = d.title || '';
                        document.getElementById('edit-content-description').value = d.description || '';
                        document.getElementById('edit-content-video-url').value = d.video_url || '';
                        document.getElementById('edit-content-preview-url').value = d.preview_url || '';
                        document.getElementById('edit-content-duration').value = d.duration || '';
                        document.getElementById('edit-content-order').value = d.order_index || 0;

                        // Asegurar listeners idempotentes del modal
                        if (!window._editContentAdminModalBound) {
                            window._editContentAdminModalBound = true;

                            const cancelBtn = document.getElementById('cancel-edit-content-admin');
                            const confirmBtn = document.getElementById('confirm-edit-content-admin');

                            cancelBtn.addEventListener('click', () => modal.classList.add('hidden'), { once: false });
                            modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.classList.add('hidden'); });

                            confirmBtn.addEventListener('click', async () => {
                                const editId = document.getElementById('edit-content-id').value;
                                const updateResult = await saveCourseContent('update', {
                                    action: 'update',
                                    id: editId,
                                    title: document.getElementById('edit-content-title').value.trim(),
                                    description: document.getElementById('edit-content-description').value.trim(),
                                    video_url: document.getElementById('edit-content-video-url').value.trim(),
                                    preview_url: document.getElementById('edit-content-preview-url').value.trim() || null,
                                    duration: document.getElementById('edit-content-duration').value.trim() || null,
                                    order_index: document.getElementById('edit-content-order').value || 0,
                                    is_active: d.is_active
                                });

                                if (updateResult.success) {
                                    showToast('Contenido actualizado');
                                    modal.classList.add('hidden');
                                    loadCourseContent(courseId);
                                } else {
                                    showToast(updateResult.message || 'Error', 'error');
                                }
                            });
                        }

                        modal.classList.remove('hidden');
                    };
                }
            }
        });
    }
}

// ===== DOMContentLoaded - detectar página y cargar datos =====
document.addEventListener('DOMContentLoaded', function() {
    const page = window.location.pathname;

    if (page.includes('admin-usuarios')) {
        // Búsqueda en tabla (email)
        setupUserEmailSearch();

        loadUsers();
        setupCreateUserForm();
        setupEditModal();
        setupDeleteModal();
        setupUserTableDelegation();
    } else if (page.includes('admin-servicios')) {
        loadCourses();
        setupCreateCourseForm();
        setupEditCourseModal();
        setupDeleteCourseModal();
        setupCourseTableDelegation();
        setupCourseContentManagement();
    } else if (page.includes('admin-inscripciones')) {
        loadInscriptionList();
        loadAdvisories();
        setupAdvisoriesDelegation();
    }
});

            // FIX: Forzar handler del API (script.js marca _bound y bloquea admin-tables.js)
(function(){
    // El handler duplicado puede interferir; se deja deshabilitado.
    return;
    var form = document.getElementById('create-user-form');
    if (!form) return;

    var apiHandler = async function(e) {
        e.preventDefault();

        var name = document.getElementById('user-name').value.trim();
        var email = document.getElementById('user-email').value.trim();
        var role = document.getElementById('user-role').value;
        var password = document.getElementById('user-password').value;

        if (!name || !email || !password) {
            showToast('Completa nombre, email y contraseña.', 'error');
            return;
        }

        try {
            var response = await fetch('/backend/api/users.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_user',
                    name: name, email: email, role: role, password: password
                }),
            });

            var result = await response.json();

            if (result.success) {
                showToast('Usuario creado exitosamente');
                form.reset();
                if (typeof loadUsers === 'function') loadUsers();
            } else {
                showToast(result.message || 'No se pudo crear', 'error');
            }
        } catch (error) {
            showToast('Error al procesar la solicitud', 'error');
        }
    };

})();
