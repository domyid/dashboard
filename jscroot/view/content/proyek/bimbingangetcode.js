import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import { getJSON, postJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
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

function loadEvents() {
    const loadingIndicator = document.getElementById('loading-indicator');
    const eventsContainer = document.getElementById('events-container');
    const noEventsMessage = document.getElementById('no-events-message');

    console.log('Loading events...');
    console.log('API URL:', backend.listEvents);
    console.log('Login token:', getCookie('login') ? 'Present' : 'Missing');

    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (eventsContainer) eventsContainer.innerHTML = '';
    if (noEventsMessage) noEventsMessage.style.display = 'none';

    // Use callback pattern like other functions
    getJSON(backend.listEvents, 'login', getCookie('login'), (response) => {
        if (loadingIndicator) loadingIndicator.style.display = 'none';

        console.log('Events API Response:', response);
        console.log('Response type:', typeof response);
        console.log('Response keys:', response ? Object.keys(response) : 'null');

        if (!response) {
            console.log('No response received');
            if (noEventsMessage) noEventsMessage.style.display = 'block';
            return;
        }

        // Handle different response formats
        let eventsData = null;

        if (response.status === 200) {
            console.log('HTTP 200 response detected');

            if (response.data) {
                let actualData;
                if (typeof response.data === 'string') {
                    try {
                        actualData = JSON.parse(response.data);
                        console.log('Parsed JSON data:', actualData);
                    } catch (e) {
                        console.error('Failed to parse JSON:', e);
                        actualData = response.data;
                    }
                } else {
                    actualData = response.data;
                }

                if (actualData.status === 'Success' && actualData.data) {
                    eventsData = actualData.data;
                    console.log('Success response with data:', eventsData);
                } else if (actualData.status === 'Success') {
                    eventsData = actualData;
                    console.log('Success response without nested data:', eventsData);
                } else if (Array.isArray(actualData)) {
                    eventsData = actualData;
                    console.log('Direct array response:', eventsData);
                }
            }
        }

        if (eventsData && Array.isArray(eventsData) && eventsData.length > 0) {
            console.log('Rendering', eventsData.length, 'events');
            currentEvents = eventsData;
            renderEvents(currentEvents);
        } else {
            console.log('No events found or invalid data format');
            if (noEventsMessage) noEventsMessage.style.display = 'block';
        }
    });
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

function confirmClaimEvent() {
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

    const claimData = {
        event_id: eventId,
        timer_sec: timerSec
    };

    console.log('Claiming event:', claimData);

    // Use callback pattern
    postJSON(backend.claimEvent, 'login', getCookie('login'), claimData, (response) => {
        confirmBtn.classList.remove('is-loading');

        console.log('Claim response:', response);

        if (!response) {
            showClaimNotification('No response received from server', 'is-danger');
            return;
        }

        // Handle different response formats
        let success = false;
        let message = 'Failed to claim event';

        if (response.status === 200) {
            if (response.data) {
                let actualData;
                if (typeof response.data === 'string') {
                    try {
                        actualData = JSON.parse(response.data);
                    } catch (e) {
                        actualData = response.data;
                    }
                } else {
                    actualData = response.data;
                }

                if (actualData.status === 'Success') {
                    success = true;
                    message = 'Event claimed successfully!';
                } else {
                    message = actualData.status || actualData.response || 'Failed to claim event';
                }
            }
        } else {
            message = response.data?.response || response.message || 'Failed to claim event';
        }

        if (success) {
            showClaimNotification(message, 'is-success');
            setTimeout(() => {
                hideClaimModal();
                loadEvents(); // Reload events
            }, 1500);
        } else {
            showClaimNotification(message, 'is-danger');
        }
    });
}

function confirmSubmitTask() {
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

    const submitData = {
        claim_id: claimId,
        task_link: taskLink
    };

    console.log('Submitting task:', submitData);

    // Use callback pattern
    postJSON(backend.submitTask, 'login', getCookie('login'), submitData, (response) => {
        confirmBtn.classList.remove('is-loading');

        console.log('Submit response:', response);

        if (!response) {
            showSubmitNotification('No response received from server', 'is-danger');
            return;
        }

        // Handle different response formats
        let success = false;
        let message = 'Failed to submit task';

        if (response.status === 200) {
            if (response.data) {
                let actualData;
                if (typeof response.data === 'string') {
                    try {
                        actualData = JSON.parse(response.data);
                    } catch (e) {
                        actualData = response.data;
                    }
                } else {
                    actualData = response.data;
                }

                if (actualData.status === 'Success') {
                    success = true;
                    message = 'Task submitted successfully! Waiting for approval.';
                } else {
                    message = actualData.status || actualData.response || 'Failed to submit task';
                }
            }
        } else {
            message = response.data?.response || response.message || 'Failed to submit task';
        }

        if (success) {
            showSubmitNotification(message, 'is-success');
            setTimeout(() => {
                hideSubmitModal();
                loadEvents(); // Reload events
            }, 1500);
        } else {
            showSubmitNotification(message, 'is-danger');
        }
    });
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