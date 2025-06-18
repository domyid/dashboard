import { getJSON, postJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";

// Backend URLs - sesuaikan dengan konfigurasi Anda
const backend = {
    generateCode: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/generatecode',
    generateTimeCode: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/generatecodetime',
    createEvent: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/create'
};

// DOM Elements
const generateBtn = document.getElementById('generateBtn');
const codeContainer = document.getElementById('codeContainer');
const generatedCode = document.getElementById('generatedCode');
const copyBtn = document.getElementById('copyBtn');

// Event Management Elements
const createEventBtn = document.getElementById('createEventBtn');
const eventContainer = document.getElementById('eventContainer');
const eventNameInput = document.getElementById('eventName');
const eventDescriptionInput = document.getElementById('eventDescription');
const eventPointsInput = document.getElementById('eventPoints');

// Time Event Elements
const generateTimeBtn = document.getElementById('generateTimeBtn');
const timeCodeContainer = document.getElementById('timeCodeContainer');
const generatedTimeCode = document.getElementById('generatedTimeCode');
const displayTimeCode = document.getElementById('displayTimeCode');
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
                console.log('Response data:', result); // Debug log
                
                let responseData;
                // Handle different response formats
                if (result.data && result.data.data) {
                    // Format: {status: "Success", data: {...}}
                    responseData = result.data.data;
                } else if (result.data) {
                    // Direct data format
                    responseData = result.data;
                } else {
                    console.error('Unexpected response format:', result);
                    showError('Format response tidak valid');
                    return;
                }
                
                if (!responseData.code || !responseData.expires_at || !responseData.duration) {
                    console.error('Missing required fields in response:', responseData);
                    showError('Data response tidak lengkap');
                    return;
                }
                
                generatedTimeCode.textContent = responseData.code;
                displayTimeCode.textContent = responseData.code;
                
                // Show time information
                const createdDate = new Date();
                
                // Parse expiry date - handle different formats
                let expiryDate;
                if (responseData.expires_at.includes('T')) {
                    // ISO format: 2024-01-15T14:30:00Z
                    expiryDate = new Date(responseData.expires_at);
                } else {
                    // Custom format: 2024-01-15 14:30:00
                    const dateStr = responseData.expires_at.replace(' ', 'T');
                    expiryDate = new Date(dateStr);
                }
                
                // Validate dates
                if (isNaN(createdDate.getTime()) || isNaN(expiryDate.getTime())) {
                    console.error('Invalid date format:', responseData.expires_at);
                    showError('Format tanggal tidak valid');
                    return;
                }
                
                createdTime.textContent = createdDate.toLocaleString('id-ID');
                expiryTime.textContent = expiryDate.toLocaleString('id-ID');
                duration.textContent = responseData.duration;
                
                // Set expiry timestamp for countdown
                expiryTimestamp = expiryDate.getTime();
                
                // Validate expiry timestamp
                if (isNaN(expiryTimestamp)) {
                    console.error('Invalid expiry timestamp');
                    showError('Timestamp kadaluarsa tidak valid');
                    return;
                }
                
                // Start countdown timer
                startCountdown();
                
                timeCodeContainer.style.display = 'block';
                hideError();
                showSuccess('Kode time event berhasil di-generate!');
            } else {
                // Show error
                const errorMsg = result.data?.response || result.data?.status || result.message || 'Gagal generate time code';
                showError(errorMsg);
                console.error('Generate time code error:', result);
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
    
    // Validate expiryTimestamp
    if (!expiryTimestamp || isNaN(expiryTimestamp)) {
        countdownTimer.innerHTML = '⚠️ <span style="color: #dc2626;">Error: Waktu kadaluarsa tidak valid!</span>';
        return;
    }
    
    // Function to update countdown
    function updateCountdown() {
        const now = Date.now();
        const timeLeft = expiryTimestamp - now;
        
        if (timeLeft <= 0) {
            // Time expired
            countdownTimer.innerHTML = '⏰ <span style="color: #dc2626;">-</span>';
            clearInterval(countdownInterval);
            return;
        }
        
        // Calculate time components
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        // Validate calculated values
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
            countdownTimer.innerHTML = '⚠️ <span style="color: #dc2626;">Error: Perhitungan waktu tidak valid!</span>';
            clearInterval(countdownInterval);
            return;
        }
        
        // Format and display
        let timeString = '';
        if (hours > 0) {
            timeString += `${hours}j `;
        }
        if (minutes > 0 || hours > 0) {
            timeString += `${minutes}m `;
        }
        timeString += `${seconds}d`;
        
        // Add color coding based on time left
        let colorClass = '#dc2626'; // red (default)
        if (timeLeft > 5 * 60 * 1000) { // more than 5 minutes
            colorClass = '#059669'; // green
        } else if (timeLeft > 1 * 60 * 1000) { // more than 1 minute
            colorClass = '#d97706'; // orange
        }
        
        countdownTimer.innerHTML = `⏰ Tersisa: <span style="color: ${colorClass}; font-weight: bold;">${timeString}</span>`;
    }
    
    // Initial call
    updateCountdown();
    
    // Set interval to update every second
    countdownInterval = setInterval(updateCountdown, 1000);
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

// Create Event function
createEventBtn.addEventListener('click', async () => {
    const eventName = eventNameInput.value.trim();
    const eventDescription = eventDescriptionInput.value.trim();
    const eventPoints = parseInt(eventPointsInput.value);

    // Validation
    if (!eventName) {
        showError('Nama event tidak boleh kosong');
        return;
    }

    if (!eventPoints || eventPoints <= 0) {
        showError('Points harus lebih dari 0');
        return;
    }

    // Disable button and show loading
    createEventBtn.disabled = true;
    createEventBtn.textContent = 'Creating...';

    try {
        const eventData = {
            name: eventName,
            description: eventDescription,
            points: eventPoints
        };

        const result = await postJSON(backend.createEvent, 'login', getCookie('login'), eventData);

        if (result.status === 'Success') {
            // Show success
            const responseData = result.data;

            document.getElementById('createdEventId').value = responseData.event_id;
            document.getElementById('createdEventName').value = eventName;
            document.getElementById('createdEventPoints').value = eventPoints + ' Points';

            eventContainer.style.display = 'block';
            hideError();
            showSuccess('Event berhasil dibuat!');

            // Clear form
            eventNameInput.value = '';
            eventDescriptionInput.value = '';
            eventPointsInput.value = '';
        } else {
            // Show error
            const errorMsg = result.info || result.response || result.status || 'Gagal membuat event';
            showError(errorMsg);
            console.error('Create event error:', result);
        }
    } catch (error) {
        showError('Terjadi kesalahan: ' + error.message);
        console.error('Create event error:', error);
    } finally {
        createEventBtn.disabled = false;
        createEventBtn.textContent = 'Create Event';
    }
});

// Check login on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = getCookie('login');
    if (!token) {
        generateBtn.disabled = true;
        generateTimeBtn.disabled = true;
        createEventBtn.disabled = true;
        showError('Silakan login terlebih dahulu untuk menggunakan fitur ini');
    }
});

// Auto-hide notifications after 5 seconds
setTimeout(() => {
    hideError();
    hideSuccess();
}, 5000);