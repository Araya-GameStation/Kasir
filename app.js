
// ============================================
// KASIR GARIS WAKTU
// ============================================

const app = document.getElementById("app");

let state = {
  user: null,
  cart: [],
  menus: [],
  transactions: [],
  expandedHistory: null,
  selectedHistory: new Set()
};

// ================= AUTH =================

firebase.auth().onAuthStateChanged(function(user){
  state.user = user;
  if(!user){
    renderLogin();
  }else{
    startRealtimeMenus();
    startRealtimeTransactions();
    renderKasir();
  }
});

function renderLogin(){
  app.innerHTML = `
    <h2>Login Admin</h2>
    <input id="email" placeholder="Email"><br><br>
    <input id="password" type="password" placeholder="Password"><br><br>
    <button onclick="login()">Login</button>
  `;
}

function login(){
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  firebase.auth().signInWithEmailAndPassword(email,pass)
    .catch(e=>alert(e.message));
}

function logout(){
  firebase.auth().signOut();
}

// ================= REALTIME =================

function startRealtimeMenus(){
  dbCloud.collection("menus").onSnapshot(snap=>{
    state.menus=[];
    snap.forEach(doc=>{
      state.menus.push({id:doc.id,...doc.data()});
    });
    renderKasir();
  });
}

function startRealtimeTransactions(){
  dbCloud.collection("transactions").onSnapshot(snap=>{
    state.transactions=[];
    snap.forEach(doc=>{
      state.transactions.push({id:doc.id,...doc.data()});
    });
  });
}

// ================= KASIR =================

function renderKasir(){
  app.innerHTML=`
    <h2>KASIR - GARIS WAKTU</h2>

    <div style="margin-bottom:10px;">
      <button onclick="connectPrinter()">Connect Printer</button>
      <button onclick="logout()">Logout</button>
      <button onclick="renderHistory()">Riwayat</button>
      <button onclick="renderMenuManager()">Kelola Menu</button>
    </div>

    <hr>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;">
      ${state.menus.map(m=>`
        <div style="border:1px solid #ccc;padding:10px;cursor:pointer"
          onclick="addToCart('${m.id}')">
          <b>${m.name}</b><br>
          Rp ${m.price}
        </div>
      `).join("")}
    </div>

    <hr>
    <h3>Keranjang</h3>
    ${state.cart.map(i=>`
      ${i.name} x${i.qty} - Rp ${i.price*i.qty}
      <button onclick="changeQty('${i.id}',-1)">-</button>
      <button onclick="changeQty('${i.id}',1)">+</button>
      <br>
    `).join("")}

    <br><b>Total: Rp ${getTotal()}</b><br><br>

    <button onclick="setPay(10000)">10K</button>
    <button onclick="setPay(20000)">20K</button>
    <button onclick="setPay(50000)">50K</button>
    <button onclick="setPay(100000)">100K</button>
    <button onclick="setPay(getTotal())">Uang Pas</button><br><br>

    <input id="payInput" type="number" placeholder="Bayar"><br><br>
    <button onclick="bayar()">Bayar</button>
  `;
}

function addToCart(id){
  const item = state.menus.find(m=>m.id===id);
  const exist = state.cart.find(c=>c.id===id);
  if(exist) exist.qty++;
  else state.cart.push({...item,qty:1});
  renderKasir();
}

function changeQty(id,d){
  const item = state.cart.find(i=>i.id===id);
  if(!item) return;
  item.qty+=d;
  if(item.qty<=0){
    state.cart=state.cart.filter(i=>i.id!==id);
  }
  renderKasir();
}

function getTotal(){
  return state.cart.reduce((s,i)=>s+(i.price*i.qty),0);
}

function setPay(v){
  document.getElementById("payInput").value=v;
}

function bayar(){
  const paid=parseInt(document.getElementById("payInput").value);
  const total=getTotal();
  if(!paid || paid<total){
    alert("Uang kurang");
    return;
  }

  const trx = {
    items: state.cart,
    total: total,
    paid: paid,
    change: paid-total,
    date: new Date()
  };

  dbCloud.collection("transactions").add(trx);

  if(typeof printStruk === "function"){
    printStruk(trx);
  }

  state.cart=[];
  renderKasir();
}

// ================= RIWAYAT =================

function renderHistory(){

  const today = new Date();
  today.setHours(0,0,0,0);

  const todayTransactions = state.transactions.filter(t=>{
    const d = new Date(t.date.seconds? t.date.seconds*1000 : t.date);
    return d >= today;
  });

  const recap = {};
  let totalIncome = 0;

  todayTransactions.forEach(t=>{
    totalIncome += t.total;
    t.items.forEach(i=>{
      if(!recap[i.name]){
        recap[i.name] = { qty:0, total:0 };
      }
      recap[i.name].qty += i.qty;
      recap[i.name].total += (i.price * i.qty);
    });
  });

  app.innerHTML=`
    <h2>Riwayat Transaksi</h2>

    <button onclick="toggleSelectAll()">Pilih Semua</button>
    <button onclick="deleteSelected()">Hapus Terpilih</button>
    <button onclick="printDailyRecap()">Cetak Rekap Hari Ini</button>

    <hr>

    <h3>Rekap Hari Ini</h3>
    ${Object.keys(recap).map(name=>`
      ${name} - ${recap[name].qty} pcs - Rp ${recap[name].total}<br>
    `).join("")}

    <br><b>Total Pendapatan Hari Ini: Rp ${totalIncome}</b>

    <hr>

    ${state.transactions.map(t=>`
      <div style="border:1px solid #ccc;padding:8px;margin-bottom:5px;">
        <input type="checkbox"
          ${state.selectedHistory.has(t.id)?'checked':''}
          onchange="toggleSelect('${t.id}')">
        ${new Date(t.date.seconds? t.date.seconds*1000 : t.date).toLocaleString()}
        - Rp ${t.total}
        <button onclick="toggleDetail('${t.id}')">Detail</button>

        ${state.expandedHistory===t.id?`
          <div style="margin-top:5px;padding-left:10px;">
            ${t.items.map(i=>`${i.name} x${i.qty} - Rp ${i.price*i.qty}`).join("<br>")}
            <br><b>Total:</b> Rp ${t.total}
            <br><b>Bayar:</b> Rp ${t.paid}
            <br><b>Kembali:</b> Rp ${t.change}
          </div>
        `:''}
      </div>
    `).join("")}

    <button onclick="renderKasir()">Kembali</button>
  `;
}

function printDailyRecap(){
  alert("Gunakan fitur printStruk untuk integrasi rekap printer jika diperlukan.");
}

function toggleDetail(id){
  state.expandedHistory =
    state.expandedHistory===id?null:id;
  renderHistory();
}

function toggleSelect(id){
  if(state.selectedHistory.has(id))
    state.selectedHistory.delete(id);
  else
    state.selectedHistory.add(id);
}

function toggleSelectAll(){
  if(state.selectedHistory.size===state.transactions.length){
    state.selectedHistory.clear();
  }else{
    state.transactions.forEach(t=>state.selectedHistory.add(t.id));
  }
  renderHistory();
}

function deleteSelected(){
  if(state.selectedHistory.size===0){
    alert("Tidak ada yang dipilih");
    return;
  }

  if(!confirm("Yakin ingin menghapus transaksi terpilih?")){
    return;
  }

  state.selectedHistory.forEach(id=>{
    dbCloud.collection("transactions").doc(id).delete();
  });

  state.selectedHistory.clear();
}

// ================= MENU =================

function renderMenuManager(){
  app.innerHTML=`
    <h2>Kelola Menu</h2>
    <input id="menuName" placeholder="Nama Menu">
    <input id="menuPrice" type="number" placeholder="Harga">
    <button onclick="addMenu()">Tambah</button>
    <hr>
    ${state.menus.map(m=>`
      ${m.name} - Rp ${m.price}
      <button onclick="deleteMenu('${m.id}')">Hapus</button><br>
    `).join("")}
    <hr>
    <button onclick="renderKasir()">Kembali</button>
  `;
}

function addMenu(){
  const name=document.getElementById("menuName").value;
  const price=parseInt(document.getElementById("menuPrice").value);
  if(!name||!price) return;

  dbCloud.collection("menus").add({
    name:name,
    price:price,
    active:true
  });
}

function deleteMenu(id){
  dbCloud.collection("menus").doc(id).delete();
}
