import { onClick, getValue, setValue, onInput, hide, show } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
import { validatePhoneNumber } from "https://cdn.jsdelivr.net/gh/jscroot/validate@0.0.2/croot.js";
import { postJSON, getJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import { addCSSIn } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';
import { id, backend } from "/dashboard/jscroot/url/config.js";

export async function main() {
    onInput('phonenumber', validatePhoneNumber);
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css", id.content);
    getJSON(backend.project.data, 'login', getCookie('login'), getResponseFunction);
    onClick('tombolmintaapproval', validateAndSubmit);
    fetchActivityScore();
}

function validateAndSubmit() {
    // Check if all quantities are above 0
    const validationResult = checkAllQuantitiesAboveZero();
    
    if (validationResult.allAboveZero) {
        // All quantities are above 0, proceed with submission
        actionfunctionname();
    } else {
        // Show error message with missing items
        showMissingItemsNotification(validationResult.missingItems);
    }
}

function checkAllQuantitiesAboveZero() {
    const tableRows = document.querySelectorAll('table.table tbody tr');
    const missingItems = [];
    
    tableRows.forEach((row, index) => {
        const quantityCell = row.querySelector('td:nth-child(3)');
        const activityName = row.querySelector('td:nth-child(2)').textContent;
        
        // Skip validation for Jurnal (index 8) since it's optional
        if (index === 8) {
            return; // Skip this iteration
        }
        
        if (quantityCell && parseInt(quantityCell.textContent || 0) === 0) {
            missingItems.push(activityName);
        }
    });
    
    return {
        allAboveZero: missingItems.length === 0,
        missingItems: missingItems
    };
}

function showMissingItemsNotification(missingItems) {
    const missingItemsList = missingItems.map(item => `- ${item}`).join('<br>');
    
    Swal.fire({
        icon: 'warning',
        title: 'Data tidak lengkap',
        html: `Anda perlu melengkapi data berikut ini (kuantitas masih 0):<br><br>${missingItemsList}`,
        confirmButtonText: 'Mengerti'
    });
}

function actionfunctionname() {
    let idprjusr = {
        // _id: getValue('project-name'),
        asesor: {
            phonenumber: getValue('phonenumber'),
        },
    };
    if (getCookie("login") === "") {
        redirect("/signin");
    } else {
        const bimbinganPerdana = backend.project.assessment + "/perdana"
        postJSON(bimbinganPerdana, "login", getCookie("login"), idprjusr, postResponseFunction);
        // hide("tombolbuatproyek");    
    }
}

function getResponseFunction(result) {
    if (result.status === 200) {
        result.data.forEach(project => {
            const option = document.createElement('option');
            option.value = project._id;
            option.textContent = project.name;
            document.getElementById('project-name').appendChild(option);
        });

    } else {
        Swal.fire({
            icon: "error",
            title: result.data.status,
            text: result.data.response,
        });
    }
}

function postResponseFunction(result) {
    if (result.status === 200) {
        // const katakata = "Selamat! Anda telah berhasil mengajukan permohonan penilaian proyek. Silakan tunggu konfirmasi dari asesor.";
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Selamat! Anda telah berhasil mengajukan permohonan penilaian proyek. Silakan tunggu konfirmasi dari asesor.',
            didClose: () => {
                setValue('phonenumber', '');
            },
        });
    } else if (result.data.status.startsWith("Info : ")) {
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

function fetchActivityScore() {
    getJSON(backend.activityscore.all, 'login', getCookie('login'), handleActivityScoreResponse);
}

function handleActivityScoreResponse(result) {
    console.log(result);
    if (result.status === 200) {
        updateTableRow(0, result.data.sponsordata, result.data.sponsor);
        updateTableRow(1, result.data.stravakm, result.data.strava);
        updateTableRow(2, result.data.iqresult, result.data.iq);
        updateTableRow(3, result.data.pomokitsesi, result.data.pomokit);
        updateTableRow(4, result.data.mbc, result.data.mbcPoints || result.data.blockchain);
        updateTableRow(5, result.data.rupiah, result.data.qrisPoints || result.data.qris);
        updateTableRow(6, result.data.trackerdata, result.data.tracker);
        updateTableRow(7, result.data.bukukatalog, result.data.bukped);
        updateTableRow(9, result.data.gtmetrixresult, result.data.gtmetrix);
        updateTableRow(10, result.data.webhookpush, result.data.webhook);
        updateTableRow(11, result.data.presensihari, result.data.presensi);
        updateTableRow(12, result.data.rvn, result.data.ravencoinPoints || 0);
        
        // After updating all table rows, check if the button should be enabled
        updateApprovalButtonState();
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

// Function to update button state based on table quantities
function updateApprovalButtonState() {
    const validationResult = checkAllQuantitiesAboveZero();
    const approvalButton = document.getElementById('tombolmintaapproval');
    
    if (approvalButton) {
        if (validationResult.allAboveZero) {
            approvalButton.removeAttribute('disabled');
            approvalButton.classList.remove('is-light');
            approvalButton.classList.add('is-primary');
        } else {
            approvalButton.setAttribute('disabled', 'disabled');
            approvalButton.classList.remove('is-primary');
            approvalButton.classList.add('is-light');
        }
    }
}