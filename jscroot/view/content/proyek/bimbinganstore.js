import { getJSON, postJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";

// Backend endpoints
const backend = {
    getUserPoints: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/mypoints',
    buyBimbinganCode: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/store/buy-bimbingan-code'
};

// Global variables
let userPointsData = null;

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
    const token = getCookie('login');
    if (!token) {
        console.log('No login token found');
        return;
    }

    console.log('Loading user points...');
    
    getJSON(backend.getUserPoints, 'login', token, (result) => {
        console.log('User points response:', result);
        
        if (result.status === 200 && (result.data?.Status === 'Success' || result.data?.status === 'Success')) {
            userPointsData = result.data.Data || result.data.data;
            console.log('Points data:', userPointsData);
            updatePointsDisplay(userPointsData.total_event_points || 0);
            updateBuyButton();
        } else {
            console.error('Failed to load user points:', result);
            updatePointsDisplay(0);
        }
    });
}

// Update points display
function updatePointsDisplay(points) {
    const pointsElement = document.getElementById('totalEventPoints');
    if (pointsElement) {
        pointsElement.textContent = `${points} Poin`;
    }
}

// Update buy button state
function updateBuyButton() {
    const buyBtn = document.getElementById('buyCodeBtn');
    if (!buyBtn) {
        console.log('Buy button not found in DOM yet');
        return;
    }

    const currentPoints = userPointsData?.total_event_points || 0;
    const requiredPoints = 15;

    if (currentPoints >= requiredPoints) {
        buyBtn.disabled = false;
        buyBtn.innerHTML = '<span class="icon"><i class="fas fa-shopping-cart"></i></span><span>Beli Sekarang</span>';
    } else {
        buyBtn.disabled = true;
        buyBtn.innerHTML = `<span class="icon"><i class="fas fa-coins"></i></span><span>Butuh ${requiredPoints - currentPoints} poin lagi</span>`;
    }
}

// Buy bimbingan code
window.buyBimbinganCode = function() {
    console.log('=== BUY FUNCTION CALLED ===');
    console.log('Backend object:', backend);
    console.log('Buy endpoint URL:', backend.buyBimbinganCode);
    console.log('Timestamp:', new Date().toISOString());

    const currentPoints = userPointsData?.total_event_points || 0;
    const requiredPoints = 15;

    if (currentPoints < requiredPoints) {
        showNotification(`Poin tidak cukup! Anda memiliki ${currentPoints} poin, butuh ${requiredPoints} poin.`, 'is-warning');
        return;
    }

    const token = getCookie('login');
    if (!token) {
        showNotification('Anda harus login terlebih dahulu', 'is-warning');
        return;
    }

    const buyBtn = document.getElementById('buyCodeBtn');
    buyBtn.disabled = true;
    buyBtn.innerHTML = '<span class="icon"><i class="fas fa-spinner fa-spin"></i></span><span>Memproses...</span>';

    const requestData = {};

    console.log('About to call postJSON with URL:', backend.buyBimbinganCode);

    postJSON(backend.buyBimbinganCode, 'login', token, requestData, (result) => {
        console.log('Buy response:', result);
        console.log('Response status:', result.status);
        console.log('Response data:', result.data);

        buyBtn.disabled = false;
        updateBuyButton();

        // Handle different response structures
        if (result.status === 200) {
            const responseData = result.data || result;

            if (responseData.Status === 'Success' || responseData.status === 'Success') {
                const codeData = responseData.Data || responseData.data || {};
                const generatedCode = codeData.code || 'ERROR';
                const newPoints = codeData.remaining_points !== undefined ? codeData.remaining_points : (currentPoints - 15);

                console.log('Generated code:', generatedCode);
                console.log('Remaining points:', newPoints);

                showSuccessModal(generatedCode, newPoints);

                // Update points
                userPointsData.total_event_points = newPoints;
                updatePointsDisplay(newPoints);
                updateBuyButton();

                showNotification('Code bimbingan berhasil dibeli!', 'is-success');
            } else {
                const errorMsg = responseData.Response || responseData.response || 'Gagal membeli code';
                console.error('Purchase failed:', errorMsg);
                showNotification('Error: ' + errorMsg, 'is-danger');
            }
        } else {
            // Handle HTTP errors
            const errorMsg = result.data?.response || result.data?.Response || `HTTP ${result.status} Error`;
            console.error('HTTP Error:', result.status, errorMsg);
            showNotification('Error: ' + errorMsg, 'is-danger');
        }
    });
};

// Show success modal
function showSuccessModal(code, remainingPoints) {
    document.getElementById('generatedCode').textContent = code;
    document.getElementById('remainingPoints').textContent = remainingPoints;
    document.getElementById('successModal').classList.add('is-active');
}

// Close success modal
window.closeSuccessModal = function() {
    document.getElementById('successModal').classList.remove('is-active');
};

// Copy code to clipboard
window.copyCode = function() {
    const code = document.getElementById('generatedCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Code berhasil disalin ke clipboard!', 'is-success');
    }).catch(() => {
        showNotification('Gagal menyalin code', 'is-warning');
    });
};





// Main function (required by dashboard routing)
export function main() {
    console.log('Bimbinganstore main function called - Version 2.0');
    console.log('Backend URLs:', backend);
    console.log('Current timestamp:', new Date().toISOString());

    const token = getCookie('login');
    console.log('Login token:', token ? 'Found' : 'Not found');

    if (!token) {
        showNotification('Silakan login terlebih dahulu untuk menggunakan store', 'is-warning');
        return;
    }

    console.log('Initializing bimbinganstore page...');

    // Add small delay to ensure DOM is ready
    setTimeout(() => {
        loadUserPoints();
    }, 100);
}

// Auto-refresh points every 6 seconds
setInterval(() => {
    if (document.visibilityState === 'visible') {
        console.log('Auto-refreshing user points...');
        loadUserPoints();
    }
// }, 60000);
}, 6000);
