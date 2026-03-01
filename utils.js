
function formatRupiah(num){return "Rp "+num.toLocaleString("id-ID");}
function showModal(text,callback){
 const modal=document.getElementById("modal");
 document.getElementById("modal-text").innerText=text;
 modal.classList.remove("hidden");
 document.getElementById("modal-confirm").onclick=()=>{modal.classList.add("hidden");callback();};
 document.getElementById("modal-cancel").onclick=()=>{modal.classList.add("hidden");};
}
