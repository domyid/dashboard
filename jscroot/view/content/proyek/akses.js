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
}

function actionfunctionname(){
    let idprjusr={
        _id:getValue("project-name"),
        phonenumber:getValue("phonenumber")
    };
    if (getCookie("login")===""){
        redirect("/signin");
    }else{
        postJSON(backend.project.anggota,"login",getCookie("login"),idprjusr,postResponseFunction);
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