
// ============================================
// GARIS WAKTU POS - FINAL ADMIN VERSION
// ============================================

const app = document.getElementById("app");

let state = {
  user: null,
  currentView: "login",
  cart: [],
  menus: [],
  transactions: []
};

////////////////////////////////////////////////////
// AUTHENTICATION
////////////////////////////////////////////////////

firebase.auth().onAuthStateChanged(user => {
  state.user = user;
  if (user) {
    state.currentView = "kasir";
    startRealtimeMenus();
    startRealtimeTransactions();
  } else {
    state.currentView = "login";
  }
  render();
});

function login() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;

  firebase.auth()
    .signInWithEmailAndPassword(email, pass)
    .catch(e => alert(e.message));
}

function logout() {
  firebase.auth().signOut();
}

////////////////////////////////////////////////////
// FIREBASE REALTIME SYNC
////////////////////////////////////////////////////

function startRealtimeMenus(){
  dbCloud.collection("menus")
    .onSnapshot(snap=>{
      state.menus = [];
      snap.forEach(doc=>{
        state.menus.push({id:doc.id, ...doc.data()});
      });
      render();
    });
}

function startRealtimeTransactions(){
  dbCloud.collection("transactions")
    .onSnapshot(snap=>{
      state.transactions = [];
      snap.forEach(doc=>{
        state.transactions.push({id:doc.id, ...doc.data()});
      });
    });
}

////////////////////////////////////////////////////
// RENDER SYSTEM
////////////////////////////////////////////////////

function render(){

  if(state.currentView === "login"){
    app.innerHTML = `
      <h2>Login Admin</h2>
      <input id="email" placeholder="Email"><br><br>
      <input id="password" type="password" placeholder="Password"><br><br>
      <button onclick="login()">Login</button>
    `;
    return;
  }

  app.innerHTML = `
    <h2>KASIR - GARIS WAKTU</h2>
    <button onclick="logout()">Logout</button>
    <button onclick="renderMenuManager()">Kelola Menu</button>
    <button onclick="renderHistory()">Riwayat</button>
    <hr>

    <h3>Menu</h3>
    ${state.menus.map(m=>`
      <button onclick="addToCart('${m.id}')">
        ${m.name} - Rp ${m.price}
      </button><br><br>
    `).join("")}

    <hr>
    <h3>Keranjang</h3>
    ${state.cart.map(i=>`
      ${i.name} x${i.qty} - Rp ${i.price*i.qty}<br>
    `).join("")}

    <br>
    <button onclick="bayar()">Bayar</button>
  `;
}

////////////////////////////////////////////////////
// KASIR LOGIC
////////////////////////////////////////////////////

function addToCart(id){
  const item = state.menus.find(m=>m.id===id);
  const exist = state.cart.find(c=>c.id===id);

  if(exist) exist.qty++;
  else state.cart.push({...item, qty:1});

  render();
}

function bayar(){
  const total = state.cart.reduce((s,i)=>s+(i.price*i.qty),0);

  dbCloud.collection("transactions").add({
    items: state.cart,
    total,
    date: new Date().toISOString()
  });

  state.cart=[];
  alert("Transaksi sukses");
  render();
}

////////////////////////////////////////////////////
// MENU MANAGER
////////////////////////////////////////////////////

function renderMenuManager(){
  app.innerHTML = `
    <h2>Kelola Menu</h2>
    <input id="namaMenu" placeholder="Nama Menu">
    <input id="hargaMenu" type="number" placeholder="Harga">
    <button onclick="tambahMenu()">Tambah</button>
    <hr>
    ${state.menus.map(m=>`
      ${m.name} - Rp ${m.price}
      <button onclick="hapusMenu('${m.id}')">Hapus</button><br><br>
    `).join("")}
    <hr>
    <button onclick="render()">Kembali</button>
  `;
}

function tambahMenu(){
  const name=document.getElementById("namaMenu").value;
  const price=parseInt(document.getElementById("hargaMenu").value);
  if(!name||!price) return;

  dbCloud.collection("menus").add({
    name,
    price,
    active:true
  });
}

function hapusMenu(id){
  dbCloud.collection("menus").doc(id).delete();
}

////////////////////////////////////////////////////
// HISTORY
////////////////////////////////////////////////////

function renderHistory(){
  app.innerHTML = `
    <h2>Riwayat</h2>
    ${state.transactions.map(t=>`
      ${new Date(t.date).toLocaleString()} - Rp ${t.total}
      <button onclick="hapusTransaksi('${t.id}')">Hapus</button><br><br>
    `).join("")}
    <hr>
    <button onclick="render()">Kembali</button>
  `;
}

function hapusTransaksi(id){
  dbCloud.collection("transactions").doc(id).delete();
}
