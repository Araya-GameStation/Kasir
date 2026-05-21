window.Layout = {
  renderMain(content) {
    this._saveSidebarScroll();
    const html = `
      <div class="pos-container">
        ${this.renderSidebar()}
        <div class="main-content-area ${window.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
          ${this.renderHeader()}
          <main class="main-scroll">
            <div class="main-inner">
              ${content}
            </div>
          </main>
        </div>
      </div>
    `;
    return html;
  },

  _saveSidebarScroll() {
    const nav = document.querySelector('.sidebar-nav');
    if (nav) window._sidebarScrollTop = nav.scrollTop;
  },

  _restoreSidebarScroll() {
    if (!window._sidebarScrollTop) return;
    requestAnimationFrame(() => {
      const nav = document.querySelector('.sidebar-nav');
      if (nav) nav.scrollTop = window._sidebarScrollTop;
    });
  },

  renderSidebar() {
    const lowStockCount = (window.state.rawMaterials || []).filter(m => m.stock <= (m.minStock || 5)).length;
    const openBillCount = (window.state.openBills || []).length;
    const pengeluaranCount = (window.state.pengeluaran || []).filter(p => p.sessionId === window.state.currentSession?.id).length;

    return `
      <aside class="sidebar ${window.sidebarCollapsed ? 'collapsed' : ''} ${!window.sidebarCollapsed ? 'open' : ''}">
        <div class="sidebar-header">
          <div class="sidebar-header-inner">
            <div class="brand-wrap ${window.sidebarCollapsed ? 'brand-hidden' : ''}">
              <span class="brand">GARIS WAKTU</span>
            </div>
            <button onclick="window.toggleSidebar()" class="toggle-sidebar">
              <i class="fas fa-${window.sidebarCollapsed ? 'chevron-right' : 'chevron-left'} nav-icon"></i>
            </button>
          </div>
        </div>

        <nav class="sidebar-nav">

          <div class="nav-section-label ${window.sidebarCollapsed ? 'hidden' : ''}">Operasional</div>

          ${this.navItem('Kasir', 'cash-register', 'kasir',
      window.state.currentSession ? '<span class="nav-active-dot"></span>' : ''
    )}

          ${this.navItem('Open Bill', 'receipt', 'openBill',
      openBillCount > 0
        ? `<span class="nav-badge warning" id="open-bill-badge">${openBillCount}</span>`
        : `<span class="nav-badge hidden-badge" id="open-bill-badge"></span>`
    )}

          <button onclick="window.bukaModalPengeluaran()" class="nav-item" title="${window.sidebarCollapsed ? 'Pengeluaran' : ''}">
            <i class="fas fa-money-bill-wave nav-icon icon-danger"></i>
            <span class="nav-label ${window.sidebarCollapsed ? 'hidden' : ''}">Pengeluaran</span>
            ${pengeluaranCount > 0
        ? `<span class="nav-badge" id="badge-pengeluaran">${pengeluaranCount}</span>`
        : `<span class="nav-badge hidden-badge" id="badge-pengeluaran">0</span>`
      }
          </button>

          <div class="nav-section-divider ${window.sidebarCollapsed ? 'divider-collapsed' : ''}"></div>
          <div class="nav-section-label ${window.sidebarCollapsed ? 'hidden' : ''}">Laporan & Data</div>

          ${this.navItem('Riwayat', 'history', 'history',
        `<span class="nav-badge">${(window.state.transactions || []).length}</span>`
      )}

          ${this.navItem('Laporan', 'chart-bar', 'laporan')}

          <div class="nav-section-divider ${window.sidebarCollapsed ? 'divider-collapsed' : ''}"></div>
          <div class="nav-section-label ${window.sidebarCollapsed ? 'hidden' : ''}">Manajemen</div>

          ${this.navItem('Bahan', 'boxes', 'bahanManager',
        lowStockCount > 0 ? `<span class="nav-badge warning">${lowStockCount}</span>` : ''
      )}

          ${this.navItem('Menu', 'utensils', 'menuManager')}

          ${this.navItem('Modifier', 'sliders-h', 'modifierManager')}

          ${this.navItem('Pengaturan', 'cog', 'settings')}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-footer-row ${window.sidebarCollapsed ? 'sidebar-footer-row-collapsed' : ''}">
            <button onclick="window.connectPrinter()" class="footer-icon-btn ${window.printerConnected ? 'printer-online' : ''}" id="printer-nav-btn" title="${window.printerConnected ? 'Printer (On)' : 'Printer'}">
              <div class="printer-dot-wrapper">
                <i class="fas fa-print"></i>
                <span id="printer-status-dot" class="printer-status-dot ${window.printerConnected ? 'online' : ''}"></span>
              </div>
            </button>
          </div>
          <button onclick="window.logout()" class="nav-item logout nav-item-mt ${window.sidebarCollapsed ? 'nav-item-centered' : ''}">
            <i class="fas fa-sign-out-alt nav-icon text-danger"></i>
            <span class="nav-label text-danger ${window.sidebarCollapsed ? 'hidden' : ''}">Logout</span>
          </button>
        </div>
      </aside>
    `;
  },

  navItem(label, icon, view, badge = '') {
    const viewMap = {
      'Kasir': 'kasir',
      'Open Bill': 'openBill',
      'Riwayat': 'history',
      'Laporan': 'laporan',
      'Bahan': 'bahanManager',
      'Menu': 'menuManager',
      'Modifier': 'modifierManager',
      'Pengaturan': 'settings'
    };
    const targetView = viewMap[label] || view;
    const isActive = window.state.currentView === targetView;

    if (targetView === 'openBill') {
      return `
        <button onclick="window.showOpenBillList()" class="nav-item ${isActive ? 'active' : ''}" title="${window.sidebarCollapsed ? label : ''}">
          <i class="fas fa-${icon} nav-icon"></i>
          <span class="nav-label ${window.sidebarCollapsed ? 'hidden' : ''}">${label}</span>
          ${badge}
        </button>
      `;
    }

    return `
      <button onclick="window.navigateTo('${targetView}')" class="nav-item ${isActive ? 'active' : ''}" title="${window.sidebarCollapsed ? label : ''}">
        <i class="fas fa-${icon} nav-icon"></i>
        <span class="nav-label ${window.sidebarCollapsed ? 'hidden' : ''}">${label}</span>
        ${badge}
      </button>
    `;
  },

  renderHeader() {
    const isDark = document.documentElement.classList.contains('dark');
    return `
      <header class="smart-header header-bar">
        <button onclick="window.toggleSidebar()" class="mobile-menu-toggle" aria-label="Menu">
          <i class="fas fa-bars"></i>
        </button>
        <h1 class="header-title">${this.getPageTitle()}</h1>
        <div class="header-right">
          ${window.state.currentSession ? `
            <div class="header-session-info">
              <span class="header-email">
                ${window.state.currentSession?.kasir || window.state.user?.email}
              </span>
              <div class="header-shift-badge">
                <span class="header-shift-dot"></span>
                <span>Shift ${window.state.currentSession.shift}</span>
              </div>
              <button onclick="window.toggleDarkMode()" class="header-theme-btn" title="${isDark ? 'Mode Terang' : 'Mode Gelap'}">
                <i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>
              </button>
              <button onclick="window.tutupShift()" class="btn-tutup-shift" id="btn-tutup-shift" title="Tutup Shift">
                <i class="fas fa-power-off"></i>
                <span>Tutup Shift</span>
              </button>
            </div>
          ` : `
            <button onclick="window.toggleDarkMode()" class="header-theme-btn" title="${isDark ? 'Mode Terang' : 'Mode Gelap'}">
              <i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>
            </button>
            <button onclick="const b=this;Utils.setButtonLoading(b,true);window.bukaShift().finally(()=>Utils.setButtonLoading(b,false))" class="btn-buka-shift">
              <i class="fas fa-play"></i>
              Buka Shift
            </button>
          `}
        </div>
      </header>
    `;
  },

  getPageTitle() {
    const titles = {
      kasir: 'Kasir',
      openBill: 'Open Bill',
      history: 'Riwayat Transaksi',
      laporan: 'Laporan',
      bahanManager: 'Manajemen Bahan',
      menuManager: 'Manajemen Menu',
      openCategory: 'Daftar Menu',
      modifierManager: 'Modifier & Add-on',
      settings: 'Pengaturan'
    };
    return titles[window.state.currentView] || 'GARIS WAKTU';
  }
};

window.showOpenBillList = function () {
  const openBills = state.openBills || [];

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modal-open-bill-list';

  const rows = openBills.length === 0
    ? `<div class="empty-state"><i class="fas fa-receipt"></i><p>Tidak ada open bill aktif</p></div>`
    : openBills.map(ob => {
      const waktu = ob.createdAt?.seconds
        ? new Date(ob.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '-';
      return `
          <div class="open-bill-list-item" onclick="window._loadOpenBillFromList('${ob.id}')">
            <div class="open-bill-list-left">
              <div class="open-bill-list-meja">
                <i class="fas fa-chair"></i> ${ob.mejaNomor} - ${ob.mejaNama}
              </div>
              <div class="open-bill-list-meta">
                ${ob.items?.length || 0} item · ${waktu}
              </div>
            </div>
            <div class="open-bill-list-right">
              <div class="open-bill-list-total">Rp ${Utils.formatRupiah(ob.total || 0)}</div>
              <div class="open-bill-list-actions">
                <button class="btn btn-sm btn-secondary open-bill-action-btn" onclick="event.stopPropagation();window._viewOpenBillDetail('${ob.id}')" title="Lihat Isi">
                  <i class="fas fa-list"></i>
                </button>
                <button class="btn btn-sm btn-secondary open-bill-action-btn" onclick="event.stopPropagation();window._printOpenBill(this, '${ob.id}')" title="Cetak Struk Sementara">
                  <i class="fas fa-print"></i>
                </button>
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();window._goPayOpenBill('${ob.id}')">
                  <i class="fas fa-credit-card"></i> Bayar
                </button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();window._cancelOpenBill('${ob.id}')">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        `;
    }).join('');

  modal.innerHTML = `
    <div class="modal modal-wide">
      <div class="modal-header">
        <h3><i class="fas fa-receipt"></i> Daftar Open Bill</h3>
        <button class="btn-icon-sm" onclick="document.getElementById('modal-open-bill-list').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body open-bill-list-body">
        ${rows}
      </div>
    </div>
  `;

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};

window._loadOpenBillFromList = function (obId) {
  const ob = (state.openBills || []).find(o => o.id === obId);
  if (!ob) return;
  document.getElementById('modal-open-bill-list')?.remove();
  window._loadOpenBill(ob, { id: ob.mejaId, nomor: ob.mejaNomor, nama: ob.mejaNama });
  state.currentView = 'kasir';
  window.renderKasir?.();
};

window._goPayOpenBill = function (obId) {
  const ob = (state.openBills || []).find(o => o.id === obId);
  document.getElementById('modal-open-bill-list')?.remove();
  if (ob) window._loadOpenBill(ob, { id: ob.mejaId, nomor: ob.mejaNomor, nama: ob.mejaNama });
  state.currentView = 'kasir';
  window.renderKasir?.();
  setTimeout(() => window.showPaymentPanel(ob.total), 300);
};

window._printOpenBill = async function (btn, obId) {
  const ob = (state.openBills || []).find(o => o.id === obId);
  if (!ob) return;
  const dummyTrx = {
    ...ob,
    id: ob.id || "OPEN-BILL",
    paid: 0,
    change: 0
  };
  Utils.setButtonLoading(btn, true);
  try {
    if (window.printStruk) {
      await window.printStruk(dummyTrx);
    } else {
      Utils.showToast("Printer belum siap", "warning");
    }
  } finally {
    Utils.setButtonLoading(btn, false);
  }
};

window._viewOpenBillDetail = function (obId) {
  const ob = (state.openBills || []).find(o => o.id === obId);
  if (!ob) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modal-ob-detail';
  modal.style.zIndex = '10000';

  const itemsHtml = ob.items.map(item => {
    let modsHtml = '';
    if (item.modifiers && item.modifiers.length > 0) {
      const ms = item.modifiers.map(m => `<span class="cart-modifier-tag">${m.optionName}</span>`).join('');
      modsHtml = `<div class="cart-item-modifiers">${ms}</div>`;
    }
    const notesHtml = item.notes ? `<div class="history-item-notes"><i class="fas fa-comment-dots"></i> ${item.notes}</div>` : '';
    const unitPrice = item.price + (item.modifierTotal || 0);

    return `
      <div class="riwayat-stok-row mb-sm">
        <div class="riwayat-stok-left">
          <div class="riwayat-stok-label">${item.name}</div>
          <div class="riwayat-stok-meta">@ ${Utils.formatRupiah(unitPrice)}</div>
          ${modsHtml}
          ${notesHtml}
        </div>
        <div class="riwayat-stok-right">
          <div class="riwayat-stok-qty">${item.qty}x</div>
          <div class="open-bill-item-total">Rp ${Utils.formatRupiah(unitPrice * item.qty)}</div>
        </div>
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="modal open-bill-detail-modal">
      <div class="modal-header">
        <h3><i class="fas fa-list"></i> Detail Pesanan ${ob.mejaNomor ? 'Meja ' + ob.mejaNomor : ob.mejaNama || 'Pesanan'}</h3>
        <button class="btn-icon-sm" onclick="document.getElementById('modal-ob-detail').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        ${itemsHtml}
        <div class="open-bill-total-row">
          <div class="open-bill-total-label">Total Tagihan</div>
          <div class="open-bill-total-amount">Rp ${Utils.formatRupiah(ob.total)}</div>
        </div>
      </div>
      <div class="modal-footer-inline">
        <button class="btn btn-secondary" onclick="document.getElementById('modal-ob-detail').remove()">Tutup</button>
      </div>
    </div>
  `;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};

window._cancelOpenBill = async function (obId) {
  const result = await Swal.fire({
    title: 'Batalkan Open Bill?',
    text: 'Pesanan yang belum dibayar akan dihapus.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, batalkan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#dc3545',
    customClass: { popup: 'swal2-is-konfirmasi' }
  });
  if (!result.isConfirmed) return;
  await dbCloud.collection('openBills').doc(obId).update({ status: 'cancelled', cancelledAt: new Date() });
  Utils.showToast('Open bill dibatalkan', 'success');
  document.getElementById('modal-open-bill-list')?.remove();
};

window.toggleDarkMode = function () {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark);
  if (typeof updateThemeColor === 'function') updateThemeColor();
  const v = window.state?.currentView;
  if (v === 'kasir') window.renderKasir?.();
  else if (v === 'history') window.renderHistory?.();
  else if (v === 'laporan') window.renderLaporan?.();
  else if (v === 'bahanManager') window.renderBahanManager?.();
  else if (v === 'menuManager') window.renderMenuManager?.();
  else if (v === 'modifierManager') window.renderModifierManager?.();
  else if (v === 'settings') window.renderSettings?.();
};