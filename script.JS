// --- Inisialisasi Aplikasi ---
     
// Kunci untuk localStorage
const APP_KEY = 'fokusMasaDepanDB';

// --- Fungsi Helper (Utility) ---

/**
 * Mengubah objek Date atau string tanggal menjadi format YYYY-MM-DD (ISO Date String).
 * @param {Date | string} date - Objek Date atau string yang valid.
 * @returns {string} Tanggal dalam format YYYY-MM-DD.
 */
function getISODate(date) {
    if (typeof date === 'string') {
        // Coba konversi string menjadi objek Date
        const dateObject = new Date(date + 'T00:00:00'); 
        if (!isNaN(dateObject)) {
            date = dateObject;
        } else {
            date = new Date(); // Fallback jika string tidak valid
        }
    } else if (!(date instanceof Date) || isNaN(date)) {
        date = new Date();
    }
    
    // Menggunakan UTC methods untuk menghindari masalah timezone lokal
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
            limitBulanan: 0, 
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

/**
 * Memuat data dari localStorage. Melakukan migrasi data lama dengan default baru secara aman.
 */
function loadDB() {
    const data = localStorage.getItem(APP_KEY);
    const defaultDB = getDefaultDB();

    if (data) {
        try {
            const parsedData = JSON.parse(data);
            
            // #PERBAIKAN 1: Migrasi data dengan Deep Merge yang Aman
            // Pastikan properti top-level ada, lalu gabungkan objek bertingkat
            db.saldo = parsedData.saldo !== undefined ? parsedData.saldo : defaultDB.saldo;
            db.transactions = Array.isArray(parsedData.transactions) ? parsedData.transactions : defaultDB.transactions;

            // Gabungkan objek bertingkat (deep merge)
            db.dream = { ...defaultDB.dream, ...(parsedData.dream || {}) };
            
            db.settings = { ...defaultDB.settings, ...(parsedData.settings || {}) };
            
            // Gabungkan objek settings bertingkat
            db.settings.motivasi = { 
                ...defaultDB.settings.motivasi, 
                ...(parsedData.settings?.motivasi || {}) 
            };
            db.settings.notifikasi = { 
                ...defaultDB.settings.notifikasi, 
                ...(parsedData.settings?.notifikasi || {}) 
            };
            // Pastikan kategori adalah array
            db.settings.kategori = Array.isArray(parsedData.settings?.kategori) && parsedData.settings.kategori.length > 0
                ? parsedData.settings.kategori
                : defaultDB.settings.kategori;

        } catch (e) {
            console.error("Gagal memparsing data dari localStorage:", e);
            db = defaultDB; // Reset jika data rusak
            showToast("Data rusak, aplikasi direset.", 'error');
            saveDB();
        }
    } else {
        db = defaultDB; 
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

// #PERBAIKAN 2: Pastikan Semua Fungsi Akses HTML Terdaftar di 'window' (Sudah Benar)
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
        
        // Panggil fungsi render spesifik (Perbaiki penamaan fungsi untuk konsistensi)
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
        }
    } else {
        console.error(`Halaman dengan ID "${pageId}" tidak ditemukan.`);
    }
}

window.showModal = function(modalId, txId = null) {
    const modal = document.getElementById(modalId);
    if (!modal) return; 
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
    
    } else if (modalId === 'modal-confirm-delete' && txId) {
        // #PERBAIKAN 5: Logic untuk Modal Konfirmasi Hapus
        const confirmButton = document.getElementById('confirm-delete-button');
        if (confirmButton) {
            confirmButton.onclick = () => deleteTransaction(txId);
        }
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
    // Jika berada di page history, render juga
    if (document.getElementById('page-history')?.classList.contains('active')) {
        renderHistoryPage();
    }
}

// #PERBAIKAN 4: Fungsi Hapus Transaksi
window.deleteTransaction = function(txId) {
    const index = db.transactions.findIndex(tx => tx.id === txId);

    if (index !== -1) {
        const txToDelete = db.transactions[index];
        
        // Sesuaikan saldo
        if (txToDelete.type === 'pengeluaran') {
            db.saldo += txToDelete.amount; // Tambahkan kembali uangnya
        } else {
            db.saldo -= txToDelete.amount; // Kurangi pemasukan
        }

        // Hapus transaksi dari array
        db.transactions.splice(index, 1);
        
        saveDB();
        hideModal('modal-confirm-delete');
        showToast("Transaksi berhasil dihapus!", 'default');
        
        // Render ulang halaman yang sedang aktif
        const activePageId = document.querySelector('.page.active')?.id;
        if (activePageId) navigateTo(activePageId);

    } else {
        showToast("Transaksi tidak ditemukan.", 'error');
    }
}

// --- ALUR 2: Halaman Histori ---

window.renderHistoryPage = function() {
    const filterEl = document.getElementById('history-filter-time');
    const listEl = document.getElementById('history-full-list');
    const totalInEl = document.getElementById('hist-total-in');
    const totalOutEl = document.getElementById('hist-total-out');

    if (!filterEl || !listEl || !totalInEl || !totalOutEl) return; 

    const filter = filterEl.value;
    const filteredTx = filterTransactions(db.transactions, filter);
    
    let totalIn = 0;
    let totalOut = 0;
    let html = '';

    // Urutkan kronologis (terbaru di atas)
    filteredTx.sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00')); // Konsisten dengan penanganan tanggal

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
                <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-2 flex justify-between items-center">
                    <div>
                        <p class="font-semibold text-gray-800">${tx.category}</p>
                        <p class="text-sm text-gray-500">${noteOrDate}</p>
                    </div>
                    <div class="text-right flex items-center gap-3">
                        ${amountHtml}
                        <button onclick="showModal('modal-confirm-delete', '${tx.id}')" class="text-gray-400 hover:text-danger ml-2 p-1">
                            <i class="fas fa-trash-alt"></i>
                        </button>
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

    if (!filterEl || !limitEl || !terpakaiEl || !sisaEl || !chartEl) return; 

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
    
    // Tampilkan sisa dengan warna
    if (sisa < 0) {
        sisaEl.className = 'font-bold text-danger';
        sisaEl.textContent = formatRupiah(sisa);
    } else {
        sisaEl.className = 'font-bold text-success';
        sisaEl.textContent = formatRupiah(sisa);
    }
    

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
        // ... (Kode Chart.js tetap sama)
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
                        '#64748b', '#a855f7' 
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
    if (limitEl) { 
        limitEl.value = db.settings.limitBulanan;
    }
}

window.saveSettingsLimit = function() {
    const limitEl = document.getElementById('setting-limit-bulanan');
    if (!limitEl) return; 
    
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
    if (!listEl) return; 
    
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
    if (!inputEl) return; 
    
    const newKategori = inputEl.value.trim();
    if (newKategori) {
        // Cek duplikat (Case-Insensitive)
        if (db.settings.kategori.map(k => k.toLowerCase()).includes(newKategori.toLowerCase())) {
            return showToast("Kategori sudah ada!", 'error');
        }
        
        db.settings.kategori.push(newKategori);
        saveDB();
        renderSettingsKategoriPage(); 
        populateCategorySelects(); 
        inputEl.value = ''; 
        showToast("Kategori ditambahkan!", 'success');
    }
}

window.deleteCategory = function(index) {
    if (index < 0 || index >= db.settings.kategori.length) return; 
    
    // Cegah penghapusan jika hanya ada 1 kategori tersisa
    if (db.settings.kategori.length <= 1) {
        return showToast("Minimal harus ada satu kategori.", 'error');
    }
    
    const kategori = db.settings.kategori[index];
    
    db.settings.kategori.splice(index, 1);
    saveDB();
    renderSettingsKategoriPage(); 
    populateCategorySelects(); 
    showToast(`Kategori "${kategori}" dihapus.`, 'default'); 
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
    
    if (!kuningEl || !merahEl) return; 
    
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

    if (!aktifEl || !waktuEl) return; 

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
    
    // Validasi Tanggal: Pastikan tanggal target tidak di masa lalu (opsional)
    const todayISO = getISODate(new Date());
    if (targetDate < todayISO) {
        // return showToast("Tanggal target tidak boleh di masa lalu.", 'error');
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
    // #PERBAIKAN 6: Menggunakan format Date yang lebih baik di Dashboard
    if (dashDreamTargetDateEl) dashDreamTargetDateEl.textContent = formatDate(targetDate, { day: 'numeric', month: 'short', year: 'numeric' });
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
        } else if (sisaPercent >= 40) { // Hijau (> 40% sisa)
            indicatorEl.className = 'px-3 py-1 rounded-full text-sm font-semibold text-white bg-success';
            indicatorEl.textContent = 'Aman';
            warningEl.textContent = '';
        } else if (sisaPercent > 10) { // Kuning (10% - 40% sisa)
            indicatorEl.className = 'px-3 py-1 rounded-full text-sm font-semibold text-white bg-warning';
            indicatorEl.textContent = 'Hati-hati';
            warningEl.textContent = db.settings.motivasi.kuning;
        } else { // Merah (<= 10% sisa atau sudah minus)
            indicatorEl.className = 'px-3 py-1 rounded-full text-sm font-semibold text-white bg-danger';
            indicatorEl.textContent = 'Bahaya';
            warningEl.textContent = db.settings.motivasi.merah;
        }
    }
    
    // 4. Render Histori Singkat
    if (listEl) { 
        // Menggunakan getISODate(new Date()) untuk mendapatkan 'today' secara konsisten
        const todayISO = getISODate(new Date()); 
        // Ambil transaksi hari ini dan urutkan (terbaru di atas)
        const recentTx = db.transactions
            .filter(tx => tx.date === todayISO)
            .sort((a, b) => new Date(b.id) - new Date(a.id)); // Urutkan berdasarkan ID (timestamp)

        
        if (recentTx.length === 0) {
            listEl.innerHTML = '<p class="text-center text-gray-500 py-4">Belum ada transaksi hari ini.</p>';
        } else {
            let html = '';
            // Hanya tampilkan 5 transaksi terbaru hari ini
            recentTx.slice(0, 5).forEach(tx => {
                const amountHtml = tx.type === 'pemasukan'
                    ? `<span class="font-bold text-success">+${formatRupiah(tx.amount)}</span>`
                    : `<span class="font-bold text-danger">-${formatRupiah(tx.amount)}</span>`;
                    
                const noteDisplay = tx.note.substring(0, 30) + (tx.note.length > 30 ? '...' : '');
                    
                html += `
                    <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm mb-2">
                        <div>
                            <p class="font-semibold text-gray-800">${tx.category}</p>
                            <p class="text-sm text-gray-500">${noteDisplay || 'Tanpa catatan'}</p>
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

/**
 * Mengubah string tanggal YYYY-MM-DD menjadi format yang lebih mudah dibaca.
 * @param {string} dateString - Tanggal dalam format YYYY-MM-DD.
 * @param {object} options - Opsi format Intl.DateTimeFormat.
 * @returns {string} Tanggal yang diformat.
 */
function formatDate(dateString, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
    try {
        // #PERBAIKAN 3: Penanganan Timezone
        // Membuat objek Date dengan offset 00:00:00 (UTC) agar konsisten 
        // dengan date string YYYY-MM-DD (menghindari pergeseran tanggal karena timezone lokal)
        const date = new Date(dateString + 'T00:00:00'); 
        return new Intl.DateTimeFormat('id-ID', options).format(date);
    } catch (e) {
        return dateString;
    }
}

function populateCategorySelects() {
    const selectEl = document.getElementById('form-tx-kategori');
    if (!selectEl) return; 
    selectEl.innerHTML = ''; 
    db.settings.kategori.forEach(kategori => {
        const option = document.createElement('option');
        option.value = kategori;
        option.textContent = kategori;
        selectEl.appendChild(option);
    });
}

function filterTransactions(transactions, filter) {
    const now = new Date();
    // #PERBAIKAN 7: Perbaikan Logika Filter Tanggal
    // Menggunakan Date Object untuk perbandingan agar lebih akurat
    const getTargetDate = (dateString) => new Date(dateString + 'T00:00:00'); 
    
    // Menghitung batas waktu
    const startOfToday = getTargetDate(getISODate(now));
    const startOfMonth = getTargetDate(getISODate(new Date(now.getFullYear(), now.getMonth(), 1)));
    const startOfYear = getTargetDate(getISODate(new Date(now.getFullYear(), 0, 1)));
    
    // Logika start of week: Hari pertama adalah Senin (1), bukan Minggu (0)
    // Disesuaikan untuk konvensi Indonesia/Asia Tenggara, jika Minggu diinginkan ganti (now.getDay())
    let dayOfWeek = now.getDay();
    dayOfWeek = (dayOfWeek === 0) ? 6 : dayOfWeek - 1; // Ubah Minggu (0) ke 6, Senin (1) ke 0, dst.
    const startOfWeek = getTargetDate(getISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)));

    
    // Filter
    return transactions.filter(tx => {
        const txDate = getTargetDate(tx.date); // Objek Date dari transaksi
        
        switch (filter) {
            case 'today':
                return txDate.getTime() === startOfToday.getTime();
            case 'week':
                return txDate >= startOfWeek && txDate <= startOfToday;
            case 'month':
                return txDate >= startOfMonth && txDate <= startOfToday;
            case 'year':
                return txDate >= startOfYear && txDate <= startOfToday;
            case 'all':
            default:
                return true;
        }
    });
}

// (Fungsi showToast tidak diubah, sudah benar)
function showToast(message, type = 'default') {
    const toast = document.getElementById('toast');
    if (!toast) return; 
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

// Tambahkan deklarasi untuk fungsi yang dipanggil dari HTML yang tidak memiliki 'window.'
window.deleteTransaction = window.deleteTransaction;
