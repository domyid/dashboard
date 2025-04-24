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
    onClick("tombolaksesmember",actionfunctionname);
    setupWeekSelection();
    fetchActivityScore();
}

// Menambahkan fungsi untuk menangani pemilihan minggu
function setupWeekSelection() {
    const weekSelect = document.getElementById('week-select');
    if (weekSelect) {
        weekSelect.addEventListener('change', function () {
            const selectedWeek = weekSelect.value;
            fetchBimbinganData(selectedWeek);
        });
    }
}

// Fungsi untuk mengambil data bimbingan berdasarkan minggu yang dipilih
async function fetchBimbinganData(selectedWeek) {
    if (!selectedWeek || isNaN(selectedWeek) || selectedWeek < 1) {
        Swal.fire({
            icon: 'error',
            title: 'Input Minggu Tidak Valid',
            text: 'Pastikan minggu yang dimasukkan adalah angka valid.',
            confirmButtonText: 'OK'
        });
        return;
    }

    try {
        const bimbinganWeekly = backend.project.assessment + "weekly?week=" + selectedWeek;
        const response = await fetch(bimbinganWeekly);

        if (!response.ok) {
            throw new Error(`Gagal memuat data bimbingan minggu ke-${selectedWeek}`);
        }

        const data = await response.json();

        // Menampilkan data bimbingan di UI
        displayBimbinganData(data);
    } catch (error) {
        console.error("Terjadi kesalahan saat memuat data bimbingan:", error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal Memuat Data',
            text: error.message,
            confirmButtonText: 'OK'
        });
    }
}

// Fungsi untuk menampilkan data bimbingan di UI
function displayBimbinganData(data) {
    // Ambil elemen tabel untuk menampilkan data
    const tableBody = document.querySelector('table tbody');
    tableBody.innerHTML = '';  // Clear previous data

    // Jika data kosong
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="has-text-centered">Tidak ada data untuk minggu ini</td></tr>`;
        return;
    }

    // Iterasi dan masukkan data ke dalam tabel
    data.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.kegiatan}</td>
            <td>${item.kuantitas}</td>
            <td>${item.poin}</td>
        `;
        tableBody.appendChild(row);
    });
}

function actionfunctionname(){
    let idprjusr={
        _id:getValue("project-name"),
        phonenumber:getValue("phonenumber")
    };
    if (getCookie("login")===""){
        redirect("/signin");
    }else{
        postJSON(backend.project.assessment,"login",getCookie("login"),idprjusr,postResponseFunction);
        // hide("tombolbuatproyek");
    }  
}

function getResponseFunction(result){
    console.log(result);
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
            text: result.data.response
          });
    }
}


function postResponseFunction(result){
    if(result.status === 200){
        const katakata = "Berhasil memasukkan member baru ke project "+result.data.name;
        Swal.fire({
            icon: "success",
            title: "Berhasil",
            text: "Selamat kak proyek "+result.data.name+" dengan ID: "+result.data._id+" sudah mendapat member baru",
            footer: '<a href="https://wa.me/62895601060000?text='+katakata+'" target="_blank">Verifikasi Proyek</a>',
            didClose: () => {
                setValue("phonenumber","");
            }
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

function fetchActivityScore() {
    getJSON(backend.activityscore.weekly, 'login', getCookie('login'), handleActivityScoreResponse);
}

function handleActivityScoreResponse(result) {
    console.log({result});
    if (result.status === 200) {
        updateTableRow(0, result.data.sponsordata, result.data.sponsor);
        updateTableRow(1, result.data.stravakm, result.data.strava);
        updateTableRow(2, result.data.iqresult, result.data.iq);
        updateTableRow(3, result.data.pomokitsesi, result.data.pomokit);
        updateTableRow(6, result.data.trackerdata, result.data.tracker);
        updateTableRow(7, result.data.bukped);
        updateTableRow(9, result.data.gtmetrixresult, result.data.gtmetrix);
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