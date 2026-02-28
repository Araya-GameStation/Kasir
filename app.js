const app = document.getElementById("app");

function navigate(page) {
  if (page === "kasir") {
    app.innerHTML = "<h2>Halaman Kasir (Kosong)</h2>";
  }

  if (page === "menu") {
    app.innerHTML = "<h2>Kelola Menu (Kosong)</h2>";
  }

  if (page === "riwayat") {
    app.innerHTML = "<h2>Riwayat Transaksi (Kosong)</h2>";
  }

  if (page === "pengaturan") {
    app.innerHTML = "<h2>Pengaturan (Kosong)</h2>";
  }
}

// Default halaman awal
navigate("kasir");

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}