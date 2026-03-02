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

////////////////////////////////////////////////////
// STRUK GARIS WAKTU
////////////////////////////////////////////////////

async function printStruk(trx){

 if(!printerCharacteristic) return;

 const now = new Date();

 const waktu = now.toLocaleString("id-ID", {
  timeZone: "Asia/Makassar",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
 });

 const encoder = new TextEncoder();
 let bytes = [];

 // Spasi atas
 bytes.push(...encoder.encode("\n\n\n"));

 // Center
 bytes.push(0x1B, 0x61, 0x01);

 // Bold ON
 bytes.push(0x1B, 0x45, 0x01);

 // Double size
 bytes.push(0x1D, 0x21, 0x11);

 bytes.push(...encoder.encode("GARIS WAKTU\n"));

 // Normal lagi
 bytes.push(0x1D, 0x21, 0x00);
 bytes.push(0x1B, 0x45, 0x00);

 // ===== JARAK BIAR ELEGAN =====
 bytes.push(...encoder.encode("\n"));

 // Alamat (tetap center)
 bytes.push(...encoder.encode("JL A YANI KM 14,8 KEL GAMBUT\n"));
 bytes.push(...encoder.encode("KEC GAMBUT KAB BANJAR, 70652\n"));

 // Jarak lagi sebelum garis
 bytes.push(...encoder.encode("\n"));
 bytes.push(...encoder.encode("--------------------------------\n"));

 // Left align untuk isi
 bytes.push(0x1B, 0x61, 0x00);

 bytes.push(...encoder.encode("Tanggal : " + waktu + "\n"));
 bytes.push(...encoder.encode("--------------------------------\n"));

 trx.items.forEach(i=>{
  bytes.push(...encoder.encode(i.name + "\n"));
  bytes.push(...encoder.encode(
    i.qty + " x Rp " + i.price +
    padLeft("Rp " + (i.price * i.qty), 18) + "\n"
  ));
 });

 bytes.push(...encoder.encode("--------------------------------\n"));

 bytes.push(...encoder.encode(
   "TOTAL   : " + padLeft("Rp " + trx.total, 18) + "\n"
 ));
 bytes.push(...encoder.encode(
   "BAYAR   : " + padLeft("Rp " + trx.paid, 18) + "\n"
 ));
 bytes.push(...encoder.encode(
   "KEMBALI : " + padLeft("Rp " + trx.change, 18) + "\n"
 ));

 // ===== FOOTER =====
 bytes.push(...encoder.encode("\n"));

 // Center ucapan
 bytes.push(0x1B, 0x61, 0x01);
 bytes.push(...encoder.encode("Terima kasih sudah mampir\n"));

 bytes.push(...encoder.encode("\n--------------------------------\n\n"));

 bytes.push(...encoder.encode("WhatsApp: 085147520182\n"));
 bytes.push(...encoder.encode("Instagram: @arayagamestation\n\n\n"));

// Spasi bawah
 bytes.push(...encoder.encode("\n\n\n"));
 
 await printerCharacteristic.writeValue(new Uint8Array(bytes));
}

////////////////////////////////////////////////////
// HELPER
////////////////////////////////////////////////////

function padLeft(text, width){
 text = text.toString();
 return " ".repeat(width - text.length) + text;
}
