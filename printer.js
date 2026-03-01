let printerDevice = null;
let printerCharacteristic = null;

async function connectPrinter(){
 try{
  printerDevice = await navigator.bluetooth.requestDevice({
   acceptAllDevices: true,
   optionalServices: [0x18F0]
  });

  const server = await printerDevice.gatt.connect();
  const service = await server.getPrimaryService(0x18F0);
  printerCharacteristic = await service.getCharacteristic(0x2AF1);

  alert("Printer terhubung");
 }catch(e){
  alert("Gagal connect printer");
 }
}

function textToBytes(text){
 return new TextEncoder().encode(text);
}

////////////////////////////////////////////////////
// STRUK PREMIUM RAPI
////////////////////////////////////////////////////

async function printStruk(trx){

 if(!printerCharacteristic) return;

 const now = new Date();

 // WITA (Asia/Makassar)
 const waktu = now.toLocaleString("id-ID", {
  timeZone: "Asia/Makassar",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
 });

 let s = "";

 // HEADER
 s += center("GARIS WAKTU") + "\n";
 s += center("JL A YANI KM 14,8 KEL GAMBUT") + "\n";
 s += center("KEC GAMBUT KAB BANJAR, 70652") + "\n";
 s += "--------------------------------\n";

 // TANGGAL
 s += "Tanggal : " + waktu + "\n";
 s += "--------------------------------\n";

 // ITEMS
 trx.items.forEach(i=>{
  s += i.name + "\n";
  s += i.qty + " x " + formatRupiah(i.price)
       + padLeft(formatRupiah(i.price * i.qty), 18) + "\n";
 });

 s += "--------------------------------\n";

 // TOTAL
 s += "TOTAL   : " + padLeft(formatRupiah(trx.total), 18) + "\n";
 s += "BAYAR   : " + padLeft(formatRupiah(trx.paid), 18) + "\n";
 s += "KEMBALI : " + padLeft(formatRupiah(trx.change), 18) + "\n";

 s += "--------------------------------\n\n";

 // FOOTER
 s += center(db.settings.footer || "Terima kasih sudah mampir") + "\n";
 s += center("IG: @arayagamestation") + "\n\n\n";

 await printerCharacteristic.writeValue(textToBytes(s));
}

////////////////////////////////////////////////////
// HELPER
////////////////////////////////////////////////////

function center(text){
 const width = 32; // untuk printer 58mm
 const space = Math.floor((width - text.length) / 2);
 return " ".repeat(space > 0 ? space : 0) + text;
}

function padLeft(text, width){
 text = text.toString();
 return " ".repeat(width - text.length) + text;
}
