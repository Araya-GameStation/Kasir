// ============================================
// KASIR GARIS WAKTU
// ============================================

const app = document.getElementById("app");

function formatRupiah(num){
  return new Intl.NumberFormat("id-ID").format(num || 0);
}

function formatInputRupiah(input){
  let value = input.value.replace(/\D/g,"");
  if(!value){
    input.value = "";
    return;
  }
  input.value = new Intl.NumberFormat("id-ID").format(parseInt(value));
}

let state = {
  user: null,
  cart: [],
  menus: [],
  categories: [],
  selectedCategory: "ALL",
  selectedMenus: new Set(),
  transactions: [],
  expandedHistory: null,
  selectedHistory: new Set(),
  currentView: "kasir",
  currentCategoryId: null
};

// ================= AUTH =================

firebase.auth().onAuthStateChanged(function(user){
  state.user = user;
  if(!user){
    renderLogin();
  }else{
    startRealtimeCategories();
    startRealtimeMenus();
    startRealtimeTransactions();
    renderKasir();
  }
});

function renderLogin() {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <span class="brand-title">Garis Waktu</span>
        <p class="brand-subtitle">Sistem Manajemen Point of Sale</p>
        
        <div class="input-group">
          <input id="email" type="email" class="login-input" placeholder="Alamat Email">
        </div>
        
        <div class="input-group">
          <input id="password" type="password" class="login-input" placeholder="Kata Sandi">
        </div>
        
        <button class="btn-login-premium" onclick="login()">
          Masuk Sekarang
        </button>
        
        <p style="margin-top: 30px; font-size: 12px; color: #cbd5e1; letter-spacing: 1px;">
          VERSI 2.0.4
        </p>
      </div>
    </div>
  `;
}

function login(){
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  firebase.auth().signInWithEmailAndPassword(email,pass)
    .catch(e=>showToast(e.message));
}

function logout(){
  firebase.auth().signOut();
}

// ================= SAFE RENDER =================

function safeRender(){
  if(state.currentView === "kasir") renderKasir();
  else if(state.currentView === "history") renderHistory();
  else if(state.currentView === "menuManager") renderMenuManager();
  else if(state.currentView === "openCategory")
    openCategory(state.currentCategoryId);
}

// ================= REALTIME =================

function startRealtimeCategories(){
  dbCloud.collection("categories").onSnapshot(async snap=>{
    state.categories=[];
    snap.forEach(doc=>{
      state.categories.push({id:doc.id,...doc.data()});
    });

    if(!state.categories.find(c=>c.system)){
      await dbCloud.collection("categories").add({
        name:"Lainnya",
        system:true
      });
    }

    safeRender();
  });
}

function startRealtimeMenus(){
  dbCloud.collection("menus").onSnapshot(snap=>{
    state.menus=[];
    snap.forEach(doc=>{
      state.menus.push({id:doc.id,...doc.data()});
    });
    safeRender();
  });
}

function startRealtimeTransactions(){
  dbCloud.collection("transactions").onSnapshot(snap=>{
    state.transactions=[];
    snap.forEach(doc=>{
      state.transactions.push({id:doc.id,...doc.data()});
    });
    if(state.currentView==="history") renderHistory();
  });
}

// ================= KASIR =================

function renderKasir(){
  state.currentView="kasir";

  const sortedCategories = [
    ...state.categories.filter(c=>!c.system).sort((a,b)=>a.name.localeCompare(b.name)),
    ...state.categories.filter(c=>c.system)
  ];

  const categoryNames = ["ALL", ...sortedCategories.map(c=>c.name)];

  const filteredMenus = (
    state.selectedCategory === "ALL"
    ? state.menus
    : state.menus.filter(m=>{
        const cat = state.categories.find(c=>c.id===m.categoryId);
        return cat && cat.name === state.selectedCategory;
      })
  ).sort((a,b)=>a.name.localeCompare(b.name));

  app.innerHTML = `
    <div class="pos-container">
      <aside class="sidebar">
        <div class="nav-item ${state.currentView==='kasir'?'active':''}" onclick="renderKasir()">
          <i>🏠</i><span>Kasir</span>
        </div>
        <div class="nav-item ${state.currentView==='history'?'active':''}" onclick="renderHistory()">
          <i>📋</i><span>Riwayat</span>
        </div>
        <div class="nav-item ${state.currentView==='menuManager' || state.currentView==='openCategory'?'active':''}" onclick="renderMenuManager()">
          <i>⚙️</i><span>Kelola</span>
        </div>
        
        <div style="margin-top: auto; width: 100%;">
          <div class="nav-item" onclick="connectPrinter()" style="margin-bottom: 20px;">
            <i>🖨️</i><span>Printer</span>
          </div>
          <div class="nav-item logout" onclick="logout()">
            <i>🚪</i><span>Keluar</span>
          </div>
        </div>
      </aside>

      <main class="main-content">
        <header class="category-header">
          ${categoryNames.map(c => `
            <button class="category-btn ${state.selectedCategory===c?'active':''}" 
                    onclick="selectCategory('${c}')">${c}</button>
          `).join("")}
        </header>
        
        <section class="menu-grid">
          ${filteredMenus.map(m => {
            const disabled = m.useStock && m.stock <= 0;
            return `
              <div class="card-menu" style="${disabled?'opacity:0.5;pointer-events:none':''}" onclick="addToCart('${m.id}')">
                <div style="font-weight:bold; margin-bottom:5px;">${m.name}</div>
                <div style="color:var(--accent); font-weight:bold">Rp ${formatRupiah(m.price)}</div>
                ${m.useStock ? `<small style="color:var(--text-muted)">Stok: ${m.stock}</small>` : ''}
              </div>
            `;
          }).join("")}
        </section>
      </main>

      <aside class="checkout-panel">
        <div class="cart-header">Pesanan Saat Ini</div>
        <div class="cart-list">
          ${state.cart.length === 0 ? '<div style="text-align:center; color:#ccc; margin-top:50px;">Belum ada pesanan</div>' : ''}
          ${state.cart.map(i => `
            <div class="cart-item">
              <div>
                <div style="font-weight:500">${i.name}</div>
                <small>Rp ${formatRupiah(i.price * i.qty)}</small>
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                <button class="qty-btn" onclick="changeQty('${i.id}',-1)">-</button>
                <span>${i.qty}</span>
                <button class="qty-btn" onclick="changeQty('${i.id}',1)">+</button>
              </div>
            </div>
          `).join("")}
        </div>

        <div class="payment-section">
          <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-weight:bold; font-size:18px;">
            <span>Total</span>
            <span>Rp ${formatRupiah(getTotal())}</span>
          </div>

          <div class="nominal-grid">
            <button class="nominal-btn" onclick="setPay(10000)">10K</button>
            <button class="nominal-btn" onclick="setPay(20000)">20K</button>
            <button class="nominal-btn" onclick="setPay(50000)">50K</button>
            <button class="nominal-btn" onclick="setPay(100000)">100K</button>
            <button class="nominal-btn" onclick="setPay(200000)">200K</button>
            <button class="nominal-btn" onclick="setPay(getTotal())">Uang Pas</button>
          </div>

          <input id="payInput" type="text" placeholder="Masukkan Nominal Bayar" 
                 oninput="formatInputRupiah(this)"
                 style="width:100%; box-sizing:border-box; padding:12px; margin-bottom:15px; border-radius:8px; border:1px solid var(--border-color);">
          
          <button id="btnBayar" class="btn-bayar" onclick="bayar()">KONFIRMASI BAYAR</button>
        </div>
      </aside>
    </div>
  `;
}

function selectCategory(c){
  state.selectedCategory = c;
  renderKasir();
}

function addToCart(id){
  const item = state.menus.find(m=>m.id===id);
  if(!item) return;

  if(item.useStock && item.stock<=0) return;

  const exist = state.cart.find(c=>c.id===id);

  if(exist){
    if(item.useStock && exist.qty>=item.stock) return;
    exist.qty++;
  }else{
    state.cart.push({...item,qty:1});
  }

  renderKasir();
}

function changeQty(id,d){
  const item = state.cart.find(i=>i.id===id);
  if(!item) return;

  const menu = state.menus.find(m=>m.id===id);

  if(menu.useStock && (item.qty+d)>menu.stock) return;

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
  const input = document.getElementById("payInput");
  if(input) {
    input.value = new Intl.NumberFormat("id-ID").format(v);
  }
}

// ================= BAYAR =================

async function bayar(){

  const btn = document.getElementById("btnBayar");
  btn.disabled=true;
  btn.innerText="Memproses...";

  const paid=parseInt(
    document.getElementById("payInput").value.replace(/\./g,"")
  );
  const total=getTotal();

  if(!paid || paid<total){
    showToast("Uang kurang");
    btn.disabled=false;
    btn.innerText="Bayar";
    return;
  }

  for(const item of state.cart){

    const menuRef = dbCloud.collection("menus").doc(item.id);

    await dbCloud.runTransaction(async (transaction)=>{
      const doc = await transaction.get(menuRef);
      const data = doc.data();

      if(data.useStock){
        if(data.stock < item.qty){
          throw "Stok tidak cukup";
        }
        transaction.update(menuRef,{
          stock:data.stock - item.qty
        });
      }
    });
  }

  const trx = {
    items: state.cart,
    total: total,
    paid: paid,
    change: paid-total,
    date: new Date()
  };

  await dbCloud.collection("transactions").add(trx);

  if(typeof printStruk === "function"){
    printStruk(trx);
  }

  state.cart=[];
  renderKasir();
}

// ================= RIWAYAT =================

function renderHistory(){
  state.currentView="history";

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

  app.innerHTML = `
    <div class="pos-container">
      <aside class="sidebar">
        <div class="nav-item ${state.currentView==='kasir'?'active':''}" onclick="renderKasir()">
          <i>🏠</i><span>Kasir</span>
        </div>
        <div class="nav-item ${state.currentView==='history'?'active':''}" onclick="renderHistory()">
          <i>📋</i><span>Riwayat</span>
        </div>
        <div class="nav-item ${state.currentView==='menuManager' || state.currentView==='openCategory'?'active':''}" onclick="renderMenuManager()">
          <i>⚙️</i><span>Kelola</span>
        </div>
        
        <div style="margin-top: auto; width: 100%;">
          <div class="nav-item" onclick="connectPrinter()" style="margin-bottom: 20px;">
            <i>🖨️</i><span>Printer</span>
          </div>
          <div class="nav-item logout" onclick="logout()">
            <i>🚪</i><span>Keluar</span>
          </div>
        </div>
      </aside>

      <main class="main-content" style="padding:20px; display:flex; flex-direction:column; height:100vh; box-sizing:border-box;">
        
        <div style="flex-shrink: 0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h2 style="margin:0">Riwayat Transaksi</h2>
            <div style="background:var(--accent); color:white; padding:10px 20px; border-radius:12px; font-weight:bold;">
              Total Hari Ini: Rp ${formatRupiah(totalIncome)}
            </div>
          </div>
        </div>

        <h3 style="font-size:16px; margin-bottom:10px; flex-shrink: 0;">📦 Pesanan Hari Ini</h3>
        <div class="scrollable-recap">
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
            ${Object.keys(recap).length === 0 ? '<div style="color:var(--text-muted)">Belum ada data</div>' : 
              Object.keys(recap).sort((a,b)=>a.localeCompare(b)).map(name=>`
                <div style="background:white; padding:10px; border-radius:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                  <div style="font-weight:bold; font-size:13px;">${name}</div>
                  <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--accent);">
                    <span>${recap[name].qty} pcs</span>
                    <span>Rp ${formatRupiah(recap[name].total)}</span>
                  </div>
                </div>
              `).join("")
            }
          </div>
        </div>

        <div style="margin-bottom:15px; display:flex; gap:10px; flex-shrink: 0;">
          <button class="category-btn" onclick="toggleSelectAll()">Pilih Semua</button>
          <button class="category-btn" id="btnHapusTrx" onclick="deleteSelected()" style="color:#ef4444;">Hapus Terpilih</button>
        </div>

        <div class="scrollable-history-list">
          ${state.transactions.sort((a,b)=>{
            const da = new Date(a.date.seconds? a.date.seconds*1000 : a.date);
            const db = new Date(b.date.seconds? b.date.seconds*1000 : b.date);
            return db - da;
          }).map(t=>`
            <div class="card-menu" style="text-align:left; margin-bottom:12px; display:block; padding:18px; width:auto; border:1px solid #f1f5f9;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:15px;">
                  <input type="checkbox" style="width:18px; height:18px;" ${state.selectedHistory.has(t.id)?'checked':''} onchange="toggleSelect('${t.id}')">
                  <div>
                    <div style="font-weight:bold; font-size:15px;">${new Date(t.date.seconds? t.date.seconds*1000 : t.date).toLocaleString('id-ID')}</div>
                    <small style="color:var(--text-muted)">ID: ${t.id.substring(0,8)}</small>
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="color:var(--accent); font-weight:bold; font-size:16px;">Rp ${formatRupiah(t.total)}</div>
                  <div style="display:flex; gap:8px; margin-top:8px; justify-content:flex-end;">
                    <button class="category-btn" style="font-size:10px; padding:4px 10px; border-color:#e2e8f0;" onclick="reprintReceipt('${t.id}')">🖨️ CETAK</button>
                    <button class="category-btn" style="font-size:10px; padding:4px 10px;" onclick="toggleDetail('${t.id}')">
                      ${state.expandedHistory === t.id ? 'TUTUP' : 'DETAIL'}
                    </button>
                  </div>
                </div>
              </div>
        
              ${state.expandedHistory === t.id ? `
                <div style="margin-top:15px; padding-top:15px; border-top:1px dashed #eee;">
                  <table style="width:100%; font-size:13px; border-collapse:collapse;">
                    <thead>
                      <tr style="color:var(--text-muted); text-align:left;">
                        <th style="padding-bottom:8px;">Item</th>
                        <th style="text-align:center;">Qty</th>
                        <th style="text-align:right;">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${t.items.map(item => `
                        <tr>
                          <td style="padding:5px 0;">${item.name}</td>
                          <td style="text-align:center;">${item.qty}</td>
                          <td style="text-align:right;">Rp ${formatRupiah(item.price * item.qty)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  <div style="margin-top:10px; padding-top:10px; border-top:1px solid #f1f5f9; text-align:right; font-size:12px; color:var(--text-muted);">
                    Metode: ${t.paymentMethod || 'Tunai'}
                  </div>
                </div>
              ` : ''}
            </div>
          `).join("")}
        </div>
      </main>
    </div>
  `;
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

async function reprintReceipt(trxId) {
    const trx = state.transactions.find(t => t.id === trxId);
    if (!trx) return showToast("Transaksi tidak ditemukan!");

    if (!state.printerDevice) {
        showToast("Printer belum terhubung. Silakan klik tombol Printer di sidebar.");
        return;
    }

    try {
        // Panggil fungsi print yang sudah kamu punya, tapi arahkan ke data transaksi ini
        await printReceipt(trx.items, trx.total, trx.paymentMethod || 'Tunai', trxId);
        console.log("Cetak ulang berhasil");
    } catch (error) {
        showToast("Gagal mencetak: " + error);
    }
}

async function deleteSelected(){
  if(state.selectedHistory.size===0){
    showToast("Tidak ada yang dipilih");
    return;
  }

  if(!confirm("Yakin ingin menghapus transaksi terpilih?")){
    return;
  }

  const btn=document.getElementById("btnHapusTrx");
  btn.disabled=true;
  btn.innerText="Menghapus...";

  const ids=[...state.selectedHistory];

  await Promise.all(
    ids.map(id=>dbCloud.collection("transactions").doc(id).delete())
  );

  state.selectedHistory.clear();
  renderHistory();
}

// ================= MENU MANAGER =================

function renderMenuManager(){
  state.currentView="menuManager";

  app.innerHTML = `
    <div class="pos-container">
      <aside class="sidebar">
        <div class="nav-item ${state.currentView==='kasir'?'active':''}" onclick="renderKasir()">
          <i>🏠</i><span>Kasir</span>
        </div>
        <div class="nav-item ${state.currentView==='history'?'active':''}" onclick="renderHistory()">
          <i>📋</i><span>Riwayat</span>
        </div>
        <div class="nav-item ${state.currentView==='menuManager' || state.currentView==='openCategory'?'active':''}" onclick="renderMenuManager()">
          <i>⚙️</i><span>Kelola</span>
        </div>
        
        <div style="margin-top: auto; width: 100%;">
          <div class="nav-item" onclick="connectPrinter()" style="margin-bottom: 20px;">
            <i>🖨️</i><span>Printer</span>
          </div>
          <div class="nav-item logout" onclick="logout()">
            <i>🚪</i><span>Keluar</span>
          </div>
        </div>
      </aside>

      <main class="main-content" style="padding:30px; overflow-y:auto;">
        <h2 style="margin-bottom:25px;">Kelola Kategori</h2>
        
        <div class="card-menu" style="display:flex; gap:10px; padding:20px; margin-bottom:30px; text-align:left; width:auto;">
          <input id="newCategory" placeholder="Nama Kategori Baru" style="flex:1; margin:0;">
          <button class="btn-bayar" style="width:auto; padding:0 30px;" onclick="addCategory()">Tambah Kategori</button>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">
          ${state.categories.map(c=>`
            <div class="card-menu" style="text-align:left; padding:20px;">
              <div style="font-size:18px; font-weight:bold; margin-bottom:15px;">${c.name}</div>
              <div style="display:flex; gap:8px;">
                <button class="category-btn" style="flex:1" onclick="openCategory('${c.id}')">Buka Menu</button>
                ${!c.system ? `<button class="category-btn" style="color:#ef4444;" onclick="deleteCategory('${c.id}')">Hapus</button>` : ''}
              </div>
            </div>
          `).join("")}
        </div>
      </main>
    </div>
  `;
}

function addCategory(){
  const name=document.getElementById("newCategory").value;
  if(!name) return;

  dbCloud.collection("categories").add({
    name:name,
    system:false
  });
}

async function deleteCategory(id){

  if(!confirm("Yakin hapus kategori? Semua menu akan dipindahkan ke Lainnya.")){
    return;
  }

  const lainnya = state.categories.find(c=>c.system);
  const menusToMove = state.menus.filter(m=>m.categoryId===id);

  for(const m of menusToMove){
    await dbCloud.collection("menus").doc(m.id).update({
      categoryId:lainnya.id
    });
  }

  await dbCloud.collection("categories").doc(id).delete();
}

function openCategory(id){
  state.currentView="openCategory";
  state.currentCategoryId=id;

  const category = state.categories.find(c=>c.id===id);
  const menus = state.menus.filter(m=>m.categoryId===id);

  app.innerHTML = `
    <div class="pos-container">
      <aside class="sidebar">
        <div class="nav-item ${state.currentView==='kasir'?'active':''}" onclick="renderKasir()">
          <i>🏠</i><span>Kasir</span>
        </div>
        <div class="nav-item ${state.currentView==='history'?'active':''}" onclick="renderHistory()">
          <i>📋</i><span>Riwayat</span>
        </div>
        <div class="nav-item ${state.currentView==='menuManager' || state.currentView==='openCategory'?'active':''}" onclick="renderMenuManager()">
          <i>⚙️</i><span>Kelola</span>
        </div>
        
        <div style="margin-top: auto; width: 100%;">
          <div class="nav-item" onclick="connectPrinter()" style="margin-bottom: 20px;">
            <i>🖨️</i><span>Printer</span>
          </div>
          <div class="nav-item logout" onclick="logout()">
            <i>🚪</i><span>Keluar</span>
          </div>
        </div>
      </aside>

      <main class="main-content" style="padding:20px; display:flex; flex-direction:column; height:100vh;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-shrink:0;">
          <h2 style="margin:0">Kategori: ${category.name}</h2>
          <button class="category-btn" onclick="renderMenuManager()">← Kembali</button>
        </div>

        <div class="card-menu" style="display:flex; gap:20px; padding:25px; margin-bottom:25px; align-items:flex-end; text-align:left; width:auto; flex-shrink:0; border:1px solid #e2e8f0; box-shadow: var(--shadow);">
          
          <div style="flex:3;">
            <label style="font-size:11px; font-weight:800; color:var(--text); letter-spacing:0.5px; display:block; margin-bottom:8px;">NAMA MENU</label>
            <input id="menuName" placeholder="Contoh: Es Kopi Susu" style="margin:0; width:100%; height:45px; box-sizing:border-box;">
          </div>

          <div style="flex:1.5;">
            <label style="font-size:11px; font-weight:800; color:var(--text); letter-spacing:0.5px; display:block; margin-bottom:8px;">HARGA (RP)</label>
            <input id="menuPrice" type="number" placeholder="15000" style="margin:0; width:100%; height:45px; box-sizing:border-box;">
          </div>

          <div style="flex:1.2;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
               <input type="checkbox" id="useStock" style="width:16px; height:16px; margin:0; cursor:pointer;"> 
               <label for="useStock" style="font-size:11px; font-weight:800; color:var(--text); cursor:pointer;">STOK</label>
            </div>
            <input id="stock" type="number" placeholder="0" style="margin:0; width:100%; height:45px; box-sizing:border-box;">
          </div>

          <button class="btn-bayar" style="width:auto; padding:0 35px; margin:0; height:45px; font-weight:bold; font-size:14px; display:flex; align-items:center; justify-content:center;" onclick="addMenu('${id}')">
            TAMBAH
          </button>
        </div>

        <div style="margin-bottom:15px; display:flex; gap:10px; flex-shrink:0;">
          <button class="category-btn" onclick="toggleSelectAllMenu('${id}')">Pilih Semua</button>
          <button class="category-btn" id="btnHapusMenu" onclick="deleteSelectedMenus('${id}')" style="color:#ef4444; border-color:#fecaca; background:white;">Hapus Terpilih</button>
        </div>

        <div class="scrollable-history-list" style="flex:1; overflow-y:auto; padding-right:10px;">
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:15px;">
            ${menus.map(m=>`
              <div class="card-menu" style="text-align:left; display:flex; justify-content:space-between; align-items:center; padding:18px; margin:0; width:auto; border: 1px solid #f1f5f9;">
                <div style="display:flex; align-items:center; gap:15px;">
                  <input type="checkbox" style="width:18px; height:18px;" ${state.selectedMenus.has(m.id)?'checked':''} onchange="toggleSelectMenu('${m.id}')">
                  <div>
                    <div style="font-weight:bold; font-size:16px; color:var(--text);">${m.name}</div>
                    <div style="color:var(--accent); font-weight:700; margin-top:2px;">Rp ${formatRupiah(m.price)}</div>
                    ${m.useStock ? `<small style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:11px; color:var(--muted)">Stok: ${m.stock}</small>` : ''}
                  </div>
                </div>
                <button class="category-btn" style="font-size:11px; padding:6px 12px; background:white;" onclick="editMenu('${m.id}')">EDIT</button>
              </div>
            `).join("")}
          </div>
        </div>
      </main>
    </div>
  `;
}

function addMenu(categoryId){

  const name=document.getElementById("menuName").value;
  const price=parseInt(document.getElementById("menuPrice").value);
  const useStock=document.getElementById("useStock").checked;
  const stock=parseInt(document.getElementById("stock").value)||0;

  if(!name||!price) return;

  dbCloud.collection("menus").add({
    name:name,
    price:price,
    categoryId:categoryId,
    useStock:useStock,
    stock:useStock?stock:0,
    active:true
  });
}


function editMenu(id){

  const menu = state.menus.find(m=>m.id===id);
  if(!menu) return;

  const newName = prompt("Nama Menu:", menu.name);
  if(newName===null || newName.trim()==="") return;

  const newPrice = prompt("Harga:", menu.price);
  if(newPrice===null || isNaN(parseInt(newPrice))) return;

  let useStock = menu.useStock;
  let newStock = menu.stock;

  const confirmStock = confirm("Gunakan sistem stok untuk menu ini?");
  useStock = confirmStock;

  if(useStock){
    const stockInput = prompt("Jumlah Stok:", menu.stock);
    if(stockInput===null || isNaN(parseInt(stockInput))) return;
    newStock = parseInt(stockInput);
  }else{
    newStock = 0;
  }

  dbCloud.collection("menus").doc(id).update({
    name: newName.trim(),
    price: parseInt(newPrice),
    useStock: useStock,
    stock: newStock
  });
}

function toggleSelectMenu(id){
  if(state.selectedMenus.has(id))
    state.selectedMenus.delete(id);
  else
    state.selectedMenus.add(id);
}

function toggleSelectAllMenu(categoryId){
  const menus = state.menus.filter(m=>m.categoryId===categoryId);

  if(state.selectedMenus.size===menus.length){
    state.selectedMenus.clear();
  }else{
    menus.forEach(m=>state.selectedMenus.add(m.id));
  }

  openCategory(categoryId);
}

async function deleteSelectedMenus(categoryId){

  if(state.selectedMenus.size===0){
    showToast("Tidak ada yang dipilih");
    return;
  }

  if(!confirm("Yakin hapus menu terpilih?")) return;

  const btn=document.getElementById("btnHapusMenu");
  btn.disabled=true;
  btn.innerText="Menghapus...";

  const ids=[...state.selectedMenus];

  await Promise.all(
    ids.map(id=>dbCloud.collection("menus").doc(id).delete())
  );

  state.selectedMenus.clear();
  openCategory(categoryId);
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container') || createToastContainer();

    // LOGIKA PENYEDERHANAAN PESAN (Agar tetap minimalis)
    let cleanMessage = message;
    if (message.includes('auth/invalid-credential') || message.includes('incorrect')) {
        cleanMessage = "Email atau Password salah.";
    } else if (message.includes('network-request-failed')) {
        cleanMessage = "Koneksi internet terganggu.";
    } else if (message.length > 60) {
        cleanMessage = message.substring(0, 60) + "..."; // Potong jika terlalu panjang
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✅' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${cleanMessage}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000); // 4 detik agar cukup waktu membaca pesan yang agak panjang
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
}