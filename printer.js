let printerDevice = null;
let printerCharacteristic = null;

function formatRupiah(num){
  return new Intl.NumberFormat("id-ID").format(num || 0);
}

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
// CEPAT TAPI AMAN
////////////////////////////////////////////////////

async function writeInChunks(data){

  const chunkSize = 100;
  const delay = 10;

  for(let i=0; i<data.length; i+=chunkSize){

    const chunk = data.slice(i, i+chunkSize);

    if(printerCharacteristic.writeValueWithoutResponse){
      await printerCharacteristic.writeValueWithoutResponse(chunk);
    }else{
      await printerCharacteristic.writeValue(chunk);
    }

    await new Promise(r=>setTimeout(r, delay));
  }
}

////////////////////////////////////////////////////
// PRINT STRUK
////////////////////////////////////////////////////

async function printStruk(trx){

 if(!printerDevice || !printerDevice.gatt.connected){
  alert("Printer tidak terhubung");
  return;
 }

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

 bytes.push(...encoder.encode("\n\n\n"));

 bytes.push(0x1B, 0x61, 0x01);
 bytes.push(0x1B, 0x45, 0x01);
 bytes.push(0x1D, 0x21, 0x11);

 bytes.push(...encoder.encode("GARIS WAKTU\n"));

 bytes.push(0x1D, 0x21, 0x00);
 bytes.push(0x1B, 0x45, 0x00);

 bytes.push(...encoder.encode("\n"));
 bytes.push(...encoder.encode("JL A YANI KM 14,8 KEL GAMBUT\n"));
 bytes.push(...encoder.encode("KEC GAMBUT KAB BANJAR, 70652\n"));

 bytes.push(...encoder.encode("\n--------------------------------\n"));

 bytes.push(0x1B, 0x61, 0x00);

 bytes.push(...encoder.encode("Tanggal : " + waktu + "\n"));
 bytes.push(...encoder.encode("--------------------------------\n"));

 trx.items.forEach(i=>{
  bytes.push(...encoder.encode(i.name + "\n"));
  bytes.push(...encoder.encode(
    i.qty + " x Rp " + formatRupiah(i.price) +
    padLeft("Rp " + formatRupiah(i.price * i.qty), 18) + "\n"
  ));
 });

 bytes.push(...encoder.encode("--------------------------------\n"));

 bytes.push(...encoder.encode(
   "TOTAL   : " + padLeft("Rp " + formatRupiah(trx.total), 18) + "\n"
 ));
 bytes.push(...encoder.encode(
   "BAYAR   : " + padLeft("Rp " + formatRupiah(trx.paid), 18) + "\n"
 ));
 bytes.push(...encoder.encode(
   "KEMBALI : " + padLeft("Rp " + formatRupiah(trx.change), 18) + "\n"
 ));

 bytes.push(...encoder.encode("\n"));

 bytes.push(0x1B, 0x61, 0x01);
 bytes.push(...encoder.encode("Terima kasih sudah mampir\n"));

 bytes.push(...encoder.encode("--------------------------------\n"));
 bytes.push(...encoder.encode("WhatsApp: 085147520182\n"));
 bytes.push(...encoder.encode("Instagram: @arayagamestation\n\n\n"));

 bytes.push(...encoder.encode("\n\n\n"));

 await writeInChunks(new Uint8Array(bytes));
}

function padLeft(text, width){
 text = text.toString();
 return " ".repeat(Math.max(0, width - text.length)) + text;
}
