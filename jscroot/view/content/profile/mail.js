import { onClick,setInner } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import {putJSON,get} from "https://cdn.jsdelivr.net/gh/jscroot/lib@0.0.4/api.js";
import {getCookie} from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import {addCSSIn} from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
import { id, backend } from "../../../url/config.js";

export async function main(){
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css",id.content);
    //getJSON(backend.user.data,"login",getCookie("login"),getUserFunction);
    onClick("btn",PostSignUp);
}


function PostSignUp(){
    const button = document.getElementById('btn');
    button.setAttribute('disabled', '');
    setInner("btn","Loading...");
    get(backend.wa.device+getCookie("login"),responseDevice);

}

function responseDevice(result){
    setInner("ket",result.message);
    if (result.status){
        //replace gambar dengan kode link wa
        let gbr=document.getElementById("gambar");
        let cnv=document.createElement('canvas');
        updateCanvas(result.code,cnv);
        gbr.replaceWith(cnv);
        //replace tombol dengan gambar input no
        let btn=document.getElementById("btn");
        let img=document.createElement('img');
        img.src='assets/img/input.jpg';
        img.alt = 'Inputkan kode yang tampak di layar';
        btn.replaceWith(img);
    } else{
        //replace gambar dengan centang
        let gbr=document.getElementById("gambar");
        gbr.replaceWith("✔️");
        putJSON(
            backend.user.data,
            "login",
            getCookie("login"),
            {},
            putTokenFunc
          );
        
    }  
}

function putTokenFunc(result){
    //replace tombol string kosong
    let btn=document.getElementById("btn");
    btn.replaceWith("Selamat WhatsApp anda sudah tertaut di sistem ini dengan token: "+result.data.linkeddevice);
    setInner("userPoint", "✔️");
    localStorage.setItem("status", "ok");
}

function updateCanvas(text,c) {
    var ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 400, 200);
    ctx.fillStyle = "#212121";
    ctx.fillRect(0, 0, 400, 200)
    var gradient = ctx.createLinearGradient(0, 0, 200, 200);
    gradient.addColorStop(0, '#39FF14');
    gradient.addColorStop(1, 'white');
    ctx.fillStyle = gradient;
    var fontface = "Courier";
    ctx.font = "30px Courier";
    ctx.textAlign = 'center';
    // start with a large font size
      var fontsize=300;
      // lower the font size until the text fits the canvas
      do{
          fontsize--;
          ctx.font=fontsize+"px "+fontface;
      }while(ctx.measureText(text).width>c.width)
    ctx.fillText(text, 150, 100);
    console.log(ctx.measureText(text).width);
  }