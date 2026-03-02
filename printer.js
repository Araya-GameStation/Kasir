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

async function printStruk(trx){

 if(!printerDevice || !printerDevice.gatt.connected){
  alert("Printer tidak terhubung");
  return;
 }

 if(!printerCharacteristic) return;

 const now = new Date();

 const tanggal = now.toLocaleDateString("id-ID", {
  timeZone: "Asia/Makassar",
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
 });

 const jam = now.toLocaleTimeString("id-ID", {
  timeZone: "Asia/Makassar",
  hour: "2-digit",
  minute: "2-digit"
 });

 const encoder = new TextEncoder();
 let bytes = [];

 bytes.push(...encoder.encode("\n\n"));

 // CENTER + BOLD + DOUBLE SIZE
 bytes.push(0x1B, 0x61, 0x01);
 bytes.push(0x1B, 0x45, 0x01);
 bytes.push(0x1D, 0x21, 0x11);

 bytes.push(...encoder.encode("GARIS WAKTU\n"));

 // NORMAL SIZE
 bytes.push(0x1D, 0x21, 0x00);
 bytes.push(0x1B, 0x45, 0x00);

 bytes.push(...encoder.encode("JL A YANI KM 14,8 KEL GAMBUT\n"));
 bytes.push(...encoder.encode("KEC GAMBUT KAB BANJAR 70652\n"));

 bytes.push(...encoder.encode("--------------------------------\n"));

 // CENTER DATE
 bytes.push(0x1B, 0x61, 0x01);
 bytes.push(...encoder.encode(tanggal + " • " + jam + "\n"));

 bytes.push(...encoder.encode("--------------------------------\n"));

 // LEFT ALIGN ITEMS
 bytes.push(0x1B, 0x61, 0x00);

 trx.items.forEach(i=>{
  bytes.push(...encoder.encode(i.name + "\n"));
  const qtyPrice = i.qty + " x " + formatRupiah(i.price);
  const totalPrice = formatRupiah(i.price * i.qty);
  bytes.push(...encoder.encode(
    qtyPrice + padLeft(totalPrice, 32 - qtyPrice.length) + "\n"
  ));
 });

 bytes.push(...encoder.encode("--------------------------------\n"));

 const totalLine = "TOTAL";
 const bayarLine = "BAYAR";
 const kembaliLine = "KEMBALI";

 bytes.push(...encoder.encode(
  totalLine + padLeft(formatRupiah(trx.total), 32 - totalLine.length) + "\n"
 ));

 bytes.push(...encoder.encode(
  bayarLine + padLeft(formatRupiah(trx.paid), 32 - bayarLine.length) + "\n"
 ));

 bytes.push(...encoder.encode(
  kembaliLine + padLeft(formatRupiah(trx.change), 32 - kembaliLine.length) + "\n"
 ));

 bytes.push(...encoder.encode("--------------------------------\n"));

 // CENTER THANK YOU
 bytes.push(0x1B, 0x61, 0x01);
 bytes.push(...encoder.encode("Terima Kasih\n"));
 bytes.push(...encoder.encode("Atas Kunjungan Anda\n"));

 bytes.push(...encoder.encode("--------------------------------\n"));

 bytes.push(...encoder.encode("WA  : 085147520182\n"));
 bytes.push(...encoder.encode("IG  : @arayagamestation\n"));

 bytes.push(...encoder.encode("\n\n\n"));

 await writeInChunks(new Uint8Array(bytes));
}

function padLeft(text, width){
 text = text.toString();
 return " ".repeat(Math.max(0, width - text.length)) + text;
}
