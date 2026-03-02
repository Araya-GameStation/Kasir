
// ============================================
// KASIR GARIS WAKTU
// ============================================

const app = document.getElementById("app");

let state = {
  user: null,
  cart: [],
  menus: [],
  categories: [],
  transactions: [],
  selectedCategory: "ALL",
  selectedMenus: new Set(),
  selectedHistory: new Set(),
  expandedHistory: null,
  currentView: localStorage.getItem("currentView") || "kasir",
  currentCategoryId: localStorage.getItem("currentCategoryId") || null
};

// ================= AUTH =================

firebase.auth().onAuthStateChanged(async function(user){
  state.user = user;
  if(!user){
    renderLogin();
  }else{
    await initData();
    restoreView();
  }
});

function renderLogin(){
  localStorage.setItem("currentView","login");
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

// ================= INIT DATA =================

async function initData(){

  await new Promise(resolve=>{
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

      resolve();
    });
  });

  dbCloud.collection("menus").onSnapshot(snap=>{
    state.menus=[];
    snap.forEach(doc=>{
      state.menus.push({id:doc.id,...doc.data()});
    });
    if(state.currentView==="kasir") renderKasir();
  });

  dbCloud.collection("transactions").onSnapshot(snap=>{
    state.transactions=[];
    snap.forEach(doc=>{
      state.transactions.push({id:doc.id,...doc.data()});
    });
  });
}

// ================= VIEW RESTORE =================

function restoreView(){
  if(state.currentView==="history") renderHistory();
  else if(state.currentView==="menuManager") renderMenuManager();
  else if(state.currentView==="openCategory" && state.currentCategoryId)
    openCategory(state.currentCategoryId);
  else renderKasir();
}

// ================= KASIR =================

function renderKasir(){
  state.currentView="kasir";
  localStorage.setItem("currentView","kasir");

  const categoryNames=["ALL",...state.categories.map(c=>c.name)];

  const filteredMenus =
    state.selectedCategory==="ALL"
    ? state.menus
    : state.menus.filter(m=>{
        const cat=state.categories.find(c=>c.id===m.categoryId);
        return cat && cat.name===state.selectedCategory;
      });

  app.innerHTML=`
    <h2>KASIR - GARIS WAKTU</h2>
    <button onclick="renderHistory()">Riwayat</button>
    <button onclick="renderMenuManager()">Kelola Menu</button>
    <button onclick="logout()">Logout</button>
    <hr>

    ${categoryNames.map(c=>`
      <button onclick="selectCategory('${c}')"
      style="${state.selectedCategory===c?'background:#6366f1;color:white':''}">
      ${c}</button>
    `).join("")}

    <hr>

    ${filteredMenus.map(m=>{
      const disabled=m.useStock && m.stock<=0;
      return `
        <div onclick="addToCart('${m.id}')"
        style="border:1px solid #ccc;padding:10px;margin:5px;
        opacity:${disabled?0.5:1};
        pointer-events:${disabled?'none':'auto'}">
          <b>${m.name}</b><br>
          Rp ${m.price}<br>
          ${m.useStock?`Sisa: ${m.stock}`:''}
          ${disabled?'<br><span style="color:red">Stok Habis</span>':''}
        </div>
      `;
    }).join("")}

    <hr>
    <h3>Keranjang</h3>
    ${state.cart.map(i=>`
      ${i.name} x${i.qty} - Rp ${i.price*i.qty}
      <button onclick="changeQty('${i.id}',-1)">-</button>
      <button onclick="changeQty('${i.id}',1)">+</button><br>
    `).join("")}

    <br><b>Total: Rp ${getTotal()}</b><br><br>

    <button onclick="setPay(10000)">10K</button>
    <button onclick="setPay(20000)">20K</button>
    <button onclick="setPay(50000)">50K</button>
    <button onclick="setPay(100000)">100K</button>
    <button onclick="setPay(getTotal())">Uang Pas</button><br><br>

    <input id="payInput" type="number" placeholder="Bayar"><br>
    <button onclick="bayar()">Bayar</button>
  `;
}

function selectCategory(c){
  state.selectedCategory=c;
  renderKasir();
}

function addToCart(id){
  const item=state.menus.find(m=>m.id===id);
  if(!item) return;

  const exist=state.cart.find(c=>c.id===id);

  if(exist){
    if(item.useStock && exist.qty>=item.stock) return;
    exist.qty++;
  }else{
    if(item.useStock && item.stock<=0) return;
    state.cart.push({...item,qty:1});
  }

  renderKasir();
}

function changeQty(id,d){
  const item=state.cart.find(i=>i.id===id);
  const menu=state.menus.find(m=>m.id===id);
  if(!item) return;

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

async function bayar(){

  const paid=parseInt(document.getElementById("payInput").value);
  const total=getTotal();
  if(!paid||paid<total){alert("Uang kurang");return;}

  for(const item of state.cart){
    const ref=dbCloud.collection("menus").doc(item.id);
    await dbCloud.runTransaction(async t=>{
      const doc=await t.get(ref);
      const data=doc.data();
      if(data.useStock){
        if(data.stock<item.qty) throw "Stok kurang";
        t.update(ref,{stock:data.stock-item.qty});
      }
    });
  }

  await dbCloud.collection("transactions").add({
    items:state.cart,
    total:total,
    paid:paid,
    change:paid-total,
    date:new Date()
  });

  state.cart=[];
  renderKasir();
}

// ================= HISTORY =================

function renderHistory(){

  state.currentView="history";
  localStorage.setItem("currentView","history");

  const today = new Date();
  today.setHours(0,0,0,0);

  const todayTransactions = state.transactions.filter(t=>{
    const d = new Date(t.date.seconds?t.date.seconds*1000:t.date);
    return d >= today;
  });

  const recap={};
  let totalIncome=0;

  todayTransactions.forEach(t=>{
    totalIncome+=t.total;
    t.items.forEach(i=>{
      if(!recap[i.name]) recap[i.name]={qty:0,total:0};
      recap[i.name].qty+=i.qty;
      recap[i.name].total+=i.price*i.qty;
    });
  });

  app.innerHTML=`
    <h2>Riwayat Transaksi</h2>

    <button onclick="toggleSelectAllHistory()">Pilih Semua</button>
    <button onclick="deleteSelectedHistory()">Hapus Terpilih</button>

    <hr>

    <h3>Rekap Hari Ini</h3>
    ${Object.keys(recap).map(name=>`
      ${name} - ${recap[name].qty} pcs - Rp ${recap[name].total}<br>
    `).join("")}
    <br><b>Total Hari Ini: Rp ${totalIncome}</b>

    <hr>

    ${state.transactions.map(t=>`
      <div style="border:1px solid #ccc;padding:8px;margin-bottom:5px;">
        <input type="checkbox"
          ${state.selectedHistory.has(t.id)?'checked':''}
          onchange="toggleHistory('${t.id}')">

        ${new Date(t.date.seconds?t.date.seconds*1000:t.date).toLocaleString()}
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

function toggleDetail(id){
  state.expandedHistory = state.expandedHistory===id?null:id;
  renderHistory();
}

function toggleHistory(id){
  if(state.selectedHistory.has(id))
    state.selectedHistory.delete(id);
  else
    state.selectedHistory.add(id);
}

function toggleSelectAllHistory(){
  if(state.selectedHistory.size===state.transactions.length){
    state.selectedHistory.clear();
  }else{
    state.transactions.forEach(t=>state.selectedHistory.add(t.id));
  }
  renderHistory();
}

function deleteSelectedHistory(){
  if(state.selectedHistory.size===0) return alert("Tidak ada yang dipilih");
  if(!confirm("Yakin hapus transaksi terpilih?")) return;

  state.selectedHistory.forEach(id=>{
    dbCloud.collection("transactions").doc(id).delete();
  });

  state.selectedHistory.clear();
}

// ================= MENU MANAGER =================

function renderMenuManager(){

  state.currentView="menuManager";
  localStorage.setItem("currentView","menuManager");

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
  dbCloud.collection("categories").add({name:name,system:false});
}

async function deleteCategory(id){
  if(!confirm("Yakin hapus kategori?")) return;
  const lainnya=state.categories.find(c=>c.system);
  const menus=state.menus.filter(m=>m.categoryId===id);
  for(const m of menus){
    await dbCloud.collection("menus").doc(m.id)
      .update({categoryId:lainnya.id});
  }
  await dbCloud.collection("categories").doc(id).delete();
}

function openCategory(id){

  state.currentView="openCategory";
  state.currentCategoryId=id;
  localStorage.setItem("currentView","openCategory");
  localStorage.setItem("currentCategoryId",id);

  const cat=state.categories.find(c=>c.id===id);
  const menus=state.menus.filter(m=>m.categoryId===id);

  app.innerHTML=`
    <h2>Kategori: ${cat.name}</h2>

    <input id="menuName" placeholder="Nama Menu">
    <input id="menuPrice" type="number" placeholder="Harga">
    <label><input type="checkbox" id="useStock"> Gunakan Stok</label>
    <input id="stock" type="number" placeholder="Jumlah Stok">
    <button onclick="addMenu('${id}')">Tambah</button>

    <hr>

    <button onclick="toggleSelectAllMenu('${id}')">Pilih Semua</button>
    <button onclick="deleteSelectedMenu('${id}')">Hapus Terpilih</button>

    <hr>

    ${menus.map(m=>`
      <input type="checkbox"
        ${state.selectedMenus.has(m.id)?'checked':''}
        onchange="toggleMenu('${m.id}')">

      ${m.name} - Rp ${m.price}
      ${m.useStock?`(Stok:${m.stock})`:''}
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
    stock:useStock?stock:0
  });
}

function toggleMenu(id){
  if(state.selectedMenus.has(id))
    state.selectedMenus.delete(id);
  else
    state.selectedMenus.add(id);
}

function toggleSelectAllMenu(categoryId){
  const menus=state.menus.filter(m=>m.categoryId===categoryId);
  if(state.selectedMenus.size===menus.length){
    state.selectedMenus.clear();
  }else{
    menus.forEach(m=>state.selectedMenus.add(m.id));
  }
  openCategory(categoryId);
}

function deleteSelectedMenu(categoryId){
  if(state.selectedMenus.size===0) return alert("Tidak ada yang dipilih");
  if(!confirm("Yakin hapus menu terpilih?")) return;

  state.selectedMenus.forEach(id=>{
    dbCloud.collection("menus").doc(id).delete();
  });

  state.selectedMenus.clear();
  openCategory(categoryId);
}
