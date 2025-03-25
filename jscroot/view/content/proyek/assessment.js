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
    getJSON(backend.project.data,'login',getCookie('login'),getResponseFunction,getResponseFunctionWithPomokit);
    onClick("tombolaksesmember",actionfunctionname);
    fetchTrackerData();
    await updatePomokitData();
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

// Modifikasi getResponseFunction untuk memanggil updatePomokitData
function getResponseFunctionWithPomokit(result){
    console.log(result);
    if (result.status===200){
        result.data.forEach(project => {
            const option = document.createElement('option');
            option.value = project._id;
            option.textContent = project.name;
            document.getElementById('project-name').appendChild(option);
        });
        
        // Setelah data project dimuat, update data Pomokit
        if(result.user && result.user.phonenumber) {
            updatePomokitData(result.user.phonenumber);
        }
    } else {
        Swal.fire({
            icon: "error",
            title: result.data.status,
            text: result.data.response
        });
    }
}

async function updatePomokitData(phonenumber) {
    const loginToken = getCookie('login');
    if (!loginToken || !phonenumber) return;
    
    try {
        // Gunakan URL dari config dan tambahkan phonenumber
        const response = await fetch(`${backend.user.pomokit}?phonenumber=${phonenumber}&send=false`, {
            headers: {
                'Authorization': `Bearer ${loginToken}`
            }
        });
        const data = await response.json();
        
        if (data.status === "Success") {
            updatePomokitTable(data.response);
        }
    } catch (error) {
        console.error("Error fetching Pomokit data:", error);
    }
}

function updatePomokitTable(response) {
    const regex = /(\d+)\s+sesi\s+\(\+(\d+)\s+poin\)/;
    const match = response.match(regex);
    
    if (match) {
        const kuantitas = match[1];
        const poin = match[2];
        
        const table = document.querySelector("table tbody");
        const pomokitRow = Array.from(table.rows).find(row => 
            row.cells[1].textContent.trim() === "Pomokit"
        );
        
        if (pomokitRow) {
            pomokitRow.cells[2].textContent = kuantitas;
            pomokitRow.cells[3].textContent = poin;
        }
    }
}