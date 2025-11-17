/**
 * 💡 Penjelasan Logika JavaScript:
 * 1. Modal: Menggunakan setTimeout saat menutup untuk memastikan animasi 
 * transisi (transform) modal selesai sebelum overlay menghilang (opacity 0).
 * 2. Toast: Menggunakan setTimeout untuk menghilangkan kelas 'show' setelah beberapa detik.
 */

// Mendapatkan elemen DOM
const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('bottom-sheet');
const toastElement = document.getElementById('toast');

// Fungsi untuk membuka modal
function openModal() {
    // 1. Tampilkan Overlay (menggunakan opacity dan visibility)
    modalOverlay.classList.add('active');
    
    // 2. Tampilkan Modal Content (memicu transform Y: 100% -> 0)
    // Berikan sedikit jeda (misal 10ms) untuk memastikan overlay sudah aktif
    setTimeout(() => {
        modalContent.classList.add('open');
    }, 10); 
}

// Fungsi untuk menutup modal
function closeModal() {
    // 1. Hilangkan Modal Content (memicu transform Y: 0 -> 100%)
    modalContent.classList.remove('open');
    
    // 2. Hilangkan Overlay (tunggu animasi transform selesai, baru hilangkan overlay)
    // Waktu tunggu harus sama atau sedikit lebih lama dari durasi transisi CSS (0.3s)
    const transitionDuration = 300; // 300ms
    
    setTimeout(() => {
        modalOverlay.classList.remove('active');
    }, transitionDuration);
}

// Fungsi untuk menampilkan Toast
function showToast(message) {
    if (!message) return;

    // 1. Masukkan pesan
    toastElement.textContent = message;

    // 2. Tampilkan Toast (tambahkan kelas 'show')
    toastElement.classList.add('show');

    // 3. Sembunyikan Toast secara otomatis setelah 3 detik
    setTimeout(function(){ 
        toastElement.classList.remove('show'); 
        
        // Opsional: Hapus konten setelah menghilang (jeda 0.3s transisi)
        setTimeout(() => {
             toastElement.textContent = '';
        }, 300);
        
    }, 3000); // Tampil selama 3 detik (3000ms)
}
