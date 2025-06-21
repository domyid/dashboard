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



    // Add new functionality for claim event - simplified
    setupClaimEventModal();
    
    // Add new functionality for claim time event
    setupClaimTimeEventModal();
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
    // Now excluding buku (bukukatalog), jurnal (jurnalcount), QRIS (rupiah), MBC (mbc), and RVN (rvn)
    const requiredActivitiesPositive = 
        sponsordata > 0 && 
        stravakm > 0 && 
        iqresult > 0 && 
        pomokitsesi > 0 && 
        trackerdata > 0 && 
        hasGtmetrixResult && // Changed condition for gtmetrixresult
        webhookpush > 0 && 
        presensihari > 0;
    
    // All conditions are now just the required activities
    // QRIS, MBC, RVN are now optional like buku and jurnal
    const allConditionsMet = requiredActivitiesPositive;
    
    return {
        isValid: allConditionsMet,
        sponsordata: sponsordata > 0,
        stravakm: stravakm > 0,
        iqresult: iqresult > 0,
        pomokitsesi: pomokitsesi > 0,
        trackerdata: trackerdata > 0,
        gtmetrixresult: hasGtmetrixResult,
        webhookpush: webhookpush > 0,
        presensihari: presensihari > 0,
        // Optional activities - not checked for approval
        rupiah: rupiah > 0,
        mbc: mbc > 0,
        rvn: rvn > 0,
        bukukatalog: bukukatalog > 0,
        jurnalcount: jurnalcount > 0
    };
}

// Function to check if student has enough bimbingan sessions to request sidang
function checkSidangEligibility() {
    console.log('🔍 Starting sidang eligibility check...');
    console.log('📡 Calling eligibility endpoint:', backend.bimbingan.eligibility);

    getJSON(backend.bimbingan.eligibility, 'login', getCookie('login'), function(result) {
        console.log('📊 Eligibility data response:', result);

        if (result.status === 200) {
            console.log('✅ Successfully got eligibility data');
            console.log('📋 Eligibility data:', result.data);

            // Extract data from new endpoint response
            // Backend returns: {status: "Success", data: {approved_count: 9, ...}}
            const eligibilityData = result.data.data || result.data;
            const approvedCount = eligibilityData.approved_count;
            const totalCount = eligibilityData.total_count;
            const pendingCount = eligibilityData.pending_count;
            const eligibilityMet = eligibilityData.eligibility_met;
            const requiredCount = eligibilityData.required_count;

            console.log('🔍 Raw eligibility data structure:', eligibilityData);
            console.log('🔍 Extracted values:');
            console.log(`   approvedCount: ${approvedCount}`);
            console.log(`   totalCount: ${totalCount}`);
            console.log(`   pendingCount: ${pendingCount}`);
            console.log(`   eligibilityMet: ${eligibilityMet}`);
            console.log(`   requiredCount: ${requiredCount}`);

            console.log(`📈 Eligibility summary:`);
            console.log(`   Total sessions: ${totalCount}`);
            console.log(`   Approved sessions: ${approvedCount}`);
            console.log(`   Pending sessions: ${pendingCount}`);
            console.log(`   Required sessions: ${requiredCount}`);
            console.log(`   Eligibility met: ${eligibilityMet}`);

            // Enable or disable the "Ajukan Sidang" button based on eligibility
            const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
            if (tombolPengajuanSidang) {
                console.log(`🔘 Button found, setting disabled = ${!eligibilityMet}`);
                tombolPengajuanSidang.disabled = !eligibilityMet;

                // Add tooltip to explain why button is disabled
                if (!eligibilityMet) {
                    let tooltipMessage = `Anda memerlukan minimal ${requiredCount} sesi bimbingan yang sudah disetujui untuk mengajukan sidang.\n`;
                    tooltipMessage += `Saat ini: ${approvedCount} approved`;
                    if (pendingCount > 0) {
                        tooltipMessage += `, ${pendingCount} pending approval`;
                    }
                    tombolPengajuanSidang.setAttribute('title', tooltipMessage);
                    console.log(`❌ Button disabled - not enough approved bimbingan (${approvedCount}/${requiredCount})`);
                } else {
                    tombolPengajuanSidang.setAttribute('title', 'Klik untuk mengajukan sidang');
                    console.log(`✅ Button should be enabled - checking existing pengajuan...`);

                    // Check if there's an existing pengajuan
                    checkExistingPengajuan();
                }
            } else {
                console.error('❌ Tombol pengajuan sidang tidak ditemukan di DOM!');
            }
        } else {
            console.error('❌ Failed to get eligibility data:', result);

            // On error, disable button for safety
            const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
            if (tombolPengajuanSidang) {
                tombolPengajuanSidang.disabled = true;
                tombolPengajuanSidang.setAttribute('title', 'Error loading eligibility data');
                console.log('❌ Button disabled due to API error');
            }
        }
    });
}



// Function to check if there's an existing pengajuan
function checkExistingPengajuan() {
    console.log('🔍 Checking existing pengajuan...');
    console.log('📡 Calling backend:', backend.bimbingan.pengajuan);

    getJSON(backend.bimbingan.pengajuan, 'login', getCookie('login'), function(result) {
        console.log('📊 Pengajuan check result:', result);

        const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
        if (!tombolPengajuanSidang) {
            console.error('❌ Tombol pengajuan sidang tidak ditemukan di DOM!');
            return;
        }

        console.log('🔘 Button current state before pengajuan check:');
        console.log(`   disabled: ${tombolPengajuanSidang.disabled}`);
        console.log(`   text: ${tombolPengajuanSidang.textContent}`);
        console.log(`   classes: ${tombolPengajuanSidang.className}`);

        // Check if response is successful
        if (result.status === 200) {
            let pengajuanData = [];

            // Handle different response structures
            if (result.data && Array.isArray(result.data)) {
                pengajuanData = result.data;
            } else if (result.data && result.data.data && Array.isArray(result.data.data)) {
                pengajuanData = result.data.data;
            }

            console.log('📋 Pengajuan data:', pengajuanData);
            console.log(`📈 Found ${pengajuanData.length} existing pengajuan(s)`);

            if (pengajuanData.length > 0) {
                // There's an existing pengajuan
                const latestPengajuan = pengajuanData[pengajuanData.length - 1];
                console.log('📝 Latest pengajuan:', latestPengajuan);
                console.log(`📊 Latest pengajuan status: ${latestPengajuan.status}`);

                // Update button based on status
                if (latestPengajuan.status === 'pending') {
                    tombolPengajuanSidang.textContent = 'Pengajuan Sidang (Pending)';
                    tombolPengajuanSidang.classList.remove('is-info');
                    tombolPengajuanSidang.classList.add('is-warning');
                    tombolPengajuanSidang.disabled = true;
                    tombolPengajuanSidang.setAttribute('title', 'Pengajuan sidang Anda sedang diproses');
                    console.log('🟡 Button set to PENDING state');
                } else if (latestPengajuan.status === 'approved') {
                    tombolPengajuanSidang.textContent = 'Pengajuan Sidang (Disetujui)';
                    tombolPengajuanSidang.classList.remove('is-info');
                    tombolPengajuanSidang.classList.add('is-success');
                    tombolPengajuanSidang.disabled = true;
                    tombolPengajuanSidang.setAttribute('title', 'Pengajuan sidang Anda telah disetujui');
                    console.log('🟢 Button set to APPROVED state');
                } else if (latestPengajuan.status === 'rejected') {
                    tombolPengajuanSidang.textContent = 'Ajukan Sidang Kembali';
                    tombolPengajuanSidang.classList.remove('is-info');
                    tombolPengajuanSidang.classList.add('is-danger');
                    tombolPengajuanSidang.disabled = false;
                    tombolPengajuanSidang.setAttribute('title', 'Pengajuan sidang Anda ditolak. Silakan ajukan kembali.');
                    console.log('🔴 Button set to REJECTED state - ENABLED for resubmission');
                } else {
                    // Default case - any other status, disable button
                    tombolPengajuanSidang.textContent = 'Sudah Mengajukan';
                    tombolPengajuanSidang.classList.remove('is-info');
                    tombolPengajuanSidang.classList.add('is-success');
                    tombolPengajuanSidang.disabled = true;
                    tombolPengajuanSidang.setAttribute('title', 'Anda sudah mengajukan sidang');
                    console.log('⚪ Button set to DEFAULT state (unknown status)');
                }

                console.log('❌ Button disabled - user already submitted pengajuan with status:', latestPengajuan.status);
            } else {
                // No existing pengajuan - keep button state from eligibility check
                console.log('✅ No existing pengajuan found - keeping eligibility state');
                tombolPengajuanSidang.textContent = 'Ajukan Sidang';
                tombolPengajuanSidang.classList.remove('is-success', 'is-warning', 'is-danger');
                tombolPengajuanSidang.classList.add('is-info');

                // Keep button enabled since user is eligible and has no pending pengajuan
                console.log('✅ Button remains ENABLED - user is eligible and has no pending pengajuan');
            }
        } else {
            console.error('❌ Failed to check pengajuan:', result);
            // On error, disable button for safety
            tombolPengajuanSidang.disabled = true;
            tombolPengajuanSidang.textContent = 'Error';
            tombolPengajuanSidang.classList.remove('is-info', 'is-success', 'is-warning');
            tombolPengajuanSidang.classList.add('is-danger');
            tombolPengajuanSidang.setAttribute('title', 'Error checking pengajuan status');
            console.log('❌ Button disabled due to pengajuan check error');
        }

        console.log('🔘 Button final state after pengajuan check:');
        console.log(`   disabled: ${tombolPengajuanSidang.disabled}`);
        console.log(`   text: ${tombolPengajuanSidang.textContent}`);
        console.log(`   classes: ${tombolPengajuanSidang.className}`);
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

        console.log('Submitting pengajuan with data:', pengajuanData);
        console.log('Backend URL:', backend.bimbingan.pengajuan);
        
        postJSON(backend.bimbingan.pengajuan, 'login', getCookie('login'), pengajuanData, function(result) {
            closeModal();
            if (result.status === 200) {
                showNotification('Pengajuan sidang berhasil dikirim', 'is-success');
                // Update button state
                setTimeout(checkExistingPengajuan, 1000);
            } else {
                // Handle specific error messages
                let errorMessage = 'Gagal mengirim pengajuan';
                if (result.data?.response) {
                    errorMessage = result.data.response;
                } else if (result.response) {
                    errorMessage = result.response;
                } else if (result.status) {
                    errorMessage = `Error ${result.status}: ${result.info || 'Unknown error'}`;
                }

                showNotification(`Error: ${errorMessage}`, 'is-danger');
                console.error('Pengajuan error:', result);
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

// Event Claim Modal Logic - Simplified (No claim status check)
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

    // Button is always enabled and ready to use
    tombolClaimEvent.textContent = 'Claim Code Referral Event';
    tombolClaimEvent.disabled = false;
    tombolClaimEvent.classList.remove('is-success');
    tombolClaimEvent.classList.add('is-warning');
    tombolClaimEvent.setAttribute('title', 'Click to claim an event referral code');

    tombolClaimEvent.addEventListener('click', function() {
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

        postJSON(backend.bimbingan.claimEvent, 'login', getCookie('login'), claimData, function(result) {
            submitBtn.classList.remove('is-loading');
            if (result.status === 200) {
                closeEventModal();
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: result.data.response || 'Event code claimed successfully! Your bimbingan has been added.',
                    confirmButtonText: 'Great!'
                }).then(() => {
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

// Time Event Claim Modal Logic
function setupClaimTimeEventModal() {
    const modal = document.getElementById('modal-claim-time-event');
    const tombolClaimTimeEvent = document.getElementById('tombolclaimtimeevent');
    const closeModalBtn = document.getElementById('close-modal-claim-time');
    const cancelBtn = document.getElementById('cancel-claim-time-code');
    const submitBtn = document.getElementById('submit-claim-time-code');
    const timeEventCodeInput = document.getElementById('time-event-code-input');

    const notificationModal = document.getElementById('notification-claim-time-event-modal');
    const notificationMessageModal = document.getElementById('notification-message-claim-time-modal');
    const closeNotificationModalBtn = document.getElementById('close-notification-claim-time-modal');

    if (!modal || !tombolClaimTimeEvent || !closeModalBtn || !cancelBtn || !submitBtn || !timeEventCodeInput) {
        console.error("One or more elements for claim time event modal not found.");
        return;
    }

    // Button is always enabled and ready to use
    tombolClaimTimeEvent.textContent = 'Claim Code Event Time';
    tombolClaimTimeEvent.disabled = false;
    tombolClaimTimeEvent.classList.remove('is-success');
    tombolClaimTimeEvent.classList.add('is-danger');
    tombolClaimTimeEvent.setAttribute('title', 'Click to claim a time-limited event code');

    tombolClaimTimeEvent.addEventListener('click', function() {
        timeEventCodeInput.value = ''; 
        hideTimeEventNotificationModal();
        modal.classList.add('is-active');
    });

    function closeTimeEventModal() {
        modal.classList.remove('is-active');
    }

    closeModalBtn.addEventListener('click', closeTimeEventModal);
    cancelBtn.addEventListener('click', closeTimeEventModal);
    if(closeNotificationModalBtn) {
        closeNotificationModalBtn.addEventListener('click', hideTimeEventNotificationModal);
    }

    submitBtn.addEventListener('click', function() {
        const code = timeEventCodeInput.value.trim();
        if (!code) {
            showTimeEventNotificationModal('Please enter a time event code.', 'is-danger');
            return;
        }

        hideTimeEventNotificationModal();
        submitBtn.classList.add('is-loading');

        const claimData = { code: code };

        postJSON(backend.bimbingan.claimTimeEvent, 'login', getCookie('login'), claimData, function(result) {
            submitBtn.classList.remove('is-loading');
            if (result.status === 200) {
                closeTimeEventModal();
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: result.data.response || 'Time event code claimed successfully! Your bimbingan has been added.',
                    confirmButtonText: 'Great!'
                }).then(() => {
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
                 showTimeEventNotificationModal(result.data?.response || 'Failed to claim time event code.', 'is-danger');
            }
        });
    });

    function showTimeEventNotificationModal(message, type) {
        if (!notificationModal || !notificationMessageModal) return;
        notificationMessageModal.textContent = message;
        notificationModal.classList.remove('is-success', 'is-danger', 'is-warning', 'is-info', 'is-hidden');
        notificationModal.classList.add(type);
    }

    function hideTimeEventNotificationModal() {
        if (!notificationModal) return;
        notificationModal.classList.add('is-hidden');
    }
}
