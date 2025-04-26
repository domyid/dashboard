import { onClick, getValue, setValue, onInput, hide, show } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
import { validatePhoneNumber } from "https://cdn.jsdelivr.net/gh/jscroot/validate@0.0.2/croot.js";
import { postJSON, getJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import { addCSSIn } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';
import { id, backend } from "/dashboard/jscroot/url/config.js";

export async function main() {
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css", id.content);
    onInput('phonenumber', validatePhoneNumber);
    
    // Add event listener for the week selector
    document.getElementById('week-select').addEventListener('change', function() {
        fetchBimbinganWeeklyData();
    });
    
    // Enable the submit button if there's a phone number
    document.getElementById('phonenumber').addEventListener('input', function() {
        document.getElementById('tombolmintaapproval').disabled = !this.value;
    });
    
    // Add event listener for the submit button
    onClick("tombolmintaapproval", submitBimbinganRequest);
    
    // Initialize by loading all weeks for this student
    loadAllWeeks();
}

// Function to load all weeks for this student
function loadAllWeeks() {
    console.log("Fetching all weeks from:", backend.bimbingan.all);
    
    // Show loading indicator
    document.getElementById('loading-indicator').style.display = 'block';
    
    getJSON(
        backend.bimbingan.all,
        'login',
        getCookie('login'),
        handleAllWeeksResponse
    );
}

// Function to handle all weeks response
function handleAllWeeksResponse(result) {
    console.log("All weeks data:", result);
    
    // Hide loading indicator
    document.getElementById('loading-indicator').style.display = 'none';
    
    if (result && Array.isArray(result) && result.length > 0) {
        // Populate the week selector with available weeks
        const weekSelect = document.getElementById('week-select');
        weekSelect.innerHTML = ''; // Clear existing options
        
        // Sort weeks by week number (ascending)
        result.sort((a, b) => a.weeknumber - b.weeknumber);
        
        result.forEach(weekly => {
            const option = document.createElement('option');
            option.value = weekly.weeknumber;
            option.textContent = `Minggu ${weekly.weeknumber} (${weekly.weeklabel})`;
            weekSelect.appendChild(option);
        });
        
        // Select the latest week
        const latestWeek = result[result.length - 1];
        weekSelect.value = latestWeek.weeknumber;
        
        // Load data for the selected week
        fetchBimbinganWeeklyData();
    } else {
        // If no data, fetch current week data
        fetchCurrentWeekData();
    }
}

// Function to fetch current week data when no weeks are available
function fetchCurrentWeekData() {
    console.log("Fetching current week status to get default week");
    // Make an API call to get the current week status
    getJSON(
        backend.bimbingan.status, // Endpoint to get current week status
        'login',
        getCookie('login'),
        (data) => {
            if (data && data.currentweek) {
                console.log("Retrieved current week data:", data);
                
                // Add the current week to the dropdown
                const weekSelect = document.getElementById('week-select');
                weekSelect.innerHTML = ''; // Clear any existing options
                
                const option = document.createElement('option');
                option.value = data.currentweek;
                option.textContent = `Minggu ${data.currentweek} (${data.weeklabel})`;
                weekSelect.appendChild(option);
                
                // Then fetch data for this week
                fetchBimbinganWeeklyData();
            } else {
                console.warn("No current week data available, using week 1 as fallback");
                // As a last resort, manually add week 1
                const weekSelect = document.getElementById('week-select');
                weekSelect.innerHTML = ''; // Clear any existing options
                
                const option = document.createElement('option');
                option.value = "1";
                option.textContent = "Minggu 1 (week1)";
                weekSelect.appendChild(option);
                
                // Try to fetch data for week 1
                fetchBimbinganWeeklyData();
                
                // Hide loading indicator if it's still showing
                document.getElementById('loading-indicator').style.display = 'none';
            }
        }
    );
}

// Function to fetch weekly bimbingan data
function fetchBimbinganWeeklyData() {
    const weekSelect = document.getElementById('week-select');
    
    // Check if there are any options in the select
    if (weekSelect.options.length === 0) {
        console.warn("No week options available in the dropdown");
        return;
    }
    
    const selectedWeek = weekSelect.value;
    
    // Show loading indicator
    document.getElementById('loading-indicator').style.display = 'block';
    
    // Debug log
    console.log(`Fetching data for week ${selectedWeek} from: ${backend.bimbingan.weekly}?week=${selectedWeek}`);
    
    // Fetch data from API
    getJSON(
        `${backend.bimbingan.weekly}?week=${selectedWeek}`,
        'login',
        getCookie('login'),
        handleBimbinganWeeklyResponse
    );
}

// Function to handle weekly bimbingan API response
function handleBimbinganWeeklyResponse(result) {
    console.log("Week data response:", result);
    
    // Hide loading indicator
    document.getElementById('loading-indicator').style.display = 'none';
    
    if (result) {
        // Update week label display
        const weekLabel = result.weeklabel || `week${result.weeknumber}`;
        document.getElementById('current-week-label').textContent = 
            `Minggu ${result.weeknumber} (${weekLabel})`;
        
        // Extract activity score data from the response
        let activityScore = null;
        
        // Look for activity score in different possible locations
        if (result.activityscore) {
            console.log("Found activityscore at root level");
            activityScore = result.activityscore;
        } else if (result.data && result.data.activityscore) {
            console.log("Found activityscore in data property");
            activityScore = result.data.activityscore;
        } else if (result.iq !== undefined || result.mbc !== undefined || result.tracker !== undefined) {
            // Some implementations might have activity score fields directly in the root object
            console.log("Using root object as activityscore");
            activityScore = result;
        }
        
        // Update the table if we found activity score data
        if (activityScore) {
            updateActivityScoreTable(activityScore);
        } else {
            console.warn("No activityscore data found in the response");
            resetActivityScoreTable();
        }
        
        // Update approval status
        updateApprovalStatus(result);
        
        // If approved, disable the approval button
        document.getElementById('tombolmintaapproval').disabled = result.approved === true;
        
        // If we have an assessor already, pre-fill the phone number
        if (result.asesor && result.asesor.phonenumber) {
            setValue('phonenumber', result.asesor.phonenumber);
        }
    } else {
        console.warn("No data received from server or error occurred");
        // No data found for this week, show initial state
        resetActivityScoreTable();
        document.getElementById('approval-status').textContent = 'Belum ada bimbingan';
        document.getElementById('approval-status').className = 'tag is-warning';
        document.getElementById('tombolmintaapproval').disabled = false;
        
        // Get week number from select
        const weekSelect = document.getElementById('week-select');
        if (weekSelect.options.length > 0) {
            const weekNumber = weekSelect.value;
            const option = weekSelect.options[weekSelect.selectedIndex];
            const label = option.textContent.split('(')[1]?.split(')')[0] || `week${weekNumber}`;
            
            document.getElementById('current-week-label').textContent = 
                `Minggu ${weekNumber} (${label})`;
        }
        
        // Hide assessor info elements
        document.getElementById('asesor-info').style.display = 'none';
        document.getElementById('validasi-score').style.display = 'none';
        document.getElementById('asesor-comment').style.display = 'none';
    }
}

// Function to update the activity score table
function updateActivityScoreTable(activityScore) {
    console.log("Updating activity score table with data:", activityScore);
    
    if (!activityScore) {
        console.warn("Activity score data is null or undefined");
        return;
    }
    
    // Calculate total score
    let totalScore = 0;
    
    // Update each row in the table
    updateTableRow(0, activityScore.sponsordata, activityScore.sponsor);
    updateTableRow(1, activityScore.stravakm, activityScore.strava);
    updateTableRow(2, activityScore.iqresult, activityScore.iq);
    updateTableRow(3, activityScore.pomokitsesi, activityScore.pomokit);
    updateTableRow(4, activityScore.mbc, activityScore.blockchain || activityScore.mbcPoints);
    updateTableRow(5, activityScore.rupiah, activityScore.qris || activityScore.qrisPoints);
    updateTableRow(6, activityScore.trackerdata, activityScore.tracker);
    updateTableRow(7, activityScore.gtmetrixresult, activityScore.gtmetrix);
    updateTableRow(8, activityScore.webhookpush, activityScore.webhook);
    updateTableRow(9, activityScore.presensihari, activityScore.presensi);
    updateTableRow(10, activityScore.rvn, activityScore.ravencoinPoints);
    
    // Sum up all point values for total score
    if (typeof activityScore.sponsor === 'number') totalScore += activityScore.sponsor;
    if (typeof activityScore.strava === 'number') totalScore += activityScore.strava;
    if (typeof activityScore.iq === 'number') totalScore += activityScore.iq;
    if (typeof activityScore.pomokit === 'number') totalScore += activityScore.pomokit;
    if (typeof activityScore.blockchain === 'number') totalScore += activityScore.blockchain;
    if (typeof activityScore.mbcPoints === 'number') totalScore += activityScore.mbcPoints;
    if (typeof activityScore.qris === 'number') totalScore += activityScore.qris;
    if (typeof activityScore.qrisPoints === 'number') totalScore += activityScore.qrisPoints;
    if (typeof activityScore.tracker === 'number') totalScore += activityScore.tracker;
    if (typeof activityScore.gtmetrix === 'number') totalScore += activityScore.gtmetrix;
    if (typeof activityScore.webhook === 'number') totalScore += activityScore.webhook;
    if (typeof activityScore.presensi === 'number') totalScore += activityScore.presensi;
    if (typeof activityScore.ravencoinPoints === 'number') totalScore += activityScore.ravencoinPoints;
    
    // If total score is available directly, use it
    if (typeof activityScore.total === 'number' || typeof activityScore.totalScore === 'number') {
        totalScore = activityScore.total || activityScore.totalScore;
    }
    
    // Update total score in the table footer
    const totalScoreElement = document.getElementById('total-score');
    if (totalScoreElement) {
        totalScoreElement.textContent = totalScore.toFixed(2);
    }
}

// Function to reset the activity score table to zeros
function resetActivityScoreTable() {
    console.log("Resetting activity score table");
    
    const tableRows = document.querySelectorAll('table.table tbody tr');
    tableRows.forEach(row => {
        const quantityCell = row.querySelector('td:nth-child(3)');
        const pointsCell = row.querySelector('td:nth-child(4)');
        
        if (quantityCell && pointsCell) {
            quantityCell.textContent = '0';
            pointsCell.textContent = '0';
        }
    });
    
    // Reset total score
    const totalScoreElement = document.getElementById('total-score');
    if (totalScoreElement) {
        totalScoreElement.textContent = '0';
    }
}

// Function to update a single table row
function updateTableRow(rowIndex, quantity, points) {
    const tableRows = document.querySelectorAll('table.table tbody tr');
    
    if (rowIndex >= tableRows.length) {
        console.warn(`Row index ${rowIndex} is out of bounds`);
        return;
    }
    
    const row = tableRows[rowIndex]; // Get row by index
    
    if (row) {
        const quantityCell = row.querySelector('td:nth-child(3)');
        const pointsCell = row.querySelector('td:nth-child(4)');
        
        if (quantityCell && pointsCell) {
            // Format quantity appropriately
            if (quantity !== undefined && quantity !== null) {
                // For floating point numbers, display with appropriate precision
                if (typeof quantity === 'number' && !Number.isInteger(quantity)) {
                    quantityCell.textContent = quantity.toFixed(4);
                } else {
                    quantityCell.textContent = quantity;
                }
            } else {
                quantityCell.textContent = '0';
            }
            
            // Format points appropriately
            if (points !== undefined && points !== null) {
                // For floating point numbers, display with appropriate precision
                if (typeof points === 'number' && !Number.isInteger(points)) {
                    pointsCell.textContent = points.toFixed(2);
                } else {
                    pointsCell.textContent = points;
                }
            } else {
                pointsCell.textContent = '0';
            }
        } else {
            console.warn(`Could not find cells for row ${rowIndex}`);
        }
    } else {
        console.warn(`Could not find row at index ${rowIndex}`);
    }
}

// Function to update approval status display
function updateApprovalStatus(data) {
    console.log("Updating approval status with data:", data);
    
    const statusElement = document.getElementById('approval-status');
    const asesorInfo = document.getElementById('asesor-info');
    const validasiScore = document.getElementById('validasi-score');
    const asesorComment = document.getElementById('asesor-comment');
    
    // Reset display
    asesorInfo.style.display = 'none';
    validasiScore.style.display = 'none';
    asesorComment.style.display = 'none';
    
    if (data.approved === true) {
        statusElement.textContent = 'Disetujui';
        statusElement.className = 'tag is-success';
        
        // Show asesor information if available
        if (data.asesor && data.asesor.name) {
            asesorInfo.textContent = 
                `Disetujui oleh: ${data.asesor.name} (${data.asesor.phonenumber})`;
            asesorInfo.style.display = 'block';
            
            // Show validation score if available
            if (data.validasi) {
                validasiScore.textContent = 
                    `Validasi: ${data.validasi}/5`;
                validasiScore.style.display = 'block';
            }
            
            // Show comment if available
            if (data.komentar) {
                asesorComment.textContent = 
                    `Komentar: ${data.komentar}`;
                asesorComment.style.display = 'block';
            }
        }
    } else if (data.asesor && data.asesor.phonenumber) {
        statusElement.textContent = 'Menunggu Persetujuan';
        statusElement.className = 'tag is-warning';
        asesorInfo.textContent = 
            `Diajukan ke: ${data.asesor.name || data.asesor.phonenumber}`;
        asesorInfo.style.display = 'block';
    } else {
        statusElement.textContent = 'Belum Diajukan';
        statusElement.className = 'tag is-danger';
    }
}

// Function to submit bimbingan request
function submitBimbinganRequest() {
    const selectedWeek = document.getElementById('week-select').value;
    const asesorPhoneNumber = getValue('phonenumber');
    
    if (!asesorPhoneNumber) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Nomor telepon dosen asesor harus diisi!'
        });
        return;
    }
    
    // Prepare request body
    const requestBody = {
        asesorPhoneNumber: asesorPhoneNumber,
        weekNumber: parseInt(selectedWeek)
    };
    
    console.log("Sending request to:", backend.bimbingan.request);
    console.log("Request body:", requestBody);
    
    // Show loading indicator
    Swal.fire({
        title: 'Mengirim permintaan...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Send request
    postJSON(
        backend.bimbingan.request,
        'login',
        getCookie('login'),
        requestBody,
        handleBimbinganSubmitResponse
    );
}

// Function to handle bimbingan submit response
function handleBimbinganSubmitResponse(result) {
    console.log("Submit response:", result);
    
    // Close loading indicator
    Swal.close();
    
    if (result && result._id) {
        // Success
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Permintaan bimbingan berhasil dikirim!'
        }).then(() => {
            // Refresh the data
            fetchBimbinganWeeklyData();
        });
    } else if (result && result.status && result.status.startsWith("Info : ")) {
        // Info message
        Swal.fire({
            icon: 'info',
            title: 'Informasi',
            text: result.response || result.status
        });
    } else {
        // Error
        Swal.fire({
            icon: 'error',
            title: result.status || 'Error',
            text: result.response || 'Gagal mengirim permintaan bimbingan'
        });
    }
}