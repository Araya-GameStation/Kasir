/* UPDATE RIWAYAT MULTI DELETE */
state.selectedHistory = new Set();

function renderHistory(){
 app.innerHTML=`
 <h2>Riwayat</h2>
 <button onclick="toggleSelectAll()">Pilih Semua</button>
 <button onclick="deleteSelected()">Hapus Terpilih</button>
 <hr>
 ${db.transactions.map(t=>`
  <div>
   <div class="history-item">
    <div>
     <input type="checkbox"
      ${state.selectedHistory.has(t.id)?'checked':''}
      onchange="toggleSelect(${t.id})">
     ${t.date} - ${formatRupiah(t.total)}
    </div>
    <button onclick="toggleHistory(${t.id})">Detail</button>
   </div>
   ${state.expandedHistory===t.id?`
    <div class="history-detail">
     ${t.items.map(i=>`${i.name} x${i.qty}`).join("<br>")}
    </div>`:''}
  </div>`).join("")}
 <hr><button onclick='render()'>Kembali</button>`;
}

function toggleSelect(id){
 if(state.selectedHistory.has(id)) state.selectedHistory.delete(id);
 else state.selectedHistory.add(id);
}

function toggleSelectAll(){
 if(state.selectedHistory.size===db.transactions.length){
  state.selectedHistory.clear();
 }else{
  db.transactions.forEach(t=>state.selectedHistory.add(t.id));
 }
 renderHistory();
}

function deleteSelected(){
 if(state.selectedHistory.size===0){
  alert("Tidak ada yang dipilih");
  return;
 }
 showModal("Hapus transaksi terpilih?",()=>{
  db.transactions=db.transactions.filter(t=>!state.selectedHistory.has(t.id));
  state.selectedHistory.clear();
  saveDB();
  renderHistory();
 });
}
