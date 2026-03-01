// ===================================
// GARIS WAKTU POS - FULL VERSION
// Chrome + Web Bluetooth
// ===================================

const app = document.getElementById("app");

let db = JSON.parse(localStorage.getItem("gw_pos_db")) || {
  categories: [],
  menus: [],
  transactions: []
};

function saveDB() {
  localStorage.setItem("gw_pos_db", JSON.stringify(db));
}

let state = {
  currentCategory: null,
  cart: []
};

function formatRupiah(num) {
  return "Rp " + num.toLocaleString("id-ID");
}

function generateId() {
  return Date.now();
}

////////////////////////////////////////////////////
// ================= KASIR ========================
////////////////////////////////////////////////////

function renderKasir() {

  if (!state.currentCategory && db.categories.length > 0) {
    state.currentCategory = db.categories[0].id;
  }

  app.innerHTML = `
    <h2>KASIR - GARIS WAKTU</h2>

    <button onclick="connectPrinter()">Connect Printer</button>

    <hr>

    ${renderCategoryBar()}

    <div class="menu-grid">
      ${renderMenuGrid()}
    </div>

    <hr>

    <h3>Keranjang</h3>
    ${renderCart()}

    <p><strong>Total: ${formatRupiah(getTotal())}</strong></p>

    <div>
      <button onclick="setQuickPay(10000)">10.000</button>
      <button onclick="setQuickPay(20000)">20.000</button>
      <button onclick="setQuickPay(50000)">50.000</button>
      <button onclick="setQuickPay(100000)">100.000</button>
    </div>

    <input type="number" id="payInput" placeholder="Bayar">

    <button onclick="processPayment()">Bayar</button>

    <hr>
    <button onclick="renderMenu()">Menu</button>
    <button onclick="renderRiwayat()">Riwayat</button>
  `;
}

function renderCategoryBar() {
  if (db.categories.length === 0) return "<p>Belum ada kategori</p>";

  return db.categories.map(cat => `
    <button onclick="selectCategory(${cat.id})">
      ${cat.name}
    </button>
  `).join("");
}

function selectCategory(id) {
  state.currentCategory = id;
  renderKasir();
}

function renderMenuGrid() {
  if (!state.currentCategory) return "<p>Pilih kategori</p>";

  const menus = db.menus.filter(m => m.categoryId === state.currentCategory);

  if (menus.length === 0) return "<p>Belum ada menu</p>";

  return menus.map(menu => `
    <div onclick="addToCart(${menu.id})"
         style="padding:10px; border:1px solid #ccc; margin:5px; cursor:pointer;">
      ${menu.name}<br>
      ${formatRupiah(menu.price)}
    </div>
  `).join("");
}

function addToCart(id) {
  const item = db.menus.find(m => m.id === id);

  const existing = state.cart.find(c => c.id === id);
  if (existing) existing.qty++;
  else state.cart.push({ ...item, qty: 1 });

  renderKasir();
}

function renderCart() {
  if (state.cart.length === 0) return "<p>Kosong</p>";

  return state.cart.map(i => `
    <div>
      ${i.name} x${i.qty} - ${formatRupiah(i.price * i.qty)}
    </div>
  `).join("");
}

function getTotal() {
  return state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function setQuickPay(amount) {
  document.getElementById("payInput").value = amount;
}

////////////////////////////////////////////////////
// =============== PAYMENT ========================
////////////////////////////////////////////////////

function processPayment() {

  const total = getTotal();
  const paid = parseInt(document.getElementById("payInput").value);

  if (!paid || paid < total) {
    alert("Uang kurang");
    return;
  }

  const change = paid - total;

  const trx = {
    id: generateId(),
    items: [...state.cart],
    total,
    paid,
    change,
    date: new Date().toLocaleString()
  };

  db.transactions.push(trx);
  saveDB();

  printStruk(trx);

  alert("Kembalian: " + formatRupiah(change));

  state.cart = [];
  renderKasir();
}

////////////////////////////////////////////////////
// =============== MENU ===========================
////////////////////////////////////////////////////

function renderMenu() {
  app.innerHTML = `
    <h2>MENU</h2>
    <input id="catName" placeholder="Nama kategori">
    <button onclick="addCategory()">Tambah Kategori</button>
    <hr>
    ${renderCategoryList()}
    <hr>
    <button onclick="renderKasir()">Kembali</button>
  `;
}

function addCategory() {
  const name = document.getElementById("catName").value;
  if (!name) return;

  db.categories.push({ id: generateId(), name });
  saveDB();
  renderMenu();
}

function renderCategoryList() {
  if (db.categories.length === 0) return "<p>Kosong</p>";

  return db.categories.map(cat => `
    <div>
      <strong>${cat.name}</strong>
      <button onclick="openCategory(${cat.id})">Buka</button>
    </div>
  `).join("");
}

function openCategory(id) {
  const cat = db.categories.find(c => c.id === id);

  app.innerHTML = `
    <button onclick="renderMenu()">← Kembali</button>
    <h3>${cat.name}</h3>
    <input id="menuName" placeholder="Nama menu">
    <input id="menuPrice" type="number" placeholder="Harga">
    <button onclick="addMenu(${id})">Tambah</button>
    <hr>
    ${renderMenuList(id)}
  `;
}

function addMenu(categoryId) {
  const name = document.getElementById("menuName").value;
  const price = parseInt(document.getElementById("menuPrice").value);

  if (!name || !price) return;

  db.menus.push({
    id: generateId(),
    name,
    price,
    categoryId
  });

  saveDB();
  openCategory(categoryId);
}

function renderMenuList(categoryId) {
  const menus = db.menus.filter(m => m.categoryId === categoryId);

  if (menus.length === 0) return "<p>Belum ada menu</p>";

  return menus.map(m => `
    <div>${m.name} - ${formatRupiah(m.price)}</div>
  `).join("");
}

////////////////////////////////////////////////////
// =============== RIWAYAT ========================
////////////////////////////////////////////////////

function renderRiwayat() {
  if (db.transactions.length === 0) {
    app.innerHTML = "<h2>Belum ada transaksi</h2><button onclick='renderKasir()'>Kembali</button>";
    return;
  }

  app.innerHTML = db.transactions.map(t => `
    <div>
      ${t.date} - ${formatRupiah(t.total)}
    </div>
  `).join("") + "<br><button onclick='renderKasir()'>Kembali</button>";
}

////////////////////////////////////////////////////
// =============== PRINTER ========================
////////////////////////////////////////////////////

let printerDevice = null;
let printerCharacteristic = null;

async function connectPrinter() {
  try {
    printerDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [0x18F0]
    });

    const server = await printerDevice.gatt.connect();
    const service = await server.getPrimaryService(0x18F0);
    printerCharacteristic = await service.getCharacteristic(0x2AF1);

    alert("Printer terhubung");
  } catch (err) {
    alert("Gagal connect printer");
  }
}

function textToBytes(text) {
  return new TextEncoder().encode(text);
}

async function printStruk(trx) {
  if (!printerCharacteristic) return;

  let struk = "";
  struk += "      GARIS WAKTU\n";
  struk += "--------------------------\n";

  trx.items.forEach(i => {
    struk += `${i.name} x${i.qty}\n`;
    struk += `${formatRupiah(i.price * i.qty)}\n`;
  });

  struk += "--------------------------\n";
  struk += `TOTAL : ${formatRupiah(trx.total)}\n`;
  struk += `BAYAR : ${formatRupiah(trx.paid)}\n`;
  struk += `KEMBALI : ${formatRupiah(trx.change)}\n\n`;
  struk += "Terima kasih\n\n\n";

  await printerCharacteristic.writeValue(textToBytes(struk));
}

renderKasir();
