import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";

// Backend URLs - sesuaikan dengan konfigurasi Anda
const backend = {
    generateSession: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/generatesession',
    stopSession: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/stopsession', 
    getActiveSession: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/activesession',
    claimQR: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/claim',
    checkClaimStatus: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/claimstatus'
};

// Global variables
let currentSession = null;
let refreshInterval = null;
let countdownInterval = null;
let scanInterval = null;
let isOwner = false;
let currentUserPhone = '';
let video = null;
let canvas = null;
let context = null;

// DOM Elements
const elements = {
    sessionStatus: document.getElementById('session-status'),
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    sessionId: document.getElementById('session-id'),
    countdownContainer: document.getElementById('countdown-container'),
    countdown: document.getElementById('countdown'),
    ownerControls: document.getElementById('owner-controls'),
    startSession: document.getElementById('start-session'),
    stopSession: document.getElementById('stop-session'),
    qrContainer: document.getElementById('qr-container'),
    refreshQr: document.getElementById('refresh-qr'),
    video: document.getElementById('video'),
    canvas: document.getElementById('canvas'),
    startCamera: document.getElementById('start-camera'),
    stopCamera: document.getElementById('stop-camera'),
    claimStatus: document.getElementById('claim-status'),
    claimMessage: document.getElementById('claim-message'),
    notification: document.getElementById('notification'),
    notificationMessage: document.getElementById('notification-message'),
    closeNotification: document.getElementById('close-notification')
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    video = elements.video;
    canvas = elements.canvas;
    context = canvas.getContext('2d');
    
    // Check if user is logged in
    const token = getCookie('login');
    if (!token) {
        showNotification('Silakan login terlebih dahulu', 'is-danger');
        return;
    }
    
    // Initialize user info and check owner status
    await initializeUser();
    
    // Check claim status
    await checkUserClaimStatus();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start checking for active sessions
    await checkActiveSession();
    startPeriodicChecks();
});

// Initialize user and check if owner
async function initializeUser() {
    try {
        // Try fallback method first (more reliable)
        const tokenParts = getCookie('login').split('.');
        if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            currentUserPhone = payload.Id || payload.id || '';
            
            // Check if user is owner
            const allowedNumbers = ['6285312924192', '6282117252716'];
            isOwner = allowedNumbers.includes(currentUserPhone);
            
            if (isOwner) {
                elements.ownerControls.style.display = 'block';
            }
            return;
        }
    } catch (error) {
        console.error('Error initializing user:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    elements.startSession.addEventListener('click', startQRSession);
    elements.stopSession.addEventListener('click', stopQRSession);
    elements.refreshQr.addEventListener('click', manualRefreshQR);
    elements.startCamera.addEventListener('click', startCamera);
    elements.stopCamera.addEventListener('click', stopCamera);
    elements.closeNotification.addEventListener('click', hideNotification);
}

// Start QR session (owner only)
async function startQRSession() {
    if (!isOwner) {
        showNotification('Anda tidak memiliki akses untuk memulai session', 'is-danger');
        return;
    }
    
    elements.startSession.classList.add('is-loading');
    
    try {
        const response = await fetch(backend.generateSession, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'login': getCookie('login')
            },
            body: JSON.stringify({})
        });
        
        const result = await response.json();
        
        if (response.ok && result.sessionId) {
            showNotification('Session QR berhasil dimulai!', 'is-success');
            await checkActiveSession();
        } else {
            throw new Error(result.response || result.message || 'Gagal memulai session');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'is-danger');
    } finally {
        elements.startSession.classList.remove('is-loading');
    }
}

// Stop QR session (owner only)
async function stopQRSession() {
    if (!isOwner) {
        showNotification('Anda tidak memiliki akses untuk menghentikan session', 'is-danger');
        return;
    }
    
    elements.stopSession.classList.add('is-loading');
    
    try {
        const response = await fetch(backend.stopSession, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'login': getCookie('login')
            },
            body: JSON.stringify({})
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Session QR berhasil dihentikan!', 'is-success');
            await checkActiveSession();
        } else {
            throw new Error(result.response || result.message || 'Gagal menghentikan session');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'is-danger');
    } finally {
        elements.stopSession.classList.remove('is-loading');
    }
}

// Check for active session
async function checkActiveSession() {
    try {
        const response = await fetch(backend.getActiveSession);
        const result = await response.json();
        
        if (result.isActive && result.sessionId) {
            currentSession = result;
            updateSessionUI(true, result.sessionId, new Date(result.expiresAt));
            generateQRCode(result.sessionId);
            startCountdown(new Date(result.expiresAt));
        } else {
            currentSession = null;
            updateSessionUI(false);
            clearQRCode();
            stopCountdown();
        }
    } catch (error) {
        console.error('Error checking active session:', error);
        currentSession = null;
        updateSessionUI(false);
    }
}

// Update session UI
function updateSessionUI(isActive, sessionId = '', expiresAt = null) {
    if (isActive) {
        elements.statusIndicator.className = 'status-indicator status-active';
        elements.statusText.textContent = 'Aktif';
        elements.sessionId.textContent = sessionId;
        elements.countdownContainer.style.display = 'block';
        elements.refreshQr.style.display = 'inline-block';
    } else {
        elements.statusIndicator.className = 'status-indicator status-inactive';
        elements.statusText.textContent = 'Tidak Aktif';
        elements.sessionId.textContent = '-';
        elements.countdownContainer.style.display = 'none';
        elements.refreshQr.style.display = 'none';
    }
}

// Generate QR Code
function generateQRCode(sessionId) {
    elements.qrContainer.innerHTML = '';
    
    const qrData = JSON.stringify({
        type: 'bimbingan_qr',
        sessionId: sessionId,
        timestamp: Date.now()
    });
    
    const qrCodeDiv = document.createElement('div');
    elements.qrContainer.appendChild(qrCodeDiv);
    
    QRCode.toCanvas(qrCodeDiv, qrData, {
        width: 256,
        height: 256,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, (error) => {
        if (error) {
            console.error('Error generating QR code:', error);
            elements.qrContainer.innerHTML = '<p class="has-text-danger">Error generating QR code</p>';
        }
    });
}

// Clear QR Code
function clearQRCode() {
    elements.qrContainer.innerHTML = `
        <div class="has-text-grey-light">
            <p class="has-text-centered">QR Code akan muncul di sini</p>
            <p class="has-text-centered is-size-7">Session akan refresh setiap 20 detik</p>
        </div>
    `;
}

// Manual refresh QR
async function manualRefreshQR() {
    await checkActiveSession();
}

// Start countdown
function startCountdown(expiresAt) {
    stopCountdown(); // Clear any existing countdown
    
    countdownInterval = setInterval(() => {
        const now = new Date();
        const timeLeft = expiresAt - now;
        
        if (timeLeft <= 0) {
            elements.countdown.textContent = 'Expired';
            stopCountdown();
            setTimeout(checkActiveSession, 1000); // Check for new session
        } else {
            const seconds = Math.ceil(timeLeft / 1000);
            elements.countdown.textContent = `${seconds}s`;
        }
    }, 1000);
}

// Stop countdown
function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    elements.countdown.textContent = '-';
}

// Start periodic checks
function startPeriodicChecks() {
    // Check for active session every 5 seconds
    setInterval(checkActiveSession, 5000);
}

// Start camera for scanning
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        
        video.srcObject = stream;
        video.play();
        
        elements.startCamera.style.display = 'none';
        elements.stopCamera.style.display = 'inline-block';
        
        // Start scanning
        startScanning();
        
    } catch (error) {
        showNotification('Error accessing camera: ' + error.message, 'is-danger');
    }
}

// Stop camera
function stopCamera() {
    if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    
    stopScanning();
    
    elements.startCamera.style.display = 'inline-block';
    elements.stopCamera.style.display = 'none';
}

// Start QR code scanning
function startScanning() {
    stopScanning(); // Clear any existing scan interval
    
    scanInterval = setInterval(() => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                handleQRCodeScanned(code.data);
            }
        }
    }, 100);
}

// Stop scanning
function stopScanning() {
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
}

// Handle QR code scanned
async function handleQRCodeScanned(qrData) {
    try {
        const data = JSON.parse(qrData);
        
        if (data.type === 'bimbingan_qr' && data.sessionId) {
            stopScanning(); // Stop scanning after successful scan
            await claimQRBimbingan(data.sessionId);
        } else {
            showNotification('QR Code tidak valid untuk bimbingan', 'is-warning');
        }
    } catch (error) {
        showNotification('QR Code format tidak valid', 'is-warning');
    }
}

// Claim QR bimbingan
async function claimQRBimbingan(sessionId) {
    try {
        const response = await fetch(backend.claimQR, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'login': getCookie('login')
            },
            body: JSON.stringify({ sessionId })
        });
        
        const result = await response.json();
        
        if (response.ok && (result.Status === "Success" || result.status === 200)) {
            showNotification('QR Code berhasil diklaim! Bimbingan telah ditambahkan.', 'is-success');
            updateClaimStatus(true);
            stopCamera(); // Stop camera after successful claim
        } else {
            throw new Error(result.Response || result.response || result.message || 'Gagal claim QR code');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'is-danger');
        // Resume scanning after error
        setTimeout(startScanning, 2000);
    }
}

// Check user claim status
async function checkUserClaimStatus() {
    try {
        const response = await fetch(backend.checkClaimStatus, {
            headers: {
                'login': getCookie('login')
            }
        });
        const result = await response.json();
        
        if (result.hasClaimed) {
            updateClaimStatus(true, result.claimedAt, result.sessionId);
        }
    } catch (error) {
        console.error('Error checking claim status:', error);
    }
}

// Update claim status display
function updateClaimStatus(hasClaimed, claimedAt = null, sessionId = null) {
    if (hasClaimed) {
        elements.claimStatus.style.display = 'block';
        elements.claimStatus.className = 'notification is-success';
        elements.claimMessage.textContent = 'Anda sudah pernah menggunakan QR Code untuk mendapatkan bimbingan';
        
        // Disable camera if already claimed
        elements.startCamera.disabled = true;
        elements.startCamera.textContent = 'Sudah Pernah Claim';
    } else {
        elements.claimStatus.style.display = 'none';
        elements.startCamera.disabled = false;
        elements.startCamera.innerHTML = `
            <span class="icon"><i class="fas fa-camera"></i></span>
            <span>Nyalakan Kamera</span>
        `;
    }
}

// Show notification
function showNotification(message, type = 'is-info') {
    elements.notification.className = `notification ${type}`;
    elements.notificationMessage.textContent = message;
    elements.notification.classList.remove('is-hidden');
    
    // Auto hide after 5 seconds
    setTimeout(hideNotification, 5000);
}

// Hide notification
function hideNotification() {
    elements.notification.classList.add('is-hidden');
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopCamera();
    stopCountdown();
    stopScanning();
});