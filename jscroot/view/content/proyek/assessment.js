import { onClick,getValue,setValue,onInput,hide,show } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
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
    onClick('tombolmintaapproval', actionfunctionname);
    fetchActivityScore();
    // fetchPomokitData();
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
        postJSON(backend.project.assessment,"login",getCookie("login"),idprjusr,postResponseFunction);
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
    }else{
        Swal.fire({
            icon: "error",
            title: result.data.status,
            text: result.data.response
          });
        //   show("tombolbuatproyek");
    }
    console.log(result);
}

function fetchActivityScore() {
    getJSON(backend.activityscore.all, 'login', getCookie('login'), handleActivityScoreResponse);
}

function handleActivityScoreResponse(result) {
    if (result.status === 200) {
        updateTableRow(0, result.data.sponsordata, result.data.sponsor);
        updateTableRow(1, result.data.stravakm, result.data.strava);
        updateTableRow(2, result.data.iqresult, result.data.iq);
        // updateTableRow(3, result.data.pomokitsesi, result.data.pomokit);
        updateTableRow(6, result.data.trackerdata, result.data.tracker);
        // updateTableRow(9, result.data.gtmetrixresult, result.data.gtmetrix);
        updateTableRow(10, result.data.webhookpush, result.data.webhook);
        updateTableRow(11, result.data.presensihari, result.data.presensi);
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

// function fetchPomokitData() {
//     getJSON(backend.user.pomokit, 'login', getCookie('login'), processPomokitResponse);
// }

// function processPomokitResponse(result) {
//     // Periksa apakah permintaan berhasil
//     if (result && result.status === 200 && result.data && result.data.count !== undefined) {
//         // Ambil nilai count dari properti data
//         const count = result.data.count;
//         // Hitung poin (1 count = 20 poin)
//         const points = count * 20;
                
//         // Update tabel Pomokit (baris ke-4, indeks 3)
//         updatePomokitTable(count, points);
//     } else {
//         console.error("Failed to get Pomokit data count");
//     }
// }


// function updatePomokitTable(count, points) {
//     // Dapatkan baris Pomokit (indeks 3 - baris ke-4)
//     const tableRows = document.querySelectorAll("table.table tbody tr");
//     const pomokitRow = tableRows[3]; // Baris Pomokit (indeks ke-3)
    
//     if (pomokitRow) {
//         // Perbarui sel kuantitas dan poin
//         const quantityCell = pomokitRow.querySelector("td:nth-child(3)");
//         const pointsCell = pomokitRow.querySelector("td:nth-child(4)");
        
//         if (quantityCell && pointsCell) {
//             quantityCell.textContent = count;
//             pointsCell.textContent = points;
//         } else {
//             console.error("Could not find quantity or points cells in the Pomokit row");
//         }
//     } else {
//         console.error("Could not find Pomokit row in the table");
//     }
// }