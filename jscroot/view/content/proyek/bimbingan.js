import { onClick,getValue,setValue,onInput,onChange,hide,show } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
import {validatePhoneNumber} from "https://cdn.jsdelivr.net/gh/jscroot/validate@0.0.2/croot.js";
import {postJSON,getJSON} from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import {getCookie} from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import {addCSSIn} from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';
import { id,backend } from "/dashboard/jscroot/url/config.js";

let bimbinganCount = 0;

export async function main(){    
    onInput('phonenumber', validatePhoneNumber);
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css",id.content);
    getJSON(backend.project.data,'login',getCookie('login'),getResponseFunction);
    
    // Get bimbingan list and count them for eligibility check
    getJSON(backend.project.bimbingan,'login',getCookie('login'), function(result) {
        getBimbinganList(result);
        processBimbinganCount(result);
    });
    
    onClick('tombolmintaapproval', checkAndSubmit);
    onChange('bimbingan-name', handleBimbinganChange);
    fetchActivityScore();
    
    // Add event listeners for the sidang feature
    onClick('tombolajukansidang', openSidangModal);
    onClick('close-modal', closeSidangModal);
    onClick('cancel-sidang', closeSidangModal);
    onClick('submit-sidang', submitSidangApplication);
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

// Function to check if sidang button should be enabled
function checkSidangButtonEligibility() {
    const MIN_BIMBINGAN_REQUIRED = 1;
    
    // Logic to check if the user is eligible for sidang
    if (bimbinganCount >= MIN_BIMBINGAN_REQUIRED) {
        document.getElementById('tombolajukansidang').removeAttribute('disabled');
        document.getElementById('sidang-status-message').textContent = 'Anda memenuhi syarat untuk mengajukan sidang!';
        document.getElementById('sidang-status-message').classList.add('is-success');
        document.getElementById('sidang-status-message').classList.remove('is-danger');
    } else {
        document.getElementById('tombolajukansidang').setAttribute('disabled', 'disabled');
        document.getElementById('sidang-status-message').textContent = `Anda butuh minimal ${MIN_BIMBINGAN_REQUIRED} bimbingan untuk mengajukan sidang (saat ini: ${bimbinganCount})`;
        document.getElementById('sidang-status-message').classList.add('is-danger');
        document.getElementById('sidang-status-message').classList.remove('is-success');
    }
}

// Function to handle bimbingan data and update count
function processBimbinganCount(result) {
    if (result.status === 200) {
        bimbinganCount = result.data.length;
        console.log(`Total bimbingan count: ${bimbinganCount}`);
        checkSidangButtonEligibility();
    } else {
        console.error('Failed to fetch bimbingan data');
    }
}

// Function to open modal
function openSidangModal() {
    document.getElementById('modal-sidang').classList.add('is-active');
}

// Function to close modal
function closeSidangModal() {
    document.getElementById('modal-sidang').classList.remove('is-active');
    // Clear form
    document.getElementById('dosen-penguji').value = '';
    document.getElementById('nomor-kelompok').value = '';
}

// Function to submit sidang application
function submitSidangApplication() {
    const dosenPenguji = document.getElementById('dosen-penguji').value;
    const nomorKelompok = document.getElementById('nomor-kelompok').value;
    
    // Validate inputs
    if (!dosenPenguji || !nomorKelompok) {
        Swal.fire({
            icon: 'warning',
            title: 'Lengkapi Form',
            text: 'Silakan lengkapi semua field yang diperlukan!'
        });
        return;
    }
    
    // Create the payload for the API
    const payload = {
        dosenpenguji: dosenPenguji,
        nomorkelompok: nomorKelompok
    };
    
    // Call the API to save the sidang application
    const sidangSubmissionURL = backend.project.bimbingan + "/pengajuan";
    postJSON(sidangSubmissionURL, "login", getCookie("login"), payload, handleSidangSubmissionResponse);
}

// Handle API response after submitting sidang application
function handleSidangSubmissionResponse(result) {
    if (result.status === 200) {
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Pengajuan sidang Anda telah berhasil diajukan!',
            didClose: () => {
                closeSidangModal();
            }
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: result.data.status || 'Error',
            text: result.data.response || 'Terjadi kesalahan saat mengajukan sidang.'
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