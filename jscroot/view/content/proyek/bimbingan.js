import { onClick,getValue,setValue,onInput,onChange,hide,show } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
import {validatePhoneNumber} from "https://cdn.jsdelivr.net/gh/jscroot/validate@0.0.2/croot.js";
import {postJSON,getJSON} from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import {getCookie} from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import {addCSSIn} from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';
import { id,backend } from "/dashboard/jscroot/url/config.js";

export async function main(){    
    onInput('phonenumber', validatePhoneNumber);
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css",id.content);
    getJSON(backend.project.data,'login',getCookie('login'),getResponseFunction);
    getJSON(backend.project.assessment,'login',getCookie('login'),getBimbinganList);
    onClick('tombolmintaapproval', checkAndSubmit);
    onChange('bimbingan-name', handleBimbinganChange);
    fetchActivityScore();
    
    // Add new functionality for pengajuan sidang
    checkSidangEligibility();
    setupPengajuanSidangModal();

        // Add new functionality for claim event
        checkEventClaimStatus();
        setupClaimEventModal();
}

// Global variable to track current approval status
let currentApprovalStatus = null;

function updateApprovalStatus(result) {
    const statusElement = document.getElementById('approval-status');
    const tombolApproval = document.getElementById('tombolmintaapproval');
    
    // Update global status
    currentApprovalStatus = result;

    switch (result) {
        case true:
            statusElement.textContent = 'Disetujui';
            statusElement.className = 'tag is-success';
            // Disable tombol if already approved
            if (tombolApproval) {
                tombolApproval.disabled = true;
                tombolApproval.textContent = 'Sudah Disetujui';
                tombolApproval.classList.remove('is-primary');
                tombolApproval.classList.add('is-success');
            }
            break;
        case false:
            statusElement.textContent = 'Belum Disetujui';
            statusElement.className = 'tag is-danger';
            // Enable tombol if not approved
            if (tombolApproval) {
                tombolApproval.disabled = false;
                tombolApproval.textContent = 'Minta Approval';
                tombolApproval.classList.remove('is-success');
                tombolApproval.classList.add('is-primary');
            }
            break;
        default:
            statusElement.textContent = '';
            statusElement.className = '';
            // Reset tombol to default state
            if (tombolApproval) {
                tombolApproval.disabled = false;
                tombolApproval.textContent = 'Minta Approval';
                tombolApproval.classList.remove('is-success');
                tombolApproval.classList.add('is-primary');
            }
    }
}

// Function to clear approval status
function clearApprovalStatus() {
    const statusElement = document.getElementById('approval-status');
    const tombolApproval = document.getElementById('tombolmintaapproval');
    
    statusElement.textContent = '';
    statusElement.className = '';
    currentApprovalStatus = null;
    
    // Reset tombol to default state
    if (tombolApproval) {
        tombolApproval.disabled = false;
        tombolApproval.textContent = 'Minta Approval';
        tombolApproval.classList.remove('is-success');
        tombolApproval.classList.add('is-primary');
    }
}

function handleBimbinganChange(target) {
    const id = target.value; // Ini _id nya
    const defaultValue = 'x'.repeat(10);

    if (id === defaultValue) {
        // When "Bimbingan Minggu ini" is selected
        fetchActivityScore();
        // Clear the approval status when selecting the default option
        clearApprovalStatus();
    } else {
        const url = `${backend.project.assessment}/${id}`;
        getJSON(url, 'login', getCookie('login'), function(result) {
            handleActivityScoreResponse(result);
            
            // Only update approval status for specific bimbingan entries
            if (result.status === 200 && result.data.approved !== undefined) {
                updateApprovalStatus(result.data.approved);
            }
        });
    }
}

function getBimbinganList(result) {
    if (result.status === 200) {
        result.data.forEach((bimbingan) => {
            console.log({ bimbingan });
            const option = document.createElement('option');
            option.value = bimbingan._id;

            const bimbinganText = 'Bimbingan Ke-';
            option.textContent = bimbinganText + (bimbingan.bimbinganke ?? 1);
            document.getElementById('bimbingan-name').appendChild(option);
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: result.data.status,
            text: result.data.response,
        });
    }
}

function checkAndSubmit() {
    // Check if already approved
    if (currentApprovalStatus === true) {
        Swal.fire({
            icon: 'info',
            title: 'Sudah Disetujui',
            text: 'Bimbingan ini sudah disetujui dan tidak perlu diajukan lagi.',
            confirmButtonText: 'OK'
        });
        return;
    }
    
    // Disable tombol immediately to prevent double-click
    const tombolApproval = document.getElementById('tombolmintaapproval');
    if (tombolApproval) {
        tombolApproval.disabled = true;
        tombolApproval.textContent = 'Memproses...';
    }
    
    // Check the conditions first
    const conditions = checkApprovalButtonConditions();
    
    if (!conditions.isValid) {
        // Create message about what's missing
        let missingItems = [];
        
        if (!conditions.sponsordata) missingItems.push("Data Sponsor");
        if (!conditions.stravakm) missingItems.push("Strava");
        if (!conditions.iqresult) missingItems.push("Test IQ");
        if (!conditions.pomokitsesi) missingItems.push("Pomokit");
        if (!conditions.trackerdata) missingItems.push("Web Tracker");
        if (!conditions.gtmetrixresult) missingItems.push("GTMetrix");
        if (!conditions.webhookpush) missingItems.push("WebHook");
        if (!conditions.presensihari) missingItems.push("Presensi");
        
        // Check QRIS condition
        if (!conditions.qrisCondition) {
            if (activityData.rupiah === 0) {
                if (activityData.mbc === 0) missingItems.push("Blockchain MBC");
                if (activityData.rvn === 0) missingItems.push("Blockchain RVN");
                missingItems.push("(QRIS kosong, butuh MBC dan RVN > 0)");
            } else {
                missingItems.push("QRIS");
            }
        }
        
        // Show alert with missing items
        Swal.fire({
            icon: 'warning',
            title: 'Belum Lengkap',
            html: `<p>Item berikut masih kurang:</p><ul>${missingItems.map(item => `<li>${item}</li>`).join('')}</ul>`,
            confirmButtonText: 'Mengerti'
        }).then(() => {
            // Re-enable tombol after alert is closed
            if (tombolApproval) {
                tombolApproval.disabled = false;
                tombolApproval.textContent = 'Minta Approval';
            }
        });
        
        return; // Stop here
    }
    
    // If all conditions are met, proceed with the action
    actionfunctionname();
}

function actionfunctionname(){
    let idprjusr = {
        // _id: getValue('project-name'),
        asesor: {
            phonenumber: getValue('phonenumber'),
        },
    };
    if (getCookie("login")===""){
        redirect("/signin");
    }else{
        const bimbinganLanjutan = backend.project.assessment + "/lanjutan"
        postJSON(bimbinganLanjutan,"login",getCookie("login"),idprjusr,postResponseFunction);
        // hide("tombolbuatproyek");    
    }
}

function getResponseFunction(result){
    if (result.status===200){
        result.data.forEach(project => {
            const option = document.createElement('option');
            option.value = project._id;
            option.textContent = project.name;
            document.getElementById('project-name').appendChild(option);
        });

    }else{
        Swal.fire({
            icon: "error",
            title: result.data.status,
            text: result.data.response,
          });
    }
}

function postResponseFunction(result){
    const tombolApproval = document.getElementById('tombolmintaapproval');
    
    if(result.status === 200){
        // const katakata = "Selamat! Anda telah berhasil mengajukan permohonan penilaian proyek. Silakan tunggu konfirmasi dari asesor.";
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Selamat! Anda telah berhasil mengajukan permohonan penilaian proyek. Silakan tunggu konfirmasi dari asesor.',
            didClose: () => {
                setValue('phonenumber', '');
                // Update button state to show it's been submitted
                if (tombolApproval) {
                    tombolApproval.disabled = true;
                    tombolApproval.textContent = 'Menunggu Approval';
                    tombolApproval.classList.remove('is-primary');
                    tombolApproval.classList.add('is-warning');
                }
            },
        });
    }else if (result.data.status.startsWith("Info : ")) {
        Swal.fire({
            icon: 'info',
            title: result.data.status,
            text: result.data.response,
            didClose: () => {
                // Re-enable button if info message
                if (tombolApproval) {
                    tombolApproval.disabled = false;
                    tombolApproval.textContent = 'Minta Approval';
                }
            }
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: result.data.status,
            text: result.data.response,
            didClose: () => {
                // Re-enable button if error
                if (tombolApproval) {
                    tombolApproval.disabled = false;
                    tombolApproval.textContent = 'Minta Approval';
                }
            }
        });
        // show("tombolmintaapproval");
    }
    console.log(result);
}

// Global variables to store activity data
let activityData = {
    sponsordata: 0,
    stravakm: 0,
    iqresult: 0,
    pomokitsesi: 0,
    mbc: 0,
    rupiah: 0,
    trackerdata: 0,
    bukukatalog: 0,
    jurnalcount: 0,
    gtmetrixresult: '', // Changed to empty string as default
    webhookpush: 0,
    presensihari: 0,
    rvn: 0
};

function fetchActivityScore() {
    getJSON(backend.activityscore.weekly, 'login', getCookie('login'), handleActivityScoreResponse);
}

function handleActivityScoreResponse(result) {
    if (result.status === 200) {
        // Update the global activity data
        activityData = {
            sponsordata: result.data.sponsordata || 0,
            stravakm: result.data.stravakm || 0,
            iqresult: result.data.iqresult || 0,
            pomokitsesi: result.data.pomokitsesi || 0,
            mbc: result.data.mbc || 0,
            rupiah: result.data.rupiah || 0,
            trackerdata: result.data.trackerdata || 0,
            bukukatalog: result.data.bukukatalog || 0,
            jurnalcount: result.data.jurnalcount || 0,
            gtmetrixresult: result.data.gtmetrixresult || '', // Accept as string
            webhookpush: result.data.webhookpush || 0,
            presensihari: result.data.presensihari || 0,
            rvn: result.data.rvn || 0
        };

        updateTableRow(0, result.data.sponsordata, result.data.sponsor);
        updateTableRow(1, result.data.stravakm, result.data.strava);
        updateTableRow(2, result.data.iqresult, result.data.iq);
        updateTableRow(3, result.data.pomokitsesi, result.data.pomokit);
        updateTableRow(4, result.data.mbc, result.data.mbcPoints || result.data.blockchain); 
        updateTableRow(5, result.data.rupiah, result.data.qrisPoints || result.data.qris);     
        updateTableRow(6, result.data.trackerdata, result.data.tracker);
        updateTableRow(7, result.data.bukukatalog, result.data.bukped);
        updateTableRow(8, result.data.jurnalcount || 0, result.data.jurnal || 0);  // Added jurnal row
        updateTableRow(9, result.data.gtmetrixresult, result.data.gtmetrix);
        updateTableRow(10, result.data.webhookpush, result.data.webhook);
        updateTableRow(11, result.data.presensihari, result.data.presensi);
        updateTableRow(12, result.data.rvn, result.data.ravencoinPoints || 0);
        
        // Check conditions and update button status
        checkApprovalButtonConditions();
    } else {
        console.log(result.data.message);
    }
}

function updateTableRow(rowIndex, quantity, points) {
    const tableRows = document.querySelectorAll('table.table tbody tr');
    const row = tableRows[rowIndex]; // Ambil baris berdasarkan indeks
    if (row) {
        const quantityCell = row.querySelector('td:nth-child(3)');
        const pointsCell = row.querySelector('td:nth-child(4)');

        if (quantityCell && pointsCell) {
            quantityCell.textContent = quantity || 0;
            pointsCell.textContent = points || 0;
        }
    }
}

// Function to check conditions and update button status
function checkApprovalButtonConditions() {
    // Extract values from activityData
    const {
        sponsordata, stravakm, iqresult, pomokitsesi, mbc, rupiah,
        trackerdata, bukukatalog, jurnalcount, gtmetrixresult, webhookpush, presensihari, rvn
    } = activityData;
    
    // Check if gtmetrixresult has a value (not empty string)
    const hasGtmetrixResult = gtmetrixresult && gtmetrixresult.trim() !== '';
    
    // Check if all required activities have quantity > 0
    // Except for buku (bukukatalog) and jurnal (jurnalcount)
    const requiredActivitiesPositive = 
        sponsordata > 0 && 
        stravakm > 0 && 
        iqresult > 0 && 
        pomokitsesi > 0 && 
        trackerdata > 0 && 
        hasGtmetrixResult && // Changed condition for gtmetrixresult
        webhookpush > 0 && 
        presensihari > 0;
    
    // Special condition for QRIS, MBC, and RVN
    const qrisCondition = rupiah > 0 || (rupiah === 0 && mbc > 0 && rvn > 0);
    
    // Combine all conditions
    const allConditionsMet = requiredActivitiesPositive && qrisCondition;
    
    return {
        isValid: allConditionsMet,
        sponsordata: sponsordata > 0,
        stravakm: stravakm > 0,
        iqresult: iqresult > 0,
        pomokitsesi: pomokitsesi > 0,
        trackerdata: trackerdata > 0,
        gtmetrixresult: hasGtmetrixResult, // Changed to check for non-empty string
        webhookpush: webhookpush > 0,
        presensihari: presensihari > 0,
        qrisCondition: qrisCondition,
        rupiah: rupiah > 0,
        mbcrvn: rupiah === 0 && mbc > 0 && rvn > 0
    };
}

// Function to check if student has enough bimbingan sessions to request sidang
function checkSidangEligibility() {
    getJSON(backend.project.assessment, 'login', getCookie('login'), function(result) {
        if (result.status === 200) {
            const bimbinganCount = result.data.length;
            const eligibilityMet = bimbinganCount >= 8;
            
            // Enable or disable the "Ajukan Sidang" button based on eligibility
            const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
            if (tombolPengajuanSidang) {
                tombolPengajuanSidang.disabled = !eligibilityMet;
                
                // Add tooltip to explain why button is disabled
                if (!eligibilityMet) {
                    tombolPengajuanSidang.setAttribute('title', `Anda memerlukan minimal 8 sesi bimbingan untuk mengajukan sidang. Saat ini: ${bimbinganCount}`);
                } else {
                    tombolPengajuanSidang.setAttribute('title', 'Klik untuk mengajukan sidang');
                    
                    // Check if there's an existing pengajuan
                    checkExistingPengajuan();
                }
            }
        } else {
            console.error('Failed to get bimbingan data:', result);
        }
    });
}

// Function to check if there's an existing pengajuan
function checkExistingPengajuan() {
    getJSON(backend.bimbingan.pengajuan, 'login', getCookie('login'), function(result) {
        if (result.status === 200 && result.data.length > 0) {
            // There's an existing pengajuan
            const latestPengajuan = result.data[result.data.length - 1];
            const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
            
            // Update button based on status
            if (tombolPengajuanSidang) {
                if (latestPengajuan.status === 'pending') {
                    tombolPengajuanSidang.textContent = 'Pengajuan Sidang (Pending)';
                    tombolPengajuanSidang.classList.remove('is-info');
                    tombolPengajuanSidang.classList.add('is-warning');
                    tombolPengajuanSidang.disabled = true;
                    tombolPengajuanSidang.setAttribute('title', 'Pengajuan sidang Anda sedang diproses');
                } else if (latestPengajuan.status === 'approved') {
                    tombolPengajuanSidang.textContent = 'Pengajuan Sidang (Disetujui)';
                    tombolPengajuanSidang.classList.remove('is-info');
                    tombolPengajuanSidang.classList.add('is-success');
                    tombolPengajuanSidang.disabled = true;
                    tombolPengajuanSidang.setAttribute('title', 'Pengajuan sidang Anda telah disetujui');
                } else if (latestPengajuan.status === 'rejected') {
                    tombolPengajuanSidang.textContent = 'Ajukan Sidang Kembali';
                    tombolPengajuanSidang.classList.remove('is-info');
                    tombolPengajuanSidang.classList.add('is-danger');
                    tombolPengajuanSidang.disabled = false;
                    tombolPengajuanSidang.setAttribute('title', 'Pengajuan sidang Anda ditolak. Silakan ajukan kembali.');
                }
            }
        }
    });
}

// Handle modal interactions for pengajuan sidang
function setupPengajuanSidangModal() {
    const modal = document.getElementById('modal-pengajuan-sidang');
    const tombolPengajuan = document.getElementById('tombolpengajuansidang');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-pengajuan');
    const submitBtn = document.getElementById('submit-pengajuan');
    const closeNotificationBtn = document.getElementById('close-notification');
    const notification = document.getElementById('notification-pengajuan');
    
    // Load the list of available dosen penguji on modal open
    tombolPengajuan.addEventListener('click', function() {
        modal.classList.add('is-active');
        // Fetch the list of dosen penguji
        fetchDosenPenguji();
    });
    
    // Close modal functions
    function closeModal() {
        modal.classList.remove('is-active');
        // Reset form
        document.getElementById('dosen-penguji').value = '';
        document.getElementById('nomor-kelompok').value = '';
    }
    
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Handle submission
    submitBtn.addEventListener('click', function() {
        const dosenPengujiSelect = document.getElementById('dosen-penguji');
        const nomorKelompok = document.getElementById('nomor-kelompok').value;
        
        if (!dosenPengujiSelect.value || !nomorKelompok) {
            showNotification('Mohon lengkapi semua field', 'is-danger');
            return;
        }
        
        // Get the selected dosen penguji phone number from the data attribute
        const dosenPengujiPhone = dosenPengujiSelect.options[dosenPengujiSelect.selectedIndex].getAttribute('data-phone');
        
        const pengajuanData = {
            dosenPengujiPhone: dosenPengujiPhone,
            nomorKelompok: nomorKelompok
        };
        
        postJSON(backend.bimbingan.pengajuan, 'login', getCookie('login'), pengajuanData, function(result) {
            closeModal();
            if (result.status === 200) {
                showNotification('Pengajuan sidang berhasil dikirim', 'is-success');
                // Update button state
                setTimeout(checkExistingPengajuan, 1000);
            } else {
                showNotification(`Error: ${result.data?.response || 'Gagal mengirim pengajuan'}`, 'is-danger');
            }
        });
    });
    
    // Close notification
    closeNotificationBtn.addEventListener('click', function() {
        notification.classList.add('is-hidden');
    });
}

// Function to fetch and populate dosen penguji dropdown
function fetchDosenPenguji() {
    getJSON(backend.bimbingan.dosenpenguji, 'login', getCookie('login'), function(result) {
        if (result.status === 200) {
            const dosenPengujiSelect = document.getElementById('dosen-penguji');
            
            // Clear existing options except the first one
            while (dosenPengujiSelect.options.length > 1) {
                dosenPengujiSelect.remove(1);
            }
            
            // Add new options
            result.data.forEach(dosen => {
                const option = document.createElement('option');
                option.value = dosen._id;
                option.textContent = dosen.name;
                option.setAttribute('data-phone', dosen.phonenumber);
                dosenPengujiSelect.appendChild(option);
            });
        } else {
            showNotification('Gagal mengambil data dosen penguji', 'is-danger');
        }
    });
}

// Show notification function
function showNotification(message, type) {
    const notification = document.getElementById('notification-pengajuan');
    const notificationMessage = document.getElementById('notification-message');
    
    // Remove all notification types
    notification.classList.remove('is-success', 'is-danger', 'is-warning', 'is-info');
    // Add the specific type
    notification.classList.add(type);
    // Set the message
    notificationMessage.textContent = message;
    // Show the notification
    notification.classList.remove('is-hidden');
    
    // Auto hide after 5 seconds
    setTimeout(function() {
        notification.classList.add('is-hidden');
    }, 5000);
}

// Event Claim Modal Logic
async function checkEventClaimStatus() {
    const tombolClaimEvent = document.getElementById('tombolclaimevent');
    if (!tombolClaimEvent) return;

    getJSON(backend.bimbingan.eventClaimStatus, 'login', getCookie('login'), function(result) { // Path from config.js
        if (result.status === 200 && result.data) {
            if (result.data.hasClaimed) {
                tombolClaimEvent.textContent = 'Event Code Claimed';
                tombolClaimEvent.disabled = true;
                tombolClaimEvent.classList.remove('is-warning');
                tombolClaimEvent.classList.add('is-success');
                tombolClaimEvent.setAttribute('title', `Code ${result.data.eventCode} claimed on ${new Date(result.data.claimedAt).toLocaleDateString()}`);
            } else {
                tombolClaimEvent.textContent = 'Claim Code Referral Event';
                tombolClaimEvent.disabled = false;
                tombolClaimEvent.classList.remove('is-success');
                tombolClaimEvent.classList.add('is-warning');
                tombolClaimEvent.setAttribute('title', 'Click to claim an event referral code');
            }
        } else {
            console.error("Error checking event claim status:", result.data?.response || "Unknown error");
            tombolClaimEvent.textContent = 'Claim Code Referral Event';
            tombolClaimEvent.disabled = false; 
        }
    });
}

function setupClaimEventModal() {
    const modal = document.getElementById('modal-claim-event');
    const tombolClaimEvent = document.getElementById('tombolclaimevent');
    const closeModalBtn = document.getElementById('close-modal-claim');
    const cancelBtn = document.getElementById('cancel-claim-code');
    const submitBtn = document.getElementById('submit-claim-code');
    const eventCodeInput = document.getElementById('event-code-input');

    const notificationModal = document.getElementById('notification-claim-event-modal');
    const notificationMessageModal = document.getElementById('notification-message-claim-modal');
    const closeNotificationModalBtn = document.getElementById('close-notification-claim-modal');

    if (!modal || !tombolClaimEvent || !closeModalBtn || !cancelBtn || !submitBtn || !eventCodeInput) {
        console.error("One or more elements for claim event modal not found.");
        return;
    }

    tombolClaimEvent.addEventListener('click', function() {
        if (tombolClaimEvent.disabled) return;
        eventCodeInput.value = ''; 
        hideEventNotificationModal();
        modal.classList.add('is-active');
    });

    function closeEventModal() {
        modal.classList.remove('is-active');
    }

    closeModalBtn.addEventListener('click', closeEventModal);
    cancelBtn.addEventListener('click', closeEventModal);
    if(closeNotificationModalBtn) {
        closeNotificationModalBtn.addEventListener('click', hideEventNotificationModal);
    }

    submitBtn.addEventListener('click', function() {
        const code = eventCodeInput.value.trim();
        if (!code) {
            showEventNotificationModal('Please enter an event code.', 'is-danger');
            return;
        }

        hideEventNotificationModal();
        submitBtn.classList.add('is-loading');

        const claimData = { code: code };

        postJSON(backend.bimbingan.claimEvent, 'login', getCookie('login'), claimData, function(result) { // Path from config.js
            submitBtn.classList.remove('is-loading');
            if (result.status === 200) {
                closeEventModal();
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: result.data.response || 'Event code claimed successfully! Your bimbingan has been added.',
                    confirmButtonText: 'Great!'
                }).then(() => {
                    checkEventClaimStatus(); 
                    fetchActivityScore(); // Refresh activity score table
                    // Refresh bimbingan list dropdown
                    const bimbinganSelect = document.getElementById('bimbingan-name');
                    if (bimbinganSelect) {
                        while (bimbinganSelect.options.length > 1) { // Keep the default option
                            bimbinganSelect.remove(1);
                        }
                    }
                    getJSON(backend.project.assessment,'login',getCookie('login'),getBimbinganList);
                    checkSidangEligibility(); // Re-check sidang eligibility as bimbingan count changed
                });
            } else {
                 showEventNotificationModal(result.data?.response || 'Failed to claim event code.', 'is-danger');
            }
        });
    });

    function showEventNotificationModal(message, type) {
        if (!notificationModal || !notificationMessageModal) return;
        notificationMessageModal.textContent = message;
        notificationModal.classList.remove('is-success', 'is-danger', 'is-warning', 'is-info', 'is-hidden');
        notificationModal.classList.add(type);
    }

    function hideEventNotificationModal() {
        if (!notificationModal) return;
        notificationModal.classList.add('is-hidden');
    }
}