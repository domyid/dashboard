import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";

// Backend URLs
const backend = {
    listEvents: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/list',
    claimEvent: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/claim',
    submitTask: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/submit',
    userPoints: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/userpoints'
};

let currentEvents = [];
let timers = {};

export async function main() {
    console.log('Initializing bimbinganevent...');
    setupEventHandlers();
    loadUserPoints();
    loadEvents();
    startTimerUpdates();
}

// Auto-initialize when module loads
document.addEventListener('DOMContentLoaded', main);

async function loadUserPoints() {
    console.log('Loading user points...');

    try {
        const token = getCookie('login');
        if (!token) {
            console.log('No login token found for points');
            return;
        }

        const response = await fetch(backend.userPoints, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'login': token
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        let responseData = JSON.parse(responseText);

        console.log('User points response:', responseData);

        if (responseData.status === 'Success' && responseData.data) {
            const pointsData = responseData.data;

            // Update UI
            const userPointsBox = document.getElementById('user-points-box');
            const totalPointsEl = document.getElementById('total-points');
            const eventsCompletedEl = document.getElementById('events-completed');

            if (userPointsBox) userPointsBox.style.display = 'block';
            if (totalPointsEl) totalPointsEl.textContent = pointsData.total_points || 0;
            if (eventsCompletedEl) eventsCompletedEl.textContent = pointsData.event_count || 0;

            // Store points data for history modal
            window.userPointsData = pointsData;
        }
    } catch (error) {
        console.error('Error loading user points:', error);
        // Don't show error to user, just log it
    }
}

function setupEventHandlers() {
    // Close modal handlers
    const closeClaimModal = document.getElementById('close-claim-modal');
    const cancelClaimBtn = document.getElementById('cancel-claim-btn');
    const closeSubmitModal = document.getElementById('close-submit-modal');
    const cancelSubmitBtn = document.getElementById('cancel-submit-btn');
    const closePointsModal = document.getElementById('close-points-modal');
    const closePointsHistoryBtn = document.getElementById('close-points-history-btn');

    if (closeClaimModal) closeClaimModal.addEventListener('click', hideClaimModal);
    if (cancelClaimBtn) cancelClaimBtn.addEventListener('click', hideClaimModal);
    if (closeSubmitModal) closeSubmitModal.addEventListener('click', hideSubmitModal);
    if (cancelSubmitBtn) cancelSubmitBtn.addEventListener('click', hideSubmitModal);
    if (closePointsModal) closePointsModal.addEventListener('click', hidePointsModal);
    if (closePointsHistoryBtn) closePointsHistoryBtn.addEventListener('click', hidePointsModal);

    // Confirm handlers
    const confirmClaimBtn = document.getElementById('confirm-claim-btn');
    const confirmSubmitBtn = document.getElementById('confirm-submit-btn');

    if (confirmClaimBtn) confirmClaimBtn.addEventListener('click', confirmClaimEvent);
    if (confirmSubmitBtn) confirmSubmitBtn.addEventListener('click', confirmSubmitTask);

    // Modal background click handlers
    const claimModalBg = document.querySelector('#claim-modal .modal-background');
    const submitModalBg = document.querySelector('#submit-modal .modal-background');
    const pointsModalBg = document.querySelector('#points-history-modal .modal-background');

    if (claimModalBg) claimModalBg.addEventListener('click', hideClaimModal);
    if (submitModalBg) submitModalBg.addEventListener('click', hideSubmitModal);
    if (pointsModalBg) pointsModalBg.addEventListener('click', hidePointsModal);
}

async function loadEvents() {
    const loadingIndicator = document.getElementById('loading-indicator');
    const eventsContainer = document.getElementById('events-container');
    const noEventsMessage = document.getElementById('no-events-message');
    
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (eventsContainer) eventsContainer.innerHTML = '';
    if (noEventsMessage) noEventsMessage.style.display = 'none';
    
    try {
        console.log('Loading events...');
        console.log('API URL:', backend.listEvents);
        console.log('Login token:', getCookie('login') ? 'Present' : 'Missing');

        // Use fetch directly instead of getJSON to avoid callback issues
        const token = getCookie('login');
        if (!token) {
            throw new Error('No login token found');
        }

        const response = await fetch(backend.listEvents, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'login': token
            }
        });

        console.log('Fetch response status:', response.status);
        console.log('Fetch response ok:', response.ok);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log('Raw response text:', responseText);

        let responseData;
        try {
            responseData = JSON.parse(responseText);
            console.log('Parsed response data:', responseData);
        } catch (e) {
            console.error('Failed to parse JSON response:', e);
            throw new Error('Invalid JSON response from server');
        }

        // Handle different response formats
        let eventsData = null;

        console.log('=== EVENTS RESPONSE DEBUG ===');
        console.log('Response data status:', responseData.status);
        console.log('Response data keys:', Object.keys(responseData));
        console.log('Response data:', responseData);

        if (responseData.status === 'Success' && responseData.data) {
            eventsData = responseData.data;
            console.log('Success response with data:', eventsData);
            console.log('Events data type:', typeof eventsData);
            console.log('Events data is array:', Array.isArray(eventsData));
        } else if (responseData.status === 'Success') {
            eventsData = responseData;
            console.log('Success response without nested data:', eventsData);
        } else if (Array.isArray(responseData)) {
            eventsData = responseData;
            console.log('Direct array response:', eventsData);
        } else {
            console.log('Unexpected response format:', responseData);
            throw new Error('Unexpected response format: ' + (responseData.status || 'Unknown'));
        }

        if (eventsData && Array.isArray(eventsData) && eventsData.length > 0) {
            console.log('Rendering', eventsData.length, 'events');
            currentEvents = eventsData;
            renderEvents(currentEvents);
        } else {
            console.log('No events found or invalid data format');
            if (noEventsMessage) noEventsMessage.style.display = 'block';
        }

    } catch (error) {
        console.error('Error loading events:', error);
        showNotification('Error loading events: ' + error.message, 'is-danger');
        if (noEventsMessage) noEventsMessage.style.display = 'block';
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

function renderEvents(events) {
    const container = document.getElementById('events-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    events.forEach(event => {
        const eventCard = createEventCard(event);
        container.appendChild(eventCard);
    });
}

function createEventCard(event) {
    const column = document.createElement('div');
    column.className = 'column is-one-third';

    const userClaim = event.user_claim;
    let statusClass = 'available';
    let statusText = 'Available';
    let actionButton = '';
    let timerDisplay = '';

    console.log(`Creating card for event ${event._id}:`, {
        userClaim: userClaim,
        isAvailable: event.is_available,
        eventName: event.name
    });

    // Note: Approved events don't appear in the list because:
    // 1. When task is approved, event.isactive becomes false (backend)
    // 2. Only active events are returned by /api/event/list
    // 3. This follows bimbingan pattern where approved items disappear

    if (userClaim) {
        // User has claimed this event
        // Note: Approved events should not appear in list (event becomes inactive)
        // So we only handle: submitted (waiting approval) or active claims

        if (userClaim.is_submitted) {
            // Task submitted, waiting for approval - keep locked
            statusClass = 'completed';
            statusText = 'Waiting for Approval ⏳';
            timerDisplay = `
                <div class="notification is-warning is-size-7">
                    <strong>🔒 Task Submitted - Waiting for Owner Approval</strong><br>
                    Task sudah di-submit dan sedang menunggu approval dari owner.<br>
                    Card akan tetap terkunci sampai di-approve atau di-reject.
                </div>
            `;
            actionButton = `
                <button class="button is-warning is-fullwidth" disabled>
                    <i class="fas fa-clock"></i> Waiting for Approval
                </button>
            `;
        } else {
            // User has active claim but hasn't submitted yet
            statusClass = 'claimed';
            statusText = 'Claimed by You 🔒';

            // Add countdown timer
            const expiresAt = new Date(userClaim.expires_at);
            const now = new Date();

            if (expiresAt > now) {
                timerDisplay = `
                    <div class="countdown-timer">
                        <span class="event-timer" id="timer-${event._id}">Calculating...</span>
                        <p class="help is-size-7">Timer akan expired dan event kembali available</p>
                    </div>
                `;

                // Store timer info
                timers[event._id] = expiresAt;

                actionButton = `
                    <button class="button is-success is-fullwidth" onclick="window.openSubmitModal('${event._id}', '${event.name}')">
                        Submit Task
                    </button>
                `;
            } else {
                // Timer expired - this should not happen as backend should clean up
                statusText = 'Timer Expired - Refreshing...';
                statusClass = 'expired';
                timerDisplay = `
                    <div class="notification is-warning is-size-7">
                        Timer expired, event akan kembali available
                    </div>
                `;
                // Trigger reload after short delay
                setTimeout(() => loadEvents(), 2000);
            }
        }

        if (userClaim.task_link) {
            timerDisplay += `
                <div class="field">
                    <label class="label is-small">Submitted Task:</label>
                    <div class="task-link">
                        <a href="${userClaim.task_link}" target="_blank" class="is-size-7">${userClaim.task_link}</a>
                    </div>
                </div>
            `;
        }
    } else if (!event.is_available) {
        // Event is claimed by someone else
        statusClass = 'claimed';
        statusText = 'Sedang Dikerjakan 🔒';
        timerDisplay = `
            <div class="notification is-info is-size-7">
                Event sedang dikerjakan oleh user lain
            </div>
        `;
        actionButton = `
            <button class="button is-light is-fullwidth" disabled>
                Tidak Tersedia
            </button>
        `;
    } else {
        // Event is available for claiming
        statusClass = 'available';
        statusText = 'Available ✨';
        actionButton = `
            <button class="button is-primary is-fullwidth" onclick="window.openClaimModal('${event._id}', '${event.name}', ${event.points})">
                Claim Event
            </button>
        `;
    }
    
    column.innerHTML = `
        <div class="card event-card">
            <div class="card-content">
                <div class="media">
                    <div class="media-content">
                        <p class="title is-4">${event.name}</p>
                        <p class="subtitle is-6">${event.points} Points</p>
                    </div>
                </div>
                
                <div class="content">
                    ${event.description ? `<p>${event.description}</p>` : ''}
                    <div class="field">
                        <span class="tag is-medium event-status ${statusClass}">${statusText}</span>
                    </div>
                    ${timerDisplay}
                </div>
            </div>
            <footer class="card-footer">
                <div class="card-footer-item">
                    ${actionButton}
                </div>
            </footer>
        </div>
    `;
    
    return column;
}

// Make functions global for onclick handlers
window.openClaimModal = function(eventId, eventName, points) {
    const modal = document.getElementById('claim-modal');
    const eventNameInput = document.getElementById('claim-event-name');
    const eventPointsInput = document.getElementById('claim-event-points');
    const timerInput = document.getElementById('claim-timer-input');

    if (eventNameInput) eventNameInput.value = eventName;
    if (eventPointsInput) eventPointsInput.value = points + ' Points';
    if (timerInput) timerInput.value = '';
    if (modal) {
        modal.dataset.eventId = eventId;
        modal.classList.add('is-active');
    }
    hideClaimNotification();
};

window.openSubmitModal = function(eventId, eventName) {
    const modal = document.getElementById('submit-modal');
    const eventNameInput = document.getElementById('submit-event-name');
    const taskLinkInput = document.getElementById('submit-task-link');

    if (eventNameInput) eventNameInput.value = eventName;
    if (taskLinkInput) taskLinkInput.value = '';
    if (modal) {
        modal.dataset.eventId = eventId; // Use eventId instead of claimId
        modal.classList.add('is-active');
    }
    hideSubmitNotification();
};

// Make close functions global too
window.closeClaimModal = hideClaimModal;
window.closeSubmitModal = hideSubmitModal;

function hideClaimModal() {
    const modal = document.getElementById('claim-modal');
    if (modal) modal.classList.remove('is-active');
}

function hideSubmitModal() {
    const modal = document.getElementById('submit-modal');
    if (modal) modal.classList.remove('is-active');
}

async function confirmClaimEvent() {
    const modal = document.getElementById('claim-modal');
    const timerInput = document.getElementById('claim-timer-input');
    const confirmBtn = document.getElementById('confirm-claim-btn');
    
    if (!modal || !timerInput || !confirmBtn) return;
    
    const eventId = modal.dataset.eventId;
    const timerSec = parseInt(timerInput.value);
    
    if (!timerSec || timerSec <= 0) {
        showClaimNotification('Please enter a valid timer duration', 'is-danger');
        return;
    }
    
    confirmBtn.classList.add('is-loading');
    
    try {
        const claimData = {
            event_id: eventId,
            timer_sec: timerSec
        };

        console.log('Claiming event:', claimData);

        const token = getCookie('login');
        if (!token) {
            throw new Error('No login token found');
        }

        const response = await fetch(backend.claimEvent, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'login': token
            },
            body: JSON.stringify(claimData)
        });

        console.log('Claim response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log('Claim response text:', responseText);

        let responseData;
        try {
            responseData = JSON.parse(responseText);
            console.log('Claim response data:', responseData);
        } catch (e) {
            console.error('Failed to parse claim response:', e);
            throw new Error('Invalid JSON response from server');
        }

        if (responseData.status === 'Success') {
            showClaimNotification('Event claimed successfully!', 'is-success');
            setTimeout(() => {
                hideClaimModal();
                loadEvents(); // Reload events
            }, 1500);
        } else {
            showClaimNotification(responseData.status || responseData.response || 'Failed to claim event', 'is-danger');
        }
    } catch (error) {
        console.error('Error claiming event:', error);
        showClaimNotification('Error: ' + error.message, 'is-danger');
    } finally {
        confirmBtn.classList.remove('is-loading');
    }
}

async function confirmSubmitTask() {
    const modal = document.getElementById('submit-modal');
    const taskLinkInput = document.getElementById('submit-task-link');
    const confirmBtn = document.getElementById('confirm-submit-btn');
    
    if (!modal || !taskLinkInput || !confirmBtn) return;
    
    const eventId = modal.dataset.eventId;
    const taskLink = taskLinkInput.value.trim();

    if (!taskLink) {
        showSubmitNotification('Please enter a task link', 'is-danger');
        return;
    }

    confirmBtn.classList.add('is-loading');

    try {
        const submitData = {
            event_id: eventId,
            task_link: taskLink
        };

        console.log('Submitting task:', submitData);

        const token = getCookie('login');
        if (!token) {
            throw new Error('No login token found');
        }

        const response = await fetch(backend.submitTask, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'login': token
            },
            body: JSON.stringify(submitData)
        });

        console.log('Submit response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log('Submit response text:', responseText);

        let responseData;
        try {
            responseData = JSON.parse(responseText);
            console.log('Submit response data:', responseData);
        } catch (e) {
            console.error('Failed to parse submit response:', e);
            throw new Error('Invalid JSON response from server');
        }

        if (responseData.status === 'Success') {
            showSubmitNotification('Task submitted successfully! Waiting for approval.', 'is-success');
            setTimeout(() => {
                hideSubmitModal();
                loadEvents(); // Reload events to show "Waiting for Approval" status
                loadUserPoints(); // Reload user points in case of immediate approval
            }, 1500);
        } else {
            showSubmitNotification(responseData.status || responseData.response || 'Failed to submit task', 'is-danger');
        }
    } catch (error) {
        console.error('Error submitting task:', error);
        showSubmitNotification('Error: ' + error.message, 'is-danger');
    } finally {
        confirmBtn.classList.remove('is-loading');
    }
}

function showClaimNotification(message, type) {
    const notification = document.getElementById('claim-notification');
    const messageEl = document.getElementById('claim-notification-message');
    
    if (notification && messageEl) {
        messageEl.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('is-hidden');
    }
}

function hideClaimNotification() {
    const notification = document.getElementById('claim-notification');
    if (notification) notification.classList.add('is-hidden');
}

function showSubmitNotification(message, type) {
    const notification = document.getElementById('submit-notification');
    const messageEl = document.getElementById('submit-notification-message');
    
    if (notification && messageEl) {
        messageEl.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('is-hidden');
    }
}

function hideSubmitNotification() {
    const notification = document.getElementById('submit-notification');
    if (notification) notification.classList.add('is-hidden');
}

function startTimerUpdates() {
    setInterval(updateTimers, 1000);
}

function updateTimers() {
    Object.keys(timers).forEach(eventId => {
        const expiresAt = timers[eventId];
        const now = new Date();
        const timeLeft = expiresAt - now;

        const timerElement = document.getElementById(`timer-${eventId}`);
        if (timerElement) {
            if (timeLeft > 0) {
                const minutes = Math.floor(timeLeft / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
            } else {
                // Timer expired - event should become available again
                console.log(`Timer expired for event ${eventId}, reloading events...`);
                delete timers[eventId];
                // Reload events to update UI - event should become available again
                loadEvents();
            }
        }
    });
}

function showNotification(message, type) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <button class="delete"></button>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Position it at the top
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.maxWidth = '400px';
    
    // Add close functionality
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

// Auto refresh events every 30 seconds
setInterval(loadEvents, 30000);

// Additional function to force refresh when needed
window.forceRefreshEvents = function() {
    console.log('Force refreshing events...');
    loadEvents();
};

// Points history functions
window.showPointsHistory = function() {
    const modal = document.getElementById('points-history-modal');
    const content = document.getElementById('points-history-content');

    if (modal) modal.classList.add('is-active');

    if (content && window.userPointsData && window.userPointsData.event_history) {
        const history = window.userPointsData.event_history;

        if (history.length === 0) {
            content.innerHTML = `
                <div class="has-text-centered">
                    <p class="title is-5">No Event History</p>
                    <p>You haven't completed any events yet.</p>
                </div>
            `;
        } else {
            let historyHTML = `
                <div class="table-container">
                    <table class="table is-fullwidth is-striped">
                        <thead>
                            <tr>
                                <th>Event Name</th>
                                <th>Points</th>
                                <th>Task Link</th>
                                <th>Approved Date</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            history.forEach(event => {
                const approvedDate = new Date(event.approvedat).toLocaleDateString();
                historyHTML += `
                    <tr>
                        <td><strong>${event.eventname}</strong></td>
                        <td><span class="tag is-success">${event.points} pts</span></td>
                        <td><a href="${event.tasklink}" target="_blank" class="is-size-7">View Task</a></td>
                        <td>${approvedDate}</td>
                    </tr>
                `;
            });

            historyHTML += `
                        </tbody>
                    </table>
                </div>
            `;

            content.innerHTML = historyHTML;
        }
    } else {
        content.innerHTML = `
            <div class="has-text-centered">
                <p>Loading history...</p>
            </div>
        `;
    }
};

function hidePointsModal() {
    const modal = document.getElementById('points-history-modal');
    if (modal) modal.classList.remove('is-active');
}