import { onClick,getValue,setValue,onChange,container } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
import {postJSON,getJSON} from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import {getCookie} from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import {addCSSIn} from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';
import { id,backend } from "/dashboard/jscroot/url/config.js";

const tugaskelasai = backend.project.kelasai + '1';

let activityData = {
    stravakm: 0,
    iqresult: 0,
    pomokitsesi: 0,
    mbc: 0,
    rupiah: 0,
    rvn: 0,
    alltugas: [],
};

export async function main(){
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css",id.content);
    getJSON(backend.project.data,'login',getCookie('login'),getResponseFunction);
    getJSON(tugaskelasai, 'login', getCookie('login'), getTugasAIList);
    onClick('tombolkirimtugas', checkAndSubmit);
    onChange('tugas-name', handleTugasAIChange);
    fetchTugasScore();
}

function handleTugasAIChange(target) {
    const id = target.value; // Ini _id nya
    const defaultValue = 'x'.repeat(10);
    const submitButton = container('tombolkirimtugas');
    const dropdownKelas = container('kelas-name');

    if (id === defaultValue) {
        submitButton.style.display = 'inline-block';
        fetchTugasScore();
    } else {
        submitButton.style.display = 'none';
        dropdownKelas.disabled = true;
        const url = `${tugaskelasai}/${id}`;
        getJSON(url, 'login', getCookie('login'), function(result) {
            handleTugasScoreResponse(result);

            if (result.status === 200) setValue('kelas-name', result.data.kelas);
        });
    }
}

function getTugasAIList(result) {
    if (result.status === 200) {
        result.data.forEach((tugas) => {
            console.log({ tugas });
            const option = document.createElement('option');
            option.value = tugas._id;

            const tugasText = 'Tugas Ke-';
            option.textContent = tugasText + (tugas.tugaske ?? 1);
            document.getElementById('tugas-name').appendChild(option);
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
    console.log({conditions})
    
    if (!conditions.isValid) {
        // Create message about what's missing
        let missingItems = [];
        
        if (!conditions.stravakm) missingItems.push("Strava");
        if (!conditions.iqresult) missingItems.push("Test IQ");
        if (!conditions.pomokitsesi) missingItems.push("Pomokit");
        
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

        if (!conditions.hasTugas) missingItems.push("Pekerjaan");
        
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
    const kelas = getValue('kelas-name');
    const defaultValue = 'x'.repeat(2);
    if (kelas === defaultValue) {
        Swal.fire({
            icon: 'error',
            title: 'Kelas Kosong',
            text: 'Silakan pilih kelas terlebih dahulu.',
        });
        return;
    }

    let idprjusr = {
        kelas: kelas,
    };
    console.log(idprjusr.kelas)
    if (getCookie("login")===""){
        redirect("/signin");
    }else{
        postJSON(tugaskelasai,"login",getCookie("login"),idprjusr,postResponseFunction);
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
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: `Tugas ${result.data.tugaske} berhasil dikirim. Selamat!`,
            didClose: () => {
                setValue('kelas-name', result.data.kelas);
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

function fetchTugasScore() {
    getJSON(tugaskelasai+'/weekly', 'login', getCookie('login'), handleTugasScoreResponse);
}

// Function to check conditions and update button status
function checkApprovalButtonConditions() {
    // Extract values from activityData
    const { stravakm, iqresult, pomokitsesi, mbc, rupiah, rvn, alltugas } = activityData;
    
    const requiredActivitiesPositive = stravakm > 0 && iqresult > 0 && pomokitsesi > 0;
    const qrisCondition = rupiah > 0 || (rupiah === 0 && mbc > 0 && rvn > 0);
    const hasTugas = Array.isArray(alltugas) && alltugas.some(item => item.trim && item.trim() !== "");
    
    // Combine all conditions
    const allConditionsMet = requiredActivitiesPositive && qrisCondition && hasTugas;
    
    return {
        isValid: allConditionsMet,
        stravakm: stravakm > 0,
        iqresult: iqresult > 0,
        pomokitsesi: pomokitsesi > 0,
        qrisCondition: qrisCondition,
        rupiah: rupiah > 0,
        mbcrvn: rupiah === 0 && mbc > 0 && rvn > 0,
        hasTugas: hasTugas,
    };
}

function handleTugasScoreResponse(result) {
    if (result.status === 200) {

        activityData = {
            stravakm: result.data.stravakm || 0,
            iqresult: result.data.iqresult || 0,
            pomokitsesi: result.data.pomokitsesi || 0,
            mbc: result.data.mbc || 0,
            rupiah: result.data.rupiah || 0,
            rvn: result.data.rvn || 0,
            alltugas: result.data.alltugas || [],
        };

        updateTableRow(0, result.data.stravakm, result.data.strava);
        updateTableRow(1, result.data.iqresult, result.data.iq);
        updateTableRow(2, result.data.pomokitsesi, result.data.pomokit);
        updateTableRow(3, result.data.mbc, result.data.mbcPoints || result.data.blockchain); 
        updateTableRow(4, result.data.rupiah, result.data.qrisPoints || result.data.qris);
        updateTableRow(5, result.data.rvn, result.data.ravencoinPoints || 0);
        addTableTugas(result.data.alltugas);
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

function addTableTugas(alltugas) {
    const tbody = document.querySelector('table.table-tugas tbody');
    tbody.innerHTML = '';
    alltugas.forEach((url, index) => {
        if(url != "") {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>Pekerjaan ${index + 1}</td>
                <td><a href="${url}" target="_blank">${url}</a></td>
            `;
            tbody.appendChild(row);
        } else {
            console.log("gaada")
        }
    });
}