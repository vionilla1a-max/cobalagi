// --- Inisialisasi Aplikasi ---
     
// Kunci untuk localStorage
const APP_KEY = 'fokusMasaDepanDB';

// --- Fungsi Helper (Utility) ---

// #PERBAIKAN 1: Fungsi Tanggal yang Lebih Robust
function getISODate(date) {
    // Mengembalikan format YYYY-MM-DD
    // Pastikan date adalah objek Date yang valid
    if (!(date instanceof Date) || isNaN(date)) {
        date = new Date();
    }
    // Menggunakan Intl.DateTimeFormat (Modern & Lebih Aman)
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
}

// Fungsi BARU untuk data default yang KOSONG
function getDefaultDB() {
    return {
        saldo: 0,
        dream: {
            title: 'Atur Impian Anda!',
            targetAmount: 0,
            targetDate: getISODate(new Date())
        },
        settings: {
            limitBulanan: 0, // Diubah menjadi 0
            motivasi: {
                kuning: 'Hati-hati, pengeluaranmu banyak!',
                merah: 'STOP! Kamu sudah boros!'
            },
            kategori: [
                '🍔 Makanan',
                '🚌 Transportasi',
                '💡 Tagihan',
                '🏠 Sewa/Cicilan',
                '🎬 Hiburan',
                '👕 Belanja',
                'Lainnya'
            ],
            notifikasi: {
                aktif: false,
                waktu: '09:00'
            }
        },
        transactions: [] // { id, type: 'pemasukan'/'pengeluaran', amount, category, note, date }
    };
}

// State global aplikasi (Database)
let db = getDefaultDB();

// Variabel state sementara
let currentTxType = 'pengeluaran'; 
let myAnalysisChart = null; // Instance untuk Chart.js

// --- Event Listener Utama ---
document.addEventListener('DOMContentLoaded', () => {
    loadDB();
    renderDashboard();
    populateCategorySelects();
    navigateTo('page-dashboard'); // Mulai dari dashboard
    
    // Set tanggal di form transaksi ke hari ini
    const txDateInput = document.getElementById('form-tx-tanggal');
    if (txDateInput) {
        txDateInput.value = getISODate(new Date());
    }
});

// --- Manajemen Database (localStorage) ---

function loadDB() {
    const data = localStorage.getItem(APP_KEY);
    if (data) {
        try {
            db = JSON.parse(data);
            // Migrasi data lama jika ada penambahan properti baru (Penting!)
            // Gunakan spread operator untuk migrasi yang lebih aman
            const defaultDB = getDefaultDB();
            db.dream = { ...defaultDB.dream, ...db.dream };
            db.settings = { ...defaultDB.settings, ...db.settings };
            db.settings.motivasi = { ...defaultDB.settings.motivasi, ...(db.settings.motivasi || {}) };
            db.settings.notifikasi = { ...defaultDB.settings.notifikasi, ...(db.settings.notifikasi || {}) };
            
        } catch (e) {
            console.error("Gagal memparsing data dari localStorage:", e);
            db = getDefaultDB(); // Reset jika data rusak
            showToast("Data rusak, aplikasi direset.", 'error');
            saveDB();
        }
    } else {
        db = getDefaultDB(); 
        saveDB(); 
    }
}

function saveDB() {
    try {
        localStorage.setItem(APP_KEY, JSON.stringify(db));
    } catch (error) {
        console.error("Gagal menyimpan ke localStorage:", error);
        showToast("Gagal menyimpan data. Mungkin penyimpanan penuh.", 'error');
    }
}

// --- Navigasi Halaman & Modal ---

// #PERBAIKAN 2: Pastikan Semua Fungsi Akses HTML Terdaftar di 'window'
window.navigateTo = function(pageId) {
    // Sembunyikan semua halaman
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Tampilkan halaman yang dituju
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
        
        // Panggil fungsi render spesifik
        if (pageId === 'page-dashboard') {
            renderDashboard();
        } else if (pageId === 'page-history') {
            renderHistoryPage();
        } else if (pageId === 'page-analysis') {
            renderAnalysisPage();
        } else if (pageId === 'page-settings-limit') {
            renderSettingsLimitPage();
        } else if (pageId === 'page-settings-kategori') {
            renderSettingsKategoriPage();
        } else if (pageId === 'page-settings-motivasi') {
            renderSettingsMotivasiPage();
        } else if (pageId === 'page-settings-notifikasi') {
            renderSettingsNotifikasiPage();
        } else if (pageId === 'page-settings') {
            // Jika halaman settings utama, tidak perlu render apa-apa
        }

    } else {
        console.error(`Halaman dengan ID "${pageId}" tidak ditemukan.`);
    }
}

window.showModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return; // Penjaga
    modal.classList.add('active');
        
    // Isi form modal dengan data yang ada
    if (modalId === 'modal-edit-dream') {
        const titleEl = document.getElementById('form-dream-title');
        const targetEl = document.getElementById('form-dream-target');
        const dateEl = document.getElementById('form-dream-date');
        
        if (titleEl) titleEl.value = db.dream.title;
        if (targetEl) targetEl.value = db.dream.targetAmount;
        if (dateEl) dateEl.value = db.dream.targetDate;
        
    } else if (modalId === 'modal-add-tx') {
        // Reset form
        const nominalEl = document.getElementById('form-tx-nominal');
        const alasanEl = document.getElementById('form-tx-alasan');
        const tanggalEl = document.getElementById('form-tx-tanggal');
        
        if (nominalEl) nominalEl.value = '';
        if (alasanEl) alasanEl.value = '';
        if (tanggalEl) tanggalEl.value = getISODate(new Date());
        
        switchTxType('pengeluaran'); // Default ke pengeluaran
    }
}

window.hideModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// --- ALUR 1: Tambah Transaksi ---

window.switchTxType = function(type) {
    currentTxType = type;
    const tabPengeluaran = document.getElementById('tab-pengeluaran');
    const tabPemasukan = document.getElementById('tab-pemasukan');
    const kategoriGroup = document.getElementById('form-tx-kategori-group');
    
    // Penjaga
    if (!tabPengeluaran || !tabPemasukan || !kategoriGroup) return; 

    if (type === 'pengeluaran') {
        tabPengeluaran.className = 'flex-1 py-2 text-center font-semibold border-b-2 border-primary text-primary';
        tabPemasukan.className = 'flex-1 py-2 text-center font-semibold text-gray-500';
        kategoriGroup.style.display = 'block';
    } else {
        tabPemasukan.className = 'flex-1 py-2 text-center font-semibold border-b-2 border-primary text-primary';
        tabPengeluaran.className = 'flex-1 py-2 text-center font-semibold text-gray-500';
        kategoriGroup.style.display = 'none'; // Sembunyikan kategori untuk pemasukan
    }
}

window.saveTransaction = function() {
    // 1. Ambil data dari form
    const nominalEl = document.getElementById('form-tx-nominal');
    const kategoriEl = document.getElementById('form-tx-kategori');
    const alasanEl = document.getElementById('form-tx-alasan');
    const tanggalEl = document.getElementById('form-tx-tanggal');

    // Penjaga
    if (!nominalEl || !kategoriEl || !alasanEl || !tanggalEl) return showToast("Error DOM, Form tidak lengkap.", 'error');

    const amount = parseFloat(nominalEl.value);
    const category = (currentTxType === 'pengeluaran') ? kategoriEl.value : 'Pemasukan';
    const note = alasanEl.value;
    const date = tanggalEl.value;

    // 2. Validasi
    if (!amount || amount <= 0) {
        return showToast("Nominal harus diisi dan lebih dari 0", 'error');
    }
    if (!date) {
        return showToast("Tanggal harus diisi", 'error');
    }

    // 3. Buat objek transaksi
    const newTx = {
        id: Date.now().toString(),
        type: currentTxType,
        amount: amount,
        category: category,
        note: note.trim(), // Trim note
        date: date
    };

    // 4. Update database
    db.transactions.push(newTx);
    if (currentTxType === 'pengeluaran') {
        db.saldo -= amount;
    } else {
        db.saldo += amount;
    }
    
    // 5. Simpan & update UI
    saveDB();
    hideModal('modal-add-tx');
    showToast("Transaksi berhasil disimpan!", 'success');
    
    // Render ulang dashboard
    renderDashboard();
}

// --- ALUR 2: Halaman Histori ---

window.renderHistoryPage = function() {
    const filterEl = document.getElementById('history-filter-time');
    const listEl = document.getElementById('history-full-list');
    const totalInEl = document.getElementById('hist-total-in');
    const totalOutEl = document.getElementById('hist-total-out');

    if (!filterEl || !listEl || !totalInEl || !totalOutEl) return; // Penjaga

    const filter = filterEl.value;
    const filteredTx = filterTransactions(db.transactions, filter);
    
    let totalIn = 0;
    let totalOut = 0;
    let html = '';

    // Urutkan kronologis (terbaru di atas)
    filteredTx.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredTx.length === 0) {
        listEl.innerHTML = '<p class="text-center text-gray-500 py-8">Tidak ada transaksi untuk periode ini.</p>';
    } else {
        filteredTx.forEach(tx => {
            let amountHtml = '';
            const noteOrDate = tx.note || formatDate(tx.date);
            const secondaryDate = (tx.note) ? formatDate(tx.date) : '';

            if (tx.type === 'pemasukan') {
                totalIn += tx.amount;
                amountHtml = `<span class="font-bold text-success">+${formatRupiah(tx.amount)}</span>`;
            } else {
                totalOut += tx.amount;
                amountHtml = `<span class="font-bold text-danger">-${formatRupiah(tx.amount)}</span>`;
            }
            
            html += `
                <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-2">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-semibold text-gray-800">${tx.category}</p>
                            <p class="text-sm text-gray-500">${noteOrDate}</p>
                        </div>
                        <div class="text-right">
                            ${amountHtml}
                            <p class="text-xs text-gray-400">${secondaryDate}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        listEl.innerHTML = html;
    }
    
    // Update Ringkasan
    totalInEl.textContent = formatRupiah(totalIn);
    totalOutEl.textContent = formatRupiah(totalOut);
}


// --- ALUR 3: Halaman Analisis ---

window.renderAnalysisPage = function() {
    const filterEl = document.getElementById('analysis-filter-time');
    const limitEl = document.getElementById('analysis-limit');
    const terpakaiEl = document.getElementById('analysis-terpakai');
    const sisaEl = document.getElementById('analysis-sisa');
    const chartEl = document.getElementById('analysis-chart');

    if (!filterEl || !limitEl || !terpakaiEl || !sisaEl || !chartEl) return; // Penjaga

    const filter = filterEl.value;
    // Filter hanya pengeluaran
    const allPengeluaran = db.transactions.filter(tx => tx.type === 'pengeluaran');
    const filteredTx = filterTransactions(allPengeluaran, filter);

    // 1. Ringkasan Budget
    const limit = db.settings.limitBulanan; // Asumsi limit bulanan
    const terpakai = filteredTx.reduce((sum, tx) => sum + tx.amount, 0);
    const sisa = limit - terpakai;
    
    limitEl.textContent = formatRupiah(limit);
    terpakaiEl.textContent = formatRupiah(terpakai);
    sisaEl.textContent = formatRupiah(sisa);

    // 2. Visualisasi Data (Chart)
    const spendingByCategory = filteredTx.reduce((acc, tx) => {
        if (!acc[tx.category]) {
            acc[tx.category] = 0;
        }
        acc[tx.category] += tx.amount;
        return acc;
    }, {});

    const labels = Object.keys(spendingByCategory);
    const data = Object.values(spendingByCategory);

    const ctx = chartEl.getContext('2d');
    
    // Hancurkan chart lama jika ada, untuk mencegah overlay
    if (myAnalysisChart) {
        myAnalysisChart.destroy();
    }

    if (labels.length > 0) {
        myAnalysisChart = new Chart(ctx, {
            type: 'pie', 
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pengeluaran per Kategori',
                    data: data,
                    backgroundColor: [ 
                        '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6',
                        '#ec4899', '#f97316', '#06b6d4', '#14b8a6', '#65a30d',
                        '#64748b', '#a855f7' // Tambah warna
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 10 }
                        }
                    }
                }
            }
        });
    } else {
        // Tampilkan pesan jika tidak ada data
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#9ca3af';
        ctx.font = '16px Inter';
        ctx.fillText('Tidak ada data pengeluaran', ctx.canvas.width / 2, ctx.canvas.height / 2);
    }
}

// --- ALUR 4: Halaman Pengaturan ---

function renderSettingsLimitPage() {
    const limitEl = document.getElementById('setting-limit-bulanan');
    if (limitEl) { // Penjaga
        limitEl.value = db.settings.limitBulanan;
    }
}

window.saveSettingsLimit = function() {
    const limitEl = document.getElementById('setting-limit-bulanan');
    if (!limitEl) return; // Penjaga
    
    const limit = parseFloat(limitEl.value);
    if (!isNaN(limit) && limit >= 0) { 
        db.settings.limitBulanan = limit;
        saveDB();
        showToast("Limit berhasil disimpan!", 'success');
        navigateTo('page-settings');
    } else {
        showToast("Limit tidak valid", 'error');
    }
}

function renderSettingsKategoriPage() {
    const listEl = document.getElementById('settings-kategori-list');
    if (!listEl) return; // Penjaga
    
    listEl.innerHTML = ''; // Kosongkan list
    db.settings.kategori.forEach((kategori, index) => {
        listEl.innerHTML += `
            <div class="flex justify-between items-center p-3 bg-gray-100 rounded-lg mb-2">
                <span class="text-gray-800">${kategori}</span>
                <button onclick="deleteCategory(${index})" class="text-red-500 hover:text-red-700 font-medium">Hapus</button>
            </div>
        `;
    });
}

window.addCategory = function() {
    const inputEl = document.getElementById('setting-kategori-baru');
    if (!inputEl) return; // Penjaga
    
    const newKategori = inputEl.value.trim();
    if (newKategori) {
        // Cek duplikat
        if (db.settings.kategori.includes(newKategori)) {
            return showToast("Kategori sudah ada!", 'error');
        }
        
        db.settings.kategori.push(newKategori);
        saveDB();
        renderSettingsKategoriPage(); // Render ulang list
        populateCategorySelects(); // Update juga dropdown di form
        inputEl.value = ''; // Kosongkan input
        showToast("Kategori ditambahkan!", 'success');
    }
}

window.deleteCategory = function(index) {
    if (index < 0 || index >= db.settings.kategori.length) return; // Penjaga
    
    // Cegah penghapusan jika hanya ada 1 kategori tersisa (opsional)
    if (db.settings.kategori.length <= 1) {
        return showToast("Minimal harus ada satu kategori.", 'error');
    }
    
    const kategori = db.settings.kategori[index];
    
    db.settings.kategori.splice(index, 1);
    saveDB();
    renderSettingsKategoriPage(); // Render ulang list
    populateCategorySelects(); // Update juga dropdown di form
    showToast(`Kategori "${kategori}" dihapus.`, 'default'); // Ubah ke default/success
}

function renderSettingsMotivasiPage() {
    const kuningEl = document.getElementById('setting-motivasi-kuning');
    const merahEl = document.getElementById('setting-motivasi-merah');
    if (kuningEl) kuningEl.value = db.settings.motivasi.kuning;
    if (merahEl) merahEl.value = db.settings.motivasi.merah;
}

window.saveSettingsMotivasi = function() {
    const kuningEl = document.getElementById('setting-motivasi-kuning');
    const merahEl = document.getElementById('setting-motivasi-merah');
    
    if (!kuningEl || !merahEl) return; // Penjaga
    
    db.settings.motivasi.kuning = kuningEl.value.trim();
    db.settings.motivasi.merah = merahEl.value.trim();
    saveDB();
    showToast("Motivasi berhasil disimpan!", 'success');
    navigateTo('page-settings');
}

function renderSettingsNotifikasiPage() {
    const aktifEl = document.getElementById('setting-notif-aktif');
    const waktuEl = document.getElementById('setting-notif-waktu');
    if (aktifEl) aktifEl.checked = db.settings.notifikasi.aktif;
    if (waktuEl) waktuEl.value = db.settings.notifikasi.waktu;
}

window.saveSettingsNotifikasi = function() {
    const aktifEl = document.getElementById('setting-notif-aktif');
    const waktuEl = document.getElementById('setting-notif-waktu');

    if (!aktifEl || !waktuEl) return; // Penjaga

    db.settings.notifikasi.aktif = aktifEl.checked;
    db.settings.notifikasi.waktu = waktuEl.value;
    saveDB();
    showToast("Pengaturan notifikasi disimpan!", 'success');
    navigateTo('page-settings');
}

// --- FUNGSI RESET APLIKASI ---
window.resetApp = function() {
    // 1. Sembunyikan modal konfirmasi
    hideModal('modal-confirm-reset');
    
    // 2. Hapus data dari localStorage
    localStorage.removeItem(APP_KEY);
    
    // 3. Tampilkan toast (opsional, tapi bagus untuk UX)
    showToast("Data berhasil direset. Memuat ulang...", 'success');
    
    // 4. Muat ulang aplikasi setelah 1 detik agar toast terlihat
    setTimeout(() => {
        location.reload();
    }, 1000);
}


// --- ALUR 5: Ubah Impian ---

window.saveDream = function() {
    // 1. Ambil data
    const titleEl = document.getElementById('form-dream-title');
    const targetEl = document.getElementById('form-dream-target');
    const dateEl = document.getElementById('form-dream-date');

    if (!titleEl || !targetEl || !dateEl) return showToast("Error DOM, Form Impian tidak lengkap.", 'error');

    const title = titleEl.value.trim();
    const targetAmount = parseFloat(targetEl.value);
    const targetDate = dateEl.value;

    // 2. Validasi
    if (!title || !targetAmount || isNaN(targetAmount) || targetAmount < 0 || !targetDate) {
        return showToast("Semua field impian harus diisi, dan target nominal harus angka valid (>=0)", 'error');
    }

    // 3. Update database
    db.dream.title = title;
    db.dream.targetAmount = targetAmount;
    db.dream.targetDate = targetDate;
    
    // 4. Simpan & update UI
    saveDB();
    hideModal('modal-edit-dream');
    showToast("Impian berhasil disimpan!", 'success');
    
    // Render ulang dashboard untuk update kartu impian
    renderDashboard();
}


// --- Fungsi Render Utama ---

function renderDashboard() {
    const dashSaldoEl = document.getElementById('dash-saldo');
    const dashDreamTitleEl = document.getElementById('dash-dream-title');
    const dashDreamTargetAmountEl = document.getElementById('dash-dream-target-amount');
    const dashDreamTargetDateEl = document.getElementById('dash-dream-target-date');
    const dashDreamProgressEl = document.getElementById('dash-dream-progress');
    const dashDreamProgressPercentEl = document.getElementById('dash-dream-progress-percent');
    const dashBudgetLimitEl = document.getElementById('dash-budget-limit');
    const dashBudgetSisaEl = document.getElementById('dash-budget-sisa');
    const indicatorEl = document.getElementById('dash-budget-indicator');
    const warningEl = document.getElementById('dash-budget-warning');
    const listEl = document.getElementById('dash-history-list');

    // Penjaga (Jika DOM belum lengkap, keluar)
    if (!dashSaldoEl || !dashDreamTitleEl || !dashBudgetLimitEl) return; 

    // 1. Render Saldo
    dashSaldoEl.textContent = formatRupiah(db.saldo);
    
    // 2. Render Impian
    const { title, targetAmount, targetDate } = db.dream;
    const progress = (targetAmount > 0) ? (db.saldo / targetAmount) * 100 : 0; // Cegah dibagi 0
    const progressPercent = Math.min(Math.max(progress, 0), 100); // Batasi 0-100%
    
    if (dashDreamTitleEl) dashDreamTitleEl.textContent = title;
    if (dashDreamTargetAmountEl) dashDreamTargetAmountEl.textContent = formatRupiah(targetAmount);
    if (dashDreamTargetDateEl) dashDreamTargetDateEl.textContent = formatDate(targetDate, { month: 'short', year: 'numeric' });
    if (dashDreamProgressEl) dashDreamProgressEl.style.width = `${progressPercent}%`;
    if (dashDreamProgressPercentEl) dashDreamProgressPercentEl.textContent = `${progressPercent.toFixed(1)}%`;
    
    // 3. Render Budget
    const limit = db.settings.limitBulanan;
    // Hitung pengeluaran bulan ini
    const pengeluaranBulanIni = filterTransactions(
        db.transactions.filter(tx => tx.type === 'pengeluaran'),
        'month'
    ).reduce((sum, tx) => sum + tx.amount, 0);
    
    const sisa = limit - pengeluaranBulanIni;
    const sisaPercent = (limit > 0) ? (sisa / limit) * 100 : 0; // Cegah dibagi 0
    
    if (dashBudgetLimitEl) dashBudgetLimitEl.textContent = formatRupiah(limit);
    if (dashBudgetSisaEl) dashBudgetSisaEl.textContent = formatRupiah(sisa);
    
    if (indicatorEl && warningEl) {
        if (limit === 0) { // Jika budget 0, jangan tampilkan indikator
            indicatorEl.className = 'px-3 py-1 rounded-full text-sm font-semibold text-white bg-gray-400';
            indicatorEl.textContent = '...';
            warningEl.textContent = 'Atur limit budget Anda di Pengaturan.';
        } else if (sisaPercent > 40) { // Hijau
            indicatorEl.className = 'px-3 py-1 rounded-full text-sm font-semibold text-white bg-success';
            indicatorEl.textContent = 'Aman';
            warningEl.textContent = '';
        } else if (sisaPercent > 10) { // Kuning
            indicatorEl.className = 'px-3 py-1 rounded-full text-sm font-semibold text-white bg-warning';
            indicatorEl.textContent = 'Hati-hati';
            warningEl.textContent = db.settings.motivasi.kuning;
        } else { // Merah
            indicatorEl.className = 'px-3 py-1 rounded-full text-sm font-semibold text-white bg-danger';
            indicatorEl.textContent = 'Bahaya';
            warningEl.textContent = db.settings.motivasi.merah;
        }
    }
    
    // 4. Render Histori Singkat
    if (listEl) { // Penjaga
        const recentTx = [...db.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5); // Ambil 5 terbaru
        
        if (recentTx.length === 0) {
            listEl.innerHTML = '<p class="text-center text-gray-500 py-4">Belum ada transaksi.</p>';
        } else {
            let html = '';
            recentTx.forEach(tx => {
                const amountHtml = tx.type === 'pemasukan'
                    ? `<span class="font-bold text-success">+${formatRupiah(tx.amount)}</span>`
                    : `<span class="font-bold text-danger">-${formatRupiah(tx.amount)}</span>`;
                    
                html += `
                    <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-2">
                        <div>
                            <p class="font-semibold text-gray-800">${tx.category}</p>
                            <p class="text-sm text-gray-500">${formatDate(tx.date)}</p>
                        </div>
                        ${amountHtml}
                    </div>
                `;
            });
            listEl.innerHTML = html;
        }
    }
}

// --- Fungsi Helper (Utility) ---

function formatRupiah(number) {
    if (isNaN(number) || number === null || number === undefined) number = 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}

function formatDate(dateString, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
    try {
        // #PERBAIKAN 3: Penanganan Timezone
        // Membuat objek Date dengan offset 00:00:00 untuk menghindari masalah timezone
        const date = new Date(dateString + 'T00:00:00'); 
        return new Intl.DateTimeFormat('id-ID', options).format(date);
    } catch (e) {
        return dateString;
    }
}

function populateCategorySelects() {
    const selectEl = document.getElementById('form-tx-kategori');
    if (!selectEl) return; 
    selectEl.innerHTML = ''; // Kosongkan
    db.settings.kategori.forEach(kategori => {
        const option = document.createElement('option');
        option.value = kategori;
        option.textContent = kategori;
        selectEl.appendChild(option);
    });
}

function filterTransactions(transactions, filter) {
    const now = new Date();
    const today = getISODate(now); 
    
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const dayOfWeek = now.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu

    // Awal minggu ini (Minggu)
    // Menggunakan T00:00:00 untuk konsistensi tanggal
    const firstDayOfWeek = new Date(year, month, day - dayOfWeek);
    const startOfWeek = getISODate(firstDayOfWeek);
    
    // Awal bulan ini
    const startOfMonth = getISODate(new Date(year, month, 1));
    
    // Awal tahun ini
    const startOfYear = getISODate(new Date(year, 0, 1));
    
    // Filter
    return transactions.filter(tx => {
        switch (filter) {
            case 'today':
                return tx.date === today;
            case 'week':
                // Perbandingan string YYYY-MM-DD bekerja dengan baik untuk tanggal
                return tx.date >= startOfWeek && tx.date <= today;
            case 'month':
                return tx.date >= startOfMonth && tx.date <= today;
            case 'year':
                return tx.date >= startOfYear && tx.date <= today;
            case 'all':
            default:
                return true;
        }
    });
}

function showToast(message, type = 'default') {
    const toast = document.getElementById('toast');
    if (!toast) return; // Penjaga
    toast.textContent = message;
    
    // Atur warna berdasarkan tipe
    if (type === 'success') {
        toast.style.backgroundColor = '#22c55e'; // green-500
    } else if (type === 'error') {
        toast.style.backgroundColor = '#ef4444'; // red-500
    } else {
        toast.style.backgroundColor = '#333';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000); // Sembunyikan setelah 3 detik
}
