import { onClick,getValue,setValue,onInput,onChange,hide,show } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
import {validatePhoneNumber} from "https://cdn.jsdelivr.net/gh/jscroot/validate@0.0.2/croot.js";
import {postJSON,getJSON} from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import {getCookie} from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import {addCSSIn} from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';
import { id,backend } from "/dashboard/jscroot/url/config.js";

export async function main(){    
    console.log('=== Initializing Bimbingan Page ===');
    
    onInput('phonenumber', validatePhoneNumber);
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css",id.content);
    getJSON(backend.project.data,'login',getCookie('login'),getResponseFunction);
    
    // Initialize progress to 0 before loading data
    console.log('Setting initial progress to 0/8');
    updateSidangProgress(0);
    
    // Load bimbingan list which will also update the progress
    console.log('Loading bimbingan list...');
    getJSON(backend.project.assessment,'login',getCookie('login'),getBimbinganList);
    onClick('tombolmintaapproval', checkAndSubmit);
    onChange('bimbingan-name', handleBimbinganChange);
    fetchActivityScore();
    
    // Add setup for pengajuan sidang modal
    setupPengajuanSidangModal();
    
    // Double check sidang eligibility after a delay to ensure all data is loaded
    setTimeout(() => {
        console.log('Double checking sidang eligibility...');
        checkSidangEligibility();
    }, 2000);
}

// Global variable to track current approval status
let currentApprovalStatus = null;

// Helper function to check if a value represents approved status
function isApprovedValue(value) {
    // Check for various representations of true/approved
    return value === true || 
           value === 'true' || 
           value === 1 ||
           value === '1' ||
           value === 'approved' ||
           value === 'yes' ||
           value === 'y';
}

function updateApprovalStatus(result) {
    const statusElement = document.getElementById('approval-status');
    const tombolApproval = document.getElementById('tombolmintaapproval');
    
    // Convert to boolean for consistent checking
    const isApproved = isApprovedValue(result);
    const isNotApproved = result === false || result === 'false' || result === 0 || result === '0' || result === 'no' || result === 'n';
    
    // Update global status
    currentApprovalStatus = isApproved ? true : (isNotApproved ? false : null);

    if (isApproved) {
        statusElement.textContent = 'Disetujui';
        statusElement.className = 'tag is-success';
        // Disable tombol if already approved
        if (tombolApproval) {
            tombolApproval.disabled = true;
            tombolApproval.textContent = 'Sudah Disetujui';
            tombolApproval.classList.remove('is-primary');
            tombolApproval.classList.add('is-success');
        }
    } else if (isNotApproved) {
        statusElement.textContent = 'Belum Disetujui';
        statusElement.className = 'tag is-danger';
        // Enable tombol if not approved
        if (tombolApproval) {
            tombolApproval.disabled = false;
            tombolApproval.textContent = 'Minta Approval';
            tombolApproval.classList.remove('is-success');
            tombolApproval.classList.add('is-primary');
        }
    } else {
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
            
            // Debug log to check data structure
            console.log('Bimbingan detail response:', result);
            
            if (result.status === 200) {
                // Check multiple possible field names
                const approvedValue = result.data?.approved || 
                                    result.data?.is_approved || 
                                    result.data?.isApproved || 
                                    (result.data?.status === 'approved' ? true : false);
                
                console.log('Approved field value:', approvedValue);
                console.log('Approved field type:', typeof approvedValue);
                
                // Only update approval status if we found an approval field
                if (approvedValue !== undefined && approvedValue !== null) {
                    updateApprovalStatus(approvedValue);
                }
            }
        });
    }
}

function getBimbinganList(result) {
    if (result.status === 200) {
        console.log('Raw bimbingan list data:', result.data);
        
        // Store all bimbingan data globally for checking approval status
        window.bimbinganData = result.data;
        
        // First, check if the list API already includes approved field
        const hasApprovedField = result.data.length > 0 && 
                                (result.data[0].hasOwnProperty('approved') || 
                                 result.data[0].hasOwnProperty('is_approved') ||
                                 result.data[0].hasOwnProperty('isApproved') ||
                                 result.data[0].hasOwnProperty('status'));
        
        if (hasApprovedField) {
            // If approved field exists in list, use it directly
            console.log('Approved field found in list API');
            let approvedCount = 0;
            
            result.data.forEach((bimbingan, index) => {
                // Check multiple possible field names
                const approvedValue = bimbingan.approved || 
                                    bimbingan.is_approved || 
                                    bimbingan.isApproved || 
                                    (bimbingan.status === 'approved' ? true : false);
                
                console.log(`Bimbingan ${bimbingan.bimbinganke}: approved =`, approvedValue, 'type:', typeof approvedValue);
                
                const option = document.createElement('option');
                option.value = bimbingan._id;

                const bimbinganText = 'Bimbingan Ke-';
                let displayText = bimbinganText + (bimbingan.bimbinganke ?? (index + 1));
                
                // Check if approved
                const isApproved = isApprovedValue(approvedValue);
                
                if (isApproved) {
                    displayText += ' ✓';
                    option.style.color = '#48c78e';
                    approvedCount++;
                } else {
                    displayText += ' ✗';
                    option.style.color = '#f14668';
                }
                
                option.textContent = displayText;
                document.getElementById('bimbingan-name').appendChild(option);
            });
            
            console.log(`Total approved from list: ${approvedCount}`);
            
            // Update progress immediately
            updateSidangProgress(approvedCount);
            updateSidangButton(approvedCount, result.data.length);
            
        } else {
            // If no approved field in list, fetch details for each
            console.log('No approved field in list, fetching details...');
            let approvedCount = 0;
            let processedCount = 0;
            
            result.data.forEach((bimbingan, index) => {
                const url = `${backend.project.assessment}/${bimbingan._id}`;
                getJSON(url, 'login', getCookie('login'), function(detailResult) {
                    processedCount++;
                    
                    const option = document.createElement('option');
                    option.value = bimbingan._id;

                    const bimbinganText = 'Bimbingan Ke-';
                    let displayText = bimbinganText + (bimbingan.bimbinganke ?? (index + 1));
                    
                    // Check approval status from detail result
                    let isApproved = false;
                    if (detailResult.status === 200) {
                        console.log(`Detail for Bimbingan ${bimbingan.bimbinganke}:`, detailResult.data);
                        
                        // Check multiple possible field names and locations
                        const approvedValue = detailResult.data.approved || 
                                            detailResult.data.is_approved || 
                                            detailResult.data.isApproved || 
                                            (detailResult.data.status === 'approved' ? true : false);
                        
                        console.log(`Approved value:`, approvedValue, 'type:', typeof approvedValue);
                        
                        // Check various possible locations and types
                        if (isApprovedValue(approvedValue)) {
                            isApproved = true;
                            approvedCount++;
                        }
                    }
                    
                    // Add approval status to the text
                    if (isApproved) {
                        displayText += ' ✓';
                        option.style.color = '#48c78e';
                    } else {
                        displayText += ' ✗';
                        option.style.color = '#f14668';
                    }
                    
                    option.textContent = displayText;
                    
                    // Add option in correct order
                    const selectElement = document.getElementById('bimbingan-name');
                    const existingOptions = Array.from(selectElement.options);
                    const insertIndex = existingOptions.findIndex(opt => {
                        const optNumber = parseInt(opt.textContent.match(/\d+/)?.[0] || '0');
                        const currentNumber = bimbingan.bimbinganke ?? (index + 1);
                        return optNumber > currentNumber;
                    });
                    
                    if (insertIndex === -1) {
                        selectElement.appendChild(option);
                    } else {
                        selectElement.insertBefore(option, existingOptions[insertIndex]);
                    }
                    
                    // Update progress when all bimbingan have been processed
                    if (processedCount === result.data.length) {
                        console.log(`Total approved from details: ${approvedCount}`);
                        updateSidangProgress(approvedCount);
                        updateSidangButton(approvedCount, result.data.length);
                    }
                });
            });
        }
        
        // If no bimbingan data, still update progress to 0
        if (result.data.length === 0) {
            updateSidangProgress(0);
            updateSidangButton(0, 0);
        }
    } else {
        Swal.fire({
            icon: 'error',
            title: result.data.status,
            text: result.data.response,
        });
    }
}

// Helper function to update sidang button
function updateSidangButton(approvedCount, totalCount) {
    const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
    if (tombolPengajuanSidang) {
        if (approvedCount < 8) {
            tombolPengajuanSidang.disabled = true;
            tombolPengajuanSidang.setAttribute('title', 
                `Anda memerlukan minimal 8 sesi bimbingan yang disetujui. Saat ini: ${approvedCount} disetujui dari ${totalCount} total`
            );
        } else {
            tombolPengajuanSidang.disabled = false;
            tombolPengajuanSidang.setAttribute('title', 'Klik untuk mengajukan sidang');
            checkExistingPengajuan();
        }
    }
}

function checkAndSubmit() {
    // Check if already approved (handle different data types)
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

// Helper function to check if a value represents approved status
function isApprovedValue(value) {
    // Check for various representations of true/approved
    return value === true || 
           value === 'true' || 
           value === 1 ||
           value === '1' ||
           value === 'approved' ||
           value === 'yes' ||
           value === 'y';
}
function updateSidangProgress(approvedCount) {
    const approvedCountElement = document.getElementById('approved-count');
    const sidangStatusElement = document.getElementById('sidang-status');
    const sidangProgressElement = document.getElementById('sidang-progress');
    
    // Ensure approvedCount is a number
    const count = parseInt(approvedCount) || 0;
    
    if (approvedCountElement) {
        approvedCountElement.textContent = `${count}/8`;
    }
    
    if (sidangProgressElement) {
        sidangProgressElement.value = count;
    }
    
    if (sidangStatusElement) {
        if (count >= 8) {
            sidangStatusElement.innerHTML = '<span class="tag is-success">Memenuhi Syarat</span>';
        } else {
            sidangStatusElement.innerHTML = '<span class="tag is-warning">Belum Memenuhi Syarat</span>';
        }
    }
    
    console.log(`Sidang progress updated: ${count}/8`);
}

// Function to check if student has enough bimbingan sessions to request sidang
function checkSidangEligibility() {
    getJSON(backend.project.assessment, 'login', getCookie('login'), function(result) {
        if (result.status === 200) {
            const totalBimbinganCount = result.data.length;
            
            // If no bimbingan, disable button
            if (totalBimbinganCount === 0) {
                updateSidangProgress(0);
                const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
                if (tombolPengajuanSidang) {
                    tombolPengajuanSidang.disabled = true;
                    tombolPengajuanSidang.setAttribute('title', 'Anda belum memiliki sesi bimbingan');
                }
                return;
            }
            
            // Check if approved field exists in the list
            const hasApprovedField = result.data[0].hasOwnProperty('approved') ||
                                   result.data[0].hasOwnProperty('is_approved') ||
                                   result.data[0].hasOwnProperty('isApproved') ||
                                   result.data[0].hasOwnProperty('status');
            
            if (hasApprovedField) {
                // If approved field exists, count directly
                console.log('Using approved field from list API for sidang eligibility');
                const approvedBimbinganCount = result.data.filter(bimbingan => {
                    const approvedValue = bimbingan.approved || 
                                        bimbingan.is_approved || 
                                        bimbingan.isApproved || 
                                        (bimbingan.status === 'approved' ? true : false);
                    return isApprovedValue(approvedValue);
                }).length;
                
                // Update UI immediately
                updateSidangProgress(approvedBimbinganCount);
                updateSidangButton(approvedBimbinganCount, totalBimbinganCount);
                
                // Check existing pengajuan if eligible
                if (approvedBimbinganCount >= 8) {
                    checkExistingPengajuan();
                }
                
            } else {
                // If no approved field, fetch details
                console.log('Fetching details for sidang eligibility check');
                let approvedBimbinganCount = 0;
                let checkedCount = 0;
                
                // Check each bimbingan's approval status
                result.data.forEach((bimbingan) => {
                    const url = `${backend.project.assessment}/${bimbingan._id}`;
                    getJSON(url, 'login', getCookie('login'), function(detailResult) {
                        checkedCount++;
                        
                        if (detailResult.status === 200) {
                            console.log(`Checking approval for bimbingan ${bimbingan.bimbinganke}:`, detailResult.data);
                            
                            // Check multiple possible field names
                            const approvedValue = detailResult.data.approved || 
                                                detailResult.data.is_approved || 
                                                detailResult.data.isApproved || 
                                                (detailResult.data.status === 'approved' ? true : false);
                            
                            // Check if approved (handle different data types)
                            if (isApprovedValue(approvedValue)) {
                                approvedBimbinganCount++;
                            }
                        }
                        
                        // When all checks are complete
                        if (checkedCount === totalBimbinganCount) {
                            // Update UI
                            updateSidangProgress(approvedBimbinganCount);
                            updateSidangButton(approvedBimbinganCount, totalBimbinganCount);
                            
                            // Check existing pengajuan if eligible
                            if (approvedBimbinganCount >= 8) {
                                checkExistingPengajuan();
                            }
                        }
                    });
                });
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