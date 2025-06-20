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

        const result = await response.json();
        return {
            status: response.ok ? 200 : response.status,
            data: result
        };
    } catch (error) {
        console.error('Fallback postJSON error:', error);
        throw error;
    }
}

// Backend URLs
const backend = {
    getAllEvents: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/all',
    claimEvent: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/claim',
    submitTask: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/submit',
    getUserClaims: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/myclaims',
    checkExpired: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/checkexpired'
};

// Global variables
let currentEvents = [];
let currentClaims = [];
let selectedEvent = null;
let selectedClaim = null;
let timers = {};

// DOM Elements
const loadingSpinner = document.getElementById('loadingSpinner');
const eventsContainer = document.getElementById('eventsContainer');
const claimsContainer = document.getElementById('claimsContainer');
const emptyEvents = document.getElementById('emptyEvents');
const emptyClaims = document.getElementById('emptyClaims');

// Note: Initialization moved to main() function for dashboard routing compatibility

// Load all available events
function loadEvents() {
    try {
        showLoading(true);
        const token = getCookie('login');

        if (!token) {
            showNotification('Silakan login terlebih dahulu', 'is-warning');
            showLoading(false);
            return;
        }

        console.log('Loading events from:', backend.getAllEvents);
        console.log('Token:', token);

        getJSON(backend.getAllEvents, 'login', token, (result) => {
            showLoading(false);

            console.log('Events response:', result);

            if (result.status === 200) {
                let responseData;
                if (result.data && result.data.data) {
                    responseData = result.data.data;
                } else if (result.data) {
                    responseData = result.data;
                } else {
                    responseData = [];
                }

                console.log('Processed events data:', responseData);
                currentEvents = responseData || [];
                displayEvents();

                if (currentEvents.length === 0) {
                    showNotification('Belum ada event yang tersedia', 'is-info');
                }
            } else {
                const errorMsg = result.data?.response || result.data?.status || result.message || 'Gagal memuat event';
                showNotification('Error loading events: ' + errorMsg, 'is-danger');
                console.error('Load events error:', result);
            }
        });
    } catch (error) {
        showLoading(false);
        console.error('Error loading events:', error);
        showNotification('Gagal memuat data event: ' + error.message, 'is-danger');
    }
}

// Load user's event claims
function loadUserClaims() {
    try {
        const token = getCookie('login');

        if (!token) {
            currentClaims = [];
            displayClaims();
            return;
        }

        console.log('Loading user claims from:', backend.getUserClaims);

        getJSON(backend.getUserClaims, 'login', token, (result) => {
            console.log('Claims response:', result);

            if (result.status === 200) {
                let responseData;
                if (result.data && result.data.data) {
                    responseData = result.data.data;
                } else if (result.data) {
                    responseData = result.data;
                } else {
                    responseData = [];
                }

                console.log('Processed claims data:', responseData);
                currentClaims = responseData || [];
                displayClaims();
            } else {
                console.log('No claims found or error:', result);
                currentClaims = [];
                displayClaims();
            }
        });
    } catch (error) {
        console.error('Error loading claims:', error);
        currentClaims = [];
        displayClaims();
    }
}

// Display available events
function displayEvents() {
    eventsContainer.innerHTML = '';
    
    if (currentEvents.length === 0) {
        emptyEvents.style.display = 'block';
        return;
    }
    
    emptyEvents.style.display = 'none';
    
    currentEvents.forEach(event => {
        const eventCard = createEventCard(event);
        eventsContainer.appendChild(eventCard);
    });
}

// Create event card HTML
function createEventCard(event) {
    const div = document.createElement('div');
    div.className = 'column is-one-third';

    let cardClass = '';
    let statusBadge = '';
    let claimButton = '';

    if (event.is_claimed_by_any) {
        // Event sudah di-claim user lain
        cardClass = 'has-background-light';
        statusBadge = '<span class="status-expired">Sudah Diklaim User Lain</span>';
        claimButton = '<p class="has-text-grey"><i class="fas fa-lock"></i> Event sudah diklaim user lain</p>';
    } else {
        // Event tersedia untuk di-claim
        cardClass = '';
        statusBadge = '<span class="tag is-success">Tersedia</span>';
        claimButton = `<button class="button is-primary is-fullwidth" onclick="openClaimModal('${event._id}')">
                         <i class="fas fa-hand-paper"></i> Claim Event
                       </button>`;
    }

    div.innerHTML = `
        <div class="card event-card ${cardClass}">
            <div class="card-content">
                <div class="media">
                    <div class="media-content">
                        <p class="title is-5">${event.name}</p>
                        <div class="is-flex is-justify-content-space-between is-align-items-center mb-3">
                            <span class="event-points">${event.points} Poin</span>
                            ${statusBadge}
                        </div>
                    </div>
                </div>
                <div class="content">
                    <p>${event.description}</p>
                    <div class="mt-4">
                        ${claimButton}
                    </div>
                </div>
            </div>
        </div>
    `;

    return div;
}

// Display user claims
function displayClaims() {
    claimsContainer.innerHTML = '';
    
    if (currentClaims.length === 0) {
        emptyClaims.style.display = 'block';
        return;
    }
    
    emptyClaims.style.display = 'none';
    
    currentClaims.forEach(claim => {
        const claimCard = createClaimCard(claim);
        claimsContainer.appendChild(claimCard);
    });
}

// Create claim card HTML
function createClaimCard(claim) {
    const div = document.createElement('div');
    div.className = 'column is-half';
    
    const now = new Date();
    const deadline = new Date(claim.deadline);
    const isExpired = now > deadline && claim.status === 'claimed';
    
    let statusBadge = '';
    let actionButton = '';
    
    switch (claim.status) {
        case 'claimed':
            if (isExpired) {
                statusBadge = '<span class="status-expired">Expired</span>';
                actionButton = '<p class="has-text-grey">Waktu habis, event tersedia untuk user lain</p>';
            } else {
                statusBadge = '<span class="claimed-badge">Diklaim</span>';
                actionButton = `
                    <div class="timer-display" id="timer-${claim.claim_id}">
                        Loading timer...
                    </div>
                    <button class="button is-success is-fullwidth" onclick="openSubmitModal('${claim.claim_id}')">
                        <i class="fas fa-upload"></i> Submit Tugas
                    </button>
                `;
            }
            break;
        case 'submitted':
            statusBadge = '<span class="status-submitted">Menunggu Approval</span>';

            // Get approval deadline dari backend response atau calculate manual
            let approvalDeadline;
            if (claim.approval_deadline) {
                approvalDeadline = new Date(claim.approval_deadline);
            } else {
                // Fallback: calculate manual jika backend belum update
                const submittedTime = new Date(claim.submitted_at);
                approvalDeadline = new Date(submittedTime.getTime() + (86400 * 1000)); // 24 jam dari submit
            }

            const approvalCountdownId = `approval-countdown-${claim.claim_id}`;

            actionButton = `
                <div class="notification is-info">
                    <p><strong>Tugas sudah disubmit!</strong></p>
                    <p>Link: <a href="${claim.task_link}" target="_blank">${claim.task_link}</a></p>
                    <p>Menunggu approval dari owner...</p>
                    <div class="mt-3">
                        <p><strong>⏰ Sisa waktu approval:</strong></p>
                        <p id="${approvalCountdownId}" class="has-text-weight-bold has-text-primary" style="font-size: 1.2em;">
                            Menghitung...
                        </p>
                        <p class="is-size-7 has-text-grey">
                            Jika tidak di-approve dalam 24 jam, event akan tersedia lagi untuk user lain
                        </p>
                    </div>
                </div>
            `;

            // Start approval countdown setelah DOM ready
            setTimeout(() => {
                startApprovalCountdown(approvalCountdownId, approvalDeadline, claim.claim_id);
            }, 100);
            break;
        case 'approved':
            statusBadge = '<span class="status-approved">Approved</span>';
            actionButton = `
                <div class="notification is-success">
                    <p><strong>Selamat! Tugas Anda telah disetujui</strong></p>
                    <p>Anda mendapat ${claim.event.points} poin</p>
                </div>
            `;
            break;
    }
    
    div.innerHTML = `
        <div class="card event-card">
            <div class="card-content">
                <div class="media">
                    <div class="media-content">
                        <p class="title is-5">${claim.event.name}</p>
                        <div class="is-flex is-justify-content-space-between is-align-items-center mb-3">
                            <span class="event-points">${claim.event.points} Poin</span>
                            ${statusBadge}
                        </div>
                    </div>
                </div>
                <div class="content">
                    <p>${claim.event.description}</p>
                    <div class="mt-4">
                        ${actionButton}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Start timer if needed
    if (claim.status === 'claimed' && !isExpired) {
        setTimeout(() => startTimer(claim.claim_id, deadline), 100);
    }
    
    return div;
}

// Start countdown timer
function startTimer(claimId, deadline) {
    const timerElement = document.getElementById(`timer-${claimId}`);
    if (!timerElement) return;

    const updateTimer = () => {
        const now = new Date();
        const timeLeft = deadline - now;

        if (timeLeft <= 0) {
            timerElement.innerHTML = 'Waktu Habis!';
            timerElement.classList.add('timer-expired');
            clearInterval(timers[claimId]);

            // Refresh data to update UI
            setTimeout(() => {
                loadEvents();
                loadUserClaims();
            }, 1000);
            return;
        }

        const seconds = Math.floor(timeLeft / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        let display = '';
        if (hours > 0) {
            display = `${hours}j ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            display = `${minutes}m ${seconds % 60}s`;
        } else {
            display = `${seconds}s`;
        }

        timerElement.innerHTML = `⏰ Sisa waktu: ${display}`;
    };

    updateTimer();
    timers[claimId] = setInterval(updateTimer, 1000);
}

// Start approval countdown timer (24 jam)
function startApprovalCountdown(countdownId, approvalDeadline, claimId) {
    const countdownElement = document.getElementById(countdownId);
    if (!countdownElement) return;

    const updateCountdown = () => {
        const now = new Date();
        const timeLeft = approvalDeadline - now;

        if (timeLeft <= 0) {
            countdownElement.innerHTML = '⏰ Waktu approval habis!';
            countdownElement.classList.add('has-text-danger');
            clearInterval(timers[`approval-${claimId}`]);

            // Show notification
            showNotification('Waktu approval habis! Event akan tersedia lagi untuk user lain.', 'is-warning');

            // Refresh data to update UI
            setTimeout(() => {
                loadEvents();
                loadUserClaims();
            }, 2000);
            return;
        }

        const totalSeconds = Math.floor(timeLeft / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let display = '';
        if (hours > 0) {
            display = `${hours} jam ${minutes} menit`;
        } else if (minutes > 0) {
            display = `${minutes} menit ${seconds} detik`;
        } else {
            display = `${seconds} detik`;
        }

        // Change color based on time left
        if (hours < 1) {
            countdownElement.classList.remove('has-text-primary');
            countdownElement.classList.add('has-text-warning');
        }
        if (minutes < 30 && hours === 0) {
            countdownElement.classList.remove('has-text-warning');
            countdownElement.classList.add('has-text-danger');
        }

        countdownElement.innerHTML = display;
    };

    updateCountdown();
    timers[`approval-${claimId}`] = setInterval(updateCountdown, 1000);
}

// Show/hide loading spinner
function showLoading(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
}

// Show notification
function showNotification(message, type = 'is-info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type} is-fixed-top`;
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 400px;';
    notification.innerHTML = `
        <button class="delete"></button>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
    
    // Add click to close
    notification.querySelector('.delete').addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}

// Check for expired claims - call backend untuk recovery 24 jam timeout
function checkExpiredClaims() {
    try {
        // Call backend endpoint untuk check dan recovery expired approvals
        fetch(backend.checkExpired)
            .then(response => response.json())
            .then(result => {
                console.log('Check expired response:', result);

                // Jika ada recovery, refresh data untuk update UI
                if (result.Status === 'Success' && result.Data && result.Data.processed > 0) {
                    console.log(`✅ Recovered ${result.Data.processed} expired events`);

                    // Refresh events dan claims untuk show recovered events
                    setTimeout(() => {
                        loadEvents();
                        loadUserClaims();
                    }, 1000);
                }
            })
            .catch(error => {
                console.error('Error checking expired claims:', error);
                // Silent fail - tidak mengganggu user experience
            });
    } catch (error) {
        console.error('Error in checkExpiredClaims:', error);
    }
}

// Modal functions
window.openClaimModal = function(eventId) {
    const event = currentEvents.find(e => e._id === eventId);
    if (!event) return;

    // Check if event is available for claim (hanya cek user lain)
    if (event.is_claimed_by_any) {
        showNotification('Event ini sudah diklaim oleh user lain', 'is-warning');
        return;
    }

    selectedEvent = event;

    document.getElementById('modalEventName').textContent = event.name;
    document.getElementById('modalEventDescription').textContent = event.description;
    document.getElementById('modalEventPoints').textContent = event.points + ' Poin';

    // Reset deadline input to default value
    document.getElementById('deadlineInput').value = 60;

    document.getElementById('claimModal').classList.add('is-active');
};

window.closeClaimModal = function() {
    document.getElementById('claimModal').classList.remove('is-active');
    selectedEvent = null;
};

window.confirmClaim = function() {
    if (!selectedEvent) return;

    // Get deadline from input
    const deadlineInput = document.getElementById('deadlineInput');
    const deadlineSeconds = parseInt(deadlineInput.value);

    // Validate deadline
    if (!deadlineSeconds || deadlineSeconds < 1 || deadlineSeconds > 3600) {
        showNotification('Deadline harus antara 1-3600 detik', 'is-warning');
        return;
    }

    const confirmBtn = document.getElementById('confirmClaimBtn');
    const originalText = confirmBtn.innerHTML;

    try {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Claiming...';
        confirmBtn.disabled = true;

        const token = getCookie('login');
        const requestData = {
            event_id: selectedEvent._id,
            deadline_seconds: deadlineSeconds
        };

        console.log('Claiming event:', requestData);

        postJSON(backend.claimEvent, 'login', token, requestData, (result) => {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;

            console.log('Claim response:', result);

            if (result.status === 200) {
                let responseData;
                if (result.data && result.data.data) {
                    responseData = result.data.data;
                } else if (result.data) {
                    responseData = result.data;
                } else {
                    responseData = result;
                }

                if (responseData.status === 'Success' || result.data?.status === 'Success') {
                    const deadlineSeconds = responseData.deadline_seconds || deadlineSeconds;
                    const message = responseData.message || `Event berhasil di-claim! Anda memiliki ${deadlineSeconds} detik untuk menyelesaikan tugas.`;
                    showNotification(message, 'is-success');
                    closeClaimModal();

                    // Refresh data
                    loadEvents();
                    loadUserClaims();
                } else {
                    const errorMsg = responseData.response || responseData.status || 'Gagal claim event';
                    showNotification('Error: ' + errorMsg, 'is-danger');
                }
            } else {
                const errorMsg = result.data?.response || result.data?.status || result.message || 'Gagal claim event';
                showNotification('Error: ' + errorMsg, 'is-danger');
                console.error('Claim event error:', result);
            }
        });
    } catch (error) {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        console.error('Error claiming event:', error);
        showNotification('Gagal claim event: ' + error.message, 'is-danger');
    }
};

window.openSubmitModal = function(claimId) {
    const claim = currentClaims.find(c => c.claim_id === claimId);
    if (!claim) return;

    selectedClaim = claim;

    document.getElementById('submitEventName').textContent = claim.event.name;
    document.getElementById('taskLinkInput').value = '';

    document.getElementById('submitModal').classList.add('is-active');
};

window.closeSubmitModal = function() {
    document.getElementById('submitModal').classList.remove('is-active');
    selectedClaim = null;
};

window.confirmSubmit = function() {
    if (!selectedClaim) return;

    const taskLink = document.getElementById('taskLinkInput').value.trim();
    if (!taskLink) {
        showNotification('Silakan masukkan link tugas', 'is-warning');
        return;
    }

    // Validate URL format
    try {
        new URL(taskLink);
    } catch (e) {
        showNotification('Format link tidak valid', 'is-warning');
        return;
    }

    const confirmBtn = document.getElementById('confirmSubmitBtn');
    const originalText = confirmBtn.innerHTML;

    try {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        confirmBtn.disabled = true;

        const token = getCookie('login');
        const requestData = {
            claim_id: selectedClaim.claim_id,
            task_link: taskLink
        };

        console.log('Submitting task:', requestData);

        postJSON(backend.submitTask, 'login', token, requestData, (result) => {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;

            console.log('Submit response:', result);

            if (result.status === 200) {
                let responseData;
                if (result.data && result.data.data) {
                    responseData = result.data.data;
                } else if (result.data) {
                    responseData = result.data;
                } else {
                    responseData = result;
                }

                if (responseData.status === 'Success' || result.data?.status === 'Success') {
                    showNotification('Tugas berhasil disubmit! Menunggu approval dari owner dalam 24 jam. Countdown akan muncul di card Anda.', 'is-success');
                    closeSubmitModal();

                    // Refresh data
                    loadUserClaims();
                } else {
                    const errorMsg = responseData.response || responseData.status || 'Gagal submit tugas';
                    showNotification('Error: ' + errorMsg, 'is-danger');
                }
            } else {
                const errorMsg = result.data?.response || result.data?.status || result.message || 'Gagal submit tugas';
                showNotification('Error: ' + errorMsg, 'is-danger');
                console.error('Submit task error:', result);
            }
        });
    } catch (error) {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        console.error('Error submitting task:', error);
        showNotification('Gagal submit tugas: ' + error.message, 'is-danger');
    }
};

// Close modals when clicking background
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-background')) {
        closeClaimModal();
        closeSubmitModal();
    }
});

// Close modals with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeClaimModal();
        closeSubmitModal();
    }
});

// Cleanup timers when page unloads
window.addEventListener('beforeunload', function() {
    Object.values(timers).forEach(timer => clearInterval(timer));
});

// Add CSS for countdown styling
function addCountdownCSS() {
    if (document.getElementById('countdown-css')) return; // Prevent duplicate

    const style = document.createElement('style');
    style.id = 'countdown-css';
    style.textContent = `
        .approval-countdown {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            text-align: center;
            font-weight: bold;
            margin: 8px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        }

        .approval-countdown.has-text-warning {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
        }

        .approval-countdown.has-text-danger {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%) !important;
            animation: pulse 1s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
}

// Main function required by dashboard routing system
export function main() {
    console.log('Bimbinganevent main function called');
    console.log('Backend URLs:', backend);

    // Add countdown CSS
    addCountdownCSS();

    // Check if user is logged in
    const token = getCookie('login');
    console.log('Login token:', token ? 'Found' : 'Not found');

    if (!token) {
        showNotification('Silakan login terlebih dahulu', 'is-warning');
        return;
    }

    // Initialize the page
    console.log('Initializing bimbinganevent page...');
    loadEvents();
    loadUserClaims();

    // Check for expired claims setiap 30 detik untuk recovery 24 jam timeout
    setInterval(checkExpiredClaims, 30000);

    // Refresh data every 60 seconds
    setInterval(() => {
        console.log('Auto-refreshing data...');
        loadEvents();
        loadUserClaims();
    }, 60000);

    // Add manual test button for debugging
    addDebugButton();
}

// Add debug button for manual testing
function addDebugButton() {
    const debugButton = document.createElement('button');
    debugButton.className = 'button is-info is-small';
    debugButton.innerHTML = '<i class="fas fa-bug"></i> Debug Test';
    debugButton.style.position = 'fixed';
    debugButton.style.top = '10px';
    debugButton.style.right = '10px';
    debugButton.style.zIndex = '9999';

    debugButton.addEventListener('click', function() {
        console.log('=== DEBUG TEST ===');
        console.log('Current events:', currentEvents);
        console.log('Current claims:', currentClaims);
        console.log('Backend URLs:', backend);
        console.log('Login token:', getCookie('login'));

        // Manual API test
        testAPIManually();
    });

    document.body.appendChild(debugButton);
}

// Manual API test function
async function testAPIManually() {
    const token = getCookie('login');
    console.log('Testing API manually...');

    try {
        const response = await fetch(backend.getAllEvents, {
            method: 'GET',
            headers: {
                'login': token
            }
        });

        console.log('Manual API test response status:', response.status);
        console.log('Manual API test response headers:', response.headers);

        const result = await response.json();
        console.log('Manual API test result:', result);

        if (response.ok) {
            showNotification('API test berhasil! Check console untuk detail.', 'is-success');
        } else {
            showNotification('API test gagal: ' + result.status, 'is-danger');
        }
    } catch (error) {
        console.error('Manual API test error:', error);
        showNotification('API test error: ' + error.message, 'is-danger');
    }
}
