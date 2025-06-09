import { onClick, getValue, setValue } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
import { getJSON, postJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import { id, backend } from "/dashboard/jscroot/url/config.js";

// Load Html5Qrcode library
let Html5Qrcode, html5QrCode;

export async function main() {
    // Load external dependencies
    await loadQRScannerLibrary();
    
    // Initialize event listeners
    onClick('manual-claim-btn', claimManual);
    onClick('toggle-camera', toggleCamera);
    onClick('close-notification', hideNotification);
    
    // Initialize page
    checkUserClaimStatus();
    
    // Check status setiap 30 detik
    setInterval(checkUserClaimStatus, 30000);
    
    // Cleanup saat page unload
    window.addEventListener('beforeunload', function() {
        if (isCameraActive && html5QrCode) {
            html5QrCode.stop();
        }
    });
}

// Global variables
let isCameraActive = false;

// Backend URLs
const qrBackend = {
    claimQR: backend.bimbingan.qr.claimQR,
    getSessionStatus: backend.bimbingan.qr.getSessionStatus,
    getUserClaimStatus: backend.bimbingan.qr.getUserClaimStatus
};

async function loadQRScannerLibrary() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        script.onload = () => {
            Html5Qrcode = window.Html5Qrcode;
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function checkUserClaimStatus() {
    const token = getCookie('login');
    if (!token) {
        showNotification('Silakan login terlebih dahulu', 'is-danger');
        const claimStatus = document.getElementById('claim-status');
        claimStatus.textContent = 'BELUM LOGIN';
        claimStatus.className = 'tag is-large status-no-session';
        return;
    }

    getJSON(qrBackend.getUserClaimStatus, 'login', token, function(result) {
        const claimStatus = document.getElementById('claim-status');
        const sessionActiveInfo = document.getElementById('session-active-info');
        const activeSessionId = document.getElementById('active-session-id');
        const claimedInfo = document.getElementById('claimed-info');
        const claimedTime = document.getElementById('claimed-time');
        const scannerSection = document.getElementById('scanner-section');

        if (result.status === 200) {
            const data = result.data;
            
            if (data.hasClaimed) {
                // User sudah claim
                claimStatus.textContent = 'SUDAH CLAIM';
                claimStatus.className = 'tag is-large status-already-claimed';
                claimedInfo.style.display = 'block';
                claimedTime.textContent = new Date(data.claimedAt).toLocaleString();
                scannerSection.style.display = 'none';
                
                if (data.sessionID) {
                    activeSessionId.textContent = data.sessionID;
                    sessionActiveInfo.style.display = 'block';
                }
            } else if (data.canClaim) {
                // User bisa claim
                claimStatus.textContent = 'DAPAT CLAIM';
                claimStatus.className = 'tag is-large status-can-claim';
                scannerSection.style.display = 'block';
                claimedInfo.style.display = 'none';
                
                if (data.sessionID) {
                    activeSessionId.textContent = data.sessionID;
                    sessionActiveInfo.style.display = 'block';
                }
                
                // Start camera
                startCamera();
            } else {
                // Tidak ada session aktif
                claimStatus.textContent = 'TIDAK ADA SESSION';
                claimStatus.className = 'tag is-large status-no-session';
                scannerSection.style.display = 'none';
                claimedInfo.style.display = 'none';
                sessionActiveInfo.style.display = 'none';
            }
        } else {
            showNotification('Gagal mengecek status: ' + (result.data?.response || ''), 'is-danger');
        }
    });
}

function startCamera() {
    if (isCameraActive || !Html5Qrcode) return;

    html5QrCode = new Html5Qrcode("qr-reader");
    
    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
            const cameraId = devices[0].id;
            
            html5QrCode.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                (decodedText, decodedResult) => {
                    // QR Code berhasil di-scan
                    claimQRCode(decodedText);
                },
                (errorMessage) => {
                    // Error scanning (ini normal, jangan tampilkan error)
                }
            ).then(() => {
                isCameraActive = true;
                const toggleCameraBtn = document.getElementById('toggle-camera');
                toggleCameraBtn.textContent = 'Stop Camera';
            }).catch(err => {
                console.error("Error starting camera:", err);
                showNotification('Gagal memulai kamera: ' + err, 'is-warning');
            });
        } else {
            showNotification('Kamera tidak ditemukan', 'is-warning');
        }
    }).catch(err => {
        console.error("Error getting cameras:", err);
        showNotification('Gagal mengakses kamera: ' + err, 'is-warning');
    });
}

function stopCamera() {
    if (!isCameraActive || !html5QrCode) return;

    html5QrCode.stop().then(() => {
        isCameraActive = false;
        const toggleCameraBtn = document.getElementById('toggle-camera');
        toggleCameraBtn.textContent = 'Start Camera';
    }).catch(err => {
        console.error("Error stopping camera:", err);
    });
}

function toggleCamera() {
    if (isCameraActive) {
        stopCamera();
    } else {
        startCamera();
    }
}

function claimManual() {
    const manualQrInput = document.getElementById('manual-qr-input');
    const qrCode = manualQrInput.value.trim();
    if (!qrCode) {
        showNotification('Masukkan kode QR terlebih dahulu', 'is-warning');
        return;
    }
    
    claimQRCode(qrCode);
}

function claimQRCode(qrCode) {
    const token = getCookie('login');
    if (!token) {
        showNotification('Silakan login terlebih dahulu', 'is-danger');
        return;
    }

    const manualClaimBtn = document.getElementById('manual-claim-btn');
    manualClaimBtn.classList.add('is-loading');
    
    const claimData = { qrcode: qrCode };
    
    postJSON(qrBackend.claimQR, 'login', token, claimData, function(result) {
        manualClaimBtn.classList.remove('is-loading');
        
        if (result.status === 200) {
            showNotification('QR Code berhasil diklaim! Bimbingan telah ditambahkan.', 'is-success');
            const manualQrInput = document.getElementById('manual-qr-input');
            manualQrInput.value = '';
            
            // Stop camera dan refresh status
            stopCamera();
            setTimeout(checkUserClaimStatus, 2000);
        } else {
            showNotification(result.data?.response || 'Gagal claim QR code', 'is-danger');
        }
    });
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    
    notificationMessage.textContent = message;
    notification.classList.remove('is-success', 'is-danger', 'is-warning', 'is-info', 'is-hidden');
    notification.classList.add(type);
    
    setTimeout(hideNotification, 5000);
}

function hideNotification() {
    const notification = document.getElementById('notification');
    notification.classList.add('is-hidden');
}