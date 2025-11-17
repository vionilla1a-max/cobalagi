/**
 * ======================================================
 * File: script.js
 * (Kode kerangka ini harus ada agar HTML tidak error)
 * ======================================================
 */

// 1. Inisialisasi dan Pemuatan Data
document.addEventListener('DOMContentLoaded', () => {
    console.log('FokusMasaDepan berhasil dimuat.');
    // Di sini Anda akan menambahkan kode untuk memuat data dari Local Storage,
    // seperti saldo, histori, limit budget, dan impian, saat aplikasi pertama dibuka.
    loadInitialData();
});

// Variabel Global (Hanya Contoh)
let currentData = {
    balance: 0,
    transactions: [],
    monthlyLimit: 2000000,
    dream: { title: 'Motor Baru', target: 10000000, current: 0 }
};

function loadInitialData() {
    // Fungsi untuk memuat data dari Local Storage
    const data = localStorage.getItem('fokusMasaDepanData');
    if (data) {
        currentData = JSON.parse(data);
    }
    // Panggil fungsi render setelah data dimuat
    renderDashboard(); 
}

function saveData() {
    // Fungsi untuk menyimpan data ke Local Storage
    localStorage.setItem('fokusMasaDepanData', JSON.stringify(currentData));
    renderDashboard();
}

function renderDashboard() {
    // Fungsi untuk memperbarui tampilan di Dashboard
    const saldoEl = document.getElementById('dash-saldo');
    if (saldoEl) {
        // Format saldo ke mata uang (Contoh: Rp 1.500.000)
        saldoEl.textContent = formatCurrency(currentData.balance);
    }
    // Tambahkan logika lain untuk update dash-budget, dash-dream-progress, dll.
}

// ======================================================
// 2. Fungsi Navigasi dan Modal (Dipanggil oleh onclick)
// ======================================================

/**
 * Mengganti tampilan halaman (dashboard, history, analysis, settings, dll.)
 * Dipanggil oleh tombol navigasi di HTML.
 * @param {string} pageId - ID dari halaman yang ingin ditampilkan (e.g., 'page-history').
 */
function navigateTo(pageId) {
    console.log('Navigasi ke:', pageId);
    // Sembunyikan semua halaman
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none'; // Sembunyikan untuk mencegah overlay aneh
    });

    // Tampilkan halaman yang diminta
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        targetPage.style.display = 'block'; // Tampilkan kembali
    }
    
    // Panggil fungsi render khusus jika perlu
    if (pageId === 'page-history') renderHistoryPage();
    if (pageId === 'page-analysis') renderAnalysisPage();
}


/**
 * Menampilkan modal.
 * @param {string} modalId - ID dari modal yang ingin ditampilkan (e.g., 'modal-add-tx').
 */
function showModal(modalId) {
    console.log('Menampilkan Modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Menyembunyikan modal.
 * @param {string} modalId - ID dari modal yang ingin disembunyikan.
 */
function hideModal(modalId) {
    console.log('Menyembunyikan Modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// ======================================================
// 3. Fungsi Logika Aplikasi (Dipanggil oleh onclick)
// ======================================================

function switchTxType(type) {
    console.log('Mengubah tipe transaksi ke:', type);
    // Tambahkan logika untuk mengganti tab styling dan opsi kategori
}

function saveTransaction() {
    console.log('Fungsi Simpan Transaksi dipanggil.');
    // Ambil nilai dari input (form-tx-nominal, form-tx-kategori, dll.)
    // Update currentData.balance dan currentData.transactions
    // Panggil saveData()
    hideModal('modal-add-tx');
}

function saveDream() {
    console.log('Fungsi Simpan Impian dipanggil.');
    // Ambil nilai dari input form-dream-title, form-dream-target, dll.
    // Update currentData.dream
    // Panggil saveData()
    hideModal('modal-edit-dream');
}

// Fungsi Pengaturan
function saveSettingsLimit() { console.log('Fungsi Simpan Limit dipanggil.'); saveData(); }
function addCategory() { console.log('Fungsi Tambah Kategori dipanggil.'); saveData(); }
function saveSettingsMotivasi() { console.log('Fungsi Simpan Motivasi dipanggil.'); saveData(); }
function saveSettingsNotifikasi() { console.log('Fungsi Simpan Notifikasi dipanggil.'); saveData(); }

function resetApp() {
    console.warn('RESET DATA APLIKASI PERMANEN DILAKUKAN!');
    localStorage.removeItem('fokusMasaDepanData');
    window.location.reload(); // Muat ulang aplikasi ke keadaan awal
}

// Fungsi Render Halaman
function renderHistoryPage() { console.log('Merender Halaman Histori.'); }
function renderAnalysisPage() { console.log('Merender Halaman Analisis.'); }

// Fungsi Pembantu
function formatCurrency(amount) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount);
}
