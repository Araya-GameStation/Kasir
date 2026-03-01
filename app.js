// ================================
// GARIS WAKTU POS - FULL KASIR UI
// ================================

const app = document.getElementById("app");

const defaultDB = {
  categories: [],
  menus: [],
  transactions: [],
  settings: {
    storeName: "GARIS WAKTU",
    theme: "light",
    paperSize: "58mm",
    quickCash: [10000, 20000, 50000, 100000]
  }
};

let db = JSON.parse(localStorage.getItem("gw_pos_db")) || defaultDB;

function saveDB() {
  localStorage.setItem("gw_pos_db", JSON.stringify(db));
}

let state = {
  currentView: "kasir",
  currentCategory: null,
  cart: [],
  manageMode: false
};

function navigate(view, data = null) {
  state.currentView = view;
  state.manageMode = false;

  if (view === "kasir") renderKasir();
  if (view === "menu") renderMenu();
  if (view === "riwayat") renderRiwayat();
  if (view === "pengaturan") renderPengaturan();
}

function formatRupiah(num) {
  return "Rp " + num.toLocaleString("id-ID");
}

function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// ======================
// ===== KASIR UI =======
// ======================

function renderKasir() {
  app.innerHTML = `
    <div class="pos-container">
      <div class="pos-left">
        ${renderCategoryBar()}
        <div class="menu-grid">
          ${renderMenuGrid()}
        </div>
      </div>

      <div class="pos-right">
        <div class="cart-section">
          <h3>Keranjang</h3>
          <div id="cartItems">
            ${renderCartItems()}
          </div>
        </div>

        <div class="payment-section">
          <div class="total">
            Total: <strong>${formatRupiah(getCartTotal())}</strong>
          </div>

          <div class="quick-cash">
            ${db.settings.quickCash.map(q =>
              `<button onclick="quickPay(${q})">${formatRupiah(q)}</button>`
            ).join("")}
          </div>

          <input type="number" id="manualPay" placeholder="Nominal Bayar">
          <button class="pay-btn" onclick="processPayment()">Bayar</button>
        </div>
      </div>
    </div>
  `;
}

function renderCategoryBar() {
  if (db.categories.length === 0) {
    return `<div class="empty-msg">Belum ada kategori</div>`;
  }

  return `
    <div class="category-bar">
      ${db.categories.map(cat => `
        <button 
          class="${state.currentCategory === cat.id ? "active" : ""}"
          onclick="selectCategory(${cat.id})">
          ${cat.name}
        </button>
      `).join("")}
    </div>
  `;
}

function selectCategory(id) {
  state.currentCategory = id;
  renderKasir();
}

function renderMenuGrid() {
  if (!state.currentCategory) {
    return `<div class="empty-msg">Pilih kategori</div>`;
  }

  const menus = db.menus.filter(m => m.categoryId === state.currentCategory);

  if (menus.length === 0) {
    return `<div class="empty-msg">Belum ada menu</div>`;
  }

  return menus.map(menu => `
    <div class="menu-card" onclick="addToCart(${menu.id})">
      <div class="menu-name">${menu.name}</div>
      <div class="menu-price">${formatRupiah(menu.price)}</div>
    </div>
  `).join("");
}

function addToCart(menuId) {
  const item = db.menus.find(m => m.id === menuId);

  const existing = state.cart.find(c => c.id === menuId);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ ...item, qty: 1 });
  }

  renderKasir();
}

function renderCartItems() {
  if (state.cart.length === 0) {
    return `<div class="empty-msg">Kosong</div>`;
  }

  return state.cart.map(item => `
    <div class="cart-item">
      <div>${item.name} x${item.qty}</div>
      <div>${formatRupiah(item.price * item.qty)}</div>
    </div>
  `).join("");
}

function getCartTotal() {
  return state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function quickPay(amount) {
  document.getElementById("manualPay").value = amount;
}

function processPayment() {
  const total = getCartTotal();
  const paid = parseInt(document.getElementById("manualPay").value);

  if (!paid || paid < total) {
    alert("Nominal kurang");
    return;
  }

  const change = paid - total;

  db.transactions.push({
    id: generateId(),
    items: state.cart,
    total,
    paid,
    change,
    date: new Date().toLocaleString()
  });

  saveDB();

  alert("Kembalian: " + formatRupiah(change));

  state.cart = [];
  renderKasir();
}

// ======================
// EMPTY OTHER VIEWS
// ======================

function renderMenu() {
  app.innerHTML = "<h2>MENU MANAGEMENT NEXT</h2>";
}

function renderRiwayat() {
  app.innerHTML = "<h2>RIWAYAT NEXT</h2>";
}

function renderPengaturan() {
  app.innerHTML = "<h2>PENGATURAN NEXT</h2>";
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

navigate("kasir");
