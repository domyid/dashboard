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

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadEvents();
    loadUserClaims();
    
    // Check for expired claims every 30 seconds
    setInterval(checkExpiredClaims, 30000);
    
    // Refresh data every 60 seconds
    setInterval(() => {
        loadEvents();
        loadUserClaims();
    }, 60000);
});

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
    
    const isClaimedClass = event.is_claimed ? 'has-background-light' : '';
    const claimButton = event.is_claimed 
        ? '<span class="claimed-badge">Sudah Diklaim</span>'
        : `<button class="button is-primary is-fullwidth" onclick="openClaimModal('${event._id}')">
             <i class="fas fa-hand-paper"></i> Claim Event
           </button>`;
    
    div.innerHTML = `
        <div class="card event-card ${isClaimedClass}">
            <div class="card-content">
                <div class="media">
                    <div class="media-content">
                        <p class="title is-5">${event.name}</p>
                        <div class="is-flex is-justify-content-space-between is-align-items-center mb-3">
                            <span class="event-points">${event.points} Poin</span>
                            ${event.is_claimed ? '<span class="claimed-badge">Sudah Diklaim</span>' : ''}
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
            actionButton = `
                <div class="notification is-info">
                    <p><strong>Tugas sudah disubmit!</strong></p>
                    <p>Link: <a href="${claim.task_link}" target="_blank">${claim.task_link}</a></p>
                    <p>Menunggu approval dari owner...</p>
                </div>
            `;
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

// Check for expired claims
function checkExpiredClaims() {
    try {
        const token = getCookie('login');
        if (!token) return;

        getJSON(backend.checkExpired, 'login', token, (result) => {
            console.log('Check expired response:', result);
            // Silently handle the response, no need to show notifications
        });
    } catch (error) {
        console.error('Error checking expired claims:', error);
    }
}

// Modal functions
window.openClaimModal = function(eventId) {
    const event = currentEvents.find(e => e._id === eventId);
    if (!event) return;

    selectedEvent = event;

    document.getElementById('modalEventName').textContent = event.name;
    document.getElementById('modalEventDescription').textContent = event.description;
    document.getElementById('modalEventPoints').textContent = event.points + ' Poin';

    document.getElementById('claimModal').classList.add('is-active');
};

window.closeClaimModal = function() {
    document.getElementById('claimModal').classList.remove('is-active');
    selectedEvent = null;
};

window.confirmClaim = function() {
    if (!selectedEvent) return;

    const confirmBtn = document.getElementById('confirmClaimBtn');
    const originalText = confirmBtn.innerHTML;

    try {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Claiming...';
        confirmBtn.disabled = true;

        const token = getCookie('login');
        const requestData = {
            event_id: selectedEvent._id
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
                    showNotification('Event berhasil di-claim! Selesaikan tugas sebelum deadline.', 'is-success');
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
                    showNotification('Tugas berhasil disubmit! Menunggu approval dari owner.', 'is-success');
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
