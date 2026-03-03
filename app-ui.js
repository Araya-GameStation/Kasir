// ============================================
// APP UI
// ============================================

function renderLogin(){
  app.innerHTML = `
    <div class="app">
      <div class="login-wrapper">
        <div class="login-card">
          <h2>Login Admin</h2>
          <input id="email" placeholder="Email">
          <input id="password" type="password" placeholder="Password">
          <button onclick="login()">Login</button>
        </div>
      </div>
    </div>
  `;
}

// ================= GLOBAL HEADER =================

function renderHeader(title, showBack=false, backAction="renderKasir()"){
  return `
    <div class="app-header">
      <div class="header-left">
        ${showBack ? `<button class="back-btn" onclick="${backAction}">←</button>` : ""}
        <h2>${title}</h2>
      </div>
      <div class="header-right">
        <button onclick="connectPrinter()">Printer</button>
        <button onclick="renderHistory()">Riwayat</button>
        <button onclick="renderMenuManager()">Kelola</button>
        <button onclick="logout()">Logout</button>
      </div>
    </div>
  `;
}

// ================= KASIR =================

function renderKasir(){

  state.currentView="kasir";

  const filteredMenus = (
    state.selectedCategory === "ALL"
    ? state.menus
    : state.menus.filter(m=>{
        const cat = state.categories.find(c=>c.id===m.categoryId);
        return cat && cat.name === state.selectedCategory;
      })
  ).sort((a,b)=>a.name.localeCompare(b.name));

  app.innerHTML = `
    <div class="app">
      ${renderHeader("KASIR - GARIS WAKTU")}

      <div class="app-body">

        <div class="menu-section">

          <div class="category-bar">
            <button onclick="selectCategory('ALL')" 
              class="${state.selectedCategory==='ALL'?'active':''}">
              ALL
            </button>
            ${state.categories.map(c=>`
              <button onclick="selectCategory('${c.name}')" 
                class="${state.selectedCategory===c.name?'active':''}">
                ${c.name}
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

        <div class="order-section">

          <div class="order-list">
            ${state.cart.map(i=>`
              <div class="cart-item">
                <div>
                  ${i.name}<br>
                  <small>${i.qty} x Rp ${formatRupiah(i.price)}</small>
                </div>
                <div>
                  Rp ${formatRupiah(i.price*i.qty)}<br>
                  <button onclick="changeQty('${i.id}',-1)">-</button>
                  <button onclick="changeQty('${i.id}',1)">+</button>
                </div>
              </div>
            `).join("")}
          </div>

          <div class="order-footer">
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
            <button class="pay-btn" onclick="bayar()">Bayar</button>
          </div>

        </div>

      </div>
    </div>
  `;
}

// ================= RIWAYAT =================

function renderHistory(){

  state.currentView="history";

  app.innerHTML=`
    <div class="app">
      ${renderHeader("Riwayat Transaksi", true)}

      <div class="app-body single">

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
    </div>
  `;
}

// ================= KELOLA MENU =================

function renderMenuManager(){

  state.currentView="menuManager";

  app.innerHTML=`
    <div class="app">
      ${renderHeader("Kelola Menu", true)}

      <div class="app-body">

        <div class="menu-list-section">
          ${state.menus.map(m=>`
            <div class="menu-row">
              ${m.name} - Rp ${formatRupiah(m.price)}
            </div>
          `).join("")}
        </div>

        <div class="menu-form-section">
          <h3>Tambah Menu</h3>
          <input id="menuName" placeholder="Nama Menu">
          <input id="menuPrice" type="number" placeholder="Harga">
          <button onclick="addMenu()">Tambah</button>
        </div>

      </div>
    </div>
  `;
}
