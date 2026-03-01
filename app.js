const app = document.getElementById("app");

// ===== DATABASE =====
let db = JSON.parse(localStorage.getItem("gw_pos_db")) || {
  categories: [],
  menus: [],
  transactions: []
};

function saveDB() {
  localStorage.setItem("gw_pos_db", JSON.stringify(db));
}

// ===== ROUTING =====
function navigate(page, data = null) {
  if (page === "kasir") renderKasir();
  if (page === "menu") renderMenuManagement();
  if (page === "categoryDetail") renderCategoryDetail(data);
  if (page === "riwayat") renderRiwayat();
  if (page === "pengaturan") renderPengaturan();
}

// ===== KASIR =====
function renderKasir() {
  if (db.categories.length === 0) {
    app.innerHTML = `
      <h2>Belum ada kategori</h2>
      <button onclick="navigate('menu')">Buat Kategori</button>
    `;
    return;
  }

  app.innerHTML = `<h2>Kasir (Belum Dibangun)</h2>`;
}

// ===== MENU MANAGEMENT =====
function renderMenuManagement() {
  app.innerHTML = `
    <h2>Kelola Kategori</h2>

    <input type="text" id="newCategory" placeholder="Nama Kategori">
    <button onclick="addCategory()">Tambah</button>

    <div id="categoryList" style="margin-top:20px;"></div>
  `;

  renderCategoryList();
}

function addCategory() {
  const name = document.getElementById("newCategory").value.trim();
  if (!name) return;

  db.categories.push({ id: Date.now(), name });
  saveDB();
  document.getElementById("newCategory").value = "";
  renderCategoryList();
}

function renderCategoryList() {
  const list = document.getElementById("categoryList");

  if (db.categories.length === 0) {
    list.innerHTML = "<p>Belum ada kategori.</p>";
    return;
  }

  list.innerHTML = db.categories.map(cat => `
    <div 
      onclick="navigate('categoryDetail', ${cat.id})"
      style="
        margin-bottom:10px;
        padding:15px;
        background:white;
        border-radius:10px;
        cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,0.05);
      ">
      ${cat.name}
    </div>
  `).join("");
}

// ===== CATEGORY DETAIL (MENU DI DALAMNYA) =====
function renderCategoryDetail(categoryId) {
  const category = db.categories.find(c => c.id === categoryId);

  const menusInCategory = db.menus.filter(m => m.categoryId === categoryId);

  app.innerHTML = `
    <button onclick="navigate('menu')">← Kembali</button>
    <h2>${category.name}</h2>

    <h3>Tambah Menu</h3>
    <input type="text" id="menuName" placeholder="Nama Menu">
    <input type="number" id="menuPrice" placeholder="Harga">
    <button onclick="addMenu(${categoryId})">Tambah Menu</button>

    <h3 style="margin-top:20px;">Daftar Menu</h3>
    <div id="menuList"></div>
  `;

  renderMenuList(categoryId);
}

function addMenu(categoryId) {
  const name = document.getElementById("menuName").value.trim();
  const price = parseInt(document.getElementById("menuPrice").value);

  if (!name || !price) return;

  db.menus.push({
    id: Date.now(),
    name,
    price,
    categoryId
  });

  saveDB();

  document.getElementById("menuName").value = "";
  document.getElementById("menuPrice").value = "";

  renderMenuList(categoryId);
}

function renderMenuList(categoryId) {
  const list = document.getElementById("menuList");
  const menus = db.menus.filter(m => m.categoryId === categoryId);

  if (menus.length === 0) {
    list.innerHTML = "<p>Belum ada menu.</p>";
    return;
  }

  list.innerHTML = menus.map(menu => `
    <div style="
      margin-bottom:10px;
      padding:12px;
      background:#f9fafb;
      border-radius:8px;
    ">
      <strong>${menu.name}</strong><br>
      Rp ${menu.price.toLocaleString()}
    </div>
  `).join("");
}

// ===== RIWAYAT =====
function renderRiwayat() {
  app.innerHTML = `<h2>Riwayat Kosong</h2>`;
}

// ===== PENGATURAN =====
function renderPengaturan() {
  app.innerHTML = `<h2>Pengaturan (Belum Dibangun)</h2>`;
}

// Default
navigate("kasir");

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
