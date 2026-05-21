function renderKasir() {
  state.currentView = "kasir";
  if (!state.currentSession) { renderNoSession(); return; }

  const categoryContainer = document.getElementById('category-scroll-container');
  if (categoryContainer) state.lastCategoryScroll = categoryContainer.scrollLeft;
  const menuContainer = document.getElementById('menu-scroll-container');
  if (menuContainer) state.lastMenuScroll = menuContainer.scrollTop;
  const cartBody = document.querySelector('.pos-cart-body');
  if (cartBody) state.lastCartScroll = cartBody.scrollTop;

  const sortedCategories = [
    ...state.categories.filter(c => !c.system).sort((a, b) => a.name.localeCompare(b.name)),
    ...state.categories.filter(c => c.system)
  ];
  const categoryNames = ["ALL", ...sortedCategories.map(c => c.name)];
  const filteredMenus = (state.selectedCategory === "ALL"
    ? state.menus
    : state.menus.filter(m => {
      const cat = state.categories.find(c => c.id === m.categoryId);
      return cat && cat.name === state.selectedCategory;
    })
  ).filter(m => !state.kasirSearchQuery || m.name.toLowerCase().includes(state.kasirSearchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const activeTab = state.activeMobileTab || 'menu';
  const cartQty = state.cart.reduce((s, i) => s + i.qty, 0);
  const content = `
    <div class="pos-layout ${activeTab === 'menu' ? 'show-menu-tab' : 'show-cart-tab'}">
      <div class="pos-mobile-tabs">
        <button onclick="window.setMobileTab('menu')" class="pos-mobile-tab-btn ${activeTab === 'menu' ? 'active' : ''}">
          <i class="fas fa-utensils"></i> Menu
        </button>
        <button onclick="window.setMobileTab('cart')" class="pos-mobile-tab-btn ${activeTab === 'cart' ? 'active' : ''}">
          <i class="fas fa-shopping-cart"></i> Keranjang
          ${cartQty > 0 ? `<span class="pos-mobile-cart-badge">${cartQty}</span>` : ''}
        </button>
      </div>
      <div class="pos-left-panel">
        <div class="smart-header pos-header-sticky">
          <div id="category-scroll-container">
            ${categoryNames.map(c => `
              <button onclick="selectCategory('${c}')"
                      class="category-btn ${state.selectedCategory === c ? 'active' : ''}">
                ${c}
              </button>
            `).join('')}
          </div>
          <div class="pos-search-wrapper">
            <i class="fas fa-search"></i>
            <input type="text" class="pos-search-input" placeholder="Cari..." 
                   value="${state.kasirSearchQuery || ''}" oninput="window._onKasirSearch(this.value)">
            ${state.kasirSearchQuery ? `
              <button class="pos-search-clear" onclick="window._clearKasirSearch()">
                <i class="fas fa-times-circle"></i>
              </button>
            ` : ''}
          </div>
        </div>
          <div class="menu-scroll-container" id="menu-scroll-container">
            <div class="menu-grid ${filteredMenus.length === 0 ? 'empty-grid' : ''}" id="menu-grid-container">
              ${filteredMenus.length === 0 ? `
                <div class="empty-state">
                  <i class="fas fa-search"></i>
                  <p>Produk tidak ditemukan</p>
                  ${state.kasirSearchQuery ? `<button class="btn btn-secondary btn-sm mt-2" onclick="window._clearKasirSearch()">Reset Pencarian</button>` : ''}
                </div>
              ` : filteredMenus.map(m => renderMenuItem(m)).join('')}
            </div>
          </div>
      </div>
      <div class="pos-right-panel">
        <div class="checkout-panel pos-checkout-panel">
          <div class="panel-header-inner">
            <h3 class="panel-title">
              <i class="fas fa-shopping-cart text-primary icon-mr"></i>
              Pesanan
            </h3>
            <span class="nav-badge">${state.cart.reduce((s, i) => s + i.qty, 0)}</span>
          </div>
          <div class="pos-cart-body">
            ${renderCartItems()}
          </div>
          <div class="panel-footer panel-footer-rounded">
            ${renderCartFooter()}
          </div>
        </div>
      </div>
    </div>
  `;

  app.innerHTML = Layout.renderMain(content);
  Layout._restoreSidebarScroll();

  requestAnimationFrame(() => {
    const _catEl = document.getElementById('category-scroll-container');
    if (_catEl && state.lastCategoryScroll > 0) _catEl.scrollLeft = state.lastCategoryScroll;
    const _menuEl = document.getElementById('menu-scroll-container');
    if (_menuEl && state.lastMenuScroll > 0) _menuEl.scrollTop = state.lastMenuScroll;
    const _cartEl = document.querySelector('.pos-cart-body');
    if (_cartEl && state.lastCartScroll > 0) _cartEl.scrollTop = state.lastCartScroll;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.classList.add('main-kasir-override');
  });
}

function renderNoSession() {
  app.innerHTML = Layout.renderMain(`
    <div class="empty-center">
      <div class="empty-state large">
        <i class="fas fa-lock"></i>
        <h2>Tidak Ada Shift Aktif</h2>
        <p>Buka shift untuk memulai transaksi</p>
        <button class="btn btn-primary" onclick="bukaShift()">BUKA SHIFT</button>
      </div>
    </div>
  `);
  Layout._restoreSidebarScroll();
}

function renderMenuItem(m) {
  const stockOk = cekKetersediaanBahan(m);
  const stokOtomatis = m.resep ? Utils.hitungStokProduk(m) : null;
  const stokTersedia = stokOtomatis !== null ? stokOtomatis : (m.useStock ? m.stock : null);
  const hasModifiers = (m.modifierGroupIds || []).length > 0;
  return `
    <div class="card hover-scale ${!stockOk.ok ? 'product-disabled' : ''}" onclick="addToCart('${m.id}')">
      ${m.imageUrl
      ? `<div class="card-img"><img src="${m.imageUrl}" alt="${m.name}" class="img-card-pos"></div>`
      : `<div class="img-placeholder-pos"><i class="fas fa-utensils"></i></div>`
    }
      <div class="card-title">${m.name}</div>
      <div class="card-price">Rp ${Utils.formatRupiah(m.price)}</div>
      ${hasModifiers ? `<div class="card-modifier-badge"><i class="fas fa-sliders-h"></i></div>` : ''}
      ${!stockOk.ok
      ? `<div class="card-stock text-danger"><i class="fas fa-exclamation-circle"></i> ${stockOk.kurang}</div>`
      : stokTersedia !== null
        ? `<div class="card-stock"><i class="fas ${m.resep ? 'fa-cubes' : 'fa-box'}"></i> Stok: ${stokTersedia} ${m.resep ? 'porsi' : ''}</div>`
        : `<div class="card-stock text-muted"><i class="fas fa-infinity"></i></div>`
    }
    </div>
  `;
}

function renderCartItems() {
  if (state.cart.length === 0) {
    return `
      <div class="empty-state">
        <i class="fas fa-shopping-basket"></i>
        <p>Belum ada pesanan</p>
      </div>
    `;
  }
  return state.cart.map(i => {
    const modTotal = _getItemModifierTotal(i);
    const unitPrice = i.price + modTotal;
    return `
      <div class="cart-item">
        <div class="cart-item-main">
          <div class="cart-item-name">${i.name}</div>
          ${(i.modifiers || []).length > 0 ? `
            <div class="cart-item-modifiers">
              ${i.modifiers.map(mod => `
                <span class="cart-modifier-tag">
                  ${mod.optionName}${mod.price > 0 ? ` +${Utils.formatRupiah(mod.price)}` : ''}
                </span>
              `).join('')}
            </div>
          ` : ''}
          <div class="cart-item-notes-wrap">
            <input
              type="text"
              class="cart-notes-input"
              placeholder="Catatan... (opsional)"
              value="${(i.notes || '').replace(/"/g, '&quot;')}"
              oninput="updateCartNotes('${i.cartItemId}', this.value)"
            >
          </div>
          <div class="cart-item-price">Rp ${Utils.formatRupiah(unitPrice)} x ${i.qty}</div>
        </div>
        <div class="cart-item-right">
          <div class="cart-item-total">Rp ${Utils.formatRupiah(unitPrice * i.qty)}</div>
          <div class="qty-control">
            <button class="qty-btn" onclick="changeQty('${i.cartItemId}',-1)"><i class="fas fa-minus"></i></button>
            <span>${i.qty}</span>
            <button class="qty-btn" onclick="changeQty('${i.cartItemId}',1)"><i class="fas fa-plus"></i></button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCartFooter() {
  const hasOpenBill = !!window._currentOpenBillId;
  const mejaLabel = state.selectedTable
    ? `${state.selectedTable.nomor} - ${state.selectedTable.nama}`
    : 'Pilih meja';
  const total = getTotal();
  const cartEmpty = state.cart.length === 0;

  return `
    <div class="table-info mb-4">
      <div>
        <i class="fas fa-chair"></i>
        ${mejaLabel}
        ${hasOpenBill ? `<span class="badge badge-warning ml-1">Open Bill</span>` : ''}
      </div>
      <button class="btn btn-secondary btn-sm" onclick="pilihMeja()">Ganti</button>
    </div>
    <div class="total-row">
      <span>Total</span>
      <span class="total-amount">Rp ${Utils.formatRupiah(total)}</span>
    </div>
    <div class="cart-footer-actions">
      ${!cartEmpty && state.selectedTable ? `
        <button class="btn btn-secondary btn-block" onclick="simpanKeOpenBill()">
          <i class="fas fa-save"></i> ${hasOpenBill ? 'Update Open Bill' : 'Simpan ke Meja'}
        </button>
      ` : ''}
      <button class="btn btn-primary btn-block btn-large"
        onclick="showPaymentModal()"
        ${(!state.selectedTable || cartEmpty) ? 'disabled' : ''}>
        <i class="fas fa-credit-card"></i> BAYAR (Rp ${Utils.formatRupiah(total)})
      </button>
    </div>
  `;
}

function selectCategory(c) {
  state.selectedCategory = c;
  const categoryContainer = document.getElementById('category-scroll-container');
  if (categoryContainer) {
    categoryContainer.querySelectorAll('.category-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim() === c);
    });
  }
  _renderKasirMenuGrid();

  const grid = document.getElementById('menu-grid-container');
  if (grid) {
    grid.classList.remove('category-enter');
    void grid.offsetWidth;
    grid.classList.add('category-enter');
  }
}

function _renderKasirMenuGrid() {
  const filteredMenus = (state.selectedCategory === "ALL"
    ? state.menus
    : state.menus.filter(m => {
      const cat = state.categories.find(c => c.id === m.categoryId);
      return cat && cat.name === state.selectedCategory;
    })
  ).filter(m => !state.kasirSearchQuery || m.name.toLowerCase().includes(state.kasirSearchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const grid = document.getElementById('menu-grid-container');
  if (grid) {
    if (filteredMenus.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <p>Produk tidak ditemukan</p>
          ${state.kasirSearchQuery ? `<button class="btn btn-secondary btn-sm mt-2" onclick="window._clearKasirSearch()">Reset Pencarian</button>` : ''}
        </div>
      `;
      grid.classList.add('empty-grid');
    } else {
      grid.innerHTML = filteredMenus.map(m => renderMenuItem(m)).join('');
      grid.classList.remove('empty-grid');
    }
  }
}

function cekKetersediaanBahan(menu, qty = 1) {
  if (!menu.resep || menu.resep.length === 0) return { ok: true };
  for (const bahan of menu.resep) {
    const bahanData = state.rawMaterials.find(b => b.id === bahan.bahanId);
    if (!bahanData) return { ok: false, kurang: `Bahan ${bahan.nama} tidak ditemukan` };
    if (bahanData.stock < (bahan.qty * qty)) {
      return { ok: false, kurang: `${bahan.nama} (butuh ${bahan.qty * qty} ${bahan.satuan})` };
    }
  }
  return { ok: true };
}

function _getItemModifierTotal(item) {
  return (item.modifiers || []).reduce((s, m) => s + (m.price || 0), 0);
}

function _genCartId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

async function addToCart(id) {
  const item = state.menus.find(m => m.id === id);
  if (!item) return;

  const stokOtomatis = item.resep ? Utils.hitungStokProduk(item) : null;
  const stokTersedia = stokOtomatis !== null ? stokOtomatis : (item.useStock ? item.stock : Infinity);
  const stockOk = cekKetersediaanBahan(item);
  if (!stockOk.ok) { Utils.showToast(`${stockOk.kurang} tidak cukup!`, 'error'); return; }
  if (stokTersedia < 1) { Utils.showToast(`Stok ${item.name} habis!`, 'error'); return; }

  const modGroups = (item.modifierGroupIds || [])
    .map(gid => (state.modifierGroups || []).find(g => g.id === gid))
    .filter(Boolean);

  if (modGroups.length > 0) {
    await _showModifierModal(item, modGroups, stokTersedia);
  } else {
    const exist = state.cart.find(c => c.id === id && (c.modifiers || []).length === 0);
    if (exist) {
      if (stokTersedia < (exist.qty + 1)) { Utils.showToast(`Stok ${item.name} tidak cukup!`, 'error'); return; }
      exist.qty++;
    } else {
      state.cart.unshift({ ...item, cartItemId: _genCartId(), qty: 1, modifiers: [], notes: '' });
    }
    renderKasir();
  }
}

async function _showModifierModal(item, modGroups, stokTersedia) {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modifier-select-modal';

    const selections = {};
    modGroups.forEach(g => {
      selections[g.id] = (g.options || []).filter(o => o.isDefault).map(o => ({ ...o, groupId: g.id, groupName: g.name }));
    });

    function buildContent() {
      return modGroups.map(group => {
        const selected = selections[group.id] || [];
        return `
          <div class="modifier-group-section">
            <div class="modifier-group-label">
              ${group.name}
              <span class="badge ${group.required ? 'badge-danger' : 'badge-secondary'}">
                ${group.required ? 'Wajib' : 'Opsional'}
              </span>
              ${group.maxSelect > 1 ? `<span class="badge badge-info">Max ${group.maxSelect}</span>` : ''}
            </div>
            <div class="modifier-options-grid">
              ${(group.options || []).map(opt => {
          const isSelected = selected.some(s => s.id === opt.id);
          return `
                  <button
                    class="modifier-opt-btn ${isSelected ? 'selected' : ''}"
                    data-group="${group.id}"
                    data-opt="${opt.id}"
                    onclick="window._toggleModifierOpt('${group.id}','${opt.id}',${group.maxSelect},${group.required})"
                  >
                    <span>${opt.name}</span>
                    <span class="modifier-opt-price">
                      ${opt.price > 0 ? `+Rp ${Utils.formatRupiah(opt.price)}` : 'Gratis'}
                    </span>
                  </button>
                `;
        }).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    modal.innerHTML = `
      <div class="modal modal-wide">
        <div class="modal-header">
          <h3><i class="fas fa-sliders-h"></i> Pilihan untuk ${item.name}</h3>
          <button class="btn-icon-sm" onclick="document.getElementById('modifier-select-modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body stack-y" id="modifier-modal-body">
          ${buildContent()}
        </div>
        <div class="modal-footer-inline">
          <button class="btn btn-secondary" onclick="document.getElementById('modifier-select-modal').remove()">Batal</button>
          <button class="btn btn-primary" id="confirm-modifier-btn" onclick="window._confirmModifier()">
            <i class="fas fa-cart-plus"></i> Tambah ke Pesanan
          </button>
        </div>
      </div>
    `;

    window._toggleModifierOpt = function (groupId, optId, maxSelect, required) {
      const group = modGroups.find(g => g.id === groupId);
      if (!group) return;
      const opt = group.options.find(o => o.id === optId);
      if (!opt) return;

      const sel = selections[groupId] || [];
      const idx = sel.findIndex(s => s.id === optId);

      if (idx >= 0) {
        if (required && sel.length <= 1) { Utils.showToast('Minimal 1 pilihan wajib dipilih', 'warning'); return; }
        selections[groupId] = sel.filter(s => s.id !== optId);
      } else {
        if (maxSelect === 1) {
          selections[groupId] = [{ ...opt, groupId, groupName: group.name }];
        } else {
          if (sel.length >= maxSelect) { Utils.showToast(`Maksimal ${maxSelect} pilihan`, 'warning'); return; }
          selections[groupId] = [...sel, { ...opt, groupId, groupName: group.name }];
        }
      }

      const body = document.getElementById('modifier-modal-body');
      if (body) body.innerHTML = buildContent();
    };

    window._confirmModifier = function () {
      for (const group of modGroups) {
        if (group.required && (selections[group.id] || []).length === 0) {
          Utils.showToast(`"${group.name}" wajib dipilih`, 'warning');
          return;
        }
      }

      const allSelected = Object.values(selections).flat();
      const cartItem = {
        ...item,
        cartItemId: _genCartId(),
        qty: 1,
        modifiers: allSelected.map(s => ({
          groupId: s.groupId,
          groupName: s.groupName,
          optionId: s.id,
          optionName: s.name,
          price: s.price || 0,
          resep: s.resep || []
        })),
        notes: ''
      };

      state.cart.unshift(cartItem);
      document.getElementById('modifier-select-modal')?.remove();
      renderKasir();
      resolve();
    };

    modal.addEventListener('click', e => {
      if (e.target === modal) { modal.remove(); resolve(); }
    });

    document.body.appendChild(modal);
  });
}

function changeQty(cartItemId, d) {
  const item = state.cart.find(i => i.cartItemId === cartItemId);
  if (!item) return;
  const menu = state.menus.find(m => m.id === item.id);
  if (!menu) return;
  const stokOtomatis = menu.resep ? Utils.hitungStokProduk(menu) : null;
  const stokTersedia = stokOtomatis !== null ? stokOtomatis : (menu.useStock ? menu.stock : Infinity);
  if (d > 0) {
    const stockOk = cekKetersediaanBahan(menu, item.qty + d);
    if (!stockOk.ok) { Utils.showToast(`${stockOk.kurang} tidak cukup!`, 'error'); return; }
    if (stokTersedia < (item.qty + d)) { Utils.showToast(`Stok ${menu.name} tidak cukup!`, 'error'); return; }
  }
  item.qty += d;
  if (item.qty <= 0) state.cart = state.cart.filter(i => i.cartItemId !== cartItemId);
  renderKasir();
}

function updateCartNotes(cartItemId, value) {
  const item = state.cart.find(i => i.cartItemId === cartItemId);
  if (item) item.notes = value;
}

function getTotal() {
  return state.cart.reduce((s, i) => s + ((i.price + _getItemModifierTotal(i)) * i.qty), 0);
}

function setPaymentMethod(method) {
  state.selectedPaymentMethod = method;
  if (method === 'tunai') { state.cashAmount = 0; state.qrisAmount = 0; }
  else if (method === 'qris') { state.cashAmount = 0; state.qrisAmount = getTotal(); }
  else { state.cashAmount = 0; state.qrisAmount = 0; }
  renderKasir();
}

async function pilihMeja() {
  const tables = state.tables.filter(t => t.aktif !== false).sort((a, b) => {
    const nc = String(a.nama).localeCompare(String(b.nama), undefined, { numeric: true, sensitivity: 'base' });
    return nc !== 0 ? nc : String(a.nomor).localeCompare(String(b.nomor), undefined, { numeric: true, sensitivity: 'base' });
  });

  const openBillByMeja = {};
  (state.openBills || []).forEach(ob => { openBillByMeja[ob.mejaId] = ob; });

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h3><i class="fas fa-chair"></i> Pilih Meja</h3>
      <div class="table-grid">
        ${tables.map(meja => {
    const hasOpenBill = !!openBillByMeja[meja.id];
    return `
            <button class="table-btn ${hasOpenBill ? 'table-btn-occupied' : ''}"
              data-id="${meja.id}" data-nomor="${meja.nomor}" data-nama="${meja.nama}">
              <div class="table-number">${meja.nomor}</div>
              <div class="table-name text-bold-md mt-1 color-primary">${meja.nama}</div>
              ${hasOpenBill ? `<div class="table-open-bill-badge"><i class="fas fa-receipt"></i> Open Bill</div>` : ''}
            </button>
          `;
  }).join('')}
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Batal</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll('.table-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const nomor = btn.dataset.nomor;
      const nama = btn.dataset.nama;
      modal.remove();

      const openBill = openBillByMeja[id];
      if (openBill) {
        const result = await Swal.fire({
          title: `Meja ${nomor} - Ada Open Bill`,
          text: `${openBill.items?.length || 0} item · Rp ${Utils.formatRupiah(openBill.total || 0)}`,
          icon: 'question',
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: 'Lanjutkan Order',
          denyButtonText: 'Bayar Sekarang',
          cancelButtonText: 'Pilih Meja Lain',
          customClass: { popup: 'swal2-is-konfirmasi' }
        });

        if (result.isConfirmed) {
          _loadOpenBill(openBill, { id, nomor, nama });
        } else if (result.isDenied) {
          state.selectedTable = { id, nomor, nama };
          _loadOpenBill(openBill, { id, nomor, nama });
          setTimeout(() => showPaymentModal(), 100);
        }
        return;
      }

      state.selectedTable = { id, nomor, nama };
      window._currentOpenBillId = null;
      Utils.showToast(`Meja ${nomor} - ${nama} dipilih`, 'success');
      renderKasir();
    });
  });
}

function _loadOpenBill(openBill, meja) {
  state.selectedTable = meja;
  state.cart = (openBill.items || []).map(i => ({
    ...i,
    cartItemId: i.cartItemId || _genCartId()
  }));
  window._currentOpenBillId = openBill.id;
  Utils.showToast('Open bill dimuat', 'success');
  renderKasir();
}

async function simpanKeOpenBill() {
  if (!state.selectedTable) { Utils.showToast('Pilih meja dulu!', 'warning'); return; }
  if (state.cart.length === 0) { Utils.showToast('Keranjang kosong!', 'warning'); return; }

  const total = getTotal();
  const data = {
    mejaId: state.selectedTable.id,
    mejaNama: state.selectedTable.nama,
    mejaNomor: state.selectedTable.nomor,
    sessionId: state.currentSession.id,
    kasir: state.user.email,
    items: state.cart,
    total,
    status: 'open',
    updatedAt: new Date()
  };

  try {
    if (window._currentOpenBillId) {
      await dbCloud.collection('openBills').doc(window._currentOpenBillId).update(data);
      Utils.showToast('Open bill diperbarui', 'success');
    } else {
      data.createdAt = new Date();
      const ref = await dbCloud.collection('openBills').add(data);
      window._currentOpenBillId = ref.id;
      Utils.showToast('Pesanan disimpan ke meja', 'success');
    }
    state.cart = [];
    state.selectedTable = null;
    window._currentOpenBillId = null;
    renderKasir();
  } catch (err) {
    Utils.showToast('Gagal simpan: ' + err.message, 'error');
  }
}

async function bayar() {
  if (!state.currentSession) { bukaShift(); return; }
  if (!state.selectedTable) { Utils.showToast("Pilih meja!", 'warning'); return; }
  if (state.cart.length === 0) { Utils.showToast("Keranjang kosong!", 'error'); return; }

  const total = getTotal();
  let cashAmount = 0, qrisAmount = 0, paid = 0;

  if (state.selectedPaymentMethod === 'tunai') {
    cashAmount = state.cashAmount || 0;
    paid = cashAmount;
    if (cashAmount < total) { Utils.showToast("Uang cash kurang!", 'error'); return; }
  } else if (state.selectedPaymentMethod === 'qris') {
    qrisAmount = total; paid = total;
  } else {
    cashAmount = state.cashAmount || 0;
    qrisAmount = state.qrisAmount || 0;
    paid = cashAmount + qrisAmount;
    if (paid < total) { Utils.showToast("Pembayaran kurang!", 'error'); return; }
  }

  try {
    for (const item of state.cart) {
      const produk = state.menus.find(m => m.id === item.id);
      if (!produk) continue;
      if (produk.resep) {
        for (const bahan of produk.resep) {
          const bahanData = state.rawMaterials.find(b => b.id === bahan.bahanId);
          if (!bahanData || bahanData.stock < (bahan.qty * item.qty)) {
            throw new Error(`Stok ${bahan.nama} tidak cukup`);
          }
        }
      }
      if (produk.useStock && produk.stock < item.qty) throw new Error(`Stok ${produk.name} tidak cukup`);

      for (const mod of (item.modifiers || [])) {
        if (!mod.resep || mod.resep.length === 0) continue;
        for (const bahan of mod.resep) {
          const bahanData = state.rawMaterials.find(b => b.id === bahan.bahanId);
          if (!bahanData || bahanData.stock < (bahan.qty * item.qty)) {
            throw new Error(`Stok ${bahan.namaBahan} tidak cukup untuk modifier "${mod.optionName}"`);
          }
        }
      }
    }

    const trxData = {
      items: state.cart.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        modifiers: i.modifiers || [],
        modifierTotal: _getItemModifierTotal(i),
        notes: i.notes || '',
        subtotal: (i.price + _getItemModifierTotal(i)) * i.qty
      })),
      total, paid, change: paid - total,
      cashAmount, qrisAmount,
      metodeBayar: state.selectedPaymentMethod,
      sessionId: state.currentSession.id,
      mejaId: state.selectedTable.id,
      mejaNama: state.selectedTable.nama,
      mejaNomor: state.selectedTable.nomor,
      kasir: state.user.email,
      date: new Date(),
      openBillId: window._currentOpenBillId || null
    };

    const trxRef = await dbCloud.collection("transactions").add(trxData);
    const trxId = trxRef.id;

    const batch = dbCloud.batch();
    for (const item of state.cart) {
      const produk = state.menus.find(m => m.id === item.id);
      if (!produk) continue;
      if (produk.useStock) {
        batch.update(dbCloud.collection("menus").doc(item.id), {
          stock: firebase.firestore.FieldValue.increment(-item.qty)
        });
      }
      if (produk.resep) {
        for (const bahan of produk.resep) {
          batch.update(dbCloud.collection("raw_materials").doc(bahan.bahanId), {
            stock: firebase.firestore.FieldValue.increment(-(bahan.qty * item.qty))
          });
          batch.set(dbCloud.collection("stock_mutations").doc(), {
            type: "out", source: "sale",
            bahanId: bahan.bahanId, namaBahan: bahan.nama,
            qty: bahan.qty * item.qty, satuan: bahan.satuan || 'pcs',
            produkId: item.id, namaProduk: produk.name,
            transactionId: trxId, userId: state.user.email, createdAt: new Date()
          });
        }
      }
      for (const mod of (item.modifiers || [])) {
        if (!mod.resep || mod.resep.length === 0) continue;
        for (const bahan of mod.resep) {
          batch.update(dbCloud.collection("raw_materials").doc(bahan.bahanId), {
            stock: firebase.firestore.FieldValue.increment(-(bahan.qty * item.qty))
          });
          batch.set(dbCloud.collection("stock_mutations").doc(), {
            type: "out", source: "sale",
            bahanId: bahan.bahanId, namaBahan: bahan.namaBahan,
            qty: bahan.qty * item.qty, satuan: bahan.satuan || 'pcs',
            produkId: item.id, namaProduk: produk.name,
            modifierId: mod.optionId, namaModifier: mod.optionName,
            transactionId: trxId, userId: state.user.email, createdAt: new Date()
          });
        }
      }
    }

    if (window._currentOpenBillId) {
      batch.update(dbCloud.collection('openBills').doc(window._currentOpenBillId), {
        status: 'paid', paidAt: new Date(), transactionId: trxId
      });
    }

    await batch.commit();

    trxData.id = trxId;
    if (typeof window.printStruk === 'function') await window.printStruk(trxData);

    state.cart = [];
    state.selectedTable = null;
    state.cashAmount = 0;
    state.qrisAmount = 0;
    state.selectedPaymentMethod = 'tunai';
    window._currentOpenBillId = null;

    Utils.showToast("Transaksi berhasil!");
    renderKasir();
  } catch (err) {
    Utils.showToast("" + err.message, 'error');
  }
}

async function showPaymentModal() {
  const total = getTotal();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'payment-modal';
  modal.innerHTML = `
    <div class="modal">
      <h3><i class="fas fa-credit-card"></i> Pembayaran</h3>
      <div class="total-display">Rp ${Utils.formatRupiah(total)}</div>
      <div class="payment-grid">
        <button class="payment-option ${state.selectedPaymentMethod === 'tunai' ? 'active' : ''}" onclick="selectPaymentMethod('tunai')">
          <i class="fas fa-money-bill-wave"></i><span>CASH</span>
        </button>
        <button class="payment-option ${state.selectedPaymentMethod === 'qris' ? 'active' : ''}" onclick="selectPaymentMethod('qris')">
          <i class="fas fa-qrcode"></i><span>QRIS</span>
        </button>
        <button class="payment-option ${state.selectedPaymentMethod === 'mixed' ? 'active' : ''}" onclick="selectPaymentMethod('mixed')">
          <i class="fas fa-random"></i><span>CAMPUR</span>
        </button>
      </div>
      <div id="modalPaymentContent">${renderModalPaymentContent()}</div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancelPaymentBtn">Batal</button>
        <button class="btn btn-primary" id="processPaymentBtn">Proses</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  window.selectPaymentMethod = function (method) {
    state.selectedPaymentMethod = method;
    if (method === 'tunai') { state.cashAmount = 0; state.qrisAmount = 0; }
    else if (method === 'qris') { state.cashAmount = 0; state.qrisAmount = total; }
    else { state.cashAmount = 0; state.qrisAmount = 0; }
    const contentDiv = document.getElementById('modalPaymentContent');
    if (contentDiv) contentDiv.innerHTML = renderModalPaymentContent();
    document.querySelectorAll('.payment-option').forEach((btn, i) => {
      btn.classList.toggle('active', (method === 'tunai' && i === 0) || (method === 'qris' && i === 1) || (method === 'mixed' && i === 2));
    });
  };

  document.getElementById('cancelPaymentBtn').addEventListener('click', () => modal.remove());
  document.getElementById('processPaymentBtn').addEventListener('click', async function () {
    const btn = this;
    Utils.setButtonLoading(btn, true);
    try {
      await bayar();
      if (document.body.contains(modal)) modal.remove();
    } catch (error) {
      Utils.setButtonLoading(btn, false);
      Utils.showToast('Gagal proses pembayaran: ' + error.message, 'error');
    }
  });
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function renderModalPaymentContent() {
  const total = getTotal();
  if (state.selectedPaymentMethod === 'tunai') {
    return `
      <div>
        <label class="form-label">Nominal Cash</label>
        <input type="text" id="cash-input" class="form-input" placeholder="Masukkan nominal"
               oninput="handleCashInput(this.value)" autocomplete="off"
               value="${state.cashAmount ? Utils.formatRupiah(state.cashAmount) : ''}">
        <div class="quick-buttons">
          <button class="btn btn-secondary" onclick="quickCash(50000)">50K</button>
          <button class="btn btn-secondary" onclick="quickCash(100000)">100K</button>
          <button class="btn btn-secondary" onclick="quickCash(${total})">LUNAS</button>
        </div>
        ${state.cashAmount > 0 ? `
          <div class="change-info ${state.cashAmount >= total ? 'success' : 'warning'}">
            <span>${state.cashAmount >= total ? 'Kembalian' : 'Kekurangan'}</span>
            <span>Rp ${Utils.formatRupiah(Math.abs(state.cashAmount - total))}</span>
          </div>
        ` : ''}
      </div>
    `;
  }
  if (state.selectedPaymentMethod === 'qris') {
    return `
      <div class="qris-display">
        <i class="fas fa-qrcode qris-icon"></i>
        <div class="qris-amount">Rp ${Utils.formatRupiah(total)}</div>
        <p>Scan QRIS</p>
      </div>
    `;
  }
  return `
    <div>
      <div class="form-group">
        <label class="form-label">Cash</label>
        <div class="mixed-input-flex">
          <input type="text" id="mixed-cash-input" class="form-input" placeholder="Nominal"
                 oninput="handleMixedCashInput(this.value)" autocomplete="off"
                 value="${state.cashAmount ? Utils.formatRupiah(state.cashAmount) : ''}">
          <button class="btn btn-secondary" onclick="quickCash(50000)">50K</button>
          <button class="btn btn-secondary" onclick="quickCash(100000)">100K</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">QRIS</label>
        <div class="mixed-input-flex">
          <input type="text" id="mixed-qris-input" class="form-input" placeholder="Nominal"
                 oninput="handleMixedQrisInput(this.value)" autocomplete="off"
                 value="${state.qrisAmount ? Utils.formatRupiah(state.qrisAmount) : ''}">
          <button class="btn btn-secondary" onclick="quickQris(50000)">50K</button>
          <button class="btn btn-secondary" onclick="quickQris(100000)">100K</button>
        </div>
      </div>
      <div class="payment-summary">
        <div><span>Total</span><span>Rp ${Utils.formatRupiah(total)}</span></div>
        <div><span>Cash</span><span>Rp ${Utils.formatRupiah(state.cashAmount || 0)}</span></div>
        <div><span>QRIS</span><span>Rp ${Utils.formatRupiah(state.qrisAmount || 0)}</span></div>
        <div class="total"><span>Dibayar</span><span>Rp ${Utils.formatRupiah((state.cashAmount || 0) + (state.qrisAmount || 0))}</span></div>
        <div class="${(state.cashAmount || 0) + (state.qrisAmount || 0) >= total ? 'success' : 'warning'}">
          <span>${(state.cashAmount || 0) + (state.qrisAmount || 0) >= total ? 'Kembalian' : 'Kekurangan'}</span>
          <span>Rp ${Utils.formatRupiah(Math.abs((state.cashAmount || 0) + (state.qrisAmount || 0) - total))}</span>
        </div>
      </div>
    </div>
  `;
}

window.handleCashInput = function (value) {
  const cash = parseInt(value.replace(/\./g, '')) || 0;
  const total = getTotal();
  state.cashAmount = cash;
  const changeInfo = document.querySelector('.change-info');
  if (changeInfo) {
    changeInfo.className = `change-info ${cash >= total ? 'success' : 'warning'}`;
    changeInfo.innerHTML = `<span>${cash >= total ? 'Kembalian' : 'Kekurangan'}</span><span>Rp ${Utils.formatRupiah(Math.abs(cash - total))}</span>`;
  }
};

window.handleMixedCashInput = function (value) {
  const cash = parseInt(value.replace(/\./g, '')) || 0;
  const total = getTotal();
  state.cashAmount = cash;
  state.qrisAmount = Math.max(0, total - cash);
  const qi = document.getElementById('mixed-qris-input');
  if (qi && state.qrisAmount > 0) qi.value = Utils.formatRupiah(state.qrisAmount);
  else if (qi) qi.value = '';
  updateMixedSummary();
};

window.handleMixedQrisInput = function (value) {
  const qris = parseInt(value.replace(/\./g, '')) || 0;
  const total = getTotal();
  state.qrisAmount = qris;
  state.cashAmount = Math.max(0, total - qris);
  const ci = document.getElementById('mixed-cash-input');
  if (ci && state.cashAmount > 0) ci.value = Utils.formatRupiah(state.cashAmount);
  else if (ci) ci.value = '';
  updateMixedSummary();
};

function updateMixedSummary() {
  const total = getTotal();
  const paid = (state.cashAmount || 0) + (state.qrisAmount || 0);
  const summary = document.querySelector('.payment-summary');
  if (summary) {
    summary.innerHTML = `
      <div><span>Total</span><span>Rp ${Utils.formatRupiah(total)}</span></div>
      <div><span>Cash</span><span>Rp ${Utils.formatRupiah(state.cashAmount || 0)}</span></div>
      <div><span>QRIS</span><span>Rp ${Utils.formatRupiah(state.qrisAmount || 0)}</span></div>
      <div class="total"><span>Dibayar</span><span>Rp ${Utils.formatRupiah(paid)}</span></div>
      <div class="${paid >= total ? 'success' : 'warning'}">
        <span>${paid >= total ? 'Kembalian' : 'Kekurangan'}</span>
        <span>Rp ${Utils.formatRupiah(Math.abs(paid - total))}</span>
      </div>
    `;
  }
}

window.quickCash = function (amount) {
  if (state.selectedPaymentMethod === 'mixed') {
    const total = getTotal();
    state.cashAmount = Math.min(amount, total);
    state.qrisAmount = total - state.cashAmount;
    const ci = document.getElementById('mixed-cash-input');
    const qi = document.getElementById('mixed-qris-input');
    if (ci) ci.value = Utils.formatRupiah(state.cashAmount);
    if (qi) qi.value = state.qrisAmount > 0 ? Utils.formatRupiah(state.qrisAmount) : '';
    updateMixedSummary();
  } else {
    state.cashAmount = amount;
    const ci = document.getElementById('cash-input');
    if (ci) ci.value = Utils.formatRupiah(amount);
    window.handleCashInput(String(amount));
  }
};

window.quickQris = function (amount) {
  const total = getTotal();
  state.qrisAmount = Math.min(Math.max(amount, 0), total);
  state.cashAmount = total - state.qrisAmount;
  const ci = document.getElementById('mixed-cash-input');
  const qi = document.getElementById('mixed-qris-input');
  if (ci) ci.value = state.cashAmount > 0 ? Utils.formatRupiah(state.cashAmount) : '';
  if (qi) qi.value = Utils.formatRupiah(state.qrisAmount);
  updateMixedSummary();
};

window.renderKasir = renderKasir;
window.selectCategory = selectCategory;
window.addToCart = addToCart;
window.changeQty = changeQty;
window.updateCartNotes = updateCartNotes;
window.getTotal = getTotal;
window.setPaymentMethod = setPaymentMethod;
window.pilihMeja = pilihMeja;
window.simpanKeOpenBill = simpanKeOpenBill;
window.bayar = bayar;
window.showPaymentModal = showPaymentModal;

window._onKasirSearch = function (val) {
  state.kasirSearchQuery = val;
  _renderKasirMenuGrid();

};

window._clearKasirSearch = function () {
  state.kasirSearchQuery = '';
  renderKasir();
};
window.renderModalPaymentContent = renderModalPaymentContent;
window._loadOpenBill = _loadOpenBill;

window.setMobileTab = function (tab) {
  state.activeMobileTab = tab;
};

