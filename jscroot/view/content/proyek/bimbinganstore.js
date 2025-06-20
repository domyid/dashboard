import { getJSON, postJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";

// Fallback postJSON function if the imported one fails
async function postJSONFallback(url, headerName, headerValue, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [headerName]: headerValue
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('Fallback postJSON error:', error);
        throw error;
    }
}

// Backend endpoints
const backend = {
    getUserPoints: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/mypoints',
    buyBimbinganCode: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/store/buy-bimbingan-code'
};

// Global variables
let userPointsData = null;

// DOM elements
const loadingSpinner = document.getElementById('loadingSpinner');
const userPointsElement = document.getElementById('userPoints');
const buyCodeBtn = document.getElementById('buyCodeBtn');
const successModal = document.getElementById('successModal');
const generatedCodeElement = document.getElementById('generatedCode');
const remainingPointsElement = document.getElementById('remainingPoints');

// Show/hide loading
function showLoading() {
    loadingSpinner.style.display = 'block';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

// Show notifications
function showNotification(message, type = 'is-info') {
    const notificationsContainer = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <button class="delete"></button>
        ${message}
    `;
    
    notificationsContainer.appendChild(notification);
    
    // Add click to close
    notification.querySelector('.delete').addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Load user points
function loadUserPoints() {
    showLoading();

    const token = getCookie('login');
    if (!token) {
        hideLoading();
        showNotification('Anda harus login terlebih dahulu', 'is-warning');
        buyCodeBtn.disabled = true;
        return;
    }

    console.log('Loading user points from:', backend.getUserPoints);

    getJSON(backend.getUserPoints, 'login', token, (result) => {
        hideLoading();
        console.log('User points response:', result);
        console.log('Response status:', result.status);
        console.log('Response data:', result.data);

        if (result.status === 200 && result.data?.Status === 'Success') {
            userPointsData = result.data.Data;
            console.log('Points data:', userPointsData);
            console.log('Total event points:', userPointsData.total_event_points);
            updatePointsDisplay(userPointsData.total_event_points || 0);
            updateBuyButton();
        } else {
            console.error('Failed to load user points:', result);
            console.error('Status:', result.status);
            console.error('Data:', result.data);
            showNotification('Gagal memuat data poin: ' + (result.data?.Response || 'Unknown error'), 'is-danger');
            buyCodeBtn.disabled = true;
            // Set default data
            userPointsData = { total_event_points: 0 };
            updatePointsDisplay(0);
        }
    });
}

// Update points display
function updatePointsDisplay(points) {
    userPointsElement.textContent = `${points} Poin`;
}

// Update buy button state
function updateBuyButton() {
    const currentPoints = userPointsData?.total_event_points || 0;
    const requiredPoints = 15;
    
    if (currentPoints >= requiredPoints) {
        buyCodeBtn.disabled = false;
        buyCodeBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Beli Sekarang';
    } else {
        buyCodeBtn.disabled = true;
        buyCodeBtn.innerHTML = `<i class="fas fa-coins"></i> Butuh ${requiredPoints - currentPoints} poin lagi`;
    }
}

// Buy bimbingan code
window.buyBimbinganCode = function() {
    const currentPoints = userPointsData?.total_event_points || 0;
    const requiredPoints = 15;

    // Validation
    if (currentPoints < requiredPoints) {
        showNotification(`Poin tidak cukup! Anda memiliki ${currentPoints} poin, butuh ${requiredPoints} poin.`, 'is-warning');
        return;
    }

    const token = getCookie('login');
    if (!token) {
        showNotification('Anda harus login terlebih dahulu', 'is-warning');
        return;
    }

    // Disable button and show loading
    buyCodeBtn.disabled = true;
    buyCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

    const requestData = {};

    console.log('Buying bimbingan code...');
    
    try {
        // Try using the imported postJSON first
        postJSON(backend.buyBimbinganCode, 'login', token, requestData, (result) => {
            console.log('Buy code response:', result);
            handleBuyResponse(result);
        });
    } catch (postJSONError) {
        console.error('postJSON failed, trying fallback:', postJSONError);
        
        // Use fallback method
        postJSONFallback(backend.buyBimbinganCode, 'login', token, requestData)
            .then(result => {
                console.log('Fallback buy response:', result);
                handleBuyResponse(result);
            })
            .catch(fallbackError => {
                console.error('Fallback also failed:', fallbackError);
                buyCodeBtn.disabled = false;
                updateBuyButton();
                showNotification('Gagal melakukan pembelian: ' + fallbackError.message, 'is-danger');
            });
    }
};

// Handle buy response
function handleBuyResponse(result) {
    buyCodeBtn.disabled = false;
    
    console.log('Processing buy response:', result);
    
    let responseData;
    if (result.data && result.data.Status) {
        responseData = result.data;
    } else if (result.Status) {
        responseData = result;
    } else {
        responseData = result;
    }
    
    if (responseData.Status === 'Success' || result.status === 200) {
        // Success - show modal with code
        const codeData = responseData.Data || responseData.data || {};
        const generatedCode = codeData.code || codeData.generated_code || 'CODE_ERROR';
        const newPoints = codeData.remaining_points !== undefined ? codeData.remaining_points : (userPointsData.total_event_points - 15);

        showSuccessModal(generatedCode, newPoints);

        // Update user points
        userPointsData.total_event_points = newPoints;
        updatePointsDisplay(newPoints);
        updateBuyButton();

        showNotification('Code bimbingan sekali pakai berhasil dibeli! Bagikan kepada user lain.', 'is-success');
    } else {
        // Error
        const errorMsg = responseData.Response || responseData.response || responseData.message || 'Gagal membeli code';
        showNotification('Error: ' + errorMsg, 'is-danger');
        updateBuyButton();
    }
}

// Show success modal
function showSuccessModal(code, remainingPoints) {
    generatedCodeElement.textContent = code;
    remainingPointsElement.textContent = remainingPoints;
    successModal.classList.add('is-active');
}

// Close success modal
window.closeSuccessModal = function() {
    successModal.classList.remove('is-active');
};

// Copy code to clipboard
window.copyCode = function() {
    const code = generatedCodeElement.textContent;
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Code berhasil disalin ke clipboard!', 'is-success');
    }).catch(() => {
        showNotification('Gagal menyalin code', 'is-warning');
    });
};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing bimbinganstore page...');
    loadUserPoints();

    // Check login on page load
    const token = getCookie('login');
    if (!token) {
        buyCodeBtn.disabled = true;
        showNotification('Silakan login terlebih dahulu untuk menggunakan store', 'is-warning');
    }

    // Add debug button
    addDebugButton();
});

// Auto-refresh points every 60 seconds
setInterval(() => {
    console.log('Auto-refreshing user points...');
    loadUserPoints();
}, 60000);

// Add debug button for manual testing
function addDebugButton() {
    const debugButton = document.createElement('button');
    debugButton.className = 'button is-info is-small';
    debugButton.innerHTML = '<i class="fas fa-bug"></i> Debug Points';
    debugButton.style.position = 'fixed';
    debugButton.style.top = '10px';
    debugButton.style.right = '10px';
    debugButton.style.zIndex = '9999';

    debugButton.addEventListener('click', function() {
        console.log('=== STORE DEBUG TEST ===');
        console.log('Backend URLs:', backend);
        console.log('Login token:', getCookie('login'));
        console.log('User points data:', userPointsData);

        // Manual API test
        testPointsAPIManually();
    });

    document.body.appendChild(debugButton);
}

// Manual API test function for points
async function testPointsAPIManually() {
    const token = getCookie('login');
    console.log('Testing Points API manually...');

    try {
        console.log('Testing endpoint:', backend.getUserPoints);
        const response = await fetch(backend.getUserPoints, {
            method: 'GET',
            headers: {
                'login': token
            }
        });

        console.log('Manual Points API response status:', response.status);
        console.log('Manual Points API response headers:', [...response.headers.entries()]);

        const result = await response.json();
        console.log('Manual Points API result:', result);

        if (response.ok && result.Status === 'Success') {
            showNotification('Points API test berhasil! Points: ' + result.Data.total_event_points, 'is-success');

            // Update display with result
            userPointsData = result.Data;
            updatePointsDisplay(result.Data.total_event_points || 0);
            updateBuyButton();
        } else {
            showNotification('Points API test gagal: ' + (result.Response || result.Status), 'is-danger');
        }
    } catch (error) {
        console.error('Manual Points API test error:', error);
        showNotification('Points API test error: ' + error.message, 'is-danger');
    }
}
