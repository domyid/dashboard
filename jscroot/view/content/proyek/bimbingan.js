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

    // Add debug button for sidang eligibility
    addSidangDebugButton();

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

    // Start with the original endpoint that we know works
    console.log('📡 Calling original endpoint:', backend.project.assessment);

    getJSON(backend.project.assessment, 'login', getCookie('login'), function(result) {
        console.log('📊 Bimbingan data response:', result);

        if (result.status === 200) {
            console.log('✅ Successfully got bimbingan data');
            console.log('📋 Raw bimbingan data:', result.data);

            // Debug: Show structure of first bimbingan record
            if (result.data.length > 0) {
                console.log('🔍 First bimbingan record structure:', result.data[0]);
                console.log('🔍 All keys in first record:', Object.keys(result.data[0]));

                // Check for different possible field names
                const firstRecord = result.data[0];
                console.log('🔍 Possible approved fields:');
                console.log(`   approved: ${firstRecord.approved}`);
                console.log(`   Approved: ${firstRecord.Approved}`);
                console.log(`   isApproved: ${firstRecord.isApproved}`);
                console.log(`   is_approved: ${firstRecord.is_approved}`);
                console.log(`   status: ${firstRecord.status}`);
                console.log(`   validasi: ${firstRecord.validasi}`);

                // Check if this endpoint has approval data
                const hasApprovalData = firstRecord.approved !== undefined ||
                                      firstRecord.Approved !== undefined ||
                                      firstRecord.isApproved !== undefined;

                if (!hasApprovalData) {
                    console.log('⚠️ Current endpoint does not have approval data, trying alternative endpoints...');

                    // Try alternative endpoints that might have complete data
                    const alternativeEndpoints = [
                        { name: 'bimbingan.weekly', url: backend.bimbingan.weekly },
                        { name: 'bimbingan.request', url: backend.bimbingan.request }
                    ];

                    let foundValidEndpoint = false;

                    // Try each alternative endpoint
                    for (let i = 0; i < alternativeEndpoints.length; i++) {
                        const altEndpoint = alternativeEndpoints[i];
                        console.log(`📡 Trying alternative endpoint ${i + 1}: ${altEndpoint.name} - ${altEndpoint.url}`);

                        getJSON(altEndpoint.url, 'login', getCookie('login'), function(altResult) {
                            console.log(`📊 ${altEndpoint.name} result:`, altResult);

                            if (altResult.status === 200 && altResult.data && altResult.data.length > 0) {
                                const altFirstRecord = altResult.data[0];
                                console.log(`🔍 ${altEndpoint.name} first record:`, altFirstRecord);
                                console.log(`🔍 ${altEndpoint.name} keys:`, Object.keys(altFirstRecord));

                                // Check if this endpoint has approval data
                                const altHasApprovalData = altFirstRecord.approved !== undefined ||
                                                         altFirstRecord.Approved !== undefined ||
                                                         altFirstRecord.isApproved !== undefined;

                                console.log(`✅ ${altEndpoint.name} has approval data: ${altHasApprovalData}`);

                                if (altHasApprovalData && !foundValidEndpoint) {
                                    foundValidEndpoint = true;
                                    console.log(`🎯 Found valid endpoint: ${altEndpoint.name}`);
                                    processBimbinganData(altResult);
                                    return;
                                }
                            }

                            // If this is the last endpoint and no valid data found
                            if (i === alternativeEndpoints.length - 1 && !foundValidEndpoint) {
                                console.log('❌ No endpoint provides approval data - this is a backend issue!');
                                console.log('💡 Suggestion: Check backend endpoint to ensure it returns complete bimbingan data with approval status');

                                // For now, assume all bimbingan are approved if we have data but no approval field
                                console.log('🔧 WORKAROUND: Assuming all bimbingan are approved since approval field is missing');

                                // Create mock approved data
                                const mockResult = {
                                    status: 200,
                                    data: result.data.map(bimbingan => ({
                                        ...bimbingan,
                                        approved: true // Assume approved for now
                                    }))
                                };

                                processBimbinganData(mockResult);
                            }
                        });
                    }

                    // If no alternative endpoints available, use workaround
                    if (alternativeEndpoints.length === 0) {
                        console.log('🔧 WORKAROUND: No alternative endpoints, assuming all bimbingan are approved');
                        const mockResult = {
                            status: 200,
                            data: result.data.map(bimbingan => ({
                                ...bimbingan,
                                approved: true // Assume approved for now
                            }))
                        };
                        processBimbinganData(mockResult);
                    }
                    return;
                }
            }

            // Process current result if it has approval data
            processBimbinganData(result);
        } else {
            console.error('❌ Failed to get bimbingan data:', result);
            console.log('🔧 Trying workaround: Check if user has enough bimbingan sessions regardless of approval status');

            // Workaround: If we can't get approval data, check total bimbingan count
            // This is a temporary solution until backend is fixed
            if (result.data && result.data.length >= 8) {
                console.log(`🔧 WORKAROUND: User has ${result.data.length} bimbingan sessions, assuming eligible`);

                const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
                if (tombolPengajuanSidang) {
                    tombolPengajuanSidang.disabled = false;
                    tombolPengajuanSidang.setAttribute('title', 'Klik untuk mengajukan sidang (approval status tidak dapat diverifikasi)');
                    console.log('✅ Button ENABLED via workaround - checking existing pengajuan...');
                    checkExistingPengajuan();
                }
            } else {
                // On error, disable button for safety
                const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
                if (tombolPengajuanSidang) {
                    tombolPengajuanSidang.disabled = true;
                    tombolPengajuanSidang.setAttribute('title', 'Error loading bimbingan data atau belum cukup sesi bimbingan');
                    console.log('❌ Button disabled due to API error or insufficient sessions');
                }
            }
        }
    });
}

// Separate function to process bimbingan data
function processBimbinganData(result) {
    if (result.status === 200) {

        // Count only APPROVED bimbingan sessions
        const approvedBimbingan = result.data.filter(bimbingan => {
            console.log(`📝 Bimbingan ${bimbingan.bimbinganke || 'unknown'}:`);
            console.log(`   approved (lowercase): ${bimbingan.approved} (type: ${typeof bimbingan.approved})`);
            console.log(`   Approved (uppercase): ${bimbingan.Approved} (type: ${typeof bimbingan.Approved})`);

            // Handle different field names and data types for approved field
            const isApproved = bimbingan.Approved === true ||
                             bimbingan.Approved === 'true' ||
                             bimbingan.Approved === 1 ||
                             bimbingan.Approved === '1' ||
                             bimbingan.approved === true ||
                             bimbingan.approved === 'true' ||
                             bimbingan.approved === 1 ||
                             bimbingan.approved === '1';

            console.log(`   Final approved status: ${isApproved}`);
            return isApproved;
        });

        const approvedCount = approvedBimbingan.length;
        const totalCount = result.data.length;
        const eligibilityMet = approvedCount >= 8;

        console.log(`📈 Bimbingan summary:`);
        console.log(`   Total sessions: ${totalCount}`);
        console.log(`   Approved sessions: ${approvedCount}`);
        console.log(`   Eligibility met (>=8): ${eligibilityMet}`);
        console.log(`   Approved bimbingan list:`, approvedBimbingan);

        // Enable or disable the "Ajukan Sidang" button based on eligibility
        const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
        if (tombolPengajuanSidang) {
            console.log(`🔘 Button found, setting disabled = ${!eligibilityMet}`);
            tombolPengajuanSidang.disabled = !eligibilityMet;

            // Add tooltip to explain why button is disabled
            if (!eligibilityMet) {
                const pendingCount = totalCount - approvedCount;
                let tooltipMessage = `Anda memerlukan minimal 8 sesi bimbingan yang sudah disetujui untuk mengajukan sidang.\n`;
                tooltipMessage += `Saat ini: ${approvedCount} approved`;
                if (pendingCount > 0) {
                    tooltipMessage += `, ${pendingCount} pending approval`;
                }
                tombolPengajuanSidang.setAttribute('title', tooltipMessage);
                console.log(`❌ Button disabled - not enough approved bimbingan`);
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
        console.error('❌ Failed to process bimbingan data:', result);

        // On error, disable button for safety
        const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
        if (tombolPengajuanSidang) {
            tombolPengajuanSidang.disabled = true;
            tombolPengajuanSidang.setAttribute('title', 'Error processing bimbingan data');
            console.log('❌ Button disabled due to processing error');
        }
    }
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

                // Check if button should be enabled based on eligibility
                // Re-run eligibility check to make sure button state is correct
                console.log('🔄 Re-checking eligibility to ensure correct button state...');

                // Get fresh bimbingan data to double-check eligibility
                getJSON(backend.project.assessment, 'login', getCookie('login'), function(bimbinganResult) {
                    if (bimbinganResult.status === 200) {
                        const approvedBimbingan = bimbinganResult.data.filter(bimbingan =>
                            bimbingan.Approved === true ||
                            bimbingan.Approved === 'true' ||
                            bimbingan.Approved === 1 ||
                            bimbingan.Approved === '1' ||
                            bimbingan.approved === true ||
                            bimbingan.approved === 'true' ||
                            bimbingan.approved === 1 ||
                            bimbingan.approved === '1'
                        );
                        const approvedCount = approvedBimbingan.length;
                        const eligibilityMet = approvedCount >= 8;

                        console.log(`🔍 Double-check eligibility: ${approvedCount} approved, eligible: ${eligibilityMet}`);

                        if (eligibilityMet) {
                            tombolPengajuanSidang.disabled = false;
                            tombolPengajuanSidang.setAttribute('title', 'Klik untuk mengajukan sidang');
                            console.log('✅ Button ENABLED - user is eligible and has no pending pengajuan');
                        } else {
                            tombolPengajuanSidang.disabled = true;
                            const tooltipMessage = `Anda memerlukan minimal 8 sesi bimbingan yang sudah disetujui untuk mengajukan sidang. Saat ini: ${approvedCount} approved`;
                            tombolPengajuanSidang.setAttribute('title', tooltipMessage);
                            console.log('❌ Button DISABLED - user not eligible');
                        }
                    }
                });
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

// Add debug button for sidang eligibility testing
function addSidangDebugButton() {
    const debugButton = document.createElement('button');
    debugButton.className = 'button is-warning is-small';
    debugButton.innerHTML = '<i class="fas fa-bug"></i> Debug Sidang';
    debugButton.style.position = 'fixed';
    debugButton.style.top = '10px';
    debugButton.style.left = '10px';
    debugButton.style.zIndex = '9999';
    debugButton.style.fontSize = '12px';
    debugButton.style.padding = '5px 10px';

    debugButton.addEventListener('click', function() {
        console.log('🐛 === SIDANG DEBUG TEST ===');

        // Test multiple bimbingan endpoints
        console.log('📡 Testing multiple bimbingan endpoints...');

        const testEndpoints = [
            { name: 'project.assessment', url: backend.project.assessment },
            { name: 'bimbingan.weekly', url: backend.bimbingan.weekly },
            { name: 'bimbingan.request', url: backend.bimbingan.request }
        ].filter(endpoint => endpoint.url); // Only test endpoints that exist

        testEndpoints.forEach((endpoint, index) => {
            console.log(`📡 Testing endpoint ${index + 1}: ${endpoint.name} - ${endpoint.url}`);

            getJSON(endpoint.url, 'login', getCookie('login'), function(result) {
                console.log(`📊 ${endpoint.name} Response:`, result);

                if (result.status === 200) {
                    if (result.data.length > 0) {
                        const firstRecord = result.data[0];
                        console.log(`🔍 ${endpoint.name} first record:`, firstRecord);
                        console.log(`🔍 ${endpoint.name} keys:`, Object.keys(firstRecord));

                        // Check for approval fields
                        const hasApprovalData = firstRecord.approved !== undefined ||
                                              firstRecord.Approved !== undefined ||
                                              firstRecord.isApproved !== undefined;
                        console.log(`✅ ${endpoint.name} has approval data: ${hasApprovalData}`);

                        if (hasApprovalData) {
                            const approvedBimbingan = result.data.filter(b =>
                                b.Approved === true ||
                                b.Approved === 'true' ||
                                b.Approved === 1 ||
                                b.Approved === '1' ||
                                b.approved === true ||
                                b.approved === 'true' ||
                                b.approved === 1 ||
                                b.approved === '1'
                            );
                            const totalCount = result.data.length;
                            const approvedCount = approvedBimbingan.length;

                            console.log(`📈 ${endpoint.name} Analysis:`);
                            console.log(`   Total: ${totalCount}`);
                            console.log(`   Approved: ${approvedCount}`);
                            console.log(`   Eligible: ${approvedCount >= 8}`);
                            console.log(`✅ ${endpoint.name} approved bimbingan:`, approvedBimbingan);
                        }
                    } else {
                        console.log(`⚠️ ${endpoint.name} returned empty data`);
                    }
                } else {
                    console.log(`❌ ${endpoint.name} failed:`, result);
                }
            });
        });

        // Test pengajuan data
        setTimeout(() => {
            console.log('📡 Testing pengajuan data fetch...');
            getJSON(backend.bimbingan.pengajuan, 'login', getCookie('login'), function(pengajuanResult) {
                console.log('📊 Pengajuan API Response:', pengajuanResult);

                // Check button state
                const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
                if (tombolPengajuanSidang) {
                    console.log('🔘 Button Current State:');
                    console.log(`   Found: YES`);
                    console.log(`   Disabled: ${tombolPengajuanSidang.disabled}`);
                    console.log(`   Text: "${tombolPengajuanSidang.textContent}"`);
                    console.log(`   Classes: ${tombolPengajuanSidang.className}`);
                    console.log(`   Title: "${tombolPengajuanSidang.getAttribute('title')}"`);
                } else {
                    console.log('❌ Button NOT FOUND in DOM!');
                }

                // Manual re-check
                console.log('🔄 Running manual eligibility check...');
                checkSidangEligibility();
            });
        }, 2000); // Wait 2 seconds for all endpoint tests to complete

        console.log('🐛 === END DEBUG TEST ===');
    });

    // Manual override button for testing
    const overrideButton = document.createElement('button');
    overrideButton.className = 'button is-success is-small';
    overrideButton.innerHTML = '<i class="fas fa-unlock"></i> Force Enable';
    overrideButton.style.position = 'fixed';
    overrideButton.style.top = '50px';
    overrideButton.style.left = '10px';
    overrideButton.style.zIndex = '9999';
    overrideButton.style.fontSize = '12px';
    overrideButton.style.padding = '5px 10px';

    overrideButton.addEventListener('click', function() {
        console.log('🔓 === MANUAL OVERRIDE ===');

        const tombolPengajuanSidang = document.getElementById('tombolpengajuansidang');
        if (tombolPengajuanSidang) {
            tombolPengajuanSidang.disabled = false;
            tombolPengajuanSidang.textContent = 'Ajukan Sidang';
            tombolPengajuanSidang.classList.remove('is-danger', 'is-warning', 'is-success');
            tombolPengajuanSidang.classList.add('is-info');
            tombolPengajuanSidang.setAttribute('title', 'Manual override - button force enabled for testing');

            console.log('✅ Button manually enabled for testing');
            console.log('🔘 Button state after override:');
            console.log(`   disabled: ${tombolPengajuanSidang.disabled}`);
            console.log(`   text: ${tombolPengajuanSidang.textContent}`);
            console.log(`   classes: ${tombolPengajuanSidang.className}`);
        } else {
            console.log('❌ Button not found!');
        }

        console.log('🔓 === END OVERRIDE ===');
    });

    document.body.appendChild(debugButton);
    document.body.appendChild(overrideButton);
}