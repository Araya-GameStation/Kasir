
const app=document.getElementById("app");
let state={currentCategory:"all",cart:[],expandedHistory:null,isProcessing:false};

function render(){
 app.innerHTML=`
 <div class="pos">
  <div class="left">
   <h2>KASIR - GARIS WAKTU</h2>
   <button onclick="connectPrinter()">Connect Printer</button>
   <hr>
   ${renderCategories()}
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
    <button onclick="renderMenu()">Menu</button>
    <button onclick="renderHistory()">Riwayat</button>
    <button onclick="renderSettings()">Setting</button>
   </div>
  </div>
 </div>`;
}

function renderCategories(){
 let html='<div class="category-bar">';
 html+=`<button class="${state.currentCategory==='all'?'active':''}" onclick="selectCategory('all')">ALL</button>`;
 db.categories.forEach(c=>{
  html+=`<button class="${state.currentCategory===c.id?'active':''}" onclick="selectCategory(${c.id})">${c.name}</button>`;
 });
 html+='</div>';
 return html;
}

function renderMenus(){
 let menus= state.currentCategory==="all"
  ? db.menus
  : db.menus.filter(m=>m.categoryId===state.currentCategory);
 if(menus.length===0)return "<p>Belum ada menu</p>";
 return menus.map(m=>`<div class="card" onclick="addToCart(${m.id})">${m.name}<br>${formatRupiah(m.price)}</div>`).join("");
}

function selectCategory(id){state.currentCategory=id;render();}

function addToCart(id){
 const item=db.menus.find(m=>m.id===id);
 const ex=state.cart.find(c=>c.id===id);
 if(ex)ex.qty++;else state.cart.push({...item,qty:1});
 render();
}

function renderCart(){
 if(state.cart.length===0)return "<p>Kosong</p>";
 return state.cart.map(i=>`
  <div class="cart-item">
   <span>${i.name} x${i.qty}</span>
   <span>
    <button class="qty-btn" onclick="changeQty(${i.id},-1)">-</button>
    <button class="qty-btn" onclick="changeQty(${i.id},1)">+</button>
    ${formatRupiah(i.price*i.qty)}
   </span>
  </div>`).join("");
}

function changeQty(id,delta){
 const item=state.cart.find(i=>i.id===id);
 if(!item)return;
 item.qty+=delta;
 if(item.qty<=0){
  state.cart=state.cart.filter(i=>i.id!==id);
 }
 render();
}

function getTotal(){return state.cart.reduce((s,i)=>s+(i.price*i.qty),0);}

function setPay(v){document.getElementById("payInput").value=v;}

function pay(){
 if(state.isProcessing)return;
 if(state.cart.length===0){alert("Keranjang kosong");return;}
 const total=getTotal();
 const paid=parseInt(document.getElementById("payInput").value);
 if(!paid||paid<total){alert("Uang kurang");return;}
 state.isProcessing=true;
 const change=paid-total;
 const trx={id:generateId(),items:[...state.cart],total,paid,change,date:new Date().toLocaleString()};
 db.transactions.push(trx);saveDB();
 printStruk(trx);
 alert("Kembalian: "+formatRupiah(change));
 state.cart=[];
 state.isProcessing=false;
 render();
}

function renderHistory(){
 app.innerHTML=`
 <h2>Riwayat</h2>
 <hr>
 ${db.transactions.map(t=>`
  <div class="history-item" onclick="toggleHistory(${t.id})">
   ${t.date} - ${formatRupiah(t.total)}
   ${state.expandedHistory===t.id?`
    <div class="history-detail">
     ${t.items.map(i=>`${i.name} x${i.qty}`).join("<br>")}
    </div>`:''}
  </div>`).join("")}
 <hr><button onclick='render()'>Kembali</button>`;
}

function toggleHistory(id){
 state.expandedHistory = state.expandedHistory===id?null:id;
 renderHistory();
}

function renderMenu(){
 app.innerHTML=`
 <h2>Kelola Menu</h2>
 <input id="catName" placeholder="Nama kategori">
 <button onclick="addCategory()">Tambah</button>
 <hr>
 ${db.categories.map(c=>`
  <div><strong>${c.name}</strong>
  <button onclick="openCategory(${c.id})">Buka</button></div>`).join("")}
 <hr><button onclick="render()">Kembali</button>`;
}

function addCategory(){
 const name=document.getElementById("catName").value;
 if(!name)return;
 db.categories.push({id:generateId(),name});saveDB();renderMenu();
}

function openCategory(id){
 const cat=db.categories.find(c=>c.id===id);
 app.innerHTML=`
 <button onclick="renderMenu()">←</button>
 <h3>${cat.name}</h3>
 <input id="menuName" placeholder="Nama menu">
 <input id="menuPrice" type="number" placeholder="Harga">
 <button onclick="addMenu(${id})">Tambah</button>
 <hr>
 ${db.menus.filter(m=>m.categoryId===id).map(m=>`<div>${m.name} - ${formatRupiah(m.price)}</div>`).join("")}
 `;
}

function addMenu(cid){
 const name=document.getElementById("menuName").value;
 const price=parseInt(document.getElementById("menuPrice").value);
 if(!name||!price)return;
 db.menus.push({id:generateId(),name,price,categoryId:cid});saveDB();openCategory(cid);
}

function renderSettings(){
 app.innerHTML=`
 <h2>Pengaturan</h2>
 <input id="footerInput" value="${db.settings.footer}">
 <button onclick="saveSettings()">Simpan</button>
 <hr><button onclick='render()'>Kembali</button>`;
}

function saveSettings(){
 db.settings.footer=document.getElementById("footerInput").value;
 saveDB();
 alert("Disimpan");
}

render();
