// certificados.js — Carga, renderiza tarjetas y genera PDF profesional
(function () {
    // Almacén en memoria: evita serializar el objeto cert en atributos HTML
    // (JSON.stringify en onclick se rompe con comillas/caracteres especiales)
    var _certStore = {};

    // ── Cargar jsPDF desde CDN si no está disponible ──────────────────────────
    function loadJsPDF() {
        return new Promise(function (resolve) {
            if (window.jspdf && window.jspdf.jsPDF) return resolve();
            var script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        var d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function serviceTypeLabel(type) {
        var map = { curso: 'Curso', asesoria: 'Asesoría', evento: 'Evento' };
        return map[type] || 'Servicio';
    }

    // ── Carga de certificados desde la API ────────────────────────────────────
    async function loadCertificates() {
        try {
            var resp = await fetch('/backend/api/certificados.php');
            var result = await resp.json();
            if (result.success && result.data && result.data.length > 0) {
                renderCertificates(result.data);
            } else {
                renderEmptyState();
            }
        } catch (e) {
            console.error('Error cargando certificados:', e);
            renderEmptyState();
        }
    }

    // ── Renderizado de tarjetas ───────────────────────────────────────────────
    function renderCertificates(certificates) {
        var grid = document.getElementById('certificates-grid');
        if (!grid) return;
        grid.innerHTML = '';

        certificates.forEach(function (cert, index) {
            // Guardar referencia segura con clave simple
            var certKey = 'cert_' + index;
            _certStore[certKey] = cert;

            var title    = cert.service_title || cert.course_title || 'Servicio';
            var dateStr  = formatDate(cert.completion_date || cert.issue_date);
            var holder   = cert.holder_name || cert.user_full_name || cert.user_name || '—';
            var idType   = cert.holder_id_type || cert.user_id_type || '';
            var idNum    = cert.holder_id_number || cert.user_id_number || '—';
            var certNum  = cert.certificate_number || '—';
            var duration = cert.course_duration || '';
            var svcType  = serviceTypeLabel(cert.service_type);

            var card = document.createElement('div');
            card.className = 'cert-card relative flex flex-col bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden shadow-lg hover:shadow-amber-900/30 hover:border-amber-700 transition-all duration-300';

            var idRow = (idType && idNum !== '—')
                ? '<div class="flex items-start gap-2 text-gray-400">'
                    + '<svg class="w-4 h-4 mt-0.5 text-amber-700 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2"/></svg>'
                    + '<span>' + idType + ': ' + idNum + '</span>'
                    + '</div>'
                : '';

            var durationRow = duration
                ? '<p class="text-gray-500 text-sm mt-0.5">Duración: ' + duration + '</p>'
                : '';

            card.innerHTML =
                '<div class="h-1.5 w-full" style="background: linear-gradient(90deg, #92400e, #d97706, #92400e);"></div>'
                + '<div class="flex flex-col flex-1 p-6 gap-4">'
                +   '<div class="flex items-center justify-between">'
                +     '<span class="text-xs font-semibold tracking-widest uppercase text-amber-500">' + svcType + '</span>'
                +     '<span class="flex items-center gap-1.5 px-3 py-1 bg-emerald-900/50 border border-emerald-700 rounded-full text-emerald-400 text-xs font-medium">'
                +       '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>'
                +       'Válido'
                +     '</span>'
                +   '</div>'
                +   '<div>'
                +     '<h5 class="text-lg font-bold text-white leading-snug">' + title + '</h5>'
                +     durationRow
                +   '</div>'
                +   '<div class="border-t border-gray-700/60"></div>'
                +   '<div class="space-y-1.5 text-sm">'
                +     '<div class="flex items-start gap-2 text-gray-300">'
                +       '<svg class="w-4 h-4 mt-0.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>'
                +       '<span>' + holder + '</span>'
                +     '</div>'
                +     idRow
                +     '<div class="flex items-start gap-2 text-gray-400">'
                +       '<svg class="w-4 h-4 mt-0.5 text-amber-700 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>'
                +       '<span>' + dateStr + '</span>'
                +     '</div>'
                +   '</div>'
                +   '<div class="mt-auto pt-2">'
                +     '<p class="text-xs text-gray-600 font-mono tracking-wider">' + certNum + '</p>'
                +   '</div>'
                + '</div>'
                + '<div class="px-6 pb-5">'
                +   '<button data-cert-key="' + certKey + '" class="download-cert-btn w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-85" style="background: linear-gradient(90deg, #92400e, #b45309);">'
                +     '<span class="flex items-center justify-center gap-2 pointer-events-none">'
                +       '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>'
                +       'Descargar Certificado'
                +     '</span>'
                +   '</button>'
                + '</div>';

            // Adjuntar evento con referencia directa al objeto cert (sin JSON en HTML)
            card.querySelector('.download-cert-btn').addEventListener('click', function () {
                var key  = this.getAttribute('data-cert-key');
                var data = _certStore[key];
                if (data) generateCertificatePDF(data);
            });

            grid.appendChild(card);
        });
    }

    // ── Estado vacío ──────────────────────────────────────────────────────────
    function renderEmptyState() {
        var grid = document.getElementById('certificates-grid');
        if (!grid) return;
        grid.innerHTML =
            '<div class="col-span-full flex flex-col items-center justify-center py-16 text-center">'
            + '<svg class="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">'
            +   '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>'
            + '</svg>'
            + '<p class="text-gray-400 text-lg font-medium">No tienes certificados aún</p>'
            + '<p class="text-gray-600 text-sm mt-1">Completa un curso o asesoría para obtener tu certificado.</p>'
            + '</div>';
    }

    // ── Generador de PDF unificado ────────────────────────────────────────────
    async function generateCertificatePDF(cert) {
        await loadJsPDF();
        try {
            var jsPDFClass = window.jspdf && window.jspdf.jsPDF;
            if (!jsPDFClass) throw new Error('jsPDF no cargó correctamente');

            var doc = new jsPDFClass({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            var W = 297, H = 210;

            // ── Intentar cargar firma ─────────────────────────────────────────
            function loadImg(url) {
                return fetch(url, { cache: 'no-cache' })
                    .then(function(r) { return r.ok ? r.blob() : null; })
                    .then(function(b) {
                        return b ? new Promise(function(res) {
                            var fr = new FileReader();
                            fr.onloadend = function() { res(fr.result); };
                            fr.readAsDataURL(b);
                        }) : null;
                    }).catch(function() { return null; });
            }
            var signaturePath = new URL('/img/firma.png', window.location.href).href;
            var signatureData = await loadImg(signaturePath);

            // ── Fondo marfil ──────────────────────────────────────────────────
            doc.setFillColor(250, 247, 240);
            doc.rect(0, 0, W, H, 'F');

            // ── Doble borde dorado (ocupa toda la página) ─────────────────────
            doc.setDrawColor(180, 140, 60);
            doc.setLineWidth(1.2);
            doc.rect(8, 8, W - 16, H - 16);
            doc.setDrawColor(210, 175, 100);
            doc.setLineWidth(0.4);
            doc.rect(11, 11, W - 22, H - 22);

            // ── Ornamentos en esquinas ────────────────────────────────────────
            doc.setDrawColor(180, 140, 60);
            doc.setLineWidth(1);
            [[8, 8], [W - 8, 8], [8, H - 8], [W - 8, H - 8]].forEach(function(c) {
                var x = c[0], y = c[1], s = 6;
                var dx = x < W / 2 ? 1 : -1, dy = y < H / 2 ? 1 : -1;
                doc.line(x, y, x + dx * s, y);
                doc.line(x, y, x, y + dy * s);
            });

            // ── Marca de agua tenue ───────────────────────────────────────────
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(72);
            doc.setTextColor(230, 225, 215);
            doc.text('CHEF JONATHAN', W / 2, H / 2 + 8, { align: 'center' });

            // ── Título principal ──────────────────────────────────────────────
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(30);
            doc.setTextColor(60, 38, 10);
            doc.text('CERTIFICADO', W / 2, 36, { align: 'center' });

            // Subtítulo dinámico según tipo de servicio
            var svcType = (cert.service_type || 'curso').toLowerCase();
            var subtitleMap = {
                curso:    'DE CURSO Y PARTICIPACIÓN',
                asesoria: 'DE ASESORÍA PERSONALIZADA',
                evento:   'DE ASISTENCIA Y PARTICIPACIÓN'
            };
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(140, 100, 40);
            doc.text(subtitleMap[svcType] || 'DE PARTICIPACIÓN', W / 2, 45, { align: 'center' });

            // ── Líneas decorativas bajo título ────────────────────────────────
            doc.setDrawColor(180, 140, 60);
            doc.setLineWidth(0.6);
            doc.line(70, 49, W - 70, 49);
            doc.setLineWidth(0.2);
            doc.line(85, 51, W - 85, 51);

            // ── Texto de otorgamiento ─────────────────────────────────────────
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(80, 60, 30);
            doc.text('La presente institución certifica que:', W / 2, 62, { align: 'center' });

            // ── Nombre del titular ────────────────────────────────────────────
            var holderName = cert.holder_name || cert.user_full_name || cert.user_name || 'Participante';
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.setTextColor(40, 26, 10);
            doc.text(holderName.toUpperCase(), W / 2, 75, { align: 'center' });

            // ── Documento de identidad ────────────────────────────────────────
            var idType   = cert.holder_id_type || cert.user_id_type || '';
            var idNumber = cert.holder_id_number || cert.user_id_number || '';
            if (idType && idNumber) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(110, 80, 40);
                doc.text(idType + ': ' + idNumber, W / 2, 82, { align: 'center' });
            }

            // ── Texto de participación (dinámico por tipo) ────────────────────
            var participationTextMap = {
                curso:    'ha completado satisfactoriamente el curso',
                asesoria: 'ha participado en la asesoría personalizada',
                evento:   'ha asistido y participado en el evento'
            };
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(80, 60, 30);
            doc.text(participationTextMap[svcType] || 'ha completado satisfactoriamente', W / 2, 92, { align: 'center' });

            // ── Nombre del servicio ───────────────────────────────────────────
            var svcTitle = cert.service_title || cert.course_title || 'Servicio';
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(130, 80, 10);
            var titleLines = doc.splitTextToSize(svcTitle, 200);
            doc.text(titleLines, W / 2, 102, { align: 'center' });
            var cursorY = 102 + (titleLines.length - 1) * 7 + 8;

            // ── Campos extra según tipo ───────────────────────────────────────
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(110, 80, 40);

            if (svcType === 'curso') {
                var duration = cert.course_duration || '';
                if (duration) {
                    doc.text('Duración: ' + duration, W / 2, cursorY, { align: 'center' });
                    cursorY += 7;
                }
            } else if (svcType === 'asesoria') {
                var advisory_type = cert.advisory_type || '';
                var advisory_mode = cert.advisory_mode || '';
                if (advisory_type) {
                    var typeLabel = advisory_type === 'asesoria_Individual' ? 'Individual' :
                                   advisory_type === 'asesoria_grupal'     ? 'Grupal'     :
                                   advisory_type.replace(/_/g, ' ');
                    doc.text('Tipo: ' + typeLabel, W / 2, cursorY, { align: 'center' });
                    cursorY += 6;
                }
                if (advisory_mode) {
                    doc.text('Modalidad: ' + advisory_mode.replace(/_/g, ' '), W / 2, cursorY, { align: 'center' });
                    cursorY += 6;
                }
                var numPersons = parseInt(cert.num_persons, 10) || 0;
                if (numPersons > 1) {
                    doc.text('Grupo de ' + numPersons + ' participantes', W / 2, cursorY, { align: 'center' });
                    cursorY += 6;
                }
            } else if (svcType === 'evento') {
                var eventDate = cert.event_date || cert.advisory_date || '';
                if (eventDate) {
                    doc.text('Fecha del evento: ' + formatDate(eventDate), W / 2, cursorY, { align: 'center' });
                    cursorY += 6;
                }
                var numPersonsEvento = parseInt(cert.num_persons, 10) || 0;
                if (numPersonsEvento > 1) {
                    doc.text('Grupo de ' + numPersonsEvento + ' participantes', W / 2, cursorY, { align: 'center' });
                    cursorY += 6;
                }
            }

            // ── Texto de dedicación ───────────────────────────────────────────
            cursorY += 4;
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8.5);
            doc.setTextColor(100, 72, 30);
            var dedicationLines = doc.splitTextToSize(
                'Ha demostrado dedicación, disciplina y excelencia durante toda su formación.',
                220
            );
            doc.text(dedicationLines, W / 2, cursorY, { align: 'center' });

            // ── Fecha y número de certificado ─────────────────────────────────
            var dataY = H - 26;
            var completionDate = formatDate(cert.completion_date || cert.issue_date);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(90, 65, 25);
            doc.text('Fecha de culminación:', 20, dataY);
            doc.setFont('helvetica', 'bold');
            doc.text(completionDate, 20, dataY + 6);

            var certNum = cert.certificate_number || '';
            if (certNum) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(120, 90, 40);
                doc.text('N.° Certificado:', W - 20, dataY, { align: 'right' });
                doc.setFont('helvetica', 'bold');
                doc.text(certNum, W - 20, dataY + 6, { align: 'right' });
            }

            // ── Firma ─────────────────────────────────────────────────────────
            var signX     = W / 2;
            var signLineY = H - 30;
            if (signatureData) {
                try { doc.addImage(signatureData, 'PNG', signX - 50, signLineY - 22, 100, 36); }
                catch (e) { /* fallo silencioso */ }
            }
            doc.setDrawColor(160, 120, 50);
            doc.setLineWidth(0.6);
            doc.line(signX - 30, signLineY, signX + 30, signLineY);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(60, 38, 10);
            doc.text('Chef Jonathan Buitrago', signX, signLineY + 5.5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(120, 90, 40);
            doc.text('Director — Escuela de Pastelería', signX, signLineY + 10, { align: 'center' });

            // ── Descargar ─────────────────────────────────────────────────────
            var holderPart = holderName.replace(/[^a-zA-Z0-9\u00C0-\u024F ]/g, '').trim().replace(/\s+/g, '_').slice(0, 30);
            var svcPart    = svcTitle.replace(/[^a-zA-Z0-9\u00C0-\u024F ]/g, '').trim().replace(/\s+/g, '_').slice(0, 30);
            doc.save('Certificado_' + holderPart + '_' + svcPart + '.pdf');

        } catch (e) {
            console.error('Error generando certificado:', e);
            if (window.showToast) {
                window.showToast('Error al generar el certificado. Intenta de nuevo.', 'error');
            } else {
                alert('Error al generar el certificado. Intenta de nuevo.');
            }
        }
    }

    // ── Inicializar ───────────────────────────────────────────────────────────
    function init() {
        loadJsPDF();        // precarga silenciosa de jsPDF
        loadCertificates();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
