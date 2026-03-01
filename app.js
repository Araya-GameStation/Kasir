// ================================
// GARIS WAKTU POS - CORE ENGINE
// ================================

const app = document.getElementById("app");

// ===== DATABASE STRUCTURE =====
const defaultDB = {
  categories: [],
  menus: [],
  transactions: [],
  settings: {
    storeName: "GARIS WAKTU",
    theme: "light",
    paperSize: "58mm",
    quickCash: [10000, 20000, 50000, 100000]
  }
};

let db = JSON.parse(localStorage.getItem("gw_pos_db")) || defaultDB;

function saveDB() {
  localStorage.setItem("gw_pos_db", JSON.stringify(db));
}

// ===== GLOBAL STATE =====
let state = {
  currentView: "kasir",
  currentCategory: null,
  cart: [],
  manageMode: false
};

// ===== ROUTING =====
function navigate(view, data = null) {
  state.currentView = view;
  state.manageMode = false;

  if (view === "kasir") renderKasir();
  if (view === "menu") renderMenu();
  if (view === "category") renderCategoryDetail(data);
  if (view === "riwayat") renderRiwayat();
  if (view === "pengaturan") renderPengaturan();
}

// ===== UTILITIES =====
function formatRupiah(num) {
  return "Rp " + num.toLocaleString("id-ID");
}

function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// ===== CHECKBOX SYSTEM (Reusable) =====
function toggleManageMode() {
  state.manageMode = !state.manageMode;
  navigate(state.currentView, state.currentCategory);
}

function confirmDelete(message, callback) {
  if (confirm(message)) {
    callback();
  }
}

// ===== EMPTY VIEWS (UI WILL BE BUILT NEXT) =====

function renderKasir() {
  app.innerHTML = `<h2>KASIR ENGINE READY</h2>`;
}

function renderMenu() {
  app.innerHTML = `<h2>MENU ENGINE READY</h2>`;
}

function renderCategoryDetail(id) {
  state.currentCategory = id;
  app.innerHTML = `<h2>CATEGORY DETAIL ENGINE READY</h2>`;
}

function renderRiwayat() {
  app.innerHTML = `<h2>RIWAYAT ENGINE READY</h2>`;
}

function renderPengaturan() {
  app.innerHTML = `<h2>PENGATURAN ENGINE READY</h2>`;
}

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

// ===== START =====
navigate("kasir");
