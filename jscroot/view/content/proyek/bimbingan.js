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
    // Memanggil fungsi fetchBimbinganData() saat minggu dipilih
    document.getElementById('week-select').addEventListener('change', function() {
    fetchBimbinganData();
    });
    // onClick("tombolaksesmember",actionfunctionname);
    fetchActivityScore();
    // Ambil data bimbingan untuk minggu pertama (default)
        // Tambahkan event listener untuk memilih minggu
        // document.getElementById('week-select').addEventListener('change', function () {
            // const selectedWeek = this.value; // Ambil nilai minggu yang dipilih
            // fetchBimbinganData(selectedWeek); // Panggil fungsi dengan nilai minggu yang dipilih
        // });
    // getJSON(backend.project.assessment + "weekly?week=" + selectedWeek,'login',getCookie('login'),fetchBimbinganData);
    populateWeekOptions();
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

// Fungsi untuk mendapatkan nomor minggu berdasarkan Senin jam 5 sore
Date.prototype.getWeekNumber = function() {
    var date = new Date(this.getFullYear(), this.getMonth(), this.getDate());
    // Mengatur waktu ke Senin jam 5 sore (17:00)
    date.setHours(17, 0, 0, 0);
    
    // Menentukan hari Senin untuk minggu ini
    var day = date.getDay();
    if (day == 0) { // Jika hari Minggu, ubah menjadi Senin
        day = 7;
    }
    date.setDate(date.getDate() - day + 1); // Menyesuaikan ke Senin

    // Tentukan minggu pertama (Minggu ke-1)
    var week1 = new Date(date.getFullYear(), 0, 4);
    return Math.ceil((((date - week1) / 86400000) + 1) / 7);
};

// Fungsi untuk mengisi daftar minggu (week)
function populateWeekOptions() {
    const currentWeek = new Date().getWeekNumber(); // Ambil minggu saat ini berdasarkan Senin jam 5 sore
    const weekSelectElement = document.getElementById("week-select");

    // Tambahkan pilihan minggu (week) secara dinamis
    for (let week = 1; week <= currentWeek; week++) {
        const option = document.createElement('option');
        option.value = week;
        option.textContent = `Minggu ${week}`;
        weekSelectElement.appendChild(option);
    }
}

// Fungsi untuk mengambil data bimbingan berdasarkan minggu yang dipilih
function fetchBimbinganData() {
    // Ambil nilai minggu yang dipilih
    const selectedWeek = document.getElementById('week-select').value;
    
    // Pastikan selectedWeek bukan undefined atau kosong
    if (selectedWeek) {
        const bimbinganWeekly = backend.project.assessment + "/weekly?week=" + selectedWeek;
        console.log("Fetching data for week: " + selectedWeek); // Log untuk debugging
        getJSON(bimbinganWeekly, 'login', getCookie('login'), handleBimbinganResponse);
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Pilih minggu terlebih dahulu!',
            text: 'Anda harus memilih minggu sebelum melanjutkan.'
        });
    }
}

// Fungsi untuk menangani response dari API setelah mengambil data bimbingan
function handleBimbinganResponse(result) {
    console.log(result);
    if (result.status === 200) {
        // Handle the result to populate bimbingan data
        result.data.forEach(bimbingan => {
            // Populate bimbingan data in table or other parts of UI
            console.log("Bimbingan Data: ", bimbingan);
        });
    } else {
        Swal.fire({
            icon: "error",
            title: result.data.status,
            text: result.data.response
        });
    }
}