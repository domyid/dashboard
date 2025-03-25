import { onClick,getValue,setValue,onInput,hide,show } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
import {validatePhoneNumber} from "https://cdn.jsdelivr.net/gh/jscroot/validate@0.0.2/croot.js";
import {postJSON,getJSON} from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import {getCookie} from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import {addCSSIn} from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';
import { id,backend } from "/dashboard/jscroot/url/config.js";

export async function main() {
    onInput('phonenumber', validatePhoneNumber);
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css", id.content);
    getJSON(backend.project.data, 'login', getCookie('login'), getResponseFunction);
    onClick("tombolaksesmember", actionfunctionname);
    
    // Tambahkan event listener untuk perubahan pada input nomor telepon
    document.getElementById('phonenumber').addEventListener('change', function() {
        const phoneNumber = getValue("phonenumber");
        if (validatePhoneNumber(phoneNumber)) {
            fetchPomokitData(phoneNumber);
        }
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
        hide("tombolbuatproyek");
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
    }else{
        Swal.fire({
            icon: "error",
            title: result.data.status,
            text: result.data.response
          });
          show("tombolbuatproyek");
    }
    console.log(result);
}

function fetchPomokitData(phoneNumber) {
    // Gunakan endpoint Pomokit
    const pomokitUrl = `https://asia-southeast2-awangga.cloudfunctions.net/domyid/report/pomokit/total?phonenumber=${phoneNumber}&send=false`;
    
    // Lakukan fetch data
    fetch(pomokitUrl)
        .then(response => response.json())
        .then(data => {
            if (data.status === "Success") {
                // Parse respons untuk mendapatkan jumlah sesi
                const responseText = data.response;
                
                // Ekstrak jumlah sesi dan poin dari respons
                // Format respons: "Total Akumulasi Poin Pomokit untuk Rafi\n\n Rafi (628225187308): 18 sesi (+360 poin)..."
                const sessionMatch = responseText.match(/(\d+)\s+sesi\s+\(\+(\d+)\s+poin\)/);
                
                if (sessionMatch && sessionMatch.length >= 3) {
                    const sessions = parseInt(sessionMatch[1], 10);
                    const points = parseInt(sessionMatch[2], 10);
                    
                    // Perbarui tabel
                    updatePomokitRow(sessions, points);
                }
            } else {
                console.error("Gagal mengambil data Pomokit:", data);
            }
        })
        .catch(error => {
            console.error("Error saat mengambil data Pomokit:", error);
        });
}

function updatePomokitRow(quantity, points) {
    // Cari baris Pomokit (indeks 4 berdasarkan HTML yang diberikan, karena baris dimulai dari 0)
    const tableRows = document.querySelectorAll("table.table tbody tr");
    const pomokitRow = tableRows[3]; // Baris ke-4 (indeks 3)
    
    if (pomokitRow) {
        // Perbarui kolom kuantitas (kolom ke-3) dan poin (kolom ke-4)
        const quantityCell = pomokitRow.querySelector("td:nth-child(3)");
        const pointsCell = pomokitRow.querySelector("td:nth-child(4)");
        
        if (quantityCell && pointsCell) {
            quantityCell.textContent = quantity;
            pointsCell.textContent = points;
        }
    }
}