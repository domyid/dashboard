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
    fetchTrackerData();
    fetchPomokitData();
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

function fetchTrackerData() {
    getJSON(backend.tracker.data, 'login', getCookie('login'), getResponseFunctionTracker);
}

function getResponseFunctionTracker(result){
    if (result.status===200){
        const tableRows = document.querySelectorAll("table.table tbody tr");
        const pomokitRow = tableRows[6];
        
        if (pomokitRow) {
            const quantityCell = pomokitRow.querySelector("td:nth-child(3)");
            const pointsCell = pomokitRow.querySelector("td:nth-child(4)");
            
            if (quantityCell && pointsCell) {
                const quantity = result.data.response;
                const points = quantity * 10;
                quantityCell.textContent = quantity;
                pointsCell.textContent = points;
            }
        }

    }else{
        console.log(result.data.message)
    }
}

async function fetchPomokitData() {
    const token = getCookie('login');
    
    const parts = token.split('.');
    if (parts.length < 3) {
        console.error("Invalid token format");
        return;
    }
  
    const idPattern = /\b(62\d{10,12})\b/;
    const match = token.match(idPattern);
    
    if (!match) {
        console.error("Could not find phone number pattern in token");
        return;
    }
    
    const phoneNumber = match[1];
    console.log(`Extracted phone number from token: ${phoneNumber}`);
    
    try {
        // Panggil API Pomokit dengan parameter phoneNumber dan send=false
        const response = await fetch(`${backend.user.pomokit}?phonenumber=${phoneNumber}&send=false`);
        
        const data = await response.json();
        console.log("Pomokit API response:", data);
        
        if (data.status === "Success") {
            updatePomokitTable(data.response);
        } else {
            console.error("Failed to get Pomokit data:", data);
        }
    } catch (error) {
        console.error("Error fetching Pomokit data:", error);
    }
}

function updatePomokitTable(response) {
    console.log("Processing Pomokit response:", response);
    
    // Regex untuk mengekstrak jumlah sesi dan poin dari respons API
    const regex = /:\s*(\d+)\s+sesi\s+\(\+(\d+)\s+poin\)/;
    const match = response.match(regex);
    
    if (match) {
        const sesi = match[1];   // Jumlah sesi
        const poin = match[2];   // Jumlah poin
        
        console.log(`Extracted: ${sesi} sesi, ${poin} poin`);
        
        // Dapatkan baris Pomokit (indeks 3 - baris ke-4)
        const tableRows = document.querySelectorAll("table.table tbody tr");
        const pomokitRow = tableRows[3]; // Baris Pomokit
        
        if (pomokitRow) {
            // Perbarui sel kuantitas dan poin
            const quantityCell = pomokitRow.querySelector("td:nth-child(3)");
            const pointsCell = pomokitRow.querySelector("td:nth-child(4)");
            
            if (quantityCell && pointsCell) {
                quantityCell.textContent = sesi;
                pointsCell.textContent = poin;
                console.log("Updated Pomokit row in table");
            }
        }
    } else {
        console.error("Could not extract session and point data from response");
    }
}