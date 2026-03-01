// ===================================
// GARIS WAKTU POS - FIXED FULL CORE
// ===================================

const app = document.getElementById("app");

const defaultDB = {
  categories: [],
  menus: [],
  transactions: [],
  settings: {
    storeName: "GARIS WAKTU",
    quickCash: [10000, 20000, 50000, 100000]
  }
};

let db = JSON.parse(localStorage.getItem("gw_pos_db")) || defaultDB;

function saveDB() {
  localStorage.setItem("gw_pos_db", JSON.stringify(db));
}

let state = {
  view: "kasir",
  currentCategory: null,
  cart: [],
  manageMode: false
};

function navigate(view) {
  state.view = view;
  state.manageMode = false;

  if (view === "kasir") renderKasir();
  if (view === "menu") renderMenu();
  if (view === "riwayat") renderRiwayat();
}

function formatRupiah(num) {
  return "Rp " + num.toLocaleString("id-ID");
}

function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

////////////////////////////////////////////////////
// ================== KASIR =======================
////////////////////////////////////////////////////

function renderKasir() {

  // Auto pilih kategori pertama kalau belum ada
  if (!state.currentCategory && db.categories.length > 0) {
    state.currentCategory = db.categories[0].id;
  }

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
          ${renderCart()}
        </div>

        <div class="payment-section">
          <div class="total">
            Total: <strong>${formatRupiah(getTotal())}</strong>
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
  if (db.categories.length === 0)
    return `<div class="empty-msg">Belum ada kategori</div>`;

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
  if (!state.currentCategory)
    return `<div class="empty-msg">Pilih kategori</div>`;

  const menus = db.menus.filter(m => m.categoryId === state.currentCategory);

  if (menus.length === 0)
    return `<div class="empty-msg">Belum ada menu</div>`;

  return menus.map(menu => `
    <div class="menu-card" onclick="addToCart(${menu.id})">
      <div>${menu.name}</div>
      <div>${formatRupiah(menu.price)}</div>
    </div>
  `).join("");
}

function addToCart(menuId) {
  const item = db.menus.find(m => m.id === menuId);
  const existing = state.cart.find(c => c.id === menuId);

  if (existing) existing.qty++;
  else state.cart.push({ ...item, qty: 1 });

  renderKasir();
}

function renderCart() {
  if (state.cart.length === 0)
    return `<div class="empty-msg">Kosong</div>`;

  return state.cart.map(item => `
    <div class="cart-item">
      <div>${item.name} x${item.qty}</div>
      <div>${formatRupiah(item.price * item.qty)}</div>
    </div>
  `).join("");
}

function getTotal() {
  return state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function quickPay(amount) {
  document.getElementById("manualPay").value = amount;
}

function processPayment() {
  const total = getTotal();
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

////////////////////////////////////////////////////
// ================= MENU =========================
////////////////////////////////////////////////////

function renderMenu() {
  app.innerHTML = `
    <h2>Kelola Kategori</h2>

    <input type="text" id="newCategory" placeholder="Nama Kategori">
    <button onclick="addCategory()">Tambah</button>

    <div id="categoryList"></div>
  `;

  renderCategoryList();
}

function addCategory() {
  const name = document.getElementById("newCategory").value.trim();
  if (!name) return;

  db.categories.push({ id: generateId(), name });
  saveDB();

  renderMenu();
}

function renderCategoryList() {
  const list = document.getElementById("categoryList");

  if (db.categories.length === 0) {
    list.innerHTML = "<p>Belum ada kategori</p>";
    return;
  }

  list.innerHTML = db.categories.map(cat => `
    <div style="margin:10px 0; padding:10px; background:white; border-radius:8px;">
      <span onclick="openCategory(${cat.id})" style="cursor:pointer;">
        ${cat.name}
      </span>
    </div>
  `).join("");
}

function openCategory(id) {
  state.currentCategory = id;
  renderCategoryDetail(id);
}

function renderCategoryDetail(categoryId) {
  const category = db.categories.find(c => c.id === categoryId);

  app.innerHTML = `
    <button onclick="renderMenu()">← Kembali</button>
    <h2>${category.name}</h2>

    <input type="text" id="menuName" placeholder="Nama Menu">
    <input type="number" id="menuPrice" placeholder="Harga">
    <button onclick="addMenu(${categoryId})">Tambah Menu</button>

    <div id="menuList"></div>
  `;

  renderMenuList(categoryId);
}

function addMenu(categoryId) {
  const name = document.getElementById("menuName").value.trim();
  const price = parseInt(document.getElementById("menuPrice").value);

  if (!name || !price) return;

  db.menus.push({
    id: generateId(),
    name,
    price,
    categoryId
  });

  saveDB();

  renderCategoryDetail(categoryId);
}

function renderMenuList(categoryId) {
  const list = document.getElementById("menuList");
  const menus = db.menus.filter(m => m.categoryId === categoryId);

  if (menus.length === 0) {
    list.innerHTML = "<p>Belum ada menu</p>";
    return;
  }

  list.innerHTML = menus.map(menu => `
    <div style="margin:10px 0; padding:10px; background:#f3f4f6; border-radius:8px;">
      <strong>${menu.name}</strong> - ${formatRupiah(menu.price)}
    </div>
  `).join("");
}

////////////////////////////////////////////////////
// ================= RIWAYAT ======================
////////////////////////////////////////////////////

function renderRiwayat() {
  if (db.transactions.length === 0) {
    app.innerHTML = "<h2>Belum ada transaksi</h2>";
    return;
  }

  app.innerHTML = `
    <h2>Riwayat</h2>
    ${db.transactions.map(trx => `
      <div style="margin-bottom:10px; padding:10px; background:white; border-radius:8px;">
        ${trx.date} - ${formatRupiah(trx.total)}
      </div>
    `).join("")}
  `;
}

navigate("kasir");
