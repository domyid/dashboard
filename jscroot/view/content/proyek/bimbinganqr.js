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
let sessionCheckInterval = null;
let isOwner = false;
let currentUserPhone = '';

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
    refreshInfo: document.getElementById('refresh-info'),
    claimStatus: document.getElementById('claim-status'),
    claimMessage: document.getElementById('claim-message'),
    notClaimed: document.getElementById('not-claimed'),
    notification: document.getElementById('notification'),
    notificationMessage: document.getElementById('notification-message'),
    closeNotification: document.getElementById('close-notification')
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    const token = getCookie('login');
    if (!token) {
        showNotification('Silakan login terlebih dahulu', 'is-danger');
        return;
    }
    
    // Initialize user info and check owner status
    await initializeUser();
    
    // Check claim status for students
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
            showNotification('QR Session berhasil dimulai! QR akan refresh setiap 20 detik.', 'is-success');
            await checkActiveSession();
            startAutoRefresh();
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
            showNotification('QR Session berhasil dihentikan!', 'is-success');
            stopAutoRefresh();
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
        elements.refreshInfo.style.display = 'block';
        elements.qrContainer.classList.add('qr-active');
        
        // Update owner controls
        if (isOwner) {
            elements.startSession.style.display = 'none';
            elements.stopSession.style.display = 'inline-block';
        }
    } else {
        elements.statusIndicator.className = 'status-indicator status-inactive';
        elements.statusText.textContent = 'Tidak Aktif';
        elements.sessionId.textContent = '-';
        elements.countdownContainer.style.display = 'none';
        elements.refreshInfo.style.display = 'none';
        elements.qrContainer.classList.remove('qr-active');
        
        // Update owner controls
        if (isOwner) {
            elements.startSession.style.display = 'inline-block';
            elements.stopSession.style.display = 'none';
        }
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
        width: 300,
        height: 300,
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
        <div class="has-text-grey-light has-text-centered">
            <i class="fas fa-qrcode" style="font-size: 4rem; margin-bottom: 20px;"></i>
            <p class="big-qr-text">QR Code akan muncul di sini</p>
            <p class="is-size-6">QR akan refresh otomatis setiap 20 detik</p>
            <p class="is-size-7 mt-3">Mahasiswa scan dengan aplikasi QR scanner</p>
        </div>
    `;
}

// Start auto refresh QR
function startAutoRefresh() {
    stopAutoRefresh(); // Clear any existing interval
    
    refreshInterval = setInterval(async () => {
        console.log('Auto refreshing QR session...');
        if (isOwner && currentSession) {
            // Generate new session automatically
            try {
                const response = await fetch(backend.generateSession, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'login': getCookie('login')
                    },
                    body: JSON.stringify({})
                });
                
                if (response.ok) {
                    await checkActiveSession();
                }
            } catch (error) {
                console.error('Auto refresh error:', error);
            }
        }
    }, 20000); // 20 detik
}

// Stop auto refresh
function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Start countdown
function startCountdown(expiresAt) {
    stopCountdown(); // Clear any existing countdown
    
    countdownInterval = setInterval(() => {
        const now = new Date();
        const timeLeft = expiresAt - now;
        
        if (timeLeft <= 0) {
            elements.countdown.textContent = 'Refreshing...';
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
    sessionCheckInterval = setInterval(checkActiveSession, 5000);
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
        } else {
            updateClaimStatus(false);
        }
    } catch (error) {
        console.error('Error checking claim status:', error);
        updateClaimStatus(false);
    }
}

// Update claim status display
function updateClaimStatus(hasClaimed, claimedAt = null, sessionId = null) {
    if (hasClaimed) {
        elements.claimStatus.style.display = 'block';
        elements.claimStatus.className = 'notification is-success';
        elements.claimMessage.textContent = `Anda sudah menggunakan QR Code untuk mendapatkan bimbingan (${new Date(claimedAt).toLocaleDateString()})`;
        elements.notClaimed.style.display = 'none';
    } else {
        elements.claimStatus.style.display = 'none';
        elements.notClaimed.style.display = 'block';
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
    stopAutoRefresh();
    stopCountdown();
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }
});