import { onClick, getValue, setValue, onInput, hide, show } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
import { validatePhoneNumber } from "https://cdn.jsdelivr.net/gh/jscroot/validate@0.0.2/croot.js";
import { postJSON, getJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import { addCSSIn } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';
import { id, backend } from "/dashboard/jscroot/url/config.js";

export async function main() {
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css", id.content);
    onInput('phonenumber', validatePhoneNumber);
    
    // Tambahkan event listener untuk pemilih minggu
    document.getElementById('week-select').addEventListener('change', function() {
        fetchBimbinganWeeklyData();
    });
    
    // Aktifkan tombol submit jika ada nomor telepon
    document.getElementById('phonenumber').addEventListener('input', function() {
        document.getElementById('tombolmintaapproval').disabled = !this.value;
    });
    
    // Tambahkan event listener untuk tombol submit
    onClick("tombolmintaapproval", submitBimbinganRequest);
    
    // Inisialisasi dengan memuat semua minggu untuk mahasiswa ini
    loadAllWeeks();
}

// Fungsi untuk memuat semua minggu yang tersedia untuk mahasiswa ini
function loadAllWeeks() {
    console.log("Mengambil semua minggu dari:", backend.bimbingan.all);
    
    // Tampilkan indikator loading
    document.getElementById('loading-indicator').style.display = 'block';
    
    // PERBAIKAN: Pertama ambil status minggu saat ini 
    getJSON(
        backend.bimbingan.status, 
        'login',
        getCookie('login'),
        (statusData) => {
            console.log("Status minggu saat ini:", statusData);
            
            // Kemudian ambil data minggu untuk pengguna
            getJSON(
                backend.bimbingan.all,
                'login',
                getCookie('login'),
                (weeklyData) => {
                    handleAllWeeksResponseImproved(weeklyData, statusData);
                }
            );
        }
    );
}

// Fungsi baru untuk menangani respons semua minggu dengan status minggu saat ini
function handleAllWeeksResponseImproved(weeklyData, statusData) {
    console.log("Data semua minggu:", weeklyData);
    
    // Sembunyikan indikator loading
    document.getElementById('loading-indicator').style.display = 'none';
    
    const weekSelect = document.getElementById('week-select');
    weekSelect.innerHTML = ''; // Bersihkan opsi yang ada
    
    // Flag untuk menandai apakah minggu aktif ditemukan dalam data pengguna
    let currentWeekFound = false;
    
    if (weeklyData && Array.isArray(weeklyData) && weeklyData.length > 0) {
        // Urutkan minggu berdasarkan nomor minggu (ascending)
        weeklyData.sort((a, b) => a.weeknumber - b.weeknumber);
        
        // Isi dropdown dengan data minggu yang ada
        weeklyData.forEach(weekly => {
            const option = document.createElement('option');
            option.value = weekly.weeknumber;
            option.textContent = `Minggu ${weekly.weeknumber} (${weekly.weeklabel})`;
            weekSelect.appendChild(option);
            
            // Cek apakah minggu aktif ada dalam data pengguna
            if (statusData && weekly.weeknumber === statusData.currentweek) {
                currentWeekFound = true;
            }
        });
        
        // PERBAIKAN: Jika minggu aktif belum ada dalam data pengguna, tambahkan ke dropdown
        if (statusData && !currentWeekFound) {
            const option = document.createElement('option');
            option.value = statusData.currentweek;
            option.textContent = `Minggu ${statusData.currentweek} (${statusData.weeklabel})`;
            weekSelect.appendChild(option);
            
            // Inisialisasi data untuk minggu aktif
            initializeWeeklyData(statusData.currentweek);
        }
        
        // Pilih minggu aktif saat ini
        if (statusData) {
            weekSelect.value = statusData.currentweek;
        } else {
            // Jika tidak ada data status, pilih minggu terbaru
            const latestWeek = weeklyData[weeklyData.length - 1];
            weekSelect.value = latestWeek.weeknumber;
        }
    } else if (statusData) {
        // Jika tidak ada data minggu sama sekali, tambahkan minggu aktif saat ini
        const option = document.createElement('option');
        option.value = statusData.currentweek;
        option.textContent = `Minggu ${statusData.currentweek} (${statusData.weeklabel})`;
        weekSelect.appendChild(option);
        
        // Inisialisasi data untuk minggu aktif
        initializeWeeklyData(statusData.currentweek);
    } else {
        // Jika tidak ada data status atau data minggu, tambahkan minggu 1 sebagai default
        const option = document.createElement('option');
        option.value = "1";
        option.textContent = "Minggu 1 (week1)";
        weekSelect.appendChild(option);
    }
    
    // Muat data untuk minggu yang dipilih
    fetchBimbinganWeeklyData();
}

// Fungsi baru untuk menginisialisasi data minggu
function initializeWeeklyData(weekNumber) {
    // Buat API call untuk menginisialisasi data minggu
    fetch(`${backend.bimbingan.weekly}?week=${weekNumber}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'login': getCookie('login')
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log(`Data minggu ${weekNumber} berhasil diinisialisasi:`, data);
    })
    .catch(error => {
        console.error(`Error menginisialisasi data minggu ${weekNumber}:`, error);
    });
}

// Fungsi untuk menangani respons semua minggu (fungsi lama dipertahankan untuk kompatibilitas)
function handleAllWeeksResponse(result) {
    console.log("Data semua minggu:", result);
    
    // Sembunyikan indikator loading
    document.getElementById('loading-indicator').style.display = 'none';
    
    if (result && Array.isArray(result) && result.length > 0) {
        // Isi dropdown pemilih minggu dengan minggu-minggu yang tersedia
        const weekSelect = document.getElementById('week-select');
        weekSelect.innerHTML = ''; // Bersihkan opsi yang ada
        
        // Urutkan minggu berdasarkan nomor minggu (ascending)
        result.sort((a, b) => a.weeknumber - b.weeknumber);
        
        result.forEach(weekly => {
            const option = document.createElement('option');
            option.value = weekly.weeknumber;
            option.textContent = `Minggu ${weekly.weeknumber} (${weekly.weeklabel})`;
            weekSelect.appendChild(option);
        });
        
        // Pilih minggu terbaru
        const latestWeek = result[result.length - 1];
        weekSelect.value = latestWeek.weeknumber;
        
        // Muat data untuk minggu yang dipilih
        fetchBimbinganWeeklyData();
    } else {
        // Jika tidak ada data, ambil data minggu saat ini
        fetchCurrentWeekData();
    }
}

// Fungsi untuk mengambil data minggu saat ini ketika tidak ada minggu tersedia
function fetchCurrentWeekData() {
    console.log("Mengambil status minggu saat ini untuk mendapatkan minggu default");
    // Buat API call untuk mendapatkan status minggu saat ini
    getJSON(
        backend.bimbingan.status, // Endpoint untuk mendapatkan status minggu saat ini
        'login',
        getCookie('login'),
        (data) => {
            if (data && data.currentweek) {
                console.log("Berhasil mengambil data minggu saat ini:", data);
                
                // Tambahkan minggu saat ini ke dropdown
                const weekSelect = document.getElementById('week-select');
                weekSelect.innerHTML = ''; // Bersihkan opsi yang ada
                
                const option = document.createElement('option');
                option.value = data.currentweek;
                option.textContent = `Minggu ${data.currentweek} (${data.weeklabel})`;
                weekSelect.appendChild(option);
                
                // Lalu ambil data untuk minggu ini
                fetchBimbinganWeeklyData();
            } else {
                console.warn("Tidak ada data minggu saat ini, menggunakan minggu 1 sebagai fallback");
                // Sebagai jalan terakhir, tambahkan minggu 1 secara manual
                const weekSelect = document.getElementById('week-select');
                weekSelect.innerHTML = ''; // Bersihkan opsi yang ada
                
                const option = document.createElement('option');
                option.value = "1";
                option.textContent = "Minggu 1 (week1)";
                weekSelect.appendChild(option);
                
                // Coba ambil data untuk minggu 1
                fetchBimbinganWeeklyData();
                
                // Sembunyikan indikator loading jika masih ditampilkan
                document.getElementById('loading-indicator').style.display = 'none';
            }
        }
    );
}

// Fungsi untuk mengambil data bimbingan mingguan
function fetchBimbinganWeeklyData() {
    const weekSelect = document.getElementById('week-select');
    
    // Periksa apakah ada opsi dalam select
    if (weekSelect.options.length === 0) {
        console.warn("Tidak ada opsi minggu yang tersedia di dropdown");
        return;
    }
    
    const selectedWeek = weekSelect.value;
    
    // Tampilkan indikator loading
    document.getElementById('loading-indicator').style.display = 'block';
    
    // Log debug
    console.log(`Mengambil data untuk minggu ${selectedWeek} dari: ${backend.bimbingan.weekly}?week=${selectedWeek}`);
    
    // Ambil data dari API
    getJSON(
        `${backend.bimbingan.weekly}?week=${selectedWeek}`,
        'login',
        getCookie('login'),
        handleBimbinganWeeklyResponse
    );
}

// Fungsi untuk menangani respons API bimbingan mingguan
function handleBimbinganWeeklyResponse(result) {
    console.log("Respons data minggu:", result);
    
    // Sembunyikan indikator loading
    document.getElementById('loading-indicator').style.display = 'none';
    
    if (result) {
        // Perbarui label minggu
        const weekLabel = result.weeklabel || `week${result.weeknumber}`;
        document.getElementById('current-week-label').textContent = 
            `Minggu ${result.weeknumber} (${weekLabel})`;
        
        // Ekstrak data skor aktivitas dari respons
        let activityScore = null;
        
        // Cari skor aktivitas di berbagai lokasi yang mungkin
        if (result.activityscore) {
            console.log("Skor aktivitas ditemukan di level root");
            activityScore = result.activityscore;
        } else if (result.data && result.data.activityscore) {
            console.log("Skor aktivitas ditemukan di properti data");
            activityScore = result.data.activityscore;
        } else if (result.iq !== undefined || result.mbc !== undefined || result.tracker !== undefined) {
            // Beberapa implementasi mungkin memiliki kolom skor aktivitas langsung di objek root
            console.log("Menggunakan objek root sebagai skor aktivitas");
            activityScore = result;
        }
        
        // Perbarui tabel jika kita menemukan data skor aktivitas
        if (activityScore) {
            updateActivityScoreTable(activityScore);
        } else {
            console.warn("Tidak ditemukan data skor aktivitas dalam respons");
            resetActivityScoreTable();
        }
        
        // Perbarui status persetujuan
        updateApprovalStatus(result);
        
        // Jika disetujui, nonaktifkan tombol persetujuan
        document.getElementById('tombolmintaapproval').disabled = result.approved === true;
        
        // Jika kita sudah memiliki asesor, isi nomor telepon
        if (result.asesor && result.asesor.phonenumber) {
            setValue('phonenumber', result.asesor.phonenumber);
        }
    } else {
        console.warn("Tidak ada data yang diterima dari server atau terjadi kesalahan");
        // Tidak ditemukan data untuk minggu ini, tampilkan state awal
        resetActivityScoreTable();
        document.getElementById('approval-status').textContent = 'Belum ada bimbingan';
        document.getElementById('approval-status').className = 'tag is-warning';
        document.getElementById('tombolmintaapproval').disabled = false;
        
        // Ambil nomor minggu dari select
        const weekSelect = document.getElementById('week-select');
        if (weekSelect.options.length > 0) {
            const weekNumber = weekSelect.value;
            const option = weekSelect.options[weekSelect.selectedIndex];
            const label = option.textContent.split('(')[1]?.split(')')[0] || `week${weekNumber}`;
            
            document.getElementById('current-week-label').textContent = 
                `Minggu ${weekNumber} (${label})`;
        }
        
        // Sembunyikan elemen info asesor
        document.getElementById('asesor-info').style.display = 'none';
        document.getElementById('validasi-score').style.display = 'none';
        document.getElementById('asesor-comment').style.display = 'none';
    }
}

// Fungsi untuk memperbarui tabel skor aktivitas
function updateActivityScoreTable(activityScore) {
    console.log("Memperbarui tabel skor aktivitas dengan data:", activityScore);
    
    if (!activityScore) {
        console.warn("Data skor aktivitas null atau undefined");
        return;
    }
    
    // Hitung total skor
    let totalScore = 0;
    
    // Perbarui setiap baris dalam tabel
    updateTableRow(0, activityScore.sponsordata, activityScore.sponsor);
    updateTableRow(1, activityScore.stravakm, activityScore.strava);
    updateTableRow(2, activityScore.iqresult, activityScore.iq);
    updateTableRow(3, activityScore.pomokitsesi, activityScore.pomokit);
    updateTableRow(4, activityScore.mbc, activityScore.blockchain || activityScore.mbcPoints);
    updateTableRow(5, activityScore.rupiah, activityScore.qris || activityScore.qrisPoints);
    updateTableRow(6, activityScore.trackerdata, activityScore.tracker);
    updateTableRow(7, activityScore.gtmetrixresult, activityScore.gtmetrix);
    updateTableRow(8, activityScore.webhookpush, activityScore.webhook);
    updateTableRow(9, activityScore.presensihari, activityScore.presensi);
    updateTableRow(10, activityScore.rvn, activityScore.ravencoinPoints);
    
    // Jumlahkan semua nilai poin untuk total skor
    if (typeof activityScore.sponsor === 'number') totalScore += activityScore.sponsor;
    if (typeof activityScore.strava === 'number') totalScore += activityScore.strava;
    if (typeof activityScore.iq === 'number') totalScore += activityScore.iq;
    if (typeof activityScore.pomokit === 'number') totalScore += activityScore.pomokit;
    if (typeof activityScore.blockchain === 'number') totalScore += activityScore.blockchain;
    if (typeof activityScore.mbcPoints === 'number') totalScore += activityScore.mbcPoints;
    if (typeof activityScore.qris === 'number') totalScore += activityScore.qris;
    if (typeof activityScore.qrisPoints === 'number') totalScore += activityScore.qrisPoints;
    if (typeof activityScore.tracker === 'number') totalScore += activityScore.tracker;
    if (typeof activityScore.gtmetrix === 'number') totalScore += activityScore.gtmetrix;
    if (typeof activityScore.webhook === 'number') totalScore += activityScore.webhook;
    if (typeof activityScore.presensi === 'number') totalScore += activityScore.presensi;
    if (typeof activityScore.ravencoinPoints === 'number') totalScore += activityScore.ravencoinPoints;
    
    // Jika total skor tersedia langsung, gunakan itu
    if (typeof activityScore.total === 'number' || typeof activityScore.totalScore === 'number') {
        totalScore = activityScore.total || activityScore.totalScore;
    }
    
    // Perbarui total skor di footer tabel
    const totalScoreElement = document.getElementById('total-score');
    if (totalScoreElement) {
        totalScoreElement.textContent = totalScore.toFixed(2);
    }
}

// Fungsi untuk mereset tabel skor aktivitas ke nol
function resetActivityScoreTable() {
    console.log("Mereset tabel skor aktivitas");
    
    const tableRows = document.querySelectorAll('table.table tbody tr');
    tableRows.forEach(row => {
        const quantityCell = row.querySelector('td:nth-child(3)');
        const pointsCell = row.querySelector('td:nth-child(4)');
        
        if (quantityCell && pointsCell) {
            quantityCell.textContent = '0';
            pointsCell.textContent = '0';
        }
    });
    
    // Reset total skor
    const totalScoreElement = document.getElementById('total-score');
    if (totalScoreElement) {
        totalScoreElement.textContent = '0';
    }
}

// Fungsi untuk memperbarui satu baris tabel
function updateTableRow(rowIndex, quantity, points) {
    const tableRows = document.querySelectorAll('table.table tbody tr');
    
    if (rowIndex >= tableRows.length) {
        console.warn(`Indeks baris ${rowIndex} di luar batas`);
        return;
    }
    
    const row = tableRows[rowIndex]; // Ambil baris berdasarkan indeks
    
    if (row) {
        const quantityCell = row.querySelector('td:nth-child(3)');
        const pointsCell = row.querySelector('td:nth-child(4)');
        
        if (quantityCell && pointsCell) {
            // Format kuantitas dengan tepat
            if (quantity !== undefined && quantity !== null) {
                // Untuk angka floating point, tampilkan dengan presisi yang sesuai
                if (typeof quantity === 'number' && !Number.isInteger(quantity)) {
                    quantityCell.textContent = quantity.toFixed(4);
                } else {
                    quantityCell.textContent = quantity;
                }
            } else {
                quantityCell.textContent = '0';
            }
            
            // Format poin dengan tepat
            if (points !== undefined && points !== null) {
                // Untuk angka floating point, tampilkan dengan presisi yang sesuai
                if (typeof points === 'number' && !Number.isInteger(points)) {
                    pointsCell.textContent = points.toFixed(2);
                } else {
                    pointsCell.textContent = points;
                }
            } else {
                pointsCell.textContent = '0';
            }
        } else {
            console.warn(`Tidak dapat menemukan sel untuk baris ${rowIndex}`);
        }
    } else {
        console.warn(`Tidak dapat menemukan baris dengan indeks ${rowIndex}`);
    }
}

// Fungsi untuk memperbarui tampilan status persetujuan
function updateApprovalStatus(data) {
    console.log("Memperbarui status persetujuan dengan data:", data);
    
    const statusElement = document.getElementById('approval-status');
    const asesorInfo = document.getElementById('asesor-info');
    const validasiScore = document.getElementById('validasi-score');
    const asesorComment = document.getElementById('asesor-comment');
    
    // Reset tampilan
    asesorInfo.style.display = 'none';
    validasiScore.style.display = 'none';
    asesorComment.style.display = 'none';
    
    if (data.approved === true) {
        statusElement.textContent = 'Disetujui';
        statusElement.className = 'tag is-success';
        
        // Tampilkan informasi asesor jika tersedia
        if (data.asesor && data.asesor.name) {
            asesorInfo.textContent = 
                `Disetujui oleh: ${data.asesor.name} (${data.asesor.phonenumber})`;
            asesorInfo.style.display = 'block';
            
            // Tampilkan skor validasi jika tersedia
            if (data.validasi) {
                validasiScore.textContent = 
                    `Validasi: ${data.validasi}/5`;
                validasiScore.style.display = 'block';
            }
            
            // Tampilkan komentar jika tersedia
            if (data.komentar) {
                asesorComment.textContent = 
                    `Komentar: ${data.komentar}`;
                asesorComment.style.display = 'block';
            }
        }
    } else if (data.asesor && data.asesor.phonenumber) {
        statusElement.textContent = 'Menunggu Persetujuan';
        statusElement.className = 'tag is-warning';
        asesorInfo.textContent = 
            `Diajukan ke: ${data.asesor.name || data.asesor.phonenumber}`;
        asesorInfo.style.display = 'block';
    } else {
        statusElement.textContent = 'Belum Diajukan';
        statusElement.className = 'tag is-danger';
    }
}

// Fungsi untuk mengirimkan permintaan bimbingan
function submitBimbinganRequest() {
    const selectedWeek = document.getElementById('week-select').value;
    const asesorPhoneNumber = getValue('phonenumber');
    
    if (!asesorPhoneNumber) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Nomor telepon dosen asesor harus diisi!'
        });
        return;
    }
    
    // Siapkan body request
    const requestBody = {
        asesorPhoneNumber: asesorPhoneNumber,
        weekNumber: parseInt(selectedWeek)
    };
    
    console.log("Mengirim permintaan ke:", backend.bimbingan.request);
    console.log("Body request:", requestBody);
    
    // Tampilkan indikator loading
    Swal.fire({
        title: 'Mengirim permintaan...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Kirim permintaan
    postJSON(
        backend.bimbingan.request,
        'login',
        getCookie('login'),
        requestBody,
        handleBimbinganSubmitResponse
    );
}

// Fungsi untuk menangani respons submit bimbingan
function handleBimbinganSubmitResponse(result) {
    console.log("Respons submit:", result);
    
    // Tutup indikator loading
    Swal.close();
    
    if (result && result._id) {
        // Sukses
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Permintaan bimbingan berhasil dikirim!'
        }).then(() => {
            // Segarkan data
            fetchBimbinganWeeklyData();
        });
    } else if (result && result.status && result.status.startsWith("Info : ")) {
        // Pesan informasi
        Swal.fire({
            icon: 'info',
            title: 'Informasi',
            text: result.response || result.status
        });
    } else {
        // Error
        Swal.fire({
            icon: 'error',
            title: result.status || 'Error',
            text: result.response || 'Gagal mengirim permintaan bimbingan'
        });
    }
}