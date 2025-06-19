import { getJSON, postJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";

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
async function loadEvents() {
    try {
        showLoading(true);
        const token = getCookie('login');
        
        const response = await getJSON(backend.getAllEvents, 'login', token);
        
        if (response.status === 'Success') {
            currentEvents = response.data || [];
            displayEvents();
        } else {
            showNotification('Error loading events: ' + response.response, 'is-danger');
        }
    } catch (error) {
        console.error('Error loading events:', error);
        showNotification('Gagal memuat data event', 'is-danger');
    } finally {
        showLoading(false);
    }
}

// Load user's event claims
async function loadUserClaims() {
    try {
        const token = getCookie('login');
        
        const response = await getJSON(backend.getUserClaims, 'login', token);
        
        if (response.status === 'Success') {
            currentClaims = response.data || [];
            displayClaims();
        } else {
            console.log('No claims found or error:', response.response);
            currentClaims = [];
            displayClaims();
        }
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
async function checkExpiredClaims() {
    try {
        const token = getCookie('login');
        await getJSON(backend.checkExpired, 'login', token);
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

window.confirmClaim = async function() {
    if (!selectedEvent) return;

    const confirmBtn = document.getElementById('confirmClaimBtn');
    const originalText = confirmBtn.innerHTML;

    try {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Claiming...';
        confirmBtn.disabled = true;

        const token = getCookie('login');
        const response = await postJSON(backend.claimEvent, 'login', token, {
            event_id: selectedEvent._id
        });

        if (response.status === 'Success') {
            showNotification('Event berhasil di-claim! Selesaikan tugas sebelum deadline.', 'is-success');
            closeClaimModal();

            // Refresh data
            loadEvents();
            loadUserClaims();
        } else {
            showNotification('Error: ' + response.response, 'is-danger');
        }
    } catch (error) {
        console.error('Error claiming event:', error);
        showNotification('Gagal claim event', 'is-danger');
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
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

window.confirmSubmit = async function() {
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
        const response = await postJSON(backend.submitTask, 'login', token, {
            claim_id: selectedClaim.claim_id,
            task_link: taskLink
        });

        if (response.status === 'Success') {
            showNotification('Tugas berhasil disubmit! Menunggu approval dari owner.', 'is-success');
            closeSubmitModal();

            // Refresh data
            loadUserClaims();
        } else {
            showNotification('Error: ' + response.response, 'is-danger');
        }
    } catch (error) {
        console.error('Error submitting task:', error);
        showNotification('Gagal submit tugas', 'is-danger');
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
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
