// ============================================
// APP UI OVERRIDE - PREMIUM LAYOUT
// ============================================

function renderLogin(){
  app.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <h2>Login Admin</h2>
        <input id="email" placeholder="Email">
        <input id="password" type="password" placeholder="Password">
        <button onclick="login()">Login</button>
      </div>
    </div>
  `;
}

// ================= KASIR UI =================

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

  app.innerHTML = `
    <div class="pos">
      <div class="left">

        <div class="top-bar">
          <h2>KASIR - GARIS WAKTU</h2>
          <div class="nav-buttons">
            <button onclick="connectPrinter()">Printer</button>
            <button onclick="renderHistory()">Riwayat</button>
            <button onclick="renderMenuManager()">Kelola</button>
            <button onclick="logout()">Logout</button>
          </div>
        </div>

        <div class="category-bar">
          ${categoryNames.map(c=>`
            <button 
              onclick="selectCategory('${c}')"
              class="${state.selectedCategory===c?'active':''}">
              ${c}
            </button>
          `).join("")}
        </div>

        <div class="menu-grid">
          ${filteredMenus.map(m=>{
            const disabled = m.useStock && m.stock<=0;
            return `
              <div 
                class="card ${disabled?'disabled':''}"
                onclick="addToCart('${m.id}')">
                <div class="menu-name">${m.name}</div>
                <div class="menu-price">Rp ${formatRupiah(m.price)}</div>
                ${m.useStock?`<div class="menu-stock">Stok: ${m.stock}</div>`:''}
                ${disabled?'<div class="out-stock">Stok Habis</div>':''}
              </div>
            `;
          }).join("")}
        </div>

      </div>

      <div class="right">
        <h3>Pesanan</h3>

        <div class="cart-list">
          ${state.cart.map(i=>`
            <div class="cart-item">
              <div>
                ${i.name}<br>
                <small>${i.qty} x Rp ${formatRupiah(i.price)}</small>
              </div>
              <div>
                Rp ${formatRupiah(i.price*i.qty)}<br>
                <button class="qty-btn" onclick="changeQty('${i.id}',-1)">-</button>
                <button class="qty-btn" onclick="changeQty('${i.id}',1)">+</button>
              </div>
            </div>
          `).join("")}
        </div>

        <div class="total">
          Total: Rp ${formatRupiah(getTotal())}
        </div>

        <div class="quick-pay">
          <button onclick="setPay(10000)">10K</button>
          <button onclick="setPay(20000)">20K</button>
          <button onclick="setPay(50000)">50K</button>
          <button onclick="setPay(100000)">100K</button>
          <button onclick="setPay(getTotal())">Pas</button>
        </div>

        <input id="payInput" type="text" placeholder="Bayar" oninput="formatInputRupiah(this)">
        <button id="btnBayar" class="pay-btn" onclick="bayar()">Bayar</button>

      </div>
    </div>
  `;
}

// ================= HISTORY UI =================

function renderHistory(){

  state.currentView="history";

  app.innerHTML=`
    <div class="page">
      <div class="page-header">
        <h2>Riwayat Transaksi</h2>
        <button onclick="renderKasir()">Kembali</button>
      </div>

      <div class="history-list">
        ${[...state.transactions]
          .sort((a,b)=>{
            const da = new Date(a.date.seconds? a.date.seconds*1000 : a.date);
            const db = new Date(b.date.seconds? b.date.seconds*1000 : b.date);
            return db - da;
          })
          .map(t=>`
          <div class="history-item">
            <div>
              ${new Date(t.date.seconds? t.date.seconds*1000 : t.date).toLocaleString()}
              <br><strong>Rp ${formatRupiah(t.total)}</strong>
            </div>
            <button onclick="toggleDetail('${t.id}')">Detail</button>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// ================= MENU MANAGER UI =================

function renderMenuManager(){

  state.currentView="menuManager";

  app.innerHTML=`
    <div class="page">
      <div class="page-header">
        <h2>Kelola Kategori</h2>
        <button onclick="renderKasir()">Kembali</button>
      </div>

      <input id="newCategory" placeholder="Nama Kategori">
      <button onclick="addCategory()">Tambah</button>

      <div class="category-list">
        ${state.categories.map(c=>`
          <div class="category-item">
            ${c.name}
            ${!c.system?`<button onclick="deleteCategory('${c.id}')">Hapus</button>`:''}
            <button onclick="openCategory('${c.id}')">Buka</button>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}