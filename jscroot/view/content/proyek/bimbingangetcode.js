import { getJSON, postJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";

// Backend URLs - sesuaikan dengan konfigurasi Anda
const backend = {
    generateCode: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/generatecode',
    generateTimeCode: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/generatecodetime'
};

// DOM Elements
const generateBtn = document.getElementById('generateBtn');
const codeContainer = document.getElementById('codeContainer');
const generatedCode = document.getElementById('generatedCode');
const copyBtn = document.getElementById('copyBtn');

// Time Event Elements
const generateTimeBtn = document.getElementById('generateTimeBtn');
const timeCodeContainer = document.getElementById('timeCodeContainer');
const generatedTimeCode = document.getElementById('generatedTimeCode');
const copyTimeBtn = document.getElementById('copyTimeBtn');
const durationInput = document.getElementById('durationInput');
const createdTime = document.getElementById('createdTime');
const expiryTime = document.getElementById('expiryTime');
const duration = document.getElementById('duration');
const countdownTimer = document.getElementById('countdownTimer');

// Notification Elements
const errorNotification = document.getElementById('errorNotification');
const errorMessage = document.getElementById('errorMessage');
const closeError = document.getElementById('closeError');
const successNotification = document.getElementById('successNotification');
const successMessage = document.getElementById('successMessage');
const closeSuccess = document.getElementById('closeSuccess');

// Global variables for countdown
let countdownInterval = null;
let expiryTimestamp = null;

// Close notification handlers
closeError.addEventListener('click', () => {
    errorNotification.style.display = 'none';
});

closeSuccess.addEventListener('click', () => {
    successNotification.style.display = 'none';
});

// Generate regular code function
generateBtn.addEventListener('click', async () => {
    // Check if user is logged in
    const token = getCookie('login');
    if (!token) {
        showError('Anda harus login terlebih dahulu');
        return;
    }
    
    // Disable button while processing
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    
    try {
        getJSON(backend.generateCode, 'login', token, (result) => {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Code';
            
            if (result.status === 200) {
                // Show the generated code
                generatedCode.textContent = result.data.response;
                codeContainer.style.display = 'block';
                hideError();
                showSuccess('Kode event berhasil di-generate!');
            } else {
                // Show error
                showError(result.data.response || 'Gagal generate code');
            }
        });
    } catch (error) {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Code';
        showError('Terjadi kesalahan: ' + error.message);
    }
});

// Generate time code function
generateTimeBtn.addEventListener('click', async () => {
    // Check if user is logged in
    const token = getCookie('login');
    if (!token) {
        showError('Anda harus login terlebih dahulu');
        return;
    }
    
    // Validate duration input
    const durationSeconds = parseInt(durationInput.value);
    if (!durationSeconds || durationSeconds <= 0 || durationSeconds > 3600) {
        showError('Durasi harus berupa angka antara 1-3600 detik');
        return;
    }
    
    // Disable button while processing
    generateTimeBtn.disabled = true;
    generateTimeBtn.textContent = 'Generating...';
    
    try {
        const requestData = {
            duration_seconds: durationSeconds
        };
        
        postJSON(backend.generateTimeCode, 'login', token, requestData, (result) => {
            generateTimeBtn.disabled = false;
            generateTimeBtn.textContent = 'Generate Time Code';
            
            if (result.status === 200) {
                // Show the generated time code
                const responseData = result.data;
                generatedTimeCode.textContent = responseData.code;
                
                // Show time information
                const createdDate = new Date();
                const expiryDate = new Date(responseData.expires_at);
                
                createdTime.textContent = createdDate.toLocaleString('id-ID');
                expiryTime.textContent = expiryDate.toLocaleString('id-ID');
                duration.textContent = responseData.duration;
                
                // Set expiry timestamp for countdown
                expiryTimestamp = expiryDate.getTime();
                
                // Start countdown timer
                startCountdown();
                
                timeCodeContainer.style.display = 'block';
                hideError();
                showSuccess('Kode time event berhasil di-generate!');
            } else {
                // Show error
                showError(result.data?.response || result.data?.status || 'Gagal generate time code');
            }
        });
    } catch (error) {
        generateTimeBtn.disabled = false;
        generateTimeBtn.textContent = 'Generate Time Code';
        showError('Terjadi kesalahan: ' + error.message);
    }
});

// Copy regular code function
copyBtn.addEventListener('click', () => {
    const code = generatedCode.textContent;
    
    // Copy to clipboard
    navigator.clipboard.writeText(code).then(() => {
        // Change button text temporarily
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.remove('is-info');
        copyBtn.classList.add('is-success');
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('is-success');
            copyBtn.classList.add('is-info');
        }, 2000);
    }).catch(err => {
        showError('Gagal menyalin kode: ' + err.message);
    });
});

// Copy time code function
copyTimeBtn.addEventListener('click', () => {
    const code = generatedTimeCode.textContent;
    
    // Copy to clipboard
    navigator.clipboard.writeText(code).then(() => {
        // Change button text temporarily
        const originalText = copyTimeBtn.textContent;
        copyTimeBtn.textContent = 'Copied!';
        copyTimeBtn.classList.remove('is-info');
        copyTimeBtn.classList.add('is-success');
        
        setTimeout(() => {
            copyTimeBtn.textContent = originalText;
            copyTimeBtn.classList.remove('is-success');
            copyTimeBtn.classList.add('is-info');
        }, 2000);
    }).catch(err => {
        showError('Gagal menyalin kode: ' + err.message);
    });
});

// Countdown timer function
function startCountdown() {
    // Clear existing interval if any
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownInterval = setInterval(() => {
        const now = Date.now();
        const timeLeft = expiryTimestamp - now;
        
        if (timeLeft <= 0) {
            // Time expired
            countdownTimer.innerHTML = '⏰ <span style="color: #dc2626;">KODE SUDAH KADALUARSA!</span>';
            clearInterval(countdownInterval);
            return;
        }
        
        // Calculate time components
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        // Format and display
        let timeString = '';
        if (hours > 0) {
            timeString += `${hours}j `;
        }
        if (minutes > 0 || hours > 0) {
            timeString += `${minutes}m `;
        }
        timeString += `${seconds}d`;
        
        countdownTimer.innerHTML = `⏰ Tersisa: <span style="color: #dc2626;">${timeString}</span>`;
    }, 1000);
}

// Show error function
function showError(message) {
    errorMessage.textContent = message;
    errorNotification.style.display = 'block';
    hideSuccess();
}

// Hide error function
function hideError() {
    errorNotification.style.display = 'none';
}

// Show success function
function showSuccess(message) {
    successMessage.textContent = message;
    successNotification.style.display = 'block';
    hideError();
}

// Hide success function
function hideSuccess() {
    successNotification.style.display = 'none';
}

// Check login on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = getCookie('login');
    if (!token) {
        generateBtn.disabled = true;
        generateTimeBtn.disabled = true;
        showError('Silakan login terlebih dahulu untuk menggunakan fitur ini');
    }
});

// Auto-hide notifications after 5 seconds
setTimeout(() => {
    hideError();
    hideSuccess();
}, 5000);