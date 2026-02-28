const app = document.getElementById("app");

// === DATABASE LOCAL ===
let db = JSON.parse(localStorage.getItem("gw_pos_db")) || {
  categories: [],
  menus: [],
  transactions: []
};

function saveDB() {
  localStorage.setItem("gw_pos_db", JSON.stringify(db));
}

// === ROUTING ===
function navigate(page) {
  if (page === "kasir") renderKasir();
  if (page === "menu") renderMenuManagement();
  if (page === "riwayat") renderRiwayat();
  if (page === "pengaturan") renderPengaturan();
}

// === KASIR ===
function renderKasir() {
  if (db.categories.length === 0) {
    app.innerHTML = `
      <h2>Belum ada kategori</h2>
      <p>Silakan buat kategori terlebih dahulu.</p>
      <button onclick="navigate('menu')">Buat Kategori</button>
    `;
    return;
  }

  app.innerHTML = `<h2>Halaman Kasir (Belum Dibangun)</h2>`;
}

// === MENU MANAGEMENT ===
function renderMenuManagement() {
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

  db.categories.push({ id: Date.now(), name });
  saveDB();
  document.getElementById("newCategory").value = "";
  renderCategoryList();
}

function renderCategoryList() {
  const list = document.getElementById("categoryList");
  if (!list) return;

  if (db.categories.length === 0) {
    list.innerHTML = "<p>Belum ada kategori.</p>";
    return;
  }

  list.innerHTML = db.categories.map(cat => `
    <div style="margin-top:10px; padding:10px; background:white; border-radius:8px;">
      ${cat.name}
    </div>
  `).join("");
}

// === RIWAYAT ===
function renderRiwayat() {
  app.innerHTML = `<h2>Riwayat Kosong</h2>`;
}

// === PENGATURAN ===
function renderPengaturan() {
  app.innerHTML = `<h2>Pengaturan (Belum Dibangun)</h2>`;
}

// Default halaman
navigate("kasir");

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
