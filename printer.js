
let printerDevice=null;
let printerCharacteristic=null;

async function connectPrinter(){
 try{
  printerDevice=await navigator.bluetooth.requestDevice({
   acceptAllDevices:true,
   optionalServices:[0x18F0]
  });
  const server=await printerDevice.gatt.connect();
  const service=await server.getPrimaryService(0x18F0);
  printerCharacteristic=await service.getCharacteristic(0x2AF1);
  alert("Printer terhubung");
 }catch(e){alert("Gagal connect printer");}
}

function textToBytes(text){return new TextEncoder().encode(text);}

async function printStruk(trx){
 if(!printerCharacteristic)return;
 let s="";
 s+="      GARIS WAKTU\n";
 s+="--------------------------\n";
 trx.items.forEach(i=>{
  s+=`${i.name} x${i.qty}\n`;
  s+=`${formatRupiah(i.price*i.qty)}\n`;
 });
 s+="--------------------------\n";
 s+=`TOTAL : ${formatRupiah(trx.total)}\n`;
 s+=`BAYAR : ${formatRupiah(trx.paid)}\n`;
 s+=`KEMBALI : ${formatRupiah(trx.change)}\n\n`;
 s+=db.settings.footer+"\n\n\n";
 await printerCharacteristic.writeValue(textToBytes(s));
}
