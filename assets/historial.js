// assets/historial.js

(function () {
  // Variables para la paginación global
  let currentPage = 1;
  const recordsPerPage = 10;
  let allHistoryData = []; // Almacenar todos los datos para paginación

  function safeGetCurrentUser() {
    // Este proyecto a veces define getCurrentUser() en assets/script.js.
    try {
      if (typeof getCurrentUser === 'function') return getCurrentUser();
    } catch (e) {}
    return null;
  }

  function showToast(message, type) {
    if (typeof window.showToast === 'function') return window.showToast(message, type);

    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className =
      'px-4 py-3 rounded-lg shadow-lg text-white text-sm animate-fade-in ' +
      (type === 'error' ? 'bg-red-600' : 'bg-green-600');
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('animate-fade-in');
      toast.classList.add('animate-fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function getServiceTypeLabelFromType(type) {
    const t = (type || '').toString();
    if (t === 'advisory_evento') return 'Evento';
    if (t === 'advisory_asesoria') return 'Asesoría';
    if (t === 'advisory_course') return 'Curso';
    if (t === 'registration') return 'Curso';
    return null;
  }

  async function loadMyHistory() {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;

    try {
      let email = null;
      const currentUser = safeGetCurrentUser();
      if (currentUser && currentUser.email) email = currentUser.email;
      if (!email) email = localStorage.getItem('advisory_email');

      const urlHistory = '/backend/api/my-history-get.php';
      const urlRefunds = '/backend/api/my-refunds-get.php';

      const [historyResp, refundsResp] = await Promise.all([
        fetch(urlHistory, { credentials: 'include' }),
        fetch(urlRefunds, { credentials: 'include' })
      ]);

      const [historyResult, refundsResult] = await Promise.all([
        historyResp.json(),
        refundsResp.json()
      ]);

      const historyData = (historyResult && historyResult.success && Array.isArray(historyResult.data)) ? historyResult.data : [];
      const refundsData = (refundsResult && refundsResult.success && Array.isArray(refundsResult.data)) ? refundsResult.data : [];

      // Construir un historial unificado
      const unified = [];
      const seenItems = new Set(); // Para rastrear entradas únicas
      
      // Función para generar una clave única para cada entrada
      function generateUniqueKey(item) {
        // Generar clave basada en información relevante del ítem
        const serviceName = (item.service_title || item.service_name || item.advisory_service || item.event_name || item.course_title || '').toLowerCase().trim();
        const date = item.created_at || item.registration_date || item.date || '';
        const price = item.price || item.course_price || '';
        const type = item.type || item.service_type || item.source || '';
        
        // Normalizar el nombre del servicio eliminando espacios y caracteres especiales
        const normalizedService = serviceName.replace(/\s+/g, '').replace(/[^\w]/g, '');
        
        // Usar solo información que identifica la transacción original, no el estado
        return `${normalizedService}_${date}_${price}_${type}`;
      }
      
      // Agrupar reembolsos por refundable_id y type para mapear estados
      const refundMap = {};
      refundsData.forEach(r => {
        const key = `${r.refundable_id}_${r.type}`;
        refundMap[key] = r;
      });
      
      // Primero agregar los datos del historial base (advisories + registrations sin refund)
      historyData.forEach(item => {
        const key = generateUniqueKey(item);
        if (!seenItems.has(key)) {
          // Verificar si este ítem tiene un reembolso asociado
          let refundItem = null;
          if (item.source === 'registration') {
            refundItem = refundMap[`${item.id}_registration`] || null;
          } else if (item.source === 'advisory') {
            if (item.service_type === 'asesoria') {
              refundItem = refundMap[`${item.id}_advisory_asesoria`] || null;
            } else if (item.service_type === 'evento') {
              refundItem = refundMap[`${item.id}_advisory_evento`] || null;
            } else if (item.service_type === 'curso') {
              refundItem = refundMap[`${item.id}_advisory_course`] || null;
            }
          }
          
          // Si hay un reembolso asociado, actualizar el estado del ítem original
          if (refundItem) {
            item.original_status = item.status; // Guardar el estado original
            item.original_payment_status = item.payment_status;
            item.status = `refund_${refundItem.refund_status}`;
            item.payment_status = refundItem.refund_status;
            item.admin_receipt = refundItem.admin_receipt;
            item.rejection_reason = refundItem.rejection_reason;
            item.refund_id = refundItem.id; // Agregar ID del reembolso para referencia
          }
          
          unified.push(item);
          seenItems.add(key);
        }
      });

      // Agregar solo reembolsos que no están asociados a entradas del historial base
      refundsData.forEach(r => {
        // Verificar si este reembolso ya fue incluido con la entrada original
        let isAssociatedWithBaseEntry = false;
        if (r.type === 'registration') {
          isAssociatedWithBaseEntry = historyData.some(h => 
            h.source === 'registration' && String(h.id) === String(r.refundable_id)
          );
        } else if (r.type.startsWith('advisory_')) {
          let expectedServiceType = '';
          if (r.type === 'advisory_asesoria') expectedServiceType = 'asesoria';
          else if (r.type === 'advisory_evento') expectedServiceType = 'evento';
          else if (r.type === 'advisory_course') expectedServiceType = 'curso';
          
          isAssociatedWithBaseEntry = historyData.some(h => 
            h.source === 'advisory' && 
            h.service_type === expectedServiceType && 
            String(h.id) === String(r.refundable_id)
          );
        }
        
        if (!isAssociatedWithBaseEntry) {
          // Este reembolso no está asociado a ninguna entrada base, así que agregarlo como entrada separada
          const key = generateUniqueKey(r);
          if (!seenItems.has(key)) {
            unified.push({
              id: r.id,
              source: r.type,
              type: r.type,
              status: `refund_${r.refund_status}`,
              payment_status: r.refund_status,
              created_at: r.created_at,
              service_title: r.service_title,
              service_name: r.service_name,
              price: r.price,
              admin_receipt: r.admin_receipt,
              refund_admin_receipt: r.admin_receipt,
              rejection_reason: r.rejection_reason,
              refund_only_entry: true // Indicar que es una entrada solo de reembolso
            });
            seenItems.add(key);
          }
        }
      });

      // Almacenar todos los datos para paginación
      allHistoryData = unified;
      const totalPages = Math.ceil(allHistoryData.length / recordsPerPage);
      
      // Asegurarse de que la página actual esté dentro de los límites
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
      }
      if (currentPage < 1) {
        currentPage = 1;
      }
      
      // Calcular índices para la página actual
      const startIndex = (currentPage - 1) * recordsPerPage;
      const endIndex = Math.min(startIndex + recordsPerPage, allHistoryData.length);
      const history = allHistoryData.slice(startIndex, endIndex);

      if (allHistoryData.length > 0) {
        if (history.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-gray-400">No hay historial de solicitudes.</td></tr>';
          updatePaginationControls(totalPages, currentPage);
          return;
        }

        tbody.innerHTML = '';

        history.forEach(function (item) {
          const statusClass =
            item.status === 'pending'
              ? 'bg-yellow-900 text-yellow-300'
              : item.status === 'confirmed'
              ? 'bg-blue-900 text-blue-300'
              : item.status === 'completed'
                ? 'bg-green-900 text-green-300'
                : item.status === 'refund_approved'
                  ? 'bg-green-900 text-green-300'
                  : item.status === 'refund_requested' || item.status === 'refund_pending'
                    ? 'bg-yellow-900 text-yellow-300'
                    : item.status === 'refund_rejected'
                      ? 'bg-red-900 text-red-300'
                      : 'bg-red-900 text-red-300';

          const statusLabel =
            item.status === 'pending'
              ? 'En espera'
              : item.status === 'confirmed'
              ? 'Aprobado'
              : item.status === 'completed'
                ? 'Completado'
                : item.status === 'refund_approved'
                  ? 'Reembolso Aprobado'
                  : item.status === 'refund_requested' || item.status === 'refund_pending'
                    ? 'Reembolso en espera'
                    : item.status === 'refund_rejected'
                      ? 'Rechazado'
                        : 'Cancelado';

          // Determine type and name
          let serviceTypeLabel = 'N/A';
          let serviceName = 'N/A';
          const source = item.source || 'advisory';

          // Para items de refunds (source = type como 'advisory_evento', 'advisory_asesoria', 'registration')
          const refundType = (item.type || '').toString();
          
          if (source === 'registration' || refundType === 'registration') {
            serviceTypeLabel = 'Curso';
            serviceName = item.course_title || item.service_title || item.service_name || 'Curso';
          } else {
            // Inferir tipo desde service_type o desde type
            if (item.service_type === 'evento' || refundType === 'advisory_evento') {
              serviceTypeLabel = 'Evento';
            } else if (item.service_type === 'asesoria' || refundType === 'advisory_asesoria') {
              serviceTypeLabel = 'Asesoría';
            } else if (item.service_type === 'curso' || refundType === 'advisory_course') {
              serviceTypeLabel = 'Curso';
            }

            // Priorizar nombre del servicio
            serviceName = item.advisory_service || item.event_name || item.service_title || item.service_name || 'N/A';
            serviceName = String(serviceName).replace(/_/g, ' ');
          }

          const priceStr = item.price && item.price > 0 ? '$' + Number(item.price).toLocaleString('es-CO') : 'N/A';
          const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES') : 'N/A';

          // Can refund?
          let refundBtn = '';

          // Si es un reembolso pendiente directo (de la tabla refunds)
          if (item.status === 'refund_requested' || item.status === 'refund_pending') {
            const btnText = 'Cancelar Reembolso';
            const btnClass = 'bg-gray-700 hover:bg-gray-600';
            const btnState = 'cancel';

            // Determinar el tipo correcto para el refund
            let refundType = item.type || source;
            // Si source es 'advisory' y tenemos service_type, usarlo
            if (source === 'advisory' && item.service_type) {
              if (item.service_type === 'asesoria') {
                refundType = 'advisory_asesoria';
              } else if (item.service_type === 'evento') {
                refundType = 'advisory_evento';
              } else if (item.service_type === 'curso') {
                refundType = 'advisory_course';
              }
            }

            refundBtn =
              '<button type="button" class="refund-toggle-btn px-3 py-1 text-white rounded text-xs transition-colors ' + btnClass + '" ' +
              'data-refund-id="' + item.id + '" data-refund-type="' + refundType + '" data-state="' + btnState + '" onclick="window.handleRefundToggle(this)">' +
              btnText + '</button>';
          }
          
          // Si no se generó botón, verificar si se puede solicitar reembolso
          if (!refundBtn) {
            const createdAt = new Date(item.created_at);
            const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            
            const statusOk = item.status === 'confirmed' || item.status === 'completed';
            
            const isRefundable = (source === 'registration' || item.service_type === 'curso' || item.service_type === 'asesoria' || item.service_type === 'evento') &&
                                daysSince <= 7 && 
                                statusOk &&
                                item.payment_status !== 'refund_requested' &&
                                item.payment_status !== 'refunded';
            
            const refundPending = item.status === 'refund_requested' || item.status === 'refund_pending' || item.payment_status === 'refund_requested';
            
            // Verificar si hay un reembolso ya procesado (aprobado o rechazado)
            const refundProcessed = (item.status === 'refund_approved' || 
                                   item.status === 'refund_rejected' || 
                                   item.payment_status === 'refunded' || 
                                   item.refund_status === 'approved' || 
                                   item.refund_status === 'rejected');
            
            if (refundProcessed) {
              // Mostrar botones según el estado del reembolso
              if (item.status === 'refund_approved' || item.payment_status === 'refunded' || item.refund_status === 'approved') {
                const receipt = item.admin_receipt || item.refund_admin_receipt || item.admin_receipt_base64 || null;
                let receiptSrc = receipt;
                if (receiptSrc && typeof receiptSrc === 'string') {
                  receiptSrc = receiptSrc.trim();
                  if (receiptSrc && !receiptSrc.startsWith('data:')) {
                    receiptSrc = 'data:image/jpeg;base64,' + receiptSrc;
                  }
                }
                
                refundBtn =
                  '<button type="button" class="refund-receipt-btn px-3 py-1 text-white rounded text-xs transition-colors bg-green-600 hover:bg-green-700" ' +
                  'data-receipt="' + (receiptSrc ? String(receiptSrc).replace(/"/g, '"') : '') + '" ' +
                  'onclick="window.handleRefundReceiptClick(this)"' +
                  '>Comprobante Reembolso</button>';
                  
                // Si también hay motivo de rechazo, añadir otro botón
                if (item.rejection_reason) {
                  refundBtn += 
                    '<button type="button" class="refund-rejection-btn px-3 py-1 text-white rounded text-xs transition-colors bg-red-600 hover:bg-red-700 ml-1" ' +
                    'data-rejection="' + String(item.rejection_reason).replace(/"/g, '"') + '" ' +
                    'onclick="window.handleRefundRejectionClick(this)">Motivo Rechazo</button>';
                }
              } else if (item.status === 'refund_rejected' || item.refund_status === 'rejected') {
                // Para rechazos, mostrar solo el motivo de rechazo
                if (item.rejection_reason) {
                  refundBtn = 
                    '<button type="button" class="refund-rejection-btn px-3 py-1 text-white rounded text-xs transition-colors bg-red-600 hover:bg-red-700" ' +
                    'data-rejection="' + String(item.rejection_reason).replace(/"/g, '"') + '" ' +
                    'onclick="window.handleRefundRejectionClick(this)">Motivo Rechazo</button>';
                }
              }
            } else if (isRefundable || refundPending) {
              const isPending = refundPending;
              const btnState = isPending ? 'cancel' : 'active';
              
              const btnText = isPending ? 'Cancelar Reembolso' : 'Solicitar Reembolso';
              const btnClass = isPending ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700';

              let refundType = null;
              if (source === 'registration') {
                refundType = 'registration';
              } else {
                const st = (item.service_type || '').toString();
                if (st === 'evento') refundType = 'advisory_evento';
                else if (st === 'asesoria') refundType = 'advisory_asesoria';
                else if (st === 'curso' || st === 'advisory_course') refundType = 'advisory_course';
                else {
                  const serviceLower = (serviceName || '').toString().toLowerCase();
                  if (serviceLower.includes('evento')) refundType = 'advisory_evento';
                  else refundType = 'advisory_asesoria';
                }
              }

              refundBtn =
                '<button type="button" class="refund-toggle-btn px-3 py-1 text-white rounded text-xs transition-colors ' + btnClass + '" ' +
                'data-refund-id="' + item.id + '" data-refund-type="' + refundType + '" data-state="' + btnState + '" onclick="window.handleRefundToggle(this)">' +
                btnText + '</button>';
            }
          }

          const row = document.createElement('tr');
          row.className = 'border-b border-gray-700';
          row.innerHTML =
            '<td class="py-3 px-6 text-gray-400 text-sm min-w-[120px]">' + dateStr + '</td>' +
            '<td class="py-3 px-6 text-gray-400 text-sm min-w-[100px]">' + serviceTypeLabel + '</td>' +
            '<td class="py-3 px-6 text-white text-sm min-w-[200px]">' + serviceName + '</td>' +
            '<td class="py-3 px-6 text-gray-400 text-sm min-w-[120px]">' + priceStr + '</td>' +
            '<td class="py-3 px-6 min-w-[120px]"><span class="px-2 py-1 ' + statusClass + ' rounded-full text-xs">' + statusLabel + '</span></td>' +
            '<td class="py-3 px-6 min-w-[150px]"><div class="flex space-x-2">' +
            refundBtn +
            '<button type="button" class="ver-detalles-historial-btn px-3 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700" ' +
            'data-id="' + item.id + '" data-source="' + source + '">Ver más</button>' +
            '</div></td>';

          tbody.appendChild(row);
        });

        // Details buttons
        tbody.querySelectorAll('.ver-detalles-historial-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            const item = allHistoryData.find(h => String(h.id) === String(id));
            if (!item) return;

            const details = [];
            if (item.advisory_mode) details.push('Modalidad: ' + item.advisory_mode);
            if (item.date) details.push('Fecha: ' + new Date(item.date).toLocaleDateString('es-ES'));
            if (item.time) details.push('Hora: ' + item.time);
            if (item.num_persons > 1) details.push('Personas: ' + item.num_personas);
if (item.notes) details.push('Notas: ' + item.notes);
            if (item.payment_method) details.push('Método de pago: ' + item.payment_method.charAt(0).toUpperCase() + item.payment_method.slice(1));
            if (item.price) details.push('Precio: $' + Number(item.price).toLocaleString('es-CO'));

            const contentDiv = document.getElementById('detalles-solicitud-content');
            const titleEl = document.getElementById('detalles-modal-title');
            if (titleEl) titleEl.textContent = 'Detalles de la Solicitud';

            if (contentDiv) {
              contentDiv.innerHTML = details
                .map(line => '<div class="py-2 border-b border-gray-700 last:border-0">' + line + '</div>')
                .join('');
            }

            const modal = document.getElementById('detalles-solicitud-modal');
            if (modal) modal.classList.remove('hidden');
          });
        });
        
        // Actualizar controles de paginación
        updatePaginationControls(totalPages, currentPage);
      } else {
        tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-gray-400">No hay historial de solicitudes.</td></tr>';
        updatePaginationControls(0, 0);
      }
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-red-300">Error al cargar historial.</td></tr>';
      updatePaginationControls(0, 0);
    }
  }

  // Función para actualizar los controles de paginación
  function updatePaginationControls(totalPages, currentPage) {
    const pageInfo = document.getElementById('history-pagination-info');
    const pageNumbers = document.getElementById('history-page-numbers');
    const prevButton = document.getElementById('history-prev-page');
    const nextButton = document.getElementById('history-next-page');
    
    if (!pageInfo || !pageNumbers || !prevButton || !nextButton) return;
    
    if (totalPages > 0) {
      pageInfo.textContent = `Mostrando ${((currentPage - 1) * recordsPerPage) + 1}-${Math.min(currentPage * recordsPerPage, allHistoryData.length)} de ${allHistoryData.length} registros`;
    } else {
      pageInfo.textContent = 'No hay registros para mostrar';
    }
    
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages || totalPages === 0;
    
    let pageLinks = '';
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      if (i === currentPage) {
        pageLinks += `<span class="mx-1 px-4 py-2 bg-purple-600 text-white rounded inline-flex items-center justify-center" style="min-height: 40px; min-width: 40px;">${i}</span>`;
      } else {
        pageLinks += `<button class="mx-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 inline-flex items-center justify-center" style="min-height: 40px; min-width: 40px;" onclick="changePage(${i})">${i}</button>`;
      }
    }
    
    pageNumbers.innerHTML = pageLinks;
  }
  
  function changePage(page) {
    currentPage = page;
    loadMyHistory();
  }
  
  function nextPage() {
    const totalPages = Math.ceil(allHistoryData.length / recordsPerPage);
    if (currentPage < totalPages) {
      changePage(currentPage + 1);
    }
  }
  
  function prevPage() {
    if (currentPage > 1) {
      changePage(currentPage - 1);
    }
  }
  
  document.addEventListener('DOMContentLoaded', function () {
    const prevButton = document.getElementById('history-prev-page');
    const nextButton = document.getElementById('history-next-page');
    
    if (prevButton) {
      prevButton.addEventListener('click', function() {
        prevPage();
      });
    }
    
    if (nextButton) {
      nextButton.addEventListener('click', function() {
        nextPage();
      });
    }
    
    loadMyHistory();
  });

  function openRefundConfirmModal(refundId, refundType, mode = 'request') {
    const modal = document.getElementById('refund-confirm-modal');
    const msg = document.getElementById('refund-confirm-message');
    const confirmBtn = document.getElementById('refund-confirm-btn');
    const cancelBtn = document.getElementById('refund-confirm-cancel');
    const hiddenId = document.getElementById('refund-confirm-id');
    const hiddenType = document.getElementById('refund-confirm-type');
    const downloadBtn = document.getElementById('download-inscription-receipt-btn');

    if (!modal || !msg || !confirmBtn || !cancelBtn || !hiddenId || !hiddenType) return;

    if (downloadBtn) {
      downloadBtn.classList.add('hidden');
      downloadBtn.disabled = true;
    }

    hiddenId.value = refundId;
    hiddenType.value = refundType;

    const isCancel = mode === 'cancel';
    
    // Mensaje contextual según tipo
    let tipoTexto = 'este servicio';
    if (refundType === 'registration' || refundType === 'advisory_course') tipoTexto = 'este curso';
    else if (refundType === 'advisory_asesoria') tipoTexto = 'esta asesoría';
    else if (refundType === 'advisory_evento') tipoTexto = 'este evento';
    
    msg.textContent = isCancel
      ? '¿Seguro que deseas cancelar la solicitud de reembolso para ' + tipoTexto + '?'
      : '¿Seguro que deseas solicitar un reembolso para ' + tipoTexto + '?';

    confirmBtn.textContent = isCancel ? 'Confirmar Cancelación' : 'Confirmar';

    const doClose = () => modal.classList.add('hidden');
    cancelBtn.onclick = doClose;
    modal.onclick = (e) => {
      if (e.target === modal) doClose();
    };

    confirmBtn.onclick = async () => {
      doClose();
      if (isCancel) {
        await window.cancelRefundRequest(refundId, refundType);
      } else {
        await window.requestRefund(refundId, refundType, true);
      }
    };

    modal.classList.remove('hidden');
  }

  window.openRefundConfirmModal = openRefundConfirmModal;

  // Modal comprobante
  window.handleRefundRejectionClick = function(btn) {
    try {
      let rejectionReason = btn.getAttribute('data-rejection');
      if (!rejectionReason) {
        showToast('No hay motivo de rechazo disponible para esta solicitud.', 'error');
        return;
      }

      const modal = document.getElementById('detalles-solicitud-modal');
      const contentDiv = document.getElementById('detalles-solicitud-content');
      const titleEl = document.getElementById('detalles-modal-title');
      
      if (!modal || !contentDiv) return;

      if (titleEl) titleEl.textContent = 'Motivo de Rechazo del Reembolso';

      contentDiv.innerHTML = 
        '<div class="py-2 border-b border-gray-700 last:border-0">' +
        '<strong>Motivo:</strong> ' + rejectionReason + '</div>';

      modal.classList.remove('hidden');
    } catch (e) {
      showToast('Error al mostrar el motivo de rechazo.', 'error');
    }
  };

  window.handleRefundReceiptClick = function(btn) {
    try {
      let receipt = btn.getAttribute('data-receipt');
      if (!receipt) {
        receipt = btn.getAttribute('data-refund-receipt') || null;
      }
      if (!receipt) {
        showToast('No hay comprobante disponible para esta solicitud.', 'error');
        return;
      }

      let normalizedReceipt = receipt;
      if (normalizedReceipt && typeof normalizedReceipt === 'string') {
        normalizedReceipt = normalizedReceipt.trim();
        if (normalizedReceipt && !normalizedReceipt.startsWith('data:')) {
          const looksBase64 = /^[A-Za-z0-9+/\n\r=]+$/.test(normalizedReceipt);
          if (looksBase64) normalizedReceipt = 'data:image/jpeg;base64,' + normalizedReceipt;
        }
      }

      if (!normalizedReceipt) {
        showToast('No hay comprobante disponible para esta solicitud.', 'error');
        return;
      }

      const modal = document.getElementById('comprobante-reembolso-modal');
      const contentDiv = document.getElementById('comprobante-solicitud-content');
      const titleEl = document.getElementById('comprobante-modal-title');
      const downloadBtn = document.getElementById('download-inscription-receipt-btn');
      if (!modal || !contentDiv) return;

      if (titleEl) titleEl.textContent = 'Comprobante de Reembolso';

      window.__inscription_receipt_src = normalizedReceipt;

      if (downloadBtn) {
        downloadBtn.style.display = '';
        downloadBtn.classList.remove('hidden');
        downloadBtn.disabled = false;
      }

      contentDiv.innerHTML =
        '<div class="flex justify-center w-full pt-0 pb-1">' +
        '<img id="inscription-receipt-img" src="' + normalizedReceipt + '" alt="Comprobante" class="max-h-[45vh] w-auto max-w-[420px] object-contain rounded" />' +
        '</div>';

      modal.classList.remove('hidden');
    } catch (e) {
      showToast('Error al mostrar el comprobante.', 'error');
    }
  };

  window.handleRefundToggle = function (btn) {
    const id = btn.getAttribute('data-refund-id');
    const type = btn.getAttribute('data-refund-type');
    const state = btn.getAttribute('data-state') || 'active';

    if (type === 'advisory_asesoria') {
      if (state === 'active') {
        window.openRefundConfirmModal(id, type, 'request');
      } else {
        window.openRefundConfirmModal(id, type, 'cancel');
      }
    } else if (type === 'advisory_evento') {
      if (state === 'active') {
        window.openRefundConfirmModal(id, type, 'request');
      } else {
        window.openRefundConfirmModal(id, type, 'cancel');
      }
    } else {
      if (state === 'active') {
        window.openRefundConfirmModal(id, type);
      } else {
        window.openRefundConfirmModal(id, type, 'cancel');
      }
    }
  };

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
      a.download = 'comprobante_reembolso';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      const notify = window.showToast || window.alert;
      notify('Error al descargar el comprobante.', 'error');
    }
  };

  window.closeDetallesModal = function() {
    document.getElementById('detalles-solicitud-modal')?.classList.add('hidden');
  };

  window.closeComprobanteModal = function() {
    document.getElementById('comprobante-reembolso-modal')?.classList.add('hidden');
  };

  window.requestRefund = async function (id, type, alreadyConfirmed = false) {
    if (!alreadyConfirmed) return openRefundConfirmModal(id, type);

    try {
      const response = await fetch('/backend/api/refund-request.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: id, type: type })
      });

      const result = await response.json();

      if (result.success) {
        showToast(result.message, 'success');
        loadMyHistory();
      } else {
        showToast(result.message || 'Error al solicitar reembolso', 'error');
      }
    } catch (e) {
      showToast('Error de conexión', 'error');
    }
  };

  window.cancelRefundRequest = async function (id, type) {
    try {
      const response = await fetch('/backend/api/refund-cancel.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: id, type: type })
      });

      const result = await response.json();
      if (result.success) {
        showToast(result.message, 'success');
        loadMyHistory();
      } else {
        showToast(result.message || 'Error al cancelar', 'error');
      }
    } catch (e) {
      showToast('Error de conexión', 'error');
    }
  };
})();
