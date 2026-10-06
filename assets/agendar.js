// agendar.js - JavaScript para views/user/agendar.html
window.agendarJsLoaded = true;
(function() {
    'use strict';

    // Asegurar que la función closeComprobanteModal esté disponible
    window.closeComprobanteModal = function() {
        var modal = document.getElementById('comprobante-solicitud-modal');
        if (modal) modal.classList.add('hidden');
    };

    document.addEventListener('DOMContentLoaded', function() {
        // Función para normalizar texto (misma que en loadCatalogData)
        function normalizeServiceValue(text) {
            return text.toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        // Configurar modales de inscripción - redirigir a agendar.html con tipo y servicio
        window.showInscriptionModal = function(courseName, coursePrice) {
            var serviceValue = normalizeServiceValue(courseName);
            var typeMap = {
                cursos: 'curso', curso: 'curso',
                asesorias: 'asesoria', asesoria: 'asesoria',
                eventos: 'evento', evento: 'evento'
            };

            var cards = document.querySelectorAll('#courses-grid .product-card');
            for (var i = 0; i < cards.length; i++) {
                if (normalizeServiceValue(cards[i].getAttribute('data-title')) === serviceValue) {
                    var category = cards[i].getAttribute('data-category');
                    var type = typeMap[category] || 'curso';
                    var rawPrice = cards[i].getAttribute('data-price') || coursePrice;
                    window.location.href = 'agendar.html?type=' + type + '&service=' + encodeURIComponent(serviceValue) + '&price=' + encodeURIComponent(rawPrice);
                    return;
                }
            }

            window.location.href = 'agendar.html?service=' + encodeURIComponent(serviceValue) + '&price=' + encodeURIComponent(coursePrice);
        };

        window.closeInscriptionModal = function() {
            var modal = document.getElementById('inscriptionModal');
            if (modal) modal.classList.add('hidden');
        };

        // Mostrar detalles del curso en modal
        window.showCourseDetails = function(title, detail) {
            var modal = document.getElementById('courseDetailsModal');
            var titleEl = document.getElementById('courseTitle');
            var contentEl = document.getElementById('courseDetailsContent');
            if (!modal || !titleEl || !contentEl) return;
            titleEl.textContent = title;
            contentEl.textContent = detail || 'Sin detalles disponibles.';
            modal.classList.remove('hidden');
        };

        window.closeCourseDetails = function() {
            var modal = document.getElementById('courseDetailsModal');
            if (modal) modal.classList.add('hidden');
        };

        // ===== FUNCIONES MODAL DESCARGA COMPROBANTE (estilo historial) =====
        window.downloadInscriptionReceipt = function () {
            try {
                const src = window.__inscription_receipt_src;
                if (!src) {
                    const notify = window.showToast || window.alert;
                    notify('No hay comprobante disponible para descargar.', 'error');
                    return;
                }

                const a = document.createElement('a');
                a.href = src;
                a.download = 'comprobante_inscripcion';
                document.body.appendChild(a);
                a.click();
                a.remove();
            } catch (e) {
                const notify = window.showToast || window.alert;
                notify('Error al descargar el comprobante.', 'error');
            }
        };

        window.handleInscriptionReceiptClick = function (btn) {
            const receipt = btn && btn.getAttribute ? btn.getAttribute('data-receipt') : null;

            const modal = document.getElementById('comprobante-solicitud-modal'); // Cambiado para usar el nuevo modal
            const contentDiv = document.getElementById('comprobante-solicitud-content'); // Cambiado para usar el nuevo modal
            const titleEl = document.getElementById('comprobante-modal-title'); // Cambiado para usar el nuevo modal
            const downloadBtn = document.getElementById('download-inscription-receipt-btn'); // Ya estaba usando el botón correcto

            if (!modal || !contentDiv || !titleEl || !downloadBtn) return;

            titleEl.textContent = 'Comprobante de Pago';

            window.__inscription_receipt_src = receipt || null;

            if (receipt) {
                downloadBtn.classList.remove('hidden');
                downloadBtn.disabled = false;

                // (sin plantilla 1:1) render simple para no afectar el modal de "Ver más"
                contentDiv.innerHTML =
                    '<div class="flex justify-center w-full pt-0 pb-1">' +
                    '<img id="inscription-receipt-img" src="' + receipt + '" alt="Comprobante" class="max-h-[45vh] w-auto max-w-[420px] object-contain rounded" />' +
                    '</div>';
            } else {
                downloadBtn.classList.add('hidden');
                downloadBtn.disabled = true;
                contentDiv.innerHTML = '<div class="text-gray-300 text-sm">Sin comprobante</div>';
            }

            modal.classList.remove('hidden');
        };

        // ===== HANDLER DEL FORMULARIO DE AGENDAR =====
        const advisoryForm = document.getElementById('advisory-form');
        if (advisoryForm) {
            advisoryForm.addEventListener('submit', function(e) {
                e.preventDefault();

                const serviceType = document.querySelector('.service-type-btn.bg-purple-600')?.getAttribute('data-type') || 'asesoria';
                const termsCheckbox = document.getElementById('terms-checkbox');
                const notify = window.showToast || window.alert;

                if (!termsCheckbox?.checked) {
                    notify('Debes aceptar los términos y condiciones', 'error');
                    return;
                }

                let price, date, time, notes;

                let advisoryType = null, advisoryService = null, advisoryMode = null, eventName = null;
                let numPersons = 1;

                if (serviceType === 'asesoria') {
                    advisoryType = document.getElementById('advisory-subtype')?.value || '';
                    advisoryService = document.getElementById('advisory-service')?.value || '';
                    advisoryMode = document.getElementById('advisory-mode')?.value || '';
                    date = document.getElementById('advisory-date')?.value || '';
                    time = document.getElementById('advisory-time')?.value || '';
                    notes = document.getElementById('advisory-details')?.value || '';

                    const selectedOption = document.getElementById('advisory-service')?.selectedOptions[0];
                    price = selectedOption?.dataset?.price || 0;

                    if (advisoryType === 'asesoria_negocio') {
                        numPersons = parseInt(document.getElementById('advisory-asesoria-persons')?.value) || 1;
                    }
                } else if (serviceType === 'curso') {
                    advisoryService = document.getElementById('advisory-course')?.value || '';
                    price = document.getElementById('advisory-course')?.selectedOptions[0]?.dataset?.price || 0;

                    date = '';
                    time = '';
                    notes = '';
                } else if (serviceType === 'evento') {
                    eventName = document.getElementById('advisory-event')?.value || '';
                    numPersons = parseInt(document.getElementById('advisory-event-persons')?.value) || 1;

                    price = document.getElementById('advisory-event')?.selectedOptions[0]?.dataset?.price || 0;

                    date = '';
                    time = '';
                    notes = '';
                    advisoryService = eventName;
                }

                if (!advisoryService || advisoryService.trim() === '') {
                    notify('Servicio es Requerido', 'error');
                    return;
                }

                window.pendingFormData = {
                    phone: null,
                    service: advisoryService,
                    price: price,
                    date: date,
                    time: time,
                    notes: notes,
                    serviceType: serviceType,
                    numPersons: numPersons,
                    advisoryType: advisoryType,
                    advisoryService: advisoryService,
                    advisoryMode: advisoryMode,
                    eventName: eventName
                };

                window.pendingPrice = price;

                window.openPaymentModal({
                    reference: 'CHEF-' + Date.now(),
                    price: price
                });
            });
        }

        // ===== Configurar botones de tipo de servicio =====
        const serviceTypeBtns = document.querySelectorAll('.service-type-btn');
        const serviceFields = document.querySelectorAll('.service-fields');

        // Leer parámetros de URL si existen (desde el catálogo)
        const urlParams = new URLSearchParams(window.location.search);
        const preselectedType = urlParams.get('type');
        const preselectedService = urlParams.get('service');
        const urlPrice = urlParams.get('price');

        window.selectServiceByValue = function(selectId, value) {
            const select = document.getElementById(selectId);
            if (!select || !value) {
                console.warn('Select no encontrado o valor vacío:', selectId, value);
                return false;
            }
            const options = select.options;
            for (let i = 0; i < options.length; i++) {
                if (options[i].value === value) {
                    select.selectedIndex = i;
                    const event = new Event('change', { bubbles: true });
                    select.dispatchEvent(event);
                    return true;
                }
            }
            return false;
        };

        function activateServiceType(type) {
            const targetBtn = document.querySelector('.service-type-btn[data-type="' + type + '"]');
            if (!targetBtn) return;

            serviceTypeBtns.forEach(b => {
                b.classList.remove('bg-purple-600');
                b.classList.add('bg-gray-700');
            });
            targetBtn.classList.remove('bg-gray-700');
            targetBtn.classList.add('bg-purple-600');

            serviceFields.forEach(field => field.classList.add('hidden'));

            const targetFields = document.getElementById('fields-' + type);
            if (targetFields) targetFields.classList.remove('hidden');

            const commonFields = document.getElementById('common-fields-asesoria');
            const detailsField = document.getElementById('details-field-asesoria');

            if (type === 'curso' || type === 'evento') {
                if (commonFields) commonFields.classList.add('hidden');
                if (detailsField) detailsField.classList.add('hidden');
            } else {
                if (commonFields) commonFields.classList.remove('hidden');
                if (detailsField) detailsField.classList.remove('hidden');
            }
        }

        // ===== HANDLER VER COMPROBANTE EN TABLA SOLICITUDES =====
        function wireReceiptButtonsInSolicitudes() {
            const tbody = document.getElementById('solicitudes-tbody');
            if (!tbody) return;

            // Manejar eventos de la tabla de solicitudes
            tbody.addEventListener('click', function(e) {
                // Botón "Ver Comprobante"
                const receiptBtn = e.target && e.target.closest ? e.target.closest('.view-inscription-receipt-btn, .view-receipt-btn, .ver-comprobante-btn') : null;
                if (receiptBtn) {
                    const receipt = receiptBtn.getAttribute('data-receipt');
                    if (!receipt) return;

                    if (typeof window.handleInscriptionReceiptClick === 'function') {
                        window.handleInscriptionReceiptClick(receiptBtn);
                    }
                    return;
                }

                // Botón "Ver más" (detalles)
                const detailsBtn = e.target && e.target.closest ? e.target.closest('.ver-detalles-btn') : null;
                if (detailsBtn) {
                    const detalles = decodeURIComponent(detailsBtn.getAttribute('data-detalles'));
                    const contentDiv = document.getElementById('detalles-solicitud-content');
                    const titleEl = document.getElementById('detalles-modal-title');
                    
                    if (titleEl) titleEl.textContent = 'Detalles de la Solicitud';
                    
                    if (contentDiv) {
                        const lines = detalles.split('\n');
                        contentDiv.innerHTML = lines.map(function(line) {
                            return '<div class="py-2 border-b border-gray-700 last:border-0">' + line + '</div>';
                        }).join('');
                    }
                    
                    const modal = document.getElementById('detalles-solicitud-modal');
                    if (modal) {
                        // Ocultar botón de descarga en el modal de detalles
                        const downloadBtn = document.getElementById('download-inscription-receipt-btn');
                        if (downloadBtn) {
                            downloadBtn.classList.add('hidden');
                            downloadBtn.disabled = true;
                        }
                        modal.classList.remove('hidden');
                    }
                    return;
                }
            });
        }

        // ===== Cargar datos del catálogo =====
        async function loadCatalogData() {
            try {
                const response = await fetch('/backend/api/cursos-get.php');
                if (!response.ok) return;
                const result = await response.json();
                if (!result.success) return;

                const courses = result.data;
                const Asesorias = courses.filter(c => c.category === 'asesorias' || c.category === 'asesoria');
                const Cursos = courses.filter(c => c.category === 'cursos' || c.category === 'curso');
                const Eventos = courses.filter(c => c.category === 'eventos' || c.category === 'evento');

                const advisoryServiceSelect = document.getElementById('advisory-service');
                if (advisoryServiceSelect) {
                    advisoryServiceSelect.innerHTML = '<option value="">Seleccionar asesoría</option>';
                    Asesorias.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = normalizeServiceValue(c.title);
                        opt.textContent = c.title;
                        opt.dataset.price = Number(c.price) || 0;
                        advisoryServiceSelect.appendChild(opt);
                    });
                }

                const courseSelect = document.getElementById('advisory-course');
                if (courseSelect) {
                    courseSelect.innerHTML = '<option value="">Seleccionar curso</option>';
                    Cursos.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = normalizeServiceValue(c.title);
                        opt.textContent = c.title;
                        opt.dataset.price = Number(c.price) || 0;
                        courseSelect.appendChild(opt);
                    });
                }

                const eventSelect = document.getElementById('advisory-event');
                if (eventSelect) {
                    eventSelect.innerHTML = '<option value="">Seleccionar evento</option>';
                    Eventos.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = normalizeServiceValue(c.title);
                        opt.textContent = c.title;
                        opt.dataset.price = Number(c.price) || 0;
                        eventSelect.appendChild(opt);
                    });
                }

                if (preselectedType && preselectedService) {
                    const selectId = preselectedType === 'asesoria' ? 'advisory-service' :
                        preselectedType === 'curso' ? 'advisory-course' : 'advisory-event';

                    if (window.selectServiceByValue) {
                        window.selectServiceByValue(selectId, preselectedService);
                    }

                    if (urlPrice) {
                        const select = document.getElementById(selectId);
                        if (select && select.selectedIndex > 0) {
                            select.options[select.selectedIndex].dataset.price = Number(urlPrice) || 0;
                        }
                    }
                }
            } catch (e) {
                console.error('Error loading catalog data:', e);
            }
        }

        // ===== Cargar grid de cursos =====
        async function loadCoursesGrid() {
            try {
                const response = await fetch('/backend/api/cursos-get.php');
                const result = await response.json();
                if (!result.success) return;

                const grid = document.getElementById('courses-grid');
                if (!grid) return;

                const courses = result.data;
                grid.innerHTML = '';

                courses.forEach(function(course) {
                    var priceStr = '$' + Number(course.price).toLocaleString('es-CO');
                    var imageHtml = '';
                    if (course.image) {
                        imageHtml = '<img src="' + course.image + '" alt="' + course.title + '" class="h-auto w-auto object-cover rounded-lg mb-4 cursor-pointer" onclick="toggleCourseContent(' + course.id + ', this)" >';
                    }

                    var card = document.createElement('div');
                    card.className = 'product-card p-4 rounded-lg bg-gray-800';
                    card.setAttribute('data-category', course.category);
                    card.setAttribute('data-title', course.title);
                    card.setAttribute('data-detail', course.description_detail || course.description || '');
                    card.setAttribute('data-price', Number(course.price) || 0);
                    card.setAttribute('data-course-id', course.id);

                    var categoryColor = course.category === 'cursos' || course.category === 'curso' ? 'bg-purple-700' :
                        course.category === 'asesorias' || course.category === 'asesoria' ? 'bg-amber-600' :
                        course.category === 'eventos' || course.category === 'evento' ? 'bg-green-600' : 'bg-purple-700';
                    var categoryLabel = course.category === 'cursos' || course.category === 'curso' ? 'Curso' :
                        course.category === 'asesorias' || course.category === 'asesoria' ? 'Asesoría' :
                        course.category === 'eventos' || course.category === 'evento' ? 'Evento' : course.category;
                    var durationStr = course.duration ? '<p class="text-gray-500 text-xs mb-2">Duración: ' + course.duration + '</p>' : '';

                    card.innerHTML = imageHtml + `
                        <span class="inline-block px-2 py-1 text-xs font-semibold text-white ${categoryColor} rounded mb-2">${categoryLabel}</span>
                        <h3 class="text-lg font-semibold text-white mb-1 cursor-pointer hover:text-amber-400" onclick="toggleCourseContent(${course.id}, this)">${course.title}</h3>
                        ${durationStr}
                        <p class="text-gray-400 text-sm mb-3">${course.description}</p>
                        <div class="flex justify-between items-center">
                            <span class="text-amber-500 font-bold">${priceStr}</span>
                            <div class="flex gap-2">
                                <button class="btn-ver-detalles px-3 py-1 bg-purple-700 text-white rounded text-sm hover:bg-purple-600 transition-colors" onclick="event.stopPropagation(); showCourseDetails('${course.title.replace(/'/g, "\\'")}', '${(course.description_detail || course.description || '').replace(/'/g, "\\'")}')">Ver detalles</button>
                            </div>
                        </div>
                        <div class="mt-3">
                            <button class="inscribirse-btn w-full px-3 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 transition-colors">Inscribirse</button>
                        </div>
                        <div id="course-content-${course.id}" class="hidden mt-4 border-t border-gray-700 pt-4"></div>
                    `;

                    grid.appendChild(card);
                });

                setupCatalogFilters();
            } catch (e) {
                console.error('Error loading courses grid:', e);
            }
        }

        // Toggle mostrar/ocultar contenido del curso (lecciones)
        window.toggleCourseContent = async function(courseId, element) {
            const contentDiv = document.getElementById('course-content-' + courseId);
            if (!contentDiv) return;

            if (!contentDiv.classList.contains('hidden')) {
                contentDiv.classList.add('hidden');
                return;
            }

            if (contentDiv.innerHTML.trim() !== '') {
                contentDiv.classList.remove('hidden');
                return;
            }

            try {
                contentDiv.innerHTML = '<div class="text-gray-400 text-sm py-2">Cargando contenido...</div>';
                contentDiv.classList.remove('hidden');

                const response = await fetch('/backend/api/course-content-get.php?course_id=' + courseId);
                const result = await response.json();

                if (!result.success || !result.content || result.content.length === 0) {
                    contentDiv.innerHTML = '<div class="text-gray-500 text-sm py-2">Este curso aún no tiene lecciones disponibles.</div>';
                    return;
                }

                let lessonsHtml = '<div class="space-y-2">';
                result.content.forEach(function(lesson, index) {
                    var durationStr = lesson.duration ? lesson.duration : '';
                    var videoUrl = lesson.video_url || '';
                    var isYoutube = videoUrl.includes('youtu.be') || videoUrl.includes('youtube.com');

                    lessonsHtml += `
                        <div class="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <span class="flex items-center justify-center w-8 h-8 bg-purple-600 rounded-full text-white text-sm font-bold">${index + 1}</span>
                                <div>
                                    <p class="text-white text-sm font-medium">${lesson.title}</p>
                                    ${durationStr ? '<p class="text-gray-400 text-xs">' + durationStr + '</p>' : ''}
                                </div>
                            </div>
                            ${isYoutube ? '<a href="' + videoUrl + '" target="_blank" class="text-red-500 hover:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm4.97 5.545L7.5 9.063V5.937l5.567 3.608z"/></svg></a>' : ''}
                        </div>
                    `;
                });
                lessonsHtml += '</div>';

                contentDiv.innerHTML = lessonsHtml;
            } catch (e) {
                contentDiv.innerHTML = '<div class="text-red-400 text-sm py-2">Error al cargar contenido</div>';
            }
        };

        // Función para configurar los filtros del catálogo
        function setupCatalogFilters() {
            const filterButtons = document.querySelectorAll('.filter-btn');
            const courses = document.querySelectorAll('.product-card[data-category]');

            filterButtons.forEach(button => {
                button.addEventListener('click', function() {
                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');

                    const filter = this.getAttribute('data-filter');

                    courses.forEach(course => {
                        const categories = course.getAttribute('data-category').split(' ');
                        if (filter === 'all' || categories.includes(filter)) {
                            course.style.display = 'block';
                        } else {
                            course.style.display = 'none';
                        }
                    });
                });
            });
        }

        // Delegar eventos del grid de cursos
        var coursesGrid = document.getElementById('courses-grid');
        if (coursesGrid) {
            coursesGrid.addEventListener('click', function(e) {
                if (e.target.classList.contains('btn-ver-detalles')) {
                    e.stopPropagation();
                    var card = e.target.closest('.product-card');
                    if (card && typeof showCourseDetails === 'function') {
                        showCourseDetails(card.getAttribute('data-title'), card.getAttribute('data-detail'));
                    }
                    return;
                }

                if (e.target.classList.contains('inscribirse-btn')) {
                    var card = e.target.closest('.product-card');
                    if (card) {
                        var title = card.getAttribute('data-title');
                        var price = card.getAttribute('data-price');
                        var category = card.getAttribute('data-category');
                        var serviceValue = normalizeServiceValue(title);
                        var typeMap = {cursos: 'curso', curso: 'curso', asesorias: 'asesoria', asesoria: 'asesoria', eventos: 'evento', evento: 'evento'};
                        var type = typeMap[category] || 'curso';

                        activateServiceType(type);

                        setTimeout(function() {
                            var selectId = type === 'asesoria' ? 'advisory-service' : type === 'curso' ? 'advisory-course' : 'advisory-event';
                            if (window.selectServiceByValue) {
                                window.selectServiceByValue(selectId, serviceValue);
                            }

                            var select = document.getElementById(selectId);
                            if (select && select.selectedIndex > 0) {
                                select.options[select.selectedIndex].dataset.price = price;
                            }

                            var formElement = document.getElementById('advisory-form');
                            if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                    }
                }
            });
        }

        // Activar el tipo correcto desde URL
        if (preselectedType) {
            activateServiceType(preselectedType);
        }

        // Listener para mostrar/ocultar número de personas según tipo de asesoría
        const subtypeSelect = document.getElementById('advisory-subtype');
        const numPersonsContainer = document.getElementById('asesoria-num-persons-container');
        const numPersonsInput = document.getElementById('advisory-asesoria-persons');

        if (subtypeSelect) {
            subtypeSelect.addEventListener('change', function() {
                if (this.value === 'asesoria_negocio') {
                    if (numPersonsContainer) numPersonsContainer.classList.remove('hidden');
                    if (numPersonsInput) numPersonsInput.value = '';
                } else {
                    if (numPersonsContainer) numPersonsContainer.classList.add('hidden');
                    if (numPersonsInput) numPersonsInput.value = '1';
                }
            });
        }

// Configurar fecha mínima para asesorías (3 días después de hoy)
        function setMinDateForAdvisory() {
            const dateInput = document.getElementById('advisory-date');
            if (!dateInput) return;
            
            const today = new Date();
            const minDate = new Date(today);
            minDate.setDate(today.getDate() + 3);
            
            const year = minDate.getFullYear();
            const month = String(minDate.getMonth() + 1).padStart(2, '0');
            const day = String(minDate.getDate()).padStart(2, '0');
            
            dateInput.min = year + '-' + month + '-' + day;
            
            // Si el valor actual es anterior a la fecha mínima, limpiarlo
            if (dateInput.value && dateInput.value < dateInput.min) {
                dateInput.value = '';
            }
        }
        setMinDateForAdvisory();

        // Cargar datos y configurar
        loadCatalogData().catch(console.error);
loadCoursesGrid().catch(console.error);

        if (typeof loadMyAdvisories === 'function') {
            loadMyAdvisories().catch(console.error);
        }

        // Conectar botón "Ver Comprobante" si existe
        wireReceiptButtonsInSolicitudes();

        serviceTypeBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                activateServiceType(btn.getAttribute('data-type'));
            });
        });

        // ===== FUNCIONES MODAL DE PAGO NEQUI =====
        window.currentPaymentData = null;
        window.pendingPrice = urlPrice || null;

        window.openPaymentModal = function(serviceData) {
            window.currentPaymentData = serviceData;
            const modal = document.getElementById('payment-modal');
            const refSpan = document.getElementById('payment-reference');
            const amountSpan = document.getElementById('payment-amount');
            const paymentNumber = document.getElementById('payment-number');
            const paymentMethodSelect = document.getElementById('payment-method-select');

            if (refSpan) refSpan.textContent = serviceData.reference || 'PAGO-' + Date.now();

            var priceValue = serviceData.price;
            if (!priceValue && window.pendingPrice) priceValue = window.pendingPrice;

            if (amountSpan) {
                if (typeof priceValue === 'string' && priceValue.includes('$')) {
                    amountSpan.textContent = priceValue;
                } else {
                    var priceNum = parseFloat(priceValue) || 0;
                    amountSpan.textContent = '$' + priceNum.toLocaleString('es-CO');
                }
            }

            // Actualizar el número de pago según el método seleccionado
            if (paymentMethodSelect) {
                // Agregar evento para actualizar la información cuando cambie la selección
                paymentMethodSelect.onchange = function() {
                    updatePaymentInfo(this.value);
                };
                
                // Mostrar la información del primer método por defecto
                updatePaymentInfo(paymentMethodSelect.value);
            }

            if (modal) modal.classList.remove('hidden');
        };

        // Función para actualizar la información del pago según el método seleccionado
        function updatePaymentInfo(method) {
            const paymentNumber = document.getElementById('payment-number');
            if (!paymentNumber) return;

            paymentNumber.textContent = '322 945 2346';
        }

        window.openTerminosModal = function() {
            const modal = document.getElementById('terminos-modal');
            if (modal) modal.classList.remove('hidden');
        };

        window.closeTerminosModal = function() {
            const modal = document.getElementById('terminos-modal');
            if (modal) modal.classList.add('hidden');
        };

        window.closePaymentModal = function() {
            const modal = document.getElementById('payment-modal');
            if (modal) modal.classList.add('hidden');

            const input = document.getElementById('payment-receipt-input');
            if (input) input.value = '';

            window.currentPaymentData = null;
            window.pendingFormData = null;
        };

        window.submitPaymentReceipt = function() {
            const input = document.getElementById('payment-receipt-input');
            if (!input || !input.files || !input.files[0]) {
                const notify = window.showToast || window.alert;
                notify('Por favor adjunta el comprobante de pago', 'error');
                return;
            }

            const file = input.files[0];

            if (!file.type.startsWith('image/')) {
                const notify = window.showToast || window.alert;
                notify('Por favor sube una imagen del comprobante', 'error');
                return;
            }

            // Obtener el método de pago seleccionado
            const paymentMethodSelect = document.getElementById('payment-method-select');
            const paymentMethod = paymentMethodSelect ? paymentMethodSelect.value : 'nequi';

            const notify = window.showToast || window.alert;

            const reader = new FileReader();
            reader.onload = function(e) {
                const base64 = e.target.result;
                const formData = window.pendingFormData;
                if (!formData) {
                    notify('Error: Datos del formulario no disponibles', 'error');
                    return;
                }

                var payload = {
                    phone: null,
                    service: formData.service,
                    price: formData.price,
                    date: formData.date,
                    time: formData.time,
                    notes: formData.notes,
                    serviceType: formData.serviceType,
                    numPersons: formData.numPersons,
                    advisoryType: formData.advisoryType,
                    advisoryService: formData.advisoryService,
                    advisoryMode: formData.advisoryMode,
                    eventName: formData.eventName,
                    payment_method: paymentMethod  // Agregar el método de pago al payload
                };

                fetch('/backend/api/advisory-registration.php', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(resp => resp.json())
                .then(function(result) {
                    if (!result || !result.success) {
                        notify(result?.message || 'Error al registrar solicitud', 'error');
                        return Promise.reject(new Error('create failed'));
                    }

                    const registrationId = result.data && result.data.id ? result.data.id : null;
                    if (!registrationId) {
                        notify('ID de registro no disponible', 'error');
                        return Promise.reject(new Error('missing id'));
                    }

                    return fetch('/backend/api/advisory-receipt.php', {
                        method: 'PUT',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: registrationId, payment_receipt: base64, payment_method: paymentMethod })
                    }).then(resp => resp.json());
                })
                .then(function(result) {
                    if (result && result.success) {
                        notify('✓ Solicitud enviada con éxito. Te contactaremos pronto para confirmar.', 'success');
                        window.closePaymentModal();
                        input.value = '';
                        window.pendingFormData = null;

                        const advisoryForm = document.getElementById('advisory-form');
                        if (advisoryForm) advisoryForm.reset();

                        const successMessage = document.getElementById('success-message');
                        if (successMessage) {
                            successMessage.classList.remove('hidden');
                            setTimeout(function() {
                                successMessage.classList.add('hidden');
                            }, 5000);
                        }

                        setTimeout(function() {
                            if (typeof loadMyAdvisories === 'function') loadMyAdvisories();
                        }, 2000);
                    } else if (result) {
                        notify(result.message || 'Error al enviar comprobante', 'error');
                    }
                })
                .catch(function(err) {
                    // ya se notificó arriba en la mayoría de casos
                    console.error('Error:', err);
                });
            };

            reader.readAsDataURL(file);
        };
    });
})();

