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
}

function updateApprovalStatus(result) {
    const statusElement = document.getElementById('approval-status');

    switch (result) {
        case true:
            statusElement.textContent = 'Disetujui';
            statusElement.className = 'tag is-success';
            break;
        case false:
            statusElement.textContent = 'Belum Disetujui';
            statusElement.className = 'tag is-danger';
            break;
        default:
            statusElement.textContent = '';
            statusElement.className = '';
    }
}

// Function to clear approval status
function clearApprovalStatus() {
    const statusElement = document.getElementById('approval-status');
    statusElement.textContent = '';
    statusElement.className = '';
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
    if(result.status === 200){
        // const katakata = "Selamat! Anda telah berhasil mengajukan permohonan penilaian proyek. Silakan tunggu konfirmasi dari asesor.";
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Selamat! Anda telah berhasil mengajukan permohonan penilaian proyek. Silakan tunggu konfirmasi dari asesor.',
            didClose: () => {
                setValue('phonenumber', '');
            },
        });
    }else if (result.data.status.startsWith("Info : ")) {
        Swal.fire({
            icon: 'info',
            title: result.data.status,
            text: result.data.response,
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: result.data.status,
            text: result.data.response,
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
            const eligibilityMet = bimbinganCount >= 1;
            
            // Enable or disable the "Ajukan Sidang" button based on eligibility
            const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
            if (tombolPengajuanSidang) {
                tombolPengajuanSidang.disabled = !eligibilityMet;
                
                // Add tooltip to explain why button is disabled
                if (!eligibilityMet) {
                    tombolPengajuanSidang.setAttribute('title', `Anda memerlukan minimal 1 sesi bimbingan untuk mengajukan sidang. Saat ini: ${bimbinganCount}`);
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
    
    // Open modal when button is clicked
    tombolPengajuan.addEventListener('click', function() {
        modal.classList.add('is-active');
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
        const dosenPenguji = document.getElementById('dosen-penguji').value;
        const nomorKelompok = document.getElementById('nomor-kelompok').value;
        
        if (!dosenPenguji || !nomorKelompok) {
            showNotification('Mohon lengkapi semua field', 'is-danger');
            return;
        }
        
        const pengajuanData = {
            dosenPenguji: dosenPenguji,
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