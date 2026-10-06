// Profile page functionality
document.addEventListener('DOMContentLoaded', function() {
    let currentUserData = {};

    // Toggle password visibility
    window.togglePassword = function(inputId) {
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
    };

    // ===== Cargar datos del usuario =====
    async function loadUserData() {

        try {
            const response = await fetch('/backend/api/users.php?action=get_current_user', { credentials: 'include' });
            if (!response.ok) throw new Error('Error al obtener usuario');

            const data = await response.json();
            currentUserData = data;

            // Llenar datos personales
            document.getElementById('profile-name').value = data.name || '';
            document.getElementById('profile-fullname').value = data.full_name || data.name || '';
            if (document.getElementById('profile-id-type')) {
                document.getElementById('profile-id-type').value = data.id_type || 'CC';
                
                // Show/hide custom document field based on selected value
                const customDocContainer = document.getElementById('profile-custom-doc-container');
                const customDocInput = document.getElementById('profile-custom-doc');
                
                if (data.id_type === 'Otro' && data.custom_doc_type) {
                    if (customDocContainer) customDocContainer.style.display = 'block';
                    if (customDocInput) {
                        customDocInput.value = data.custom_doc_type;
                    }
                } else {
                    if (customDocContainer) customDocContainer.style.display = 'none';
                }
            }
            document.getElementById('profile-id-number').value = data.id_number || '';
            document.getElementById('profile-email').value = data.email || '';

            // Llenar preferencias de notificación
            // Normalizar valores recibidos desde BD (pueden venir como 0/1, '0'/'1', true/false)
            document.getElementById('notify-email-checkbox').checked = (data.notify_email == 1 || data.notify_email === true || data.notify_email === '1');
            document.getElementById('notify-whatsapp-checkbox').checked = (data.notify_whatsapp == 1 || data.notify_whatsapp === true || data.notify_whatsapp === '1');

            return data;
        } catch (error) {
            console.error('Error cargando datos del usuario:', error);
            showAlert('Error al cargar datos del usuario', 'error');
            return null;
        }
    }

    loadUserData();

    // Add event listener for document type select to show/hide custom field
    function setupProfileDocumentTypeListener() {
        const profileIdTypeSelect = document.getElementById('profile-id-type');
        const profileCustomDocContainer = document.getElementById('profile-custom-doc-container');
        const profileCustomDocInput = document.getElementById('profile-custom-doc');
        
        if (profileIdTypeSelect && profileCustomDocContainer) {
            profileIdTypeSelect.addEventListener('change', function() {
                if (this.value === 'Otro') {
                    profileCustomDocContainer.style.display = 'block';
                } else {
                    profileCustomDocContainer.style.display = 'none';
                    if (profileCustomDocInput) profileCustomDocInput.value = '';
                }
            });
        }
    }

    // Setup the listener after DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupProfileDocumentTypeListener);
    } else {
        setupProfileDocumentTypeListener();
    }

    // ===== Editar Información Personal =====
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const profileNameInput = document.getElementById('profile-name');
    const profileFullnameInput = document.getElementById('profile-fullname');
    const profileIdTypeSelect = document.getElementById('profile-id-type');
    const profileIdNumberInput = document.getElementById('profile-id-number');
    const profileEmailInput = document.getElementById('profile-email');

    // Add event listener for document type select to show/hide custom field
    if (profileIdTypeSelect) {
        profileIdTypeSelect.addEventListener('change', function() {
            const customDocContainer = document.getElementById('profile-custom-doc-container');
            const customDocInput = document.getElementById('profile-custom-doc');
            
            if (this.value === 'Otro') {
                if (customDocContainer) customDocContainer.style.display = 'block';
            } else {
                if (customDocContainer) customDocContainer.style.display = 'none';
                if (customDocInput) customDocInput.value = '';
            }
        });
    }

    if (editProfileBtn && profileNameInput && profileEmailInput) {
        // Inicialmente readonly/disabled
        profileNameInput.readOnly = true;
        profileEmailInput.readOnly = true;
        if (profileFullnameInput) profileFullnameInput.readOnly = true;
        if (profileIdTypeSelect) profileIdTypeSelect.disabled = true;
        if (profileIdNumberInput) profileIdNumberInput.readOnly = true;

        editProfileBtn.addEventListener('click', async function() {
            // Si ya está habilitado, no hacemos nada
            // Habilitar inputs
            profileNameInput.readOnly = false;
            profileEmailInput.readOnly = false;
            if (profileFullnameInput) profileFullnameInput.readOnly = false;
            if (profileIdTypeSelect) profileIdTypeSelect.disabled = false;
            if (profileIdNumberInput) profileIdNumberInput.readOnly = false;

            // Crear botones si no existen
            let actions = document.getElementById('profile-actions');
            if (!actions) {
                actions = document.createElement('div');
                actions.id = 'profile-actions';
                actions.className = 'flex justify-end gap-3 mt-4';
                const container = document.querySelector('.product-card.mb-8');
                // Inserción robusta: al final del bloque de Información Personal
                if (container) container.appendChild(actions);
                else document.body.appendChild(actions);
            }

            actions.innerHTML = `
                <button type="button" id="cancel-profile-edit" class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">Cancelar</button>
                <button type="button" id="save-profile-edit" class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">Guardar</button>
            `;

            const cancelBtn = document.getElementById('cancel-profile-edit');
            const saveBtn = document.getElementById('save-profile-edit');

            if (cancelBtn) {
                cancelBtn.addEventListener('click', function() {
                    profileNameInput.readOnly = true;
                    profileEmailInput.readOnly = true;
                    if (profileFullnameInput) profileFullnameInput.readOnly = true;
                    if (profileIdTypeSelect) profileIdTypeSelect.disabled = true;
                    if (profileIdNumberInput) profileIdNumberInput.readOnly = true;
                    // Restaurar valores originales
                    if (currentUserData.name) profileNameInput.value = currentUserData.name;
                    if (currentUserData.email) profileEmailInput.value = currentUserData.email;
                    if (currentUserData.full_name && profileFullnameInput) profileFullnameInput.value = currentUserData.full_name;
                    if (currentUserData.id_type && profileIdTypeSelect) profileIdTypeSelect.value = currentUserData.id_type;
                    if (currentUserData.id_number && profileIdNumberInput) profileIdNumberInput.value = currentUserData.id_number;
                    actions.remove();
                });
            }

            if (saveBtn) {
                saveBtn.addEventListener('click', async function() {
                        const name = profileNameInput.value.trim();
                        const email = profileEmailInput.value.trim();
                        const full_name = document.getElementById('profile-fullname') ? document.getElementById('profile-fullname').value.trim() : '';
                        const id_type_select = document.getElementById('profile-id-type');
                        const custom_doc_input = document.getElementById('profile-custom-doc');
                        
                        // Determine the actual document type and custom type
                        let id_type = id_type_select ? id_type_select.value : 'CC';
                        let custom_doc_type = null;
                        
                        // If the selected option was 'Otro' and there's a custom value, use the custom value
                        if (id_type_select && id_type_select.value === 'Otro' && custom_doc_input && custom_doc_input.value.trim() !== '') {
                            custom_doc_type = custom_doc_input.value.trim();
                        }
                        
                        const id_number = document.getElementById('profile-id-number') ? document.getElementById('profile-id-number').value.trim() : '';

                        if (!name || !email) {
                            showAlert('Nombre y email son requeridos', 'error');
                            return;
                        }

                        try {
                            const response = await fetch('/backend/api/profile-update.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ name, full_name, id_type, custom_doc_type, id_number, email })
                            });

                            const data = await response.json();
                            if (data.success) {
                                showAlert('Perfil actualizado exitosamente', 'success');
                                profileNameInput.readOnly = true;
                                profileEmailInput.readOnly = true;
                                // Restablecer readonly/disabled en los nuevos campos
                                const fnInput = document.getElementById('profile-fullname');
                                const idTypeSelect = document.getElementById('profile-id-type');
                                const idNumInput = document.getElementById('profile-id-number');
                                if (fnInput) fnInput.readOnly = true;
                                if (idTypeSelect) idTypeSelect.disabled = true;
                                if (idNumInput) idNumInput.readOnly = true;
                                actions.remove();

                                // refrescar valores locales
                                currentUserData = { ...currentUserData, name, full_name, id_type, custom_doc_type, id_number, email };
                            } else {
                            showAlert(data.message || 'Error al actualizar perfil', 'error');
                        }
                    } catch (err) {
                        console.error(err);
                        showAlert('Error de conexión con el servidor', 'error');
                    }
                });
            }
        });
    }

    // ===== Cambiar Contraseña =====
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const currentPassword = document.getElementById('current-password').value.trim();
            const newPassword = document.getElementById('new-password').value.trim();
            const confirmNewPassword = document.getElementById('confirm-new-password').value.trim();

            if (!currentPassword || !newPassword || !confirmNewPassword) {
                showAlert('Todos los campos son requeridos', 'error');
                return;
            }

            if (newPassword !== confirmNewPassword) {
                showAlert('Las contraseñas nuevas no coinciden', 'error');
                return;
            }

            if (newPassword === currentPassword) {
                showAlert('La nueva contraseña debe ser diferente a la actual', 'error');
                return;
            }

            try {
                const response = await fetch('/backend/api/password-change.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        currentPassword,
                        newPassword
                    })
                });

                const data = await response.json();

                if (data.success) {
                    showAlert('Contraseña actualizada exitosamente', 'success');
                    changePasswordForm.reset();
                } else {
                    showAlert(data.message || 'Error al cambiar contraseña', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('Error de conexión con el servidor', 'error');
            }
        });
    }

    // ===== Cambiar Pregunta de Seguridad =====
    const changeSecurityForm = document.getElementById('change-security-form');
    if (changeSecurityForm) {
        changeSecurityForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const verifyPassword = document.getElementById('security-verify-password').value.trim();
            const newQuestion = document.getElementById('new-security-question').value.trim();
            const newAnswer = document.getElementById('new-security-answer').value.trim();

            if (!verifyPassword || !newQuestion || !newAnswer) {
                showAlert('Todos los campos son requeridos', 'error');
                return;
            }

            try {
                const response = await fetch('/backend/api/update-security.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        password: verifyPassword,
                        security_question: newQuestion,
                        security_answer: newAnswer
                    })
                });

                const data = await response.json();

                if (data.success) {
                    showAlert('Pregunta de seguridad actualizada exitosamente', 'success');
                    changeSecurityForm.reset();
                } else {
                    showAlert(data.message || 'Error al cambiar pregunta de seguridad', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('Error de conexión con el servidor', 'error');
            }
        });
    }

    // ===== Guardar Preferencias de Notificación =====
    const notificationsForm = document.getElementById('notifications-form');
    if (notificationsForm) {
        notificationsForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const notify_email = document.getElementById('notify-email-checkbox').checked;
            const notify_whatsapp = document.getElementById('notify-whatsapp-checkbox').checked;

            try {
                // Debug (visible en consola)
                console.log('Guardando notificaciones:', { notify_email, notify_whatsapp });

                const response = await fetch('/backend/api/update-notifications.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        notify_email,
                        notify_whatsapp
                    })
                });

                const data = await response.json();
                console.log('Respuesta update-notifications:', data);

                if (data.success) {
                    showAlert('Preferencias de notificación guardadas exitosamente', 'success');

                    // Refrescar UI localmente: como la BD ya se actualizó,
                    // evitamos recargar (que podría sobrescribir por sesión/caché).
                    currentUserData.notify_email = notify_email;
                    currentUserData.notify_whatsapp = notify_whatsapp;

                    document.getElementById('notify-email-checkbox').checked = !!notify_email;
                    document.getElementById('notify-whatsapp-checkbox').checked = !!notify_whatsapp;
                } else {
                    showAlert(data.message || 'Error al guardar preferencias', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('Error de conexión con el servidor', 'error');
            }
        });
    }

    // ===== Eliminar Cuenta =====
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const deleteConfirmationModal = document.getElementById('delete-confirmation-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const confirmEmailInput = document.getElementById('confirm-email-input');

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async function() {
            if (!currentUserData.email) {
                const userData = await loadUserData();
                if (!userData) {
                    showAlert('No se pudo obtener el email del usuario', 'error');
                    return;
                }
            }

            deleteConfirmationModal.classList.remove('hidden');
            confirmEmailInput.value = '';
            confirmEmailInput.placeholder = `Escribe: ${currentUserData.email}`;
            confirmDeleteBtn.disabled = true;
            confirmEmailInput.focus();
        });
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', function() {
            deleteConfirmationModal.classList.add('hidden');
        });
    }

    if (confirmEmailInput) {
        confirmEmailInput.addEventListener('input', function() {
            const inputValue = this.value.trim().toLowerCase();
            const storedEmail = (currentUserData.email || '').toLowerCase();
            confirmDeleteBtn.disabled = (inputValue !== storedEmail);
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async function() {
            const inputValue = confirmEmailInput.value.trim().toLowerCase();
            const storedEmail = (currentUserData.email || '').toLowerCase();

            if (inputValue !== storedEmail) {
                showAlert('El email no coincide. Por favor ingresa: ' + currentUserData.email, 'error');
                return;
            }

            // Eliminar de una vez (sin ventana confirm adicional)
            deleteConfirmationModal.classList.add('hidden');
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.textContent = 'Eliminando...';

            try {
                const response = await fetch('/backend/api/usuarios.php', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        action: 'delete_account'
                    })
                });


                const data = await response.json();

                if (data.success) {
                    showAlert('Tu cuenta ha sido eliminada exitosamente.', 'success');
                    setTimeout(() => {
                    window.location.href = '/?i=1';
                    // Cerrar sesión para limpiar sesión local
                    try { if (typeof logout === 'function') logout(); } catch (e) {}
                    }, 2000);
                } else {
                    showAlert(data.message || 'No se pudo eliminar la cuenta', 'error');
                    confirmDeleteBtn.disabled = false;
                    confirmDeleteBtn.textContent = 'Eliminar Permanentemente';
                }
            } catch (error) {
                console.error('Error al eliminar cuenta:', error);
                showAlert('Error al procesar la solicitud. Intenta de nuevo.', 'error');
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.textContent = 'Eliminar Permanentemente';
            }
        });
    }

    if (deleteConfirmationModal) {
        deleteConfirmationModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    }
});