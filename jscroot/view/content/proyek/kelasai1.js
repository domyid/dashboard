import { onClick,getValue,setValue,onInput,onChange,hide,show } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
import {postJSON,getJSON} from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import {getCookie} from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import {addCSSIn} from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';
import { id,backend } from "/dashboard/jscroot/url/config.js";

export async function main(){
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css",id.content);
    getJSON(backend.project.data,'login',getCookie('login'),getResponseFunction);
    onClick('tombolkirimtugas', actionfunctionname);
    fetchTugasScore();
}

const tugaskelasai = backend.project.kelasai + '1';

function actionfunctionname(){
    let idprjusr = {
        kelas: getValue('kelas-name'),
        alltugas: [
            getValue('tugas1'),
            getValue('tugas2'),
        ],
    };
    if (getCookie("login")===""){
        redirect("/signin");
    }else{
        postJSON(tugaskelasai,"login",getCookie("login"),idprjusr,postResponseFunction);
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
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Tugas sudah dikirim. Selamat!',
            didClose: () => {
                setValue('kelas-name', '');
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

function handleTugasScoreResponse(result) {
    console.log(result);
    if (result.status === 200) {
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

function addTableTugas(data) {
    const tbody = document.querySelector('table.table-tugas tbody');
    tbody.innerHTML = '';
    data.alltugas.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>Pekerjaan ${index + 1}</td>
            <td>${item}</td>
        `;
        tbody.appendChild(row);
    });
}