import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import { addCSSIn } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import { id } from "/dashboard/jscroot/url/config.js";

// Backend URLs
const backend = {
    listEvents: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/list',
    claimEvent: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/claim',
    submitTask: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/submit'
};

let currentEvents = [];
let timers = {};

export async function main() {
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css", id.content);
    setupEventHandlers();
    await loadEvents();
    startTimerUpdates();
}

// Auto-initialize when module loads
document.addEventListener('DOMContentLoaded', main);

function setupEventHandlers() {
    // Close modal handlers
    const closeClaimModal = document.getElementById('close-claim-modal');
    const cancelClaimBtn = document.getElementById('cancel-claim-btn');
    const closeSubmitModal = document.getElementById('close-submit-modal');
    const cancelSubmitBtn = document.getElementById('cancel-submit-btn');
    
    if (closeClaimModal) closeClaimModal.addEventListener('click', hideClaimModal);
    if (cancelClaimBtn) cancelClaimBtn.addEventListener('click', hideClaimModal);
    if (closeSubmitModal) closeSubmitModal.addEventListener('click', hideSubmitModal);
    if (cancelSubmitBtn) cancelSubmitBtn.addEventListener('click', hideSubmitModal);
    
    // Confirm handlers
    const confirmClaimBtn = document.getElementById('confirm-claim-btn');
    const confirmSubmitBtn = document.getElementById('confirm-submit-btn');
    
    if (confirmClaimBtn) confirmClaimBtn.addEventListener('click', confirmClaimEvent);
    if (confirmSubmitBtn) confirmSubmitBtn.addEventListener('click', confirmSubmitTask);
    
    // Modal background click handlers
    const claimModalBg = document.querySelector('#claim-modal .modal-background');
    const submitModalBg = document.querySelector('#submit-modal .modal-background');
    
    if (claimModalBg) claimModalBg.addEventListener('click', hideClaimModal);
    if (submitModalBg) submitModalBg.addEventListener('click', hideSubmitModal);
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

        if (responseData.status === 'Success' && responseData.data) {
            eventsData = responseData.data;
            console.log('Success response with data:', eventsData);
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
    
    if (userClaim) {
        if (userClaim.is_approved) {
            statusClass = 'approved';
            statusText = 'Approved';
        } else if (userClaim.is_completed) {
            statusClass = 'completed';
            statusText = 'Waiting for Approval';
        } else {
            statusClass = 'claimed';
            statusText = 'Claimed by You';
            
            // Add countdown timer
            const expiresAt = new Date(userClaim.expires_at);
            const now = new Date();
            
            if (expiresAt > now) {
                timerDisplay = `
                    <div class="countdown-timer">
                        <span class="event-timer" id="timer-${event._id}">Calculating...</span>
                    </div>
                `;
                
                // Store timer info
                timers[event._id] = expiresAt;
                
                actionButton = `
                    <button class="button is-success is-fullwidth" onclick="window.openSubmitModal('${event._id}', '${event.name}', '${userClaim.claim_id}')">
                        Submit Task
                    </button>
                `;
            } else {
                statusText = 'Expired';
                statusClass = 'expired';
            }
        }
        
        if (userClaim.task_link) {
            timerDisplay += `
                <div class="field">
                    <label class="label is-small">Submitted Task:</label>
                    <div class="task-link">
                        <a href="${userClaim.task_link}" target="_blank">${userClaim.task_link}</a>
                    </div>
                </div>
            `;
        }
    } else if (!event.is_available) {
        statusClass = 'claimed';
        statusText = 'Claimed by Others';
    } else {
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

window.openSubmitModal = function(eventId, eventName, claimId) {
    const modal = document.getElementById('submit-modal');
    const eventNameInput = document.getElementById('submit-event-name');
    const taskLinkInput = document.getElementById('submit-task-link');

    if (eventNameInput) eventNameInput.value = eventName;
    if (taskLinkInput) taskLinkInput.value = '';
    if (modal) {
        modal.dataset.claimId = claimId;
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
    
    const claimId = modal.dataset.claimId;
    const taskLink = taskLinkInput.value.trim();
    
    if (!taskLink) {
        showSubmitNotification('Please enter a task link', 'is-danger');
        return;
    }
    
    confirmBtn.classList.add('is-loading');
    
    try {
        const submitData = {
            claim_id: claimId,
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
                loadEvents(); // Reload events
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
                timerElement.textContent = 'Expired';
                timerElement.style.color = '#ff3860';
                delete timers[eventId];
                // Reload events to update UI
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