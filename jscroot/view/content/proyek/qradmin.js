import { getJSON, postJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";

// Backend URLs
const backend = {
    qr: {
        generate: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/generate',
        status: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/status',
        start: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/start',
        stop: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/qr/stop'
    }
};

// Global variables
let systemIsActive = false;
let qrRefreshInterval = null;
let countdownInterval = null;
let statusCheckInterval = null;
let currentQRCode = null;
let qrExpiryTime = null;

// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const systemStatus = document.getElementById('system-status');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const lastUpdated = document.getElementById('last-updated');
const qrDisplay = document.getElementById('qr-display');
const currentQRCanvas = document.getElementById('currentQR');
const qrTextInput = document.getElementById('qr-text');
const countdown = document.getElementById('countdown');
const totalClaims = document.getElementById('total-claims');
const activeSessions = document.getElementById('active-sessions');
const recentActivity = document.getElementById('recent-activity');
const refreshStatsBtn = document.getElementById('refreshStats');
const errorNotification = document.getElementById('errorNotification');
const successNotification = document.getElementById('successNotification');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const closeError = document.getElementById('closeError');
const closeSuccess = document.getElementById('closeSuccess');

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    const token = getCookie('login');
    if (!token) {
        showError('Silakan login terlebih dahulu untuk mengakses halaman admin');
        return;
    }

    await checkSystemStatus();
    setupEventListeners();
    
    // Start periodic status checks
    statusCheckInterval = setInterval(checkSystemStatus, 5000);
    
    if (systemIsActive) {
        startQRMonitoring();
    }
});

// Setup event listeners
function setupEventListeners() {
    startBtn.addEventListener('click', handleStartSystem);
    stopBtn.addEventListener('click', handleStopSystem);
    refreshStatsBtn.addEventListener('click', refreshStatistics);
    closeError.addEventListener('click', hideError);
    closeSuccess.addEventListener('click', hideSuccess);
}

// Check system status
async function checkSystemStatus() {
    getJSON(backend.qr.status, '', '', (result) => {
        if (result.status === 200) {
            const wasActive = systemIsActive;
            systemIsActive = result.data.isActive;
            
            updateSystemStatusDisplay(result.data);
            
            // If system just became active, start monitoring
            if (!wasActive && systemIsActive) {
                startQRMonitoring();
            }
            // If system just became inactive, stop monitoring
            else if (wasActive && !systemIsActive) {
                stopQRMonitoring();
            }
        } else {
            systemIsActive = false;
            updateSystemStatusDisplay({ isActive: false });
        }
    });
}

// Update system status display
function updateSystemStatusDisplay(data) {
    if (systemIsActive) {
        statusIndicator.className = 'status-indicator status-active';
        statusText.textContent = 'Sistem QR Aktif';
        systemStatus.className = 'notification is-success';
        
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } else {
        statusIndicator.className = 'status-indicator status-inactive';
        statusText.textContent = 'Sistem QR Tidak Aktif';
        systemStatus.className = 'notification is-warning';
        
        startBtn.disabled = false;
        stopBtn.disabled = true;
        
        qrDisplay.style.display = 'none';
    }
    
    if (data.updatedAt) {
        lastUpdated.textContent = `Last updated: ${new Date(data.updatedAt).toLocaleString('id-ID')}`;
    }
}

// Handle start system
async function handleStartSystem() {
    const token = getCookie('login');
    if (!token) {
        showError('Silakan login terlebih dahulu');
        return;
    }
    
    startBtn.classList.add('is-loading');
    
    postJSON(backend.qr.start, 'login', token, {}, (result) => {
        startBtn.classList.remove('is-loading');
        
        if (result.status === 200) {
            showSuccess('Sistem QR berhasil diaktifkan');
            systemIsActive = true;
            updateSystemStatusDisplay({ isActive: true });
            startQRMonitoring();
        } else {
            showError(result.data?.response || 'Gagal mengaktifkan sistem QR');
        }
    });
}

// Handle stop system
async function handleStopSystem() {
    const token = getCookie('login');
    if (!token) {
        showError('Silakan login terlebih dahulu');
        return;
    }
    
    stopBtn.classList.add('is-loading');
    
    postJSON(backend.qr.stop, 'login', token, {}, (result) => {
        stopBtn.classList.remove('is-loading');
        
        if (result.status === 200) {
            showSuccess('Sistem QR berhasil dihentikan');
            systemIsActive = false;
            updateSystemStatusDisplay({ isActive: false });
            stopQRMonitoring();
        } else {
            showError(result.data?.response || 'Gagal menghentikan sistem QR');
        }
    });
}

// Start QR monitoring
function startQRMonitoring() {
    if (!systemIsActive) return;
    
    qrDisplay.style.display = 'block';
    
    // Generate initial QR
    generateNewQR();
    
    // Set interval for QR refresh
    qrRefreshInterval = setInterval(() => {
        if (systemIsActive) {
            generateNewQR();
        }
    }, 20000);
}

// Stop QR monitoring
function stopQRMonitoring() {
    qrDisplay.style.display = 'none';
    
    if (qrRefreshInterval) {
        clearInterval(qrRefreshInterval);
        qrRefreshInterval = null;
    }
    
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

// Generate new QR code
async function generateNewQR() {
    getJSON(backend.qr.generate, '', '', (result) => {
        if (result.status === 200) {
            currentQRCode = result.data.qrcode;
            qrExpiryTime = new Date(result.data.expiresAt);
            
            // Update QR text input
            qrTextInput.value = currentQRCode;
            
            // Generate QR code image
            QRCode.toCanvas(currentQRCanvas, currentQRCode, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            }, (error) => {
                if (error) {
                    console.error('QR Code generation error:', error);
                    showError('Gagal generate QR code visual');
                }
            });
            
            // Start countdown
            startCountdown();
            
        } else {
            showError(result.data?.response || 'Gagal generate QR code');
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
            countdown.textContent = '⏱️ QR Expired - Generating new...';
            clearInterval(countdownInterval);
            return;
        }
        
        const seconds = Math.ceil(timeLeft / 1000);
        countdown.textContent = `⏱️ Expires in: ${seconds} seconds`;
        
        // Change color when close to expiry
        if (seconds <= 5) {
            countdown.style.color = '#ff3860';
        } else {
            countdown.style.color = '#3273dc';
        }
    }, 100);
}

// Refresh statistics
async function refreshStatistics() {
    refreshStatsBtn.classList.add('is-loading');
    
    // Simulate stats refresh (you can implement actual API calls)
    setTimeout(() => {
        // Update mock statistics
        totalClaims.textContent = Math.floor(Math.random() * 50) + 10;
        activeSessions.textContent = systemIsActive ? '1' : '0';
        
        // Update recent activity
        recentActivity.innerHTML = `
            <div class="content">
                <p><strong>${new Date().toLocaleTimeString('id-ID')}</strong> - System status checked</p>
                <p><strong>${new Date(Date.now() - 60000).toLocaleTimeString('id-ID')}</strong> - QR code regenerated</p>
                <p><strong>${new Date(Date.now() - 120000).toLocaleTimeString('id-ID')}</strong> - User claim attempt</p>
            </div>
        `;
        
        refreshStatsBtn.classList.remove('is-loading');
        showSuccess('Statistik berhasil diperbarui');
    }, 1000);
}

// Show error notification
function showError(message) {
    errorMessage.textContent = message;
    errorNotification.style.display = 'block';
    hideSuccess();
    
    // Auto hide after 5 seconds
    setTimeout(hideError, 5000);
}

// Show success notification
function showSuccess(message) {
    successMessage.textContent = message;
    successNotification.style.display = 'block';
    hideError();
    
    // Auto hide after 5 seconds
    setTimeout(hideSuccess, 5000);
}

// Hide error notification
function hideError() {
    errorNotification.style.display = 'none';
}

// Hide success notification
function hideSuccess() {
    successNotification.style.display = 'none';
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopQRMonitoring();
    
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
});