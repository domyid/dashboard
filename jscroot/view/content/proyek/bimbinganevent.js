import { getJSON, postJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";

// API Configuration
const API_BASE = 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event';
const endpoints = {
    getAllEvents: `${API_BASE}/all`,
    claimEvent: `${API_BASE}/claim`,
    submitTask: `${API_BASE}/submit`,
    getUserClaims: `${API_BASE}/myclaims`,
    getUserPoints: `${API_BASE}/mypoints`,
    checkExpired: `${API_BASE}/checkexpired`
};

// Application State
const state = {
    events: [],
    claims: [],
    userStats: {
        totalPoints: 0,
        claimedCount: 0,
        completedCount: 0
    },
    selectedEvent: null,
    selectedClaim: null,
    timers: new Map(),
    isLoading: false
};

// DOM Elements Cache
const elements = {
    // Stats
    userTotalPoints: null,
    userClaimedCount: null,
    userCompletedCount: null,
    
    // Events
    eventsGrid: null,
    eventsLoading: null,
    eventsEmpty: null,
    
    // Claims
    claimsGrid: null,
    claimsLoading: null,
    claimsEmpty: null,
    
    // Modals
    claimModal: null,
    submitModal: null
};

// Initialize Application
export function main() {
    console.log('🚀 Initializing Event Bimbingan v2...');
    
    // Check authentication
    const token = getCookie('login');
    if (!token) {
        showNotification('Silakan login terlebih dahulu', 'is-warning');
        return;
    }

    // Initialize DOM elements
    initializeElements();
    
    // Load initial data
    setTimeout(() => {
        loadAllData();
    }, 100);

    // Setup auto-refresh
    setupAutoRefresh();
    
    // Setup expired claims checker
    setupExpiredChecker();
    
    console.log('✅ Event Bimbingan v2 initialized successfully');
}

// Initialize DOM Elements
function initializeElements() {
    // Stats elements
    elements.userTotalPoints = document.getElementById('userTotalPoints');
    elements.userClaimedCount = document.getElementById('userClaimedCount');
    elements.userCompletedCount = document.getElementById('userCompletedCount');
    
    // Events elements
    elements.eventsGrid = document.getElementById('eventsGrid');
    elements.eventsLoading = document.getElementById('eventsLoading');
    elements.eventsEmpty = document.getElementById('eventsEmpty');
    
    // Claims elements
    elements.claimsGrid = document.getElementById('claimsGrid');
    elements.claimsLoading = document.getElementById('claimsLoading');
    elements.claimsEmpty = document.getElementById('claimsEmpty');
    
    // Modal elements
    elements.claimModal = document.getElementById('claimModal');
    elements.submitModal = document.getElementById('submitModal');
    
    console.log('DOM elements initialized');
}

// Load All Data
async function loadAllData() {
    console.log('Loading all data...');
    
    try {
        // Load data in parallel
        await Promise.all([
            loadEvents(),
            loadUserClaims(),
            loadUserPoints()
        ]);
        
        console.log('✅ All data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showNotification('Gagal memuat data. Silakan refresh halaman.', 'is-danger');
    }
}

// Load Available Events
async function loadEvents() {
    if (!elements.eventsGrid) return;
    
    try {
        showEventsLoading(true);
        
        const token = getCookie('login');
        console.log('Loading events from:', endpoints.getAllEvents);
        
        getJSON(endpoints.getAllEvents, 'login', token, (result) => {
            showEventsLoading(false);
            console.log('Events response:', result);
            
            if (result.status === 200) {
                let events = [];
                
                // Handle different response formats
                if (result.data?.data && Array.isArray(result.data.data)) {
                    events = result.data.data;
                } else if (result.data && Array.isArray(result.data)) {
                    events = result.data;
                }
                
                state.events = events;
                renderEvents();
                console.log(`✅ Loaded ${events.length} events`);
            } else {
                console.log('No events found');
                state.events = [];
                renderEvents();
            }
        });
    } catch (error) {
        console.error('Error loading events:', error);
        showEventsLoading(false);
        state.events = [];
        renderEvents();
    }
}

// Load User Claims
async function loadUserClaims() {
    if (!elements.claimsGrid) return;
    
    try {
        showClaimsLoading(true);
        
        const token = getCookie('login');
        console.log('Loading user claims from:', endpoints.getUserClaims);
        
        getJSON(endpoints.getUserClaims, 'login', token, (result) => {
            showClaimsLoading(false);
            console.log('Claims response:', result);
            
            if (result.status === 200) {
                let claims = [];
                
                // Handle different response formats
                if (result.data?.data && Array.isArray(result.data.data)) {
                    claims = result.data.data;
                } else if (result.data && Array.isArray(result.data)) {
                    claims = result.data;
                }
                
                state.claims = claims;
                renderClaims();
                updateUserStats();
                console.log(`✅ Loaded ${claims.length} claims`);
            } else {
                console.log('No claims found');
                state.claims = [];
                renderClaims();
                updateUserStats();
            }
        });
    } catch (error) {
        console.error('Error loading claims:', error);
        showClaimsLoading(false);
        state.claims = [];
        renderClaims();
    }
}

// Load User Points
async function loadUserPoints() {
    try {
        const token = getCookie('login');
        console.log('Loading user points from:', endpoints.getUserPoints);
        
        getJSON(endpoints.getUserPoints, 'login', token, (result) => {
            console.log('Points response:', result);
            
            if (result.status === 200 && (result.data?.Status === 'Success' || result.data?.status === 'Success')) {
                const pointsData = result.data.Data || result.data.data;
                state.userStats.totalPoints = pointsData?.total_event_points || 0;
                updateStatsDisplay();
                console.log(`✅ User has ${state.userStats.totalPoints} points`);
            } else {
                console.log('Failed to load points, setting to 0');
                state.userStats.totalPoints = 0;
                updateStatsDisplay();
            }
        });
    } catch (error) {
        console.error('Error loading user points:', error);
        state.userStats.totalPoints = 0;
        updateStatsDisplay();
    }
}

// Render Events
function renderEvents() {
    if (!elements.eventsGrid) return;
    
    elements.eventsGrid.innerHTML = '';
    
    if (state.events.length === 0) {
        showEventsEmpty(true);
        return;
    }
    
    showEventsEmpty(false);
    
    state.events.forEach(event => {
        const eventCard = createEventCard(event);
        elements.eventsGrid.appendChild(eventCard);
    });
}

// Render Claims
function renderClaims() {
    if (!elements.claimsGrid) return;
    
    elements.claimsGrid.innerHTML = '';
    
    if (state.claims.length === 0) {
        showClaimsEmpty(true);
        return;
    }
    
    showClaimsEmpty(false);
    
    state.claims.forEach(claim => {
        const claimCard = createClaimCard(claim);
        elements.claimsGrid.appendChild(claimCard);
    });
}

// Create Event Card
function createEventCard(event) {
    const div = document.createElement('div');
    div.className = 'column is-one-third';
    
    const isAvailable = !event.is_claimed_by_any;
    const statusClass = isAvailable ? 'status-available' : 'status-expired';
    const statusText = isAvailable ? 'Tersedia' : 'Sudah Diklaim';
    const buttonContent = isAvailable 
        ? `<button class="button is-success is-fullwidth btn-claim" onclick="openClaimModal('${event._id}')">
             <i class="fas fa-hand-paper"></i> Claim Event
           </button>`
        : `<p class="has-text-grey has-text-centered">
             <i class="fas fa-lock"></i> Event sudah diklaim user lain
           </p>`;
    
    div.innerHTML = `
        <div class="card event-card ${isAvailable ? '' : 'has-background-light'}">
            <div class="card-content">
                <div class="media">
                    <div class="media-content">
                        <p class="title is-5">${event.name}</p>
                        <div class="level is-mobile">
                            <div class="level-left">
                                <span class="event-points">${event.points} Poin</span>
                            </div>
                            <div class="level-right">
                                <span class="${statusClass}">${statusText}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="content">
                    <p>${event.description}</p>
                    <div class="tags">
                        <span class="tag is-light">
                            <i class="fas fa-clock"></i> ${event.deadline_seconds}s
                        </span>
                    </div>
                    <div class="mt-4">
                        ${buttonContent}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return div;
}

// Create Claim Card
function createClaimCard(claim) {
    const div = document.createElement('div');
    div.className = 'column is-half';

    const now = new Date();
    const deadline = new Date(claim.deadline);
    const isExpired = now > deadline && claim.status === 'claimed';

    let statusClass = '';
    let statusText = '';
    let actionContent = '';

    switch (claim.status) {
        case 'claimed':
            if (isExpired) {
                statusClass = 'status-expired';
                statusText = 'Expired';
                actionContent = '<p class="has-text-grey">Waktu habis, event tersedia untuk user lain</p>';
            } else {
                statusClass = 'status-claimed';
                statusText = 'Diklaim';
                actionContent = `
                    <div class="timer-display" id="timer-${claim.claim_id}">
                        Loading timer...
                    </div>
                    <button class="button is-primary is-fullwidth btn-submit" onclick="openSubmitModal('${claim.claim_id}')">
                        <i class="fas fa-upload"></i> Submit Tugas
                    </button>
                `;
                // Start timer
                setTimeout(() => startTimer(claim.claim_id, deadline), 100);
            }
            break;

        case 'submitted':
            statusClass = 'status-submitted';
            statusText = 'Menunggu Approval';
            actionContent = `
                <div class="notification is-info">
                    <p><strong>Tugas sudah disubmit!</strong></p>
                    <p>Link: <a href="${claim.task_link}" target="_blank" class="has-text-link">${claim.task_link}</a></p>
                    <p>Menunggu approval dari owner...</p>
                </div>
            `;
            break;

        case 'approved':
            statusClass = 'status-approved';
            statusText = 'Approved';
            actionContent = `
                <div class="notification is-success">
                    <p><strong>🎉 Selamat! Tugas Anda telah disetujui</strong></p>
                    <p>Anda mendapat <strong>${claim.event.points} poin</strong></p>
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
                        <div class="level is-mobile">
                            <div class="level-left">
                                <span class="event-points">${claim.event.points} Poin</span>
                            </div>
                            <div class="level-right">
                                <span class="${statusClass}">${statusText}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="content">
                    <p>${claim.event.description}</p>
                    <div class="mt-4">
                        ${actionContent}
                    </div>
                </div>
            </div>
        </div>
    `;

    return div;
}

// Start Timer
function startTimer(claimId, deadline) {
    const timerElement = document.getElementById(`timer-${claimId}`);
    if (!timerElement) return;

    const updateTimer = () => {
        const now = new Date();
        const timeLeft = deadline - now;

        if (timeLeft <= 0) {
            timerElement.innerHTML = '⏰ Waktu Habis!';
            timerElement.classList.add('timer-expired');

            // Clear timer
            if (state.timers.has(claimId)) {
                clearInterval(state.timers.get(claimId));
                state.timers.delete(claimId);
            }

            // Refresh data
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
    const intervalId = setInterval(updateTimer, 1000);
    state.timers.set(claimId, intervalId);
}

// Update User Stats
function updateUserStats() {
    const claimedCount = state.claims.filter(c => ['claimed', 'submitted', 'approved'].includes(c.status)).length;
    const completedCount = state.claims.filter(c => c.status === 'approved').length;

    state.userStats.claimedCount = claimedCount;
    state.userStats.completedCount = completedCount;

    updateStatsDisplay();
}

// Update Stats Display
function updateStatsDisplay() {
    if (elements.userTotalPoints) {
        elements.userTotalPoints.textContent = state.userStats.totalPoints;
    }
    if (elements.userClaimedCount) {
        elements.userClaimedCount.textContent = state.userStats.claimedCount;
    }
    if (elements.userCompletedCount) {
        elements.userCompletedCount.textContent = state.userStats.completedCount;
    }
}

// Show/Hide Loading States
function showEventsLoading(show) {
    if (elements.eventsLoading) {
        elements.eventsLoading.style.display = show ? 'block' : 'none';
    }
}

function showClaimsLoading(show) {
    if (elements.claimsLoading) {
        elements.claimsLoading.style.display = show ? 'block' : 'none';
    }
}

function showEventsEmpty(show) {
    if (elements.eventsEmpty) {
        elements.eventsEmpty.style.display = show ? 'block' : 'none';
    }
}

function showClaimsEmpty(show) {
    if (elements.claimsEmpty) {
        elements.claimsEmpty.style.display = show ? 'block' : 'none';
    }
}

// Show Notification
function showNotification(message, type = 'is-info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
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

// Setup Auto Refresh
function setupAutoRefresh() {
    setInterval(() => {
        if (document.visibilityState === 'visible' && !state.isLoading) {
            console.log('Auto-refreshing data...');
            loadAllData();
        }
    }, 15000); // Every 15 seconds
}

// Setup Expired Claims Checker
function setupExpiredChecker() {
    setInterval(() => {
        checkExpiredClaims();
    }, 30000); // Every 30 seconds
}

// Check Expired Claims
async function checkExpiredClaims() {
    try {
        const response = await fetch(endpoints.checkExpired);
        const result = await response.json();

        console.log('Check expired response:', result);

        if (result.Status === 'Success' && result.Data && result.Data.processed > 0) {
            console.log(`✅ Recovered ${result.Data.processed} expired events`);
            setTimeout(() => {
                loadEvents();
                loadUserClaims();
            }, 1000);
        }
    } catch (error) {
        console.error('Error checking expired claims:', error);
    }
}

// Global Functions for HTML onclick handlers
window.refreshData = function() {
    console.log('Manual refresh triggered');
    loadAllData();
};

window.openClaimModal = function(eventId) {
    const event = state.events.find(e => e._id === eventId);
    if (!event) {
        showNotification('Event tidak ditemukan', 'is-danger');
        return;
    }

    if (event.is_claimed_by_any) {
        showNotification('Event ini sudah diklaim oleh user lain', 'is-warning');
        return;
    }

    state.selectedEvent = event;

    // Update modal content
    document.getElementById('modalEventName').textContent = event.name;
    document.getElementById('modalEventDescription').textContent = event.description;
    document.getElementById('modalEventPoints').textContent = event.points + ' Poin';
    document.getElementById('modalEventDeadline').textContent = event.deadline_seconds + ' detik';

    // Show modal
    if (elements.claimModal) {
        elements.claimModal.classList.add('is-active');
    }
};

window.closeClaimModal = function() {
    if (elements.claimModal) {
        elements.claimModal.classList.remove('is-active');
    }
    state.selectedEvent = null;
};

window.confirmClaim = function() {
    if (!state.selectedEvent) return;

    const confirmBtn = document.getElementById('confirmClaimBtn');
    const originalText = confirmBtn.innerHTML;

    try {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Claiming...';
        confirmBtn.disabled = true;

        const token = getCookie('login');
        const requestData = {
            event_id: state.selectedEvent._id
        };

        console.log('Claiming event:', requestData);

        postJSON(endpoints.claimEvent, 'login', token, requestData, (result) => {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;

            console.log('Claim response:', result);

            if (result.status === 200) {
                const responseData = result.data || result;

                if (responseData.status === 'Success' || result.data?.status === 'Success') {
                    const message = responseData.message || 'Event berhasil di-claim! Silakan cek di bagian Event Saya.';
                    showNotification(message, 'is-success');
                    closeClaimModal();

                    // Refresh data
                    setTimeout(() => {
                        loadEvents();
                        loadUserClaims();
                    }, 1000);
                } else {
                    const errorMsg = responseData.response || responseData.status || 'Gagal claim event';
                    showNotification('Error: ' + errorMsg, 'is-danger');
                }
            } else {
                const errorMsg = result.data?.response || result.data?.status || result.message || 'Gagal claim event';
                showNotification('Error: ' + errorMsg, 'is-danger');
            }
        });
    } catch (error) {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        console.error('Error claiming event:', error);
        showNotification('Error: ' + error.message, 'is-danger');
    }
};

window.openSubmitModal = function(claimId) {
    const claim = state.claims.find(c => c.claim_id === claimId);
    if (!claim) {
        showNotification('Claim tidak ditemukan', 'is-danger');
        return;
    }

    state.selectedClaim = claim;

    // Update modal content
    document.getElementById('submitEventName').textContent = claim.event.name;
    document.getElementById('taskLinkInput').value = '';

    // Show modal
    if (elements.submitModal) {
        elements.submitModal.classList.add('is-active');
    }
};

window.closeSubmitModal = function() {
    if (elements.submitModal) {
        elements.submitModal.classList.remove('is-active');
    }
    state.selectedClaim = null;
};

window.confirmSubmit = function() {
    if (!state.selectedClaim) return;

    const taskLink = document.getElementById('taskLinkInput').value.trim();
    if (!taskLink) {
        showNotification('Mohon masukkan link tugas', 'is-warning');
        return;
    }

    // Validate URL
    try {
        new URL(taskLink);
    } catch (e) {
        showNotification('Format URL tidak valid', 'is-warning');
        return;
    }

    const confirmBtn = document.getElementById('confirmSubmitBtn');
    const originalText = confirmBtn.innerHTML;

    try {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        confirmBtn.disabled = true;

        const token = getCookie('login');
        const requestData = {
            claim_id: state.selectedClaim.claim_id,
            task_link: taskLink
        };

        console.log('Submitting task:', requestData);

        postJSON(endpoints.submitTask, 'login', token, requestData, (result) => {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;

            console.log('Submit response:', result);

            if (result.status === 200) {
                const responseData = result.data || result;

                if (responseData.status === 'Success' || result.data?.status === 'Success') {
                    showNotification('Tugas berhasil disubmit! Menunggu approval dari owner.', 'is-success');
                    closeSubmitModal();

                    // Refresh data
                    setTimeout(() => {
                        loadUserClaims();
                        loadUserPoints();
                    }, 1000);
                } else {
                    const errorMsg = responseData.response || responseData.status || 'Gagal submit tugas';
                    showNotification('Error: ' + errorMsg, 'is-danger');
                }
            } else {
                const errorMsg = result.data?.response || result.data?.status || result.message || 'Gagal submit tugas';
                showNotification('Error: ' + errorMsg, 'is-danger');
            }
        });
    } catch (error) {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        console.error('Error submitting task:', error);
        showNotification('Error: ' + error.message, 'is-danger');
    }
};

// Cleanup function
window.addEventListener('beforeunload', () => {
    // Clear all timers
    state.timers.forEach((intervalId) => {
        clearInterval(intervalId);
    });
    state.timers.clear();
});

console.log('✅ Event Bimbingan v2 module loaded');
