import { getJSON, postJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";

// Backend URLs - sesuaikan dengan konfigurasi Anda
const backend = {
    qr: {
        generate: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/generate',
        claim: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/claim',
        status: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/status',
        userStatus: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/userstatus',
        start: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/start',
        stop: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/stop'
    }
};

// Global variables
let qrRefreshInterval = null;
let countdownInterval = null;
let currentQRCode = null;
let qrExpiryTime = null;
let userHasClaimed = false;
let systemIsActive = false;

// DOM Elements
const qrCodeCanvas = document.getElementById('qrcode');
const countdownElement = document.getElementById('countdown');
const manualQRInput = document.getElementById('manual-qr-input');
const manualClaimBtn = document.getElementById('manual-claim-btn');
const startQRBtn = document.getElementById('start-qr-btn');
const stopQRBtn = document.getElementById('stop-qr-btn');
const adminControls = document.getElementById('admin-controls');
const systemStatus = document.getElementById('system-status');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const userStatus = document.getElementById('user-status');
const qrDisplaySection = document.getElementById('qr-display-section');
const notificationArea = document.getElementById('notification-area');
const notificationMessage = document.getElementById('notification-message');
const closeNotification = document.getElementById('close-notification');

// Owner phone numbers
const ownerNumbers = ['6285312924192', '6282117252716'];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    const token = getCookie('login');
    if (!token) {
        showNotification('Silakan login terlebih dahulu', 'is-danger');
        return;
    }

    await checkUserStatus();
    await checkSystemStatus();
    await checkIfOwner();
    
    setupEventListeners();
    
    if (systemIsActive && !userHasClaimed) {
        startQRGeneration();
    }
});

// Check if current user is owner
async function checkIfOwner() {
    // Decode token to get user phone number
    try {
        const token = getCookie('login');
        if (!token) return;
        
        // Simple check - in production you might want to verify with backend
        // For now, we'll show admin controls and let backend validate
        adminControls.classList.remove('hidden');
        
    } catch (error) {
        console.log('Error checking owner status:', error);
    }
}

// Check user claim status
async function checkUserStatus() {
    const token = getCookie('login');
    if (!token) return;
    
    getJSON(backend.qr.userStatus, 'login', token, (result) => {
        if (result.status === 200) {
            userHasClaimed = result.data.hasClaimed;
            
            if (userHasClaimed) {
                userStatus.innerHTML = `
                    <span class="icon">✅</span>
                    <strong>Anda sudah pernah claim QR code bimbingan!</strong><br>
                    <small>Claimed pada: ${new Date(result.data.claimedAt).toLocaleString('id-ID')}</small><br>
                    <small>QR Code: ${result.data.qrCode}</small>
                `;
                userStatus.className = 'notification is-success';
                userStatus.style.display = 'block';
                
                // Hide claim section if user already claimed
                qrDisplaySection.style.display = 'none';
                manualClaimBtn.disabled = true;
            } else {
                userStatus.innerHTML = `
                    <span class="icon">🎯</span>
                    <strong>Anda belum pernah claim QR code bimbingan</strong><br>
                    <small>Silakan claim untuk mendapat 1 bimbingan bonus!</small>
                `;
                userStatus.className = 'notification is-info';
                userStatus.style.display = 'block';
            }
        }
    });
}

// Check system status
async function checkSystemStatus() {
    getJSON(backend.qr.status, '', '', (result) => {
        if (result.status === 200) {
            systemIsActive = result.data.isActive;
            updateSystemStatusDisplay();
        } else {
            systemIsActive = false;
            updateSystemStatusDisplay();
        }
    });
}

// Update system status display
function updateSystemStatusDisplay() {
    if (systemIsActive) {
        statusIndicator.className = 'status-indicator status-active';
        statusText.textContent = 'Sistem QR Aktif';
        systemStatus.className = 'notification is-success';
    } else {
        statusIndicator.className = 'status-indicator status-inactive';
        statusText.textContent = 'Sistem QR Tidak Aktif';
        systemStatus.className = 'notification is-warning';
        
        // Stop QR generation if system is inactive
        stopQRGeneration();
    }
}

// Setup event listeners
function setupEventListeners() {
    manualClaimBtn.addEventListener('click', handleManualClaim);
    startQRBtn.addEventListener('click', handleStartQR);
    stopQRBtn.addEventListener('click', handleStopQR);
    closeNotification.addEventListener('click', hideNotification);
    
    // Enter key for manual input
    manualQRInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleManualClaim();
        }
    });
}

// Start QR generation
function startQRGeneration() {
    if (userHasClaimed || !systemIsActive) return;
    
    generateNewQR();
    
    // Set interval for every 20 seconds
    qrRefreshInterval = setInterval(() => {
        generateNewQR();
    }, 20000);
}

// Stop QR generation
function stopQRGeneration() {
    if (qrRefreshInterval) {
        clearInterval(qrRefreshInterval);
        qrRefreshInterval = null;
    }
    
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    
    countdownElement.textContent = '⏹️ QR Generation Stopped';
}

// Generate new QR code
async function generateNewQR() {
    if (!systemIsActive || userHasClaimed) return;
    
    getJSON(backend.qr.generate, '', '', (result) => {
        if (result.status === 200) {
            currentQRCode = result.data.qrcode;
            qrExpiryTime = new Date(result.data.expiresAt);
            
            // Generate QR code image
            QRCode.toCanvas(qrCodeCanvas, currentQRCode, {
                width: 250,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            }, (error) => {
                if (error) {
                    console.error('QR Code generation error:', error);
                    showNotification('Gagal generate QR code', 'is-danger');
                }
            });
            
            // Start countdown
            startCountdown();
            
        } else {
            showNotification(result.data?.response || 'Gagal generate QR code', 'is-danger');
            stopQRGeneration();
        }
    });
}

// Start countdown timer
function startCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownInterval = setInterval(() => {
        const now = new Date();
        const timeLeft = qrExpiryTime - now;
        
        if (timeLeft <= 0) {
            countdownElement.textContent = '⏱️ QR Expired - Generating new...';
            clearInterval(countdownInterval);
            return;
        }
        
        const seconds = Math.ceil(timeLeft / 1000);
        countdownElement.textContent = `⏱️ Expires in: ${seconds} seconds`;
        
        // Change color when close to expiry
        if (seconds <= 5) {
            countdownElement.style.color = '#ff3860';
        } else {
            countdownElement.style.color = '#3273dc';
        }
    }, 100);
}

// Handle manual claim
async function handleManualClaim() {
    const qrCode = manualQRInput.value.trim();
    
    if (!qrCode) {
        showNotification('Masukkan kode QR terlebih dahulu', 'is-warning');
        return;
    }
    
    if (userHasClaimed) {
        showNotification('Anda sudah pernah claim QR code sebelumnya', 'is-info');
        return;
    }
    
    claimQRCode(qrCode);
}

// Claim QR code
async function claimQRCode(qrCode) {
    const token = getCookie('login');
    if (!token) {
        showNotification('Silakan login terlebih dahulu', 'is-danger');
        return;
    }
    
    manualClaimBtn.classList.add('is-loading');
    manualClaimBtn.disabled = true;
    
    const claimData = { qrcode: qrCode };
    
    postJSON(backend.qr.claim, 'login', token, claimData, (result) => {
        manualClaimBtn.classList.remove('is-loading');
        manualClaimBtn.disabled = false;
        
        if (result.status === 200) {
            showNotification(result.data.response || 'QR Code berhasil diklaim!', 'is-success');
            
            // Update UI
            userHasClaimed = true;
            manualQRInput.value = '';
            
            // Refresh user status
            setTimeout(() => {
                checkUserStatus();
                stopQRGeneration();
            }, 1000);
            
        } else {
            showNotification(result.data?.response || 'Gagal claim QR code', 'is-danger');
        }
    });
}

// Handle start QR system (admin only)
async function handleStartQR() {
    const token = getCookie('login');
    if (!token) {
        showNotification('Silakan login terlebih dahulu', 'is-danger');
        return;
    }
    
    startQRBtn.classList.add('is-loading');
    
    postJSON(backend.qr.start, 'login', token, {}, (result) => {
        startQRBtn.classList.remove('is-loading');
        
        if (result.status === 200) {
            showNotification('Sesi QR berhasil dimulai', 'is-success');
            systemIsActive = true;
            updateSystemStatusDisplay();
            
            if (!userHasClaimed) {
                setTimeout(startQRGeneration, 1000);
            }
        } else {
            showNotification(result.data?.response || 'Gagal memulai sesi QR', 'is-danger');
        }
    });
}

// Handle stop QR system (admin only)
async function handleStopQR() {
    const token = getCookie('login');
    if (!token) {
        showNotification('Silakan login terlebih dahulu', 'is-danger');
        return;
    }
    
    stopQRBtn.classList.add('is-loading');
    
    postJSON(backend.qr.stop, 'login', token, {}, (result) => {
        stopQRBtn.classList.remove('is-loading');
        
        if (result.status === 200) {
            showNotification('Sesi QR berhasil dihentikan', 'is-success');
            systemIsActive = false;
            updateSystemStatusDisplay();
            stopQRGeneration();
        } else {
            showNotification(result.data?.response || 'Gagal menghentikan sesi QR', 'is-danger');
        }
    });
}

// Show notification
function showNotification(message, type) {
    notificationMessage.textContent = message;
    notificationArea.classList.remove('is-success', 'is-danger', 'is-warning', 'is-info', 'is-hidden');
    notificationArea.classList.add(type);
    
    // Auto hide after 5 seconds
    setTimeout(hideNotification, 5000);
}

// Hide notification
function hideNotification() {
    notificationArea.classList.add('is-hidden');
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopQRGeneration();
});