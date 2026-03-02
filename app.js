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
    ...state.categories.filter(c=>!c.system)
      .sort((a,b)=>a.name.localeCompare(b.name)),
    ...state.categories.filter(c=>c.system)
  ];

  const categoryNames = [
    "ALL",
    ...sortedCategories.map(c=>c.name)
  ];

  const filteredMenus = (
    state.selectedCategory === "ALL"
    ? state.menus
    : state.menus.filter(m=>{
        const cat = state.categories.find(c=>c.id===m.categoryId);
        return cat && cat.name === state.selectedCategory;
      })
  ).sort((a,b)=>a.name.localeCompare(b.name));

  app.innerHTML=`
    <h2>KASIR - GARIS WAKTU</h2>

    <div style="margin-bottom:10px;">
      <button onclick="connectPrinter()">Connect Printer</button>
      <button onclick="logout()">Logout</button>
      <button onclick="renderHistory()">Riwayat</button>
      <button onclick="renderMenuManager()">Kelola Menu</button>
    </div>

    <hr>

    <div style="margin-bottom:10px;">
      ${categoryNames.map(c=>`
        <button 
          onclick="selectCategory('${c}')"
          style="margin-right:5px;
          ${state.selectedCategory===c?'background:#6366f1;color:white;':''}">
          ${c}
        </button>
      `).join("")}
    </div>

    <hr>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">
      ${filteredMenus.map(m=>{
        const disabled = m.useStock && m.stock<=0;
        return `
          <div 
            style="border:1px solid #ccc;padding:10px;
              opacity:${disabled?0.5:1};
              pointer-events:${disabled?'none':'auto'};
              cursor:pointer"
            onclick="addToCart('${m.id}')">
            <b>${m.name}</b><br>
            Rp ${formatRupiah(m.price)}<br>
            ${m.useStock?`Sisa: ${m.stock}`:''}
            ${disabled?'<br><span style="color:red">Stok Habis</span>':''}
          </div>
        `;
      }).join("")}
    </div>

    <hr>

    <h3>PESANAN</h3>

    ${state.cart.map(i=>`
      ${i.name} x${i.qty} - Rp ${formatRupiah(i.price*i.qty)}
      <button onclick="changeQty('${i.id}',-1)">-</button>
      <button onclick="changeQty('${i.id}',1)">+</button>
      <br>
    `).join("")}

    <br><b>Total: Rp ${formatRupiah(getTotal())}</b><br><br>

    <button onclick="setPay(10000)">10K</button>
    <button onclick="setPay(20000)">20K</button>
    <button onclick="setPay(50000)">50K</button>
    <button onclick="setPay(100000)">100K</button>
    <button onclick="setPay(getTotal())">Uang Pas</button><br><br>

    <input id="payInput" type="text" placeholder="Bayar" oninput="formatInputRupiah(this)"><br><br>
    <button id="btnBayar" onclick="bayar()">Bayar</button>
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
  document.getElementById("payInput").value=v;
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
    alert("Uang kurang");
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

  app.innerHTML=`
    <h2>Riwayat Transaksi</h2>

    <button onclick="toggleSelectAll()">Pilih Semua</button>
    <button id="btnHapusTrx" onclick="deleteSelected()">Hapus Terpilih</button>

    <hr>

    <h3>Pesanan Hari Ini</h3>
    ${Object.keys(recap)
      .sort((a,b)=>a.localeCompare(b))
      .map(name=>`
      ${name} - ${recap[name].qty} pcs - Rp ${formatRupiah(recap[name].total)}<br>
    `).join("")}

    <br><b>Total Pendapatan Hari Ini: Rp ${formatRupiah(totalIncome)}</b>

    <hr>

    ${[...state.transactions]
      .sort((a,b)=>{
        const da = new Date(a.date.seconds? a.date.seconds*1000 : a.date);
        const db = new Date(b.date.seconds? b.date.seconds*1000 : b.date);
        return db - da;
      })
      .map(t=>`
      <div style="border:1px solid #ccc;padding:8px;margin-bottom:5px;">
        <input type="checkbox"
          ${state.selectedHistory.has(t.id)?'checked':''}
          onchange="toggleSelect('${t.id}')">
        ${new Date(t.date.seconds? t.date.seconds*1000 : t.date).toLocaleString()}
        - Rp ${formatRupiah(t.total)}
        <button onclick="toggleDetail('${t.id}')">Detail</button>

        ${state.expandedHistory===t.id?`
          <div style="margin-top:5px;padding-left:10px;">
            ${t.items.map(i=>`${i.name} x${i.qty} - Rp ${formatRupiah(i.price*i.qty)}`).join("<br>")}
            <br><b>Total:</b> Rp ${formatRupiah(t.total)}
            <br><b>Bayar:</b> Rp ${formatRupiah(t.paid)}
            <br><b>Kembali:</b> Rp ${formatRupiah(t.change)}
          </div>
        `:''}
      </div>
    `).join("")}

    <button onclick="renderKasir()">Kembali</button>
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

async function deleteSelected(){
  if(state.selectedHistory.size===0){
    alert("Tidak ada yang dipilih");
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

  app.innerHTML=`
    <h2>Kelola Kategori</h2>

    <input id="newCategory" placeholder="Nama Kategori">
    <button onclick="addCategory()">Tambah</button>

    <hr>

    ${state.categories.map(c=>`
      ${c.name}
      ${!c.system?`<button onclick="deleteCategory('${c.id}')">Hapus</button>`:''}
      <button onclick="openCategory('${c.id}')">Buka</button>
      <br>
    `).join("")}

    <hr>
    <button onclick="renderKasir()">Kembali</button>
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

  app.innerHTML=`
    <h2>Kategori: ${category.name}</h2>

    <input id="menuName" placeholder="Nama Menu">
    <input id="menuPrice" type="number" placeholder="Harga">
    <label><input type="checkbox" id="useStock"> Gunakan Stok</label>
    <input id="stock" type="number" placeholder="Jumlah Stok">
    <button onclick="addMenu('${id}')">Tambah Menu</button>

    <hr>

    <button onclick="toggleSelectAllMenu('${id}')">Pilih Semua</button>
    <button id="btnHapusMenu" onclick="deleteSelectedMenus('${id}')">Hapus Terpilih</button>

    <hr>

    ${menus.map(m=>`
      <input type="checkbox"
        ${state.selectedMenus.has(m.id)?'checked':''}
        onchange="toggleSelectMenu('${m.id}')">
      ${m.name} - Rp ${formatRupiah(m.price)} <button onclick="editMenu('${m.id}')">Edit</button>
      ${m.useStock?`(Stok: ${m.stock})`:''}
      <br>
    `).join("")}

    <hr>
    <button onclick="renderMenuManager()">Kembali</button>
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
    alert("Tidak ada yang dipilih");
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

