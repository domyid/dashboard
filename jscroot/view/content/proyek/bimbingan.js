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
    
    // Populate the week selector
    populateWeekOptions();
    
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
    
    if (result.status === 200 && Array.isArray(result.data)) {
        // Populate the week selector with available weeks
        const weekSelect = document.getElementById('week-select');
        weekSelect.innerHTML = ''; // Clear existing options
        
        result.data.forEach(weekly => {
            const option = document.createElement('option');
            option.value = weekly.weeknumber;
            option.textContent = `Minggu ${weekly.weeknumber} (${weekly.weeklabel})`;
            weekSelect.appendChild(option);
        });
        
        // If no weeks available, show default option
        if (result.data.length === 0) {
            addDefaultWeekOption();
        } else {
            // Select the latest week by default
            const latestWeek = result.data[result.data.length - 1];
            weekSelect.value = latestWeek.weeknumber;
            
            // Load data for the selected week
            fetchBimbinganWeeklyData();
        }
    } else {
        // No weeks found or error, show default week option
        addDefaultWeekOption();
        fetchBimbinganWeeklyData(); // Try to fetch week 1 data
    }
}

// Function to add default week option
function addDefaultWeekOption() {
    const weekSelect = document.getElementById('week-select');
    const option = document.createElement('option');
    option.value = "1";
    option.textContent = "Minggu 1";
    weekSelect.appendChild(option);
}

// Function to populate week dropdown options
function populateWeekOptions() {
    // This is now handled by loadAllWeeks which gets actual data from the server
    // We'll keep this as a fallback in case loadAllWeeks fails
    const weekSelect = document.getElementById('week-select');
    if (weekSelect.options.length === 0) {
        addDefaultWeekOption();
    }
}

// Function to fetch weekly bimbingan data
function fetchBimbinganWeeklyData() {
    const selectedWeek = document.getElementById('week-select').value || "1";
    
    // Show loading indicator
    document.getElementById('loading-indicator').style.display = 'block';
    
    // Fetch data from API
    getJSON(
        backend.project.weeklyassessment + "?week=" + selectedWeek,
        'login',
        getCookie('login'),
        handleBimbinganWeeklyResponse
    );
}

// Function to handle weekly bimbingan API response
function handleBimbinganWeeklyResponse(result) {
    console.log("Week data:", result);
    
    // Hide loading indicator
    document.getElementById('loading-indicator').style.display = 'none';
    
    if (result.status === 200) {
        // Update the activity score table
        updateActivityScoreTable(result.data.activityscore);
        
        // Update approval status
        updateApprovalStatus(result.data);
        
        // Update week label display
        document.getElementById('current-week-label').textContent = 
            `Minggu ${result.data.weeknumber} (${result.data.weeklabel})`;
        
        // If approved, disable the approval button
        document.getElementById('tombolmintaapproval').disabled = result.data.approved;
        
        // If we have an assessor already, pre-fill the phone number
        if (result.data.asesor && result.data.asesor.phonenumber) {
            setValue('phonenumber', result.data.asesor.phonenumber);
        }
    } else if (result.status === 404) {
        // No data found for this week, show initial state
        resetActivityScoreTable();
        document.getElementById('approval-status').textContent = 'Belum ada bimbingan';
        document.getElementById('approval-status').className = 'tag is-warning';
        document.getElementById('tombolmintaapproval').disabled = false;
        
        // Get week number from select
        const weekNumber = document.getElementById('week-select').value || "1";
        const weekLabel = `week${weekNumber}`;
        document.getElementById('current-week-label').textContent = 
            `Minggu ${weekNumber} (${weekLabel})`;
    } else {
        // Error
        Swal.fire({
            icon: 'error',
            title: 'Error mengambil data',
            text: result.response || 'Gagal mengambil data bimbingan mingguan'
        });
    }
}

// Function to update the activity score table
function updateActivityScoreTable(activityScore) {
    if (!activityScore) return;
    
    // Update each row in the table
    updateTableRow(0, activityScore.sponsordata, activityScore.sponsor);
    updateTableRow(1, activityScore.stravakm, activityScore.strava);
    updateTableRow(2, activityScore.iqresult, activityScore.iq);
    updateTableRow(3, activityScore.pomokitsesi, activityScore.pomokit);
    updateTableRow(4, activityScore.mbc, activityScore.blockchain);
    updateTableRow(5, activityScore.rupiah, activityScore.qris);
    updateTableRow(6, activityScore.trackerdata, activityScore.tracker);
    updateTableRow(7, activityScore.bukukatalog || '', activityScore.bukped);
    updateTableRow(8, activityScore.jurnalweb || '', activityScore.jurnal);
    updateTableRow(9, activityScore.gtmetrixresult, activityScore.gtmetrix);
    updateTableRow(10, activityScore.webhookpush, activityScore.webhook);
    updateTableRow(11, activityScore.presensihari, activityScore.presensi);
    
    // Update total score
    document.getElementById('total-score').textContent = activityScore.total || 0;
}

// Function to reset the activity score table
function resetActivityScoreTable() {
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
    document.getElementById('total-score').textContent = '0';
}

// Function to update a single table row
function updateTableRow(rowIndex, quantity, points) {
    const tableRows = document.querySelectorAll('table.table tbody tr');
    const row = tableRows[rowIndex]; // Get row by index
    
    if (row) {
        const quantityCell = row.querySelector('td:nth-child(3)');
        const pointsCell = row.querySelector('td:nth-child(4)');
        
        if (quantityCell && pointsCell) {
            quantityCell.textContent = quantity !== undefined ? quantity : '0';
            pointsCell.textContent = points !== undefined ? points : '0';
        }
    }
}

// Function to update approval status display
function updateApprovalStatus(data) {
    const statusElement = document.getElementById('approval-status');
    
    if (data.approved) {
        statusElement.textContent = 'Disetujui';
        statusElement.className = 'tag is-success';
        
        // Show asesor information if available
        if (data.asesor && data.asesor.name) {
            document.getElementById('asesor-info').textContent = 
                `Disetujui oleh: ${data.asesor.name} (${data.asesor.phonenumber})`;
            document.getElementById('asesor-info').style.display = 'block';
            
            // Show validation score if available
            if (data.validasi) {
                document.getElementById('validasi-score').textContent = 
                    `Validasi: ${data.validasi}/5`;
                document.getElementById('validasi-score').style.display = 'block';
            }
            
            // Show comment if available
            if (data.komentar) {
                document.getElementById('asesor-comment').textContent = 
                    `Komentar: ${data.komentar}`;
                document.getElementById('asesor-comment').style.display = 'block';
            }
        }
    } else if (data.asesor && data.asesor.phonenumber) {
        statusElement.textContent = 'Menunggu Persetujuan';
        statusElement.className = 'tag is-warning';
        document.getElementById('asesor-info').textContent = 
            `Diajukan ke: ${data.asesor.name || data.asesor.phonenumber}`;
        document.getElementById('asesor-info').style.display = 'block';
    } else {
        statusElement.textContent = 'Belum Diajukan';
        statusElement.className = 'tag is-danger';
        document.getElementById('asesor-info').style.display = 'none';
        document.getElementById('validasi-score').style.display = 'none';
        document.getElementById('asesor-comment').style.display = 'none';
    }
}

// Function to submit bimbingan request
function submitBimbinganRequest() {
    const selectedWeek = document.getElementById('week-select').value;
    const phonenumber = getValue('phonenumber');
    
    if (!phonenumber) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Nomor telepon dosen asesor harus diisi!'
        });
        return;
    }
    
    // Prepare request body
    const requestBody = {
        asesor: {
            phonenumber: phonenumber
        }
    };
    
    // Determine which endpoint to use based on current week
    const endpoint = parseInt(selectedWeek) === 1 
        ? backend.project.assessment + "/perdana" 
        : backend.project.assessment + "/lanjutan";
    
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
        endpoint,
        'login',
        getCookie('login'),
        requestBody,
        handleBimbinganSubmitResponse
    );
}

// Function to handle bimbingan submit response
function handleBimbinganSubmitResponse(result) {
    console.log(result);
    
    // Close loading indicator
    Swal.close();
    
    if (result.status === 200) {
        // Success
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Permintaan bimbingan berhasil dikirim!'
        }).then(() => {
            // Refresh the data
            fetchBimbinganWeeklyData();
        });
    } else if (result.data && result.data.status && result.data.status.startsWith("Info : ")) {
        // Info message
        Swal.fire({
            icon: 'info',
            title: result.data.status,
            text: result.data.response
        });
    } else {
        // Error
        Swal.fire({
            icon: 'error',
            title: result.data ? result.data.status : 'Error',
            text: result.data ? result.data.response : 'Gagal mengirim permintaan bimbingan'
        });
    }
}