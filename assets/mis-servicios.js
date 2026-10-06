// mis-servicios.js - Manejo de asesorias, eventos y cursos en la pagina de mis servicios

document.addEventListener('DOMContentLoaded', function() {
    loadAdvisoriesAndEvents();
});

async function loadAdvisoriesAndEvents() {
    try {
        const response = await fetch('/backend/api/my-advisories-events.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            document._cached_advisories = result.advisories || [];
            document._cached_events = result.events || [];
            
            displayAdvisories(result.advisories);
            displayEvents(result.events);
            
            updateCounters(result.advisories.length, result.events.length);
        } else {
            console.error('Error al cargar asesorías y eventos:', result.message);
            showToast(result.message || 'Error al cargar asesorías y eventos', 'error');
        }
    } catch (error) {
        console.error('Error de conexión al cargar asesorías y eventos:', error);
        showToast('Error de conexión', 'error');
    }
}

function updateCounters(advisoryCount, eventCount) {
    const advisoryCounter = document.querySelector('#advisory-list').closest('.product-card').querySelector('p.text-gray-300 span.text-white');
    if (advisoryCounter) {
        advisoryCounter.textContent = advisoryCount;
    }
    
    const eventCounter = document.querySelector('#event-list').closest('.product-card').querySelector('p.text-gray-300 span.text-white');
    if (eventCounter) {
        eventCounter.textContent = eventCount;
    }
}

function displayAdvisories(advisories) {
    const container = document.getElementById('advisory-list');
    if (!container) return;
    
    document._cached_advisories = advisories || [];
    
    if (!advisories || advisories.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-6">No tienes asesorías programadas</p>';
        return;
    }
    
    container.innerHTML = advisories.map(advisory => `
        <div class="bg-gradient-to-br from-gray-700 to-gray-800 p-6 rounded-xl shadow-xl border border-gray-600 transition-transform duration-300 hover:scale-[1.02]">
            <h5 class="text-xl font-semibold text-white mb-3">${advisory.advisory_service || 'Asesoría'}</h5>
            <div class="space-y-2 text-gray-300 mb-4">
                <p><strong>Fecha:</strong> ${formatDate(advisory.date)}</p>
                <p><strong>Hora:</strong> ${advisory.time || 'No especificada'}</p>
                <p><strong>Modalidad:</strong> ${advisory.advisory_mode || 'No especificada'}</p>
                <p><strong>Precio:</strong> <span class="text-amber-400">$${Number(advisory.price || 0).toLocaleString('es-CO')}</span></p>
            </div>
            <div class="flex justify-between items-center">
                <span class="px-2 py-1 ${getStatusClass(advisory.status)} rounded-full text-xs">${getStatusDisplay(advisory.status)}</span>
                <button class="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-300 font-medium" 
                        onclick="showAdvisoryDetails(${advisory.id}, 'asesoria')">Ver Detalles</button>
            </div>
        </div>
    `).join('');
}

function displayEvents(events) {
    const container = document.getElementById('event-list');
    if (!container) return;
    
    document._cached_events = events || [];
    
    if (!events || events.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-6">No tienes eventos programados</p>';
        return;
    }
    
    container.innerHTML = events.map(event => `
        <div class="bg-gradient-to-br from-gray-700 to-gray-800 p-6 rounded-xl shadow-xl border border-gray-600 transition-transform duration-300 hover:scale-[1.02]">
            <h5 class="text-xl font-semibold text-white mb-3">${event.event_name || event.advisory_service || 'Evento'}</h5>
            <div class="space-y-2 text-gray-300 mb-4">
                <p><strong>Fecha:</strong> ${formatDate(event.date)}</p>
                <p><strong>Hora:</strong> ${event.time || 'No especificada'}</p>
                <p><strong>Personas:</strong> ${event.num_persons || 1}</p>
                <p><strong>Precio:</strong> <span class="text-amber-400">$${Number(event.price || 0).toLocaleString('es-CO')}</span></p>
            </div>
            <div class="flex justify-between items-center">
                <span class="px-2 py-1 ${getStatusClass(event.status)} rounded-full text-xs">${getStatusDisplay(event.status)}</span>
                <button class="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-300 font-medium" 
                        onclick="showEventDetails(${event.id}, 'evento')">Ver Detalles</button>
            </div>
    `).join('');
}

function getStatusDisplay(status) {
    const statusMap = {
        'pending': 'Pendiente',
        'confirmed': 'Confirmado',
        'completed': 'Completado',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

function getStatusClass(status) {
    const statusMap = {
        'pending': 'bg-blue-900 text-blue-300',
        'confirmed': 'bg-green-900 text-green-300',
        'completed': 'bg-emerald-900 text-emerald-300',
        'cancelled': 'bg-red-900 text-red-300'
    };
    return statusMap[status] || 'bg-gray-900 text-gray-300';
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showAdvisoryDetails(id, type) {
    const allAdvisories = document._cached_advisories || [];
    const advisory = allAdvisories.find(a => a.id == id);
    
    if (advisory) {
        var lines = [
            '<div class="space-y-3">',
            '<div><strong>Servicio:</strong> ' + (advisory.advisory_service || 'No especificado') + '</div>',
            '<div><strong>Tipo:</strong> ' + (advisory.advisory_type || 'No especificado') + '</div>',
            '<div><strong>Fecha:</strong> ' + formatDate(advisory.date) + '</div>',
            '<div><strong>Hora:</strong> ' + (advisory.time || 'No especificada') + '</div>',
            '<div><strong>Modalidad:</strong> ' + (advisory.advisory_mode || 'No especificada') + '</div>',
            '<div><strong>Nombre:</strong> ' + (advisory.name || 'No especificado') + '</div>',
            '<div><strong>Email:</strong> ' + (advisory.email || 'No especificado') + '</div>',
            '<div><strong>Tel\u00e9fono:</strong> ' + (advisory.phone || 'No especificado') + '</div>',
            '<div><strong>Personas:</strong> ' + (advisory.num_persons || 1) + '</div>',
            '<div><strong>Precio:</strong> $' + Number(advisory.price || 0).toLocaleString('es-CO') + '</div>',
            '<div><strong>Estado:</strong> ' + getStatusDisplay(advisory.status) + '</div>',
            '<div><strong>Estado de Pago:</strong> ' + (advisory.payment_status || 'No especificado') + '</div>'
        ];
        if (advisory.payment_method) {
            lines.push('<div><strong>M\u00e9todo de pago:</strong> ' + advisory.payment_method.charAt(0).toUpperCase() + advisory.payment_method.slice(1) + '</div>');
        }
        if (advisory.notes) {
            lines.push('<div><strong>Notas:</strong> ' + advisory.notes + '</div>');
        }
        lines.push('</div>');
        
        showModal('Detalles de la Asesor\u00eda', lines.join(''));
    } else {
        fetchAdvisoryDetails(id, type, 'asesoria');
    }
}

function showEventDetails(id, type) {
    const allEvents = document._cached_events || [];
    const event = allEvents.find(e => e.id == id);
    
    if (event) {
        var lines = [
            '<div class="space-y-3">',
            '<div><strong>Evento:</strong> ' + (event.event_name || event.advisory_service || 'No especificado') + '</div>',
            '<div><strong>Tipo:</strong> ' + (event.advisory_type || 'No especificado') + '</div>',
            '<div><strong>Fecha:</strong> ' + formatDate(event.date) + '</div>',
            '<div><strong>Hora:</strong> ' + (event.time || 'No especificada') + '</div>',
            '<div><strong>Nombre:</strong> ' + (event.name || 'No especificado') + '</div>',
            '<div><strong>Email:</strong> ' + (event.email || 'No especificado') + '</div>',
            '<div><strong>Tel\u00e9fono:</strong> ' + (event.phone || 'No especificado') + '</div>',
            '<div><strong>Personas:</strong> ' + (event.num_persons || 1) + '</div>',
            '<div><strong>Precio:</strong> $' + Number(event.price || 0).toLocaleString('es-CO') + '</div>',
            '<div><strong>Estado:</strong> ' + getStatusDisplay(event.status) + '</div>',
            '<div><strong>Estado de Pago:</strong> ' + (event.payment_status || 'No especificado') + '</div>'
        ];
        if (event.payment_method) {
            lines.push('<div><strong>M\u00e9todo de pago:</strong> ' + event.payment_method.charAt(0).toUpperCase() + event.payment_method.slice(1) + '</div>');
        }
        if (event.notes) {
            lines.push('<div><strong>Notas:</strong> ' + event.notes + '</div>');
        }
        lines.push('</div>');
        
        showModal('Detalles del Evento', lines.join(''));
    } else {
        fetchAdvisoryDetails(id, type, 'evento');
    }
}

function showToast(message, type) {
    if (type === undefined) type = 'info';
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = 'p-4 rounded-lg shadow-lg ' + (
        type === 'error' ? 'bg-red-600' : 
        type === 'success' ? 'bg-green-600' : 'bg-blue-600'
    ) + ' text-white';
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(function() {
        toast.remove();
    }, 3000);
}

function fetchAdvisoryDetails(id, type, serviceType) {
    fetch('/backend/api/get-advisory-details.php?id=' + id + '&type=' + type, {
        method: 'GET',
        credentials: 'include'
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (data.success) {
            var details = data.advisory;
            var lines = [
                '<div class="space-y-3">',
                '<div><strong>Servicio:</strong> ' + (details.advisory_service || 'No especificado') + '</div>',
                '<div><strong>Tipo:</strong> ' + (details.advisory_type || 'No especificado') + '</div>',
                '<div><strong>Fecha:</strong> ' + formatDate(details.date) + '</div>',
                '<div><strong>Hora:</strong> ' + (details.time || 'No especificada') + '</div>',
                '<div><strong>Modalidad:</strong> ' + (details.advisory_mode || 'No especificada') + '</div>',
                '<div><strong>Nombre:</strong> ' + (details.name || 'No especificado') + '</div>',
                '<div><strong>Email:</strong> ' + (details.email || 'No especificado') + '</div>',
                '<div><strong>Tel\u00e9fono:</strong> ' + (details.phone || 'No especificado') + '</div>',
                '<div><strong>Personas:</strong> ' + (details.num_persons || 1) + '</div>',
                '<div><strong>Precio:</strong> $' + Number(details.price || 0).toLocaleString('es-CO') + '</div>',
                '<div><strong>Estado:</strong> ' + getStatusDisplay(details.status) + '</div>',
                '<div><strong>Estado de Pago:</strong> ' + (details.payment_status || 'No especificado') + '</div>'
            ];
            if (details.payment_method) {
                lines.push('<div><strong>M\u00e9todo de pago:</strong> ' + details.payment_method.charAt(0).toUpperCase() + details.payment_method.slice(1) + '</div>');
            }
            if (details.notes) {
                lines.push('<div><strong>Notas:</strong> ' + details.notes + '</div>');
            }
            lines.push('</div>');
            
            showModal(serviceType === 'asesoria' ? 'Detalles de la Asesor\u00eda' : 'Detalles del Evento', lines.join(''));
        } else {
            showToast(data.message || 'Error al obtener detalles', 'error');
        }
    })
    .catch(function(error) {
        console.error('Error al obtener detalles del ' + serviceType + ':', error);
        showToast('Error de conexi\u00f3n', 'error');
    });
}

function showModal(title, content) {
    var modal = document.getElementById('details-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'details-modal';
        modal.className = 'hidden fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50';
        modal.onclick = function(event) {
            if (event.target === modal) {
                closeModal();
            }
        };
        
        modal.innerHTML = 
            '<div class="bg-gray-800 p-6 rounded-xl max-w-lg mx-4 shadow-2xl border border-gray-700 w-full max-h-[90vh] overflow-y-auto">' +
                '<h3 id="modal-title" class="text-xl font-semibold text-white mb-4 border-b border-gray-600 pb-3"></h3>' +
                '<div id="modal-content" class="text-gray-300 space-y-2"></div>' +
                '<div class="flex justify-end mt-6">' +
                    '<button type="button" onclick="window.closeModal()" class="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">Cerrar</button>' +
                '</div>' +
            '</div>';
        
        document.body.appendChild(modal);
    }
    
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').innerHTML = content;
    
    modal.classList.remove('hidden');
}

window.closeModal = function() {
    var modal = document.getElementById('details-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// mis-servicios.js - Carga contenido de cursos para usuarios inscritos

async function loadMyCourses() {
    const container = document.getElementById('enrolled-courses');
    if (!container) return;

    try {
        const response = await fetch('/backend/api/inscripciones.php');
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            const paidCourses = result.data.filter(function(r) { 
                return r.payment_status === 'paid' && 
                    (!r.refund_status || r.refund_status !== 'approved');
            });

            if (paidCourses.length > 0) {
                container.innerHTML = '';
                for (var i = 0; i < paidCourses.length; i++) {
                    await loadCourseCard(container, {
                        id: paidCourses[i].course_id,
                        title: paidCourses[i].course_title
                    }, paidCourses[i]);
                }

                for (var j = 0; j < paidCourses.length; j++) {
                    refreshCourseProgress(paidCourses[j].course_id);
                }

                var totalLabel = document.querySelector('#enrolled-courses').closest('.product-card').querySelector('p.text-gray-300 span.text-white');
                if (totalLabel) totalLabel.textContent = String(paidCourses.length);

            } else {
                container.innerHTML = '<p class="text-gray-400 text-center py-6">No tienes cursos con pago aprobado.</p>';
            }
        } else {
            container.innerHTML = '<p class="text-gray-400 text-center py-6">No tienes cursos inscritos.</p>';
        }

    } catch (error) {
        container.innerHTML = '<p class="text-red-400 text-center py-6">Error al cargar cursos</p>';
    }
}

async function loadCourseCard(container, course, registration) {
    var progressPercent = typeof registration.progress_percent === 'number'
        ? registration.progress_percent
        : registration.status === 'completed'
            ? 100
            : (registration.progress || 0);

    var wrapper = document.createElement('div');
    wrapper.className = 'bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-600 transition-transform duration-300 hover:scale-[1.02]';

    var priceStr = registration.course_price ? '$' + Number(registration.course_price).toLocaleString('es-CO') : '';

    wrapper.innerHTML = 
        '<div class="p-6 cursor-pointer transition-colors" onclick="toggleCourseLessons(' + course.id + ')">' +
            '<div class="flex items-center justify-between gap-4">' +
                '<div class="flex-1">' +
                    '<h5 class="text-xl font-semibold text-white">' + course.title + '</h5>' +
                    '<p class="text-amber-400 text-sm mt-1">' + priceStr + '</p>' +
                '</div>' +
                '<div class="text-right">' +
                    '<span id="progress-label-' + course.id + '" class="text-amber-500 font-semibold">' + progressPercent + '%</span>' +
                    '<div class="w-28 bg-gray-600 rounded-full h-2 mt-1">' +
                        '<div id="progress-bar-' + course.id + '" class="bg-amber-500 h-2 rounded-full" style="width: ' + progressPercent + '%"></div>' +
                    '</div>' +
                '</div>' +
                '<svg id="arrow-' + course.id + '" class="w-6 h-6 text-gray-400 transform transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>' +
                '</svg>' +
            '</div>' +
        '</div>' +
        '<div id="course-lessons-' + course.id + '" class="hidden px-6 pb-6">' +
            '<div class="space-y-3">' +
                '<p class="text-gray-400 text-center py-4">Cargando contenido...</p>' +
            '</div>' +
        '</div>';
    container.appendChild(wrapper);
}

window.toggleCourseLessons = async function(courseId) {
    var contentDiv = document.getElementById('course-lessons-' + courseId);
    var arrow = document.getElementById('arrow-' + courseId);

    if (!contentDiv.classList.contains('hidden')) {
        contentDiv.classList.add('hidden');
        if (arrow) arrow.classList.remove('rotate-180');
        return;
    }

    contentDiv.classList.remove('hidden');
    if (arrow) arrow.classList.add('rotate-180');

    var lessonsContainer = contentDiv.querySelector('.space-y-3');
    if (lessonsContainer.children.length > 0 && lessonsContainer.querySelector('.bg-gray-700')) {
        return;
    }

    await loadCourseLessons(courseId, contentDiv);
};

async function loadCourseLessons(courseId, contentDiv, forceReload) {
    if (forceReload === undefined) forceReload = false;
    var lessonsContainer = contentDiv.querySelector('.space-y-3');
    if (!lessonsContainer) return;

    if (!forceReload && lessonsContainer.children.length > 0 && lessonsContainer.querySelector('.bg-gray-700')) {
        return;
    }

    lessonsContainer.innerHTML = '<p class="text-gray-400 text-center py-4">Cargando contenido...</p>';

    try {
        var response = await fetch('/backend/api/course-content-get.php?course_id=' + courseId, { credentials: 'include' });
        var result = await response.json();

        if (result.success && result.content && result.content.length > 0) {
            var total = result.content.length;
            var completedCount = result.content.filter(function(lesson) { return lesson.completed; }).length;
            var progressPercent = result.progress_percent || (total ? Math.round((completedCount / total) * 100) : 0);
            updateCourseProgress(courseId, progressPercent);

            lessonsContainer.innerHTML = '';
            result.content.forEach(function(lesson) {
                var lessonEl = document.createElement('div');
                lessonEl.className = 'bg-gray-700 p-4 rounded-lg relative';

                var videoId = extractYouTubeId(lesson.video_url);
                var seenBadge = lesson.completed ? '<span class="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-200 px-3 py-2 text-[10px] font-semibold mr-2 mb-2">&#10004;</span>' : '';

                var previewHtml = videoId 
                    ? '<img src="https://img.youtube.com/vi/' + videoId + '/mqdefault.jpg" alt="Preview" class="w-full h-full object-cover rounded" onerror="this.style.display=\'none\'">' 
                    : '<svg class="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C3.156 3.193 3 3.361 3 3.616v17.462c0 3.064 2.933 5.076 6.615 5.076h9.77c3.604 0 11.631-.245 15.23 0 3.897-.228 4.616-3.132 4.616-3.132V3.616c0-.255-.156-.423-.615-.423z"/></svg>';

                var durationHtml = lesson.duration ? '<span class="text-gray-500 text-xs mt-1 inline-block">&#9201; ' + lesson.duration + '</span>' : '';

                lessonEl.innerHTML = 
                    '<div class="flex items-start gap-3">' +
                        '<div class="flex-shrink-0 w-24 h-16 bg-gray-600 rounded flex items-center justify-center overflow-hidden">' +
                            previewHtml +
                        '</div>' +
                        '<div class="flex-1">' +
                            '<div class="flex items-center gap-2">' +
                                '<h6 class="text-white font-medium">' + lesson.order_index + '. ' + lesson.title + '</h6>' +
                            '</div>' +
                            '<p class="text-gray-400 text-sm mt-1">' + (lesson.description || 'Sin descripci\u00f3n') + '</p>' +
                            durationHtml +
                        '</div>' +
                        '<button onclick="openSecurePlayer(' + lesson.id + ', ' + courseId + ', \'' + lesson.title.replace(/'/g, "\\'") + '\')" class="flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded text-sm">' +
                            '&#9654;' +
                        '</button>' +
                    '</div>' + seenBadge;
                lessonsContainer.appendChild(lessonEl);
            });
        } else {
            lessonsContainer.innerHTML = '<p class="text-gray-400 text-sm">Este curso a\u00fan no tiene lecciones.</p>';
        }
    } catch (error) {
        lessonsContainer.innerHTML = '<p class="text-red-400 text-sm">Error al cargar contenido</p>';
    }
}

async function refreshCourseProgress(courseId) {
    var response = await fetch('/backend/api/course-content-get.php?course_id=' + courseId, { credentials: 'include' });
    var result = await response.json();

    if (result.success) {
        var progressPercent = result.progress_percent || 0;
        updateCourseProgress(courseId, progressPercent);

        var contentDiv = document.getElementById('course-lessons-' + courseId);
        if (contentDiv && !contentDiv.classList.contains('hidden')) {
            await loadCourseLessons(courseId, contentDiv, true);
        }
    }
}

function updateCourseProgress(courseId, progressPercent) {
    var label = document.getElementById('progress-label-' + courseId);
    var bar = document.getElementById('progress-bar-' + courseId);
    if (label) label.textContent = progressPercent + '%';
    if (bar) bar.style.width = progressPercent + '%';
}

function extractYouTubeId(url) {
    if (!url) return null;
    var patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];
    for (var i = 0; i < patterns.length; i++) {
        var match = url.match(patterns[i]);
        if (match) return match[1];
    }
    return null;
}

function openSecurePlayer(contentId, courseId, title) {
    var playerUrl = '/reproductor.php?content_id=' + contentId + '&course_id=' + courseId;
    window.open(playerUrl, '_blank', 'width=1024,height=600,menubar=no,location=no,resizable=yes,scrollbars=no,status=no');
}

function playLesson(videoUrl, title) {
    var videoId = extractYouTubeId(videoUrl);
    if (!videoId) {
        alert('URL de video no v\u00e1lida');
        return;
    }

    var modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50';
    modal.innerHTML = 
        '<div class="w-full max-w-4xl mx-4">' +
            '<div class="flex justify-between items-center mb-2">' +
                '<h4 class="text-white text-lg">' + title + '</h4>' +
                '<button onclick="this.closest(\'.fixed\').remove()" class="text-gray-400 hover:text-white">' +
                    '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>' +
                '</button>' +
            '</div>' +
            '<div class="aspect-video">' +
                '<iframe src="https://www.youtube.com/embed/' + videoId + '?autoplay=1" class="w-full h-full rounded" frameborder="0" allowfullscreen allow="autoplay"></iframe>' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);
}

window.addEventListener('message', async function(event) {
    if (event.origin !== window.location.origin) return;
    var data = event.data || {};
    if (data.type === 'lesson-completed' && data.courseId) {
        await refreshCourseProgress(data.courseId);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    var page = window.location.pathname;
    if (page.includes('mis-servicios')) {
        loadMyCourses();
        var script = document.createElement('script');
        script.src = 'mis-servicios-asesorias-eventos.js';
        document.head.appendChild(script);
    }
});
