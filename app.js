
// ========================================
// GARIS WAKTU POS - CLOUD VERSION
// ========================================

const app = document.getElementById("app");

let state = {
  currentCategory: "all",
  cart: [],
  expandedHistory: null,
  isProcessing: false,
  selectedHistory: new Set()
};

////////////////////////////////////////////////////
// FIREBASE REALTIME SYNC
////////////////////////////////////////////////////

function startRealtimeMenuSync() {
  if (!window.dbCloud) {
    console.log("Firestore belum siap");
    return;
  }

  window.dbCloud.collection("menus")
    .where("active", "==", true)
    .onSnapshot(snapshot => {

      db.menus = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        db.menus.push({
          id: doc.id,
          name: data.name,
          price: data.price,
          categoryId: data.category || "cloud"
        });
      });

      render();
    });
}

function saveTransactionToCloud(trx) {
  if (!window.dbCloud) return;
  window.dbCloud.collection("transactions").add(trx);
}

////////////////////////////////////////////////////
// MAIN RENDER
////////////////////////////////////////////////////

function render() {
  app.innerHTML = `
  <div class="pos">
    <div class="left">
      <h2>KASIR - GARIS WAKTU</h2>
      <button onclick="connectPrinter()">Connect Printer</button>
      <hr>
      <div class="category-bar">
        <button class="active">ALL</button>
      </div>
      <div class="menu-grid">${renderMenus()}</div>
    </div>

    <div class="right">
      <h3>Keranjang</h3>
      ${renderCart()}
      <div class="total">Total: ${formatRupiah(getTotal())}</div>

      <div>
        <button onclick="setPay(10000)">10k</button>
        <button onclick="setPay(20000)">20k</button>
        <button onclick="setPay(50000)">50k</button>
        <button onclick="setPay(100000)">100k</button>
        <button onclick="setPay(getTotal())">Uang Pas</button>
      </div>

      <input type="number" id="payInput" placeholder="Bayar">
      <button onclick="pay()">Bayar</button>

      <div class="nav">
        <button onclick="render()">Kasir</button>
        <button onclick="renderHistory()">Riwayat</button>
      </div>
    </div>
  </div>`;
}

////////////////////////////////////////////////////
// MENU
////////////////////////////////////////////////////

function renderMenus() {
  if (!db.menus || db.menus.length === 0) return "<p>Belum ada menu</p>";

  return db.menus.map(m =>
    `<div class="card" onclick="addToCart('${m.id}')">
      ${m.name}<br>${formatRupiah(m.price)}
    </div>`
  ).join("");
}

////////////////////////////////////////////////////
// CART
////////////////////////////////////////////////////

function addToCart(id) {
  const item = db.menus.find(m => m.id === id);
  if (!item) return;

  const existing = state.cart.find(c => c.id === id);

  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({ ...item, qty: 1 });
  }

  render();
}

function renderCart() {
  if (state.cart.length === 0) return "<p>Kosong</p>";

  return state.cart.map(i => `
    <div class="cart-item">
      <span>${i.name} x${i.qty}</span>
      <span>
        <button onclick="changeQty('${i.id}',-1)">-</button>
        <button onclick="changeQty('${i.id}',1)">+</button>
        ${formatRupiah(i.price * i.qty)}
      </span>
    </div>
  `).join("");
}

function changeQty(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    state.cart = state.cart.filter(i => i.id !== id);
  }

  render();
}

function getTotal() {
  return state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

////////////////////////////////////////////////////
// PAYMENT
////////////////////////////////////////////////////

function setPay(value) {
  document.getElementById("payInput").value = value;
}

function pay() {
  if (state.isProcessing) return;

  if (state.cart.length === 0) {
    alert("Keranjang kosong");
    return;
  }

  const total = getTotal();
  const paid = parseInt(document.getElementById("payInput").value);

  if (!paid || paid < total) {
    alert("Uang kurang");
    return;
  }

  state.isProcessing = true;

  const change = paid - total;

  const trx = {
    items: [...state.cart],
    total,
    paid,
    change,
    date: new Date().toISOString()
  };

  db.transactions.push(trx);
  saveTransactionToCloud(trx);

  printStruk(trx);

  alert("Kembalian: " + formatRupiah(change));

  state.cart = [];
  state.isProcessing = false;

  render();
}

////////////////////////////////////////////////////
// HISTORY
////////////////////////////////////////////////////

function renderHistory() {
  app.innerHTML = `
    <h2>Riwayat</h2>
    <hr>
    ${db.transactions.map(t => `
      <div>
        ${new Date(t.date).toLocaleString()} - ${formatRupiah(t.total)}
      </div>
    `).join("")}
    <hr>
    <button onclick="render()">Kembali</button>
  `;
}

////////////////////////////////////////////////////
// START SYSTEM
////////////////////////////////////////////////////

startRealtimeMenuSync();
render();
