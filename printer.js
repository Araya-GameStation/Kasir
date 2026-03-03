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

 const tanggalLengkap = now.toLocaleDateString("id-ID", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Makassar"
 });

 const jam = now.toLocaleTimeString("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Makassar"
 });

 const encoder = new TextEncoder();
 let bytes = [];

 bytes.push(...encoder.encode("\n\n"));

 bytes.push(0x1B, 0x61, 0x01);
 bytes.push(0x1B, 0x45, 0x01);
 bytes.push(0x1D, 0x21, 0x11);
 bytes.push(...encoder.encode("GARIS WAKTU\n"));

 bytes.push(0x1D, 0x21, 0x00);
 bytes.push(0x1B, 0x45, 0x00);

 bytes.push(...encoder.encode("\n"));
 bytes.push(...encoder.encode("JL A YANI KM 14,8 KEL GAMBUT\n"));
 bytes.push(...encoder.encode("KEC GAMBUT KAB BANJAR 70652\n"));

 bytes.push(...encoder.encode("--------------------------------\n"));

 const left = tanggalLengkap;
 const right = jam;
 const spacing = 32 - left.length - right.length;
 const dateLine = left + " ".repeat(Math.max(0, spacing)) + right;

 bytes.push(0x1B, 0x61, 0x00);
 bytes.push(...encoder.encode(dateLine + "\n"));

 bytes.push(...encoder.encode("--------------------------------\n"));

 trx.items.forEach(i=>{
  bytes.push(...encoder.encode(i.name + "\n"));
  const qtyPrice = i.qty + " x " + formatRupiah(i.price);
  const totalPrice = formatRupiah(i.price * i.qty);
  const itemSpacing = 32 - qtyPrice.length - totalPrice.length;
  const itemLine = qtyPrice + " ".repeat(Math.max(0, itemSpacing)) + totalPrice;
  bytes.push(...encoder.encode(itemLine + "\n"));
 });

 bytes.push(...encoder.encode("--------------------------------\n"));

 const totalLine = "TOTAL";
 const bayarLine = "BAYAR";
 const kembaliLine = "KEMBALI";

 const totalSpacing = 32 - totalLine.length - formatRupiah(trx.total).length;
 const bayarSpacing = 32 - bayarLine.length - formatRupiah(trx.paid).length;
 const kembaliSpacing = 32 - kembaliLine.length - formatRupiah(trx.change).length;

 bytes.push(...encoder.encode(
  totalLine + " ".repeat(Math.max(0, totalSpacing)) + formatRupiah(trx.total) + "\n"
 ));

 bytes.push(...encoder.encode(
  bayarLine + " ".repeat(Math.max(0, bayarSpacing)) + formatRupiah(trx.paid) + "\n"
 ));

 bytes.push(...encoder.encode(
  kembaliLine + " ".repeat(Math.max(0, kembaliSpacing)) + formatRupiah(trx.change) + "\n"
 ));

 bytes.push(...encoder.encode("--------------------------------\n"));

 bytes.push(0x1B, 0x61, 0x01);
 bytes.push(...encoder.encode("Terima Kasih\n"));
 bytes.push(...encoder.encode("Atas Kunjungan Anda\n"));

 bytes.push(...encoder.encode("--------------------------------\n"));

 bytes.push(...encoder.encode("WA  : 085147520182\n"));
 bytes.push(...encoder.encode("IG  : @arayagamestation\n"));

 bytes.push(...encoder.encode("\n\n\n"));

 await writeInChunks(new Uint8Array(bytes));
}