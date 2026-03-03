// ============================================
// GARIS WAKTU POS - REFACTORED GLOBAL LAYOUT
// BASE: STABLE 700+ LINES VERSION
// ============================================

// ================= UTIL =================

function formatRupiah(num){
  return new Intl.NumberFormat("id-ID").format(num || 0);
}

function parseRupiah(value){
  return parseInt(String(value).replace(/\./g,"")) || 0;
}

function formatInputRupiah(input){
  let value = input.value.replace(/\D/g,"");
  if(!value){
    input.value="";
    return;
  }
  input.value = new Intl.NumberFormat("id-ID").format(parseInt(value));
}

// ================= GLOBAL STATE =================

const app = document.getElementById("app");

let state = {
  user:null,
  cart:[],
  menus:[],
  categories:[],
  transactions:[],
  selectedCategory:"ALL",
  selectedMenus:new Set(),
  selectedHistory:new Set(),
  expandedHistory:null,
  currentView:"kasir",
  currentCategoryId:null
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

function login(){
  const email = document.getElementById("email").value;
  const pass  = document.getElementById("password").value;

  firebase.auth()
    .signInWithEmailAndPassword(email,pass)
    .catch(e=>alert(e.message));
}

function logout(){
  firebase.auth().signOut();
}

// ================= REALTIME =================

function startRealtimeCategories(){
  dbCloud.collection("categories").onSnapshot(async snap=>{
    state.categories = [];
    snap.forEach(doc=>{
      state.categories.push({id:doc.id,...doc.data()});
    });

    // ensure "Lainnya" exists
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

    if(state.currentView==="history"){
      renderHistory();
    }
  });
}

// ================= SAFE RENDER =================

function safeRender(){
  if(state.currentView==="kasir") renderKasir();
  if(state.currentView==="history") renderHistory();
  if(state.currentView==="menuManager") renderMenuManager();
  if(state.currentView==="openCategory") openCategory(state.currentCategoryId);
}

// ================= GLOBAL LAYOUT WRAPPER =================

function renderLayout(title, actionsHTML, contentHTML){
  app.innerHTML = `
    <div class="app-shell">
      <div class="app-header">
        <h2>${title}</h2>
        <div class="header-actions">
          ${actionsHTML || ""}
        </div>
      </div>
      <div class="app-body">
        ${contentHTML}
      </div>
    </div>
  `;
}

// ================= LOGIN =================

function renderLogin(){
  app.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <h2>Login Admin</h2>
        <p style="color:#64748b;margin-bottom:20px;">
          Masuk untuk mengakses sistem kasir
        </p>

        <input id="email" placeholder="Email" style="margin-bottom:10px;">
        <input id="password" type="password" placeholder="Password" style="margin-bottom:20px;">

        <button class="primary" onclick="login()" style="width:100%;">
          Login
        </button>
      </div>
    </div>
  `;
}

// ================= KASIR =================

function renderKasir(){
  state.currentView="kasir";

  const sortedCategories=[
    ...state.categories.filter(c=>!c.system)
      .sort((a,b)=>a.name.localeCompare(b.name)),
    ...state.categories.filter(c=>c.system)
  ];

  const categoryNames=["ALL",...sortedCategories.map(c=>c.name)];

  const filteredMenus=(
    state.selectedCategory==="ALL"
      ? state.menus
      : state.menus.filter(m=>{
          const cat=state.categories.find(c=>c.id===m.categoryId);
          return cat && cat.name===state.selectedCategory;
        })
  ).sort((a,b)=>a.name.localeCompare(b.name));

  const content=`
    <div class="pos">

      <div class="pos-left">

        <div class="category-bar">
          ${categoryNames.map(c=>`
            <button onclick="selectCategory('${c}')"
              class="${state.selectedCategory===c?'active':''}">
              ${c}
            </button>
          `).join("")}
        </div>

        <div class="menu-grid">
          ${filteredMenus.map(m=>{
            const disabled=m.useStock&&m.stock<=0;
            return `
              <div class="menu-card ${disabled?'disabled':''}"
                onclick="addToCart('${m.id}')">
                <div><b>${m.name}</b></div>
                <div>Rp ${formatRupiah(m.price)}</div>
                ${m.useStock?`
                  <div class="${m.stock<=0?'stock-habis':''}">
                    Sisa: ${m.stock}
                  </div>
                `:''}
              </div>
            `;
          }).join("")}
        </div>

      </div>

      <div class="pos-right">

        <h3 style="margin-top:0;">Pesanan</h3>

        <div class="cart-list">
          ${state.cart.map(i=>`
            <div class="cart-item">
              <div>
                ${i.name}<br>
                x${i.qty} - Rp ${formatRupiah(i.price*i.qty)}
              </div>
              <div>
                <button onclick="changeQty('${i.id}',-1)">-</button>
                <button onclick="changeQty('${i.id}',1)">+</button>
              </div>
            </div>
          `).join("")}
        </div>

        <div class="cart-total">
          Total: Rp ${formatRupiah(getTotal())}
        </div>

        <div class="quick-pay">
          <button onclick="setPay(10000)">10K</button>
          <button onclick="setPay(20000)">20K</button>
          <button onclick="setPay(50000)">50K</button>
          <button onclick="setPay(100000)">100K</button>
          <button onclick="setPay(getTotal())">Pas</button>
        </div>

        <input id="payInput"
          type="text"
          placeholder="Masukkan Bayar"
          oninput="formatInputRupiah(this)"
          style="margin-bottom:10px;">

        <button class="primary" onclick="bayar()">
          Bayar
        </button>

      </div>

    </div>
  `;

  renderLayout(
    "Kasir",
    `
      <button onclick="renderHistory()">Riwayat</button>
      <button onclick="renderMenuManager()">Kelola</button>
      <button onclick="connectPrinter()">Printer</button>
      <button onclick="logout()">Logout</button>
    `,
    content
  );
}

// ================= KASIR LOGIC =================

function selectCategory(c){
  state.selectedCategory=c;
  renderKasir();
}

function addToCart(id){
  const item=state.menus.find(m=>m.id===id);
  if(!item) return;
  if(item.useStock&&item.stock<=0) return;

  const exist=state.cart.find(c=>c.id===id);

  if(exist){
    if(item.useStock&&exist.qty>=item.stock) return;
    exist.qty++;
  }else{
    state.cart.push({...item,qty:1});
  }

  renderKasir();
}

function changeQty(id,d){
  const item=state.cart.find(i=>i.id===id);
  if(!item) return;

  const menu=state.menus.find(m=>m.id===id);
  if(menu.useStock&&(item.qty+d)>menu.stock) return;

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
  const paid=parseRupiah(
    document.getElementById("payInput").value
  );

  const total=getTotal();

  if(!paid||paid<total){
    alert("Uang kurang");
    return;
  }

  const trx={
    items:state.cart,
    total:total,
    paid:paid,
    change:paid-total,
    date:new Date()
  };

  await dbCloud.collection("transactions").add(trx);

  if(typeof printStruk==="function"){
    printStruk(trx);
  }

  state.cart=[];
  renderKasir();
}

// ================= RIWAYAT =================

function renderHistory(){
  state.currentView="history";

  const sorted = [...state.transactions].sort((a,b)=>{
    const da=new Date(a.date.seconds?a.date.seconds*1000:a.date);
    const db=new Date(b.date.seconds?b.date.seconds*1000:b.date);
    return db-da;
  });

  const content=`
    <div class="history-wrapper">

      <div class="recap-box">
        <b>Total Transaksi:</b> ${sorted.length}
      </div>

      <div class="transaction-list">
        ${sorted.map(t=>`
          <div class="transaction-card">
            <div>
              ${new Date(
                t.date.seconds?t.date.seconds*1000:t.date
              ).toLocaleString()}
              - Rp ${formatRupiah(t.total)}
            </div>

            <div style="margin-top:6px;">
              <button onclick="toggleDetail('${t.id}')">
                Detail
              </button>
            </div>

            ${
              state.expandedHistory===t.id
              ?`
              <div class="transaction-detail">
                ${t.items.map(i=>`
                  ${i.name} x${i.qty}
                  - Rp ${formatRupiah(i.price*i.qty)}
                `).join("<br>")}
                <br><br>
                Bayar: Rp ${formatRupiah(t.paid)}<br>
                Kembali: Rp ${formatRupiah(t.change)}
              </div>
              `
              :""
            }

          </div>
        `).join("")}
      </div>

    </div>
  `;

  renderLayout(
    "Riwayat Transaksi",
    `
      <button onclick="renderKasir()">Kasir</button>
      <button onclick="renderMenuManager()">Kelola</button>
      <button onclick="logout()">Logout</button>
    `,
    content
  );
}

function toggleDetail(id){
  state.expandedHistory=
    state.expandedHistory===id?null:id;
  renderHistory();
}

// ================= MENU MANAGER =================

function renderMenuManager(){
  state.currentView="menuManager";

  const sortedCategories=[
    ...state.categories.filter(c=>!c.system)
      .sort((a,b)=>a.name.localeCompare(b.name)),
    ...state.categories.filter(c=>c.system)
  ];

  const content=`
    <div class="manager-grid">

      <div class="manager-left">

        <h3>Tambah Kategori</h3>

        <input id="newCategory"
          placeholder="Nama kategori"
          style="margin-bottom:10px;">

        <button class="primary"
          onclick="addCategory()">
          Tambah
        </button>

      </div>

      <div class="manager-right">

        ${sortedCategories.map(c=>`
          <div class="category-item">
            <div>${c.name}</div>
            <div>
              <button onclick="openCategory('${c.id}')">
                Buka
              </button>
              ${
                !c.system
                ?`<button onclick="deleteCategory('${c.id}')">
                    Hapus
                  </button>`
                :""
              }
            </div>
          </div>
        `).join("")}

      </div>

    </div>
  `;

  renderLayout(
    "Kelola Menu",
    `
      <button onclick="renderKasir()">Kasir</button>
      <button onclick="renderHistory()">Riwayat</button>
      <button onclick="logout()">Logout</button>
    `,
    content
  );
}

// ================= OPEN CATEGORY =================

function openCategory(id){
  state.currentView="openCategory";
  state.currentCategoryId=id;

  const category=state.categories.find(c=>c.id===id);
  if(!category) return;

  const menus=state.menus
    .filter(m=>m.categoryId===id)
    .sort((a,b)=>a.name.localeCompare(b.name));

  const content=`
    <div class="manager-grid">

      <div class="manager-left">

        <h3>Tambah Menu</h3>

        <input id="menuName"
          placeholder="Nama menu"
          style="margin-bottom:10px;">

        <input id="menuPrice"
          placeholder="Harga"
          oninput="formatInputRupiah(this)"
          style="margin-bottom:10px;">

        <button class="primary"
          onclick="addMenu('${id}')">
          Tambah
        </button>

      </div>

      <div class="manager-right">

        ${menus.map(m=>`
          <div class="menu-item">
            <div>
              ${m.name}
              <br>
              Rp ${formatRupiah(m.price)}
            </div>
            <div>
              <button onclick="deleteMenu('${m.id}')">
                Hapus
              </button>
            </div>
          </div>
        `).join("")}

      </div>

    </div>
  `;

  renderLayout(
    "Kategori: "+category.name,
    `
      <button onclick="renderMenuManager()">
        Kembali
      </button>
      <button onclick="logout()">Logout</button>
    `,
    content
  );
}

// ================= CATEGORY & MENU CRUD =================

async function addCategory(){
  const name=document.getElementById("newCategory").value;
  if(!name) return;

  await dbCloud.collection("categories").add({
    name:name,
    system:false
  });

  document.getElementById("newCategory").value="";
}

async function deleteCategory(id){
  if(!confirm("Hapus kategori?")) return;
  await dbCloud.collection("categories").doc(id).delete();
}

async function addMenu(categoryId){
  const name=document.getElementById("menuName").value;
  const price=parseRupiah(
    document.getElementById("menuPrice").value
  );

  if(!name||!price) return;

  await dbCloud.collection("menus").add({
    name:name,
    price:price,
    categoryId:categoryId,
    useStock:false
  });

  document.getElementById("menuName").value="";
  document.getElementById("menuPrice").value="";
}

async function deleteMenu(id){
  if(!confirm("Hapus menu?")) return;
  await dbCloud.collection("menus").doc(id).delete();
}