import { onClick,getValue,setValue,hide,show,onInput } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
import {validatePhoneNumber} from "https://cdn.jsdelivr.net/gh/jscroot/validate@0.0.1/croot.js";
import {postJSON,getJSON} from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import {getCookie} from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import {redirect} from "https://cdn.jsdelivr.net/gh/jscroot/url@0.0.9/croot.js";
import {addCSSIn} from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';
import { id, backend } from "/dashboard/jscroot/url/config.js";

export async function main(){
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css",id.content);
    getJSON(backend.project.anggota,'login',getCookie('login'),getResponseFunction);
    //onInput('phone', validatePhoneNumber);
    onClick("tombolmeet",actionfunctionname);
    setValue('date',getTomorrowDate());
    setValue("timeStart","09:00:00");
    setValue("timeEnd","10:00:00");
}

function getTomorrowDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    //tomorrow.setDate(today.getDate() + 1);
    tomorrow.setDate(today.getDate());

    const isoString = tomorrow.toISOString();
    const datePart = isoString.split('T')[0];

    return datePart;
}

function getResponseFunction(result){
    console.log(result);
    if (result.status===200){
        result.data.forEach(project => {
            const option = document.createElement('option');
            option.value = project._id;
            option.textContent = project.name;
            document.getElementById('kode').appendChild(option);
        });

    }else{
        Swal.fire({
            icon: "error",
            title: result.data.status,
            text: result.data.response
          });
    }
}

function actionfunctionname(){
    const attachmentsInput = document.getElementById('attachments').value.split(',').map(url => url.trim());
    const attachments = attachmentsInput.map(url => ({
        fileUrl: url,
        mimeType: "application/pdf", // Example, change as needed
        title: "Attachment"
    }));
    let event={
        project_id:getValue("kode"),
        summary:getValue("summary"),
        location:getValue("location"),
        description:getValue("description"),
        date:getValue("date"),
        timestart:getValue("timeStart"),
        timeend:getValue("timeEnd"),
        attachments:attachments
    };
    if (getCookie("login")===""){
        redirect("/signin");
    }else{
        postJSON(backend.ux.meeting,"login",getCookie("login"),event,responseFunction);
        hide("tombolmeet");
    }  
}

function responseFunction(result){
    if(result.status === 200){
        const katakata = "Selamat kak meeting dari "+result.data.nama+" sudah tersimpan dengan alamat: "+result.data.kode;
        Swal.fire({
            icon: "success",
            title: "Berhasil",
            text: katakata,
            footer: '<a href="https://wa.me/'+result.data.phone+'?text='+katakata+'" target="_blank">Kirim Pesan</a>',
            didClose: () => {
                setValue("summary","");
                setValue("location","");
                setValue("description","");
                setValue("date",getTomorrowDate());
                setValue("timeStart","09:00:00");
                setValue("timeEnd","10:00:00");
                setValue("attachments","");
                show("tombolmeet");
            }
          });
    }else{
        Swal.fire({
            icon: "error",
            title: result.data.status,
            text: result.data.response
          });
          show("tombolmeet");
    }
    console.log(result);
}
