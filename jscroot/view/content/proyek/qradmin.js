import { onClick, getValue, setValue, addCSSIn } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
import { getJSON, postJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import { id, backend } from "/dashboard/jscroot/url/config.js";

// Load QRCode library
let QRCode;

export async function main() {
    // Load external dependencies
    await loadQRCodeLibrary();
    
    // Initialize event listeners
    onClick('start-session', startSession);
    onClick('stop-session', stopSession);
    onClick('close-notification', hideNotification);
    
    // Initialize page
    checkSessionStatus();
    
    // Check session status setiap 30 detik
    setInterval(checkSessionStatus, 30000);
}

// Global variables
let refreshInterval;
let countdownInterval;
let countdownValue = 20;

// Backend URLs
const qrBackend = {
    startSession: backend.bimbingan.qr.startSession,
    stopSession: backend.bimbingan.qr.stopSession,
    getCurrentQR: backend.bimbingan.qr.getCurrentQR,
    getSessionStatus: backend.bimbingan.qr.getSessionStatus
};

async function loadQRCodeLibrary() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
        script.onload = () => {
            QRCode = window.QRCode;
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function startSession() {
    const token = getCookie('login');
    if (!token) {
        showNotification('Silakan login terlebih dahulu', 'is-danger');
        return;
    }

    const startBtn = document.getElementById('start-session');
    startBtn.classList.add('is-loading');
    
    postJSON(qrBackend.startSession, 'login', token, {}, function(result) {
        startBtn.classList.remove('is-loading');
        
        if (result.status === 200) {
            showNotification('Session QR berhasil dimulai', 'is-success');
            checkSessionStatus();
            startQRRefresh();
        } else {
            showNotification(result.data?.response || 'Gagal memulai session', 'is-danger');
        }
    });
}

function stopSession() {
    const token = getCookie('login');
    if (!token) {
        showNotification('Silakan login terlebih dahulu', 'is-danger');
        return;
    }

    const stopBtn = document.getElementById('stop-session');
    stopBtn.classList.add('is-loading');
    
    postJSON(qrBackend.stopSession, 'login', token, {}, function(result) {
        stopBtn.classList.remove('is-loading');
        
        if (result.status === 200) {
            showNotification('Session QR berhasil dihentikan', 'is-success');
            stopQRRefresh();
            checkSessionStatus();
        } else {
            showNotification(result.data?.response || 'Gagal menghentikan session', 'is-danger');
        }
    });
}

function checkSessionStatus() {
    getJSON(qrBackend.getSessionStatus, '', '', function(result) {
        const sessionStatus = document.getElementById('session-status');
        const sessionInfo = document.getElementById('session-info');
        const sessionId = document.getElementById('session-id');
        const sessionStartTime = document.getElementById('session-start-time');
        const qrDisplay = document.getElementById('qr-display');
        const startBtn = document.getElementById('start-session');
        const stopBtn = document.getElementById('stop-session');

        if (result.status === 200 && result.data.isActive) {
            // Session aktif
            sessionStatus.textContent = 'AKTIF';
            sessionStatus.className = 'tag is-large status-active';
            sessionId.textContent = result.data.sessionID;
            sessionStartTime.textContent = new Date(result.data.createdAt).toLocaleString();
            sessionInfo.style.display = 'block';
            
            startBtn.disabled = true;
            stopBtn.disabled = false;
            
            if (!refreshInterval) {
                startQRRefresh();
            }
        } else {
            // Session tidak aktif
            sessionStatus.textContent = 'TIDAK AKTIF';
            sessionStatus.className = 'tag is-large status-inactive';
            sessionInfo.style.display = 'none';
            qrDisplay.style.display = 'none';
            
            startBtn.disabled = false;
            stopBtn.disabled = true;
            
            stopQRRefresh();
        }
    });
}

function startQRRefresh() {
    refreshQRCode(); // Generate pertama kali
    
    refreshInterval = setInterval(refreshQRCode, 20000); // Refresh setiap 20 detik
    startCountdown();
}

function stopQRRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    const qrDisplay = document.getElementById('qr-display');
    qrDisplay.style.display = 'none';
}

function refreshQRCode() {
    getJSON(qrBackend.getCurrentQR, '', '', function(result) {
        if (result.status === 200) {
            const qrCode = result.data.qrCode;
            const currentQRText = document.getElementById('current-qr-text');
            const qrCanvas = document.getElementById('qr-canvas');
            const qrDisplay = document.getElementById('qr-display');
            
            currentQRText.textContent = qrCode;
            
            // Generate QR Code
            if (QRCode) {
                QRCode.toCanvas(qrCanvas, qrCode, {
                    width: 300,
                    height: 300,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                }, function (error) {
                    if (error) console.error(error);
                });
            }
            
            qrDisplay.style.display = 'block';
            resetCountdown();
        } else {
            console.error('Gagal mendapatkan QR code:', result.data?.response);
        }
    });
}

function startCountdown() {
    const countdown = document.getElementById('countdown');
    
    countdownInterval = setInterval(function() {
        countdownValue--;
        countdown.textContent = countdownValue;
        
        if (countdownValue <= 0) {
            resetCountdown();
        }
    }, 1000);
}

function resetCountdown() {
    countdownValue = 20;
    const countdown = document.getElementById('countdown');
    countdown.textContent = countdownValue;
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