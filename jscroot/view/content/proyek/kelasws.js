import {onClick, getValue, setValue,onInput, hide, show} from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
  import { postJSON, getJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
  import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
  import { addCSSIn } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.5/croot.js";
  import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/src/sweetalert2.js';
  import { id, backend } from "/dashboard/jscroot/url/config.js";
  
  export async function main(){
    // load Swal CSS
    await addCSSIn("https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.css", id.content);
    // validasi tugas1 sebagai GitHub URL
    onInput('tugas1', validateGithubURL);
    // load daftar proyek
    getJSON(backend.project.data, 'login', getCookie('login'), getResponseFunction);
    // tombol kirim
    onClick('tombolkirimtugas', actionfunctionname);
  }
  
  // validasi GitHub URL sederhana
  function validateGithubURL() {
    const val = getValue('tugas1').trim();
    const re = /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\/.*)?$/;
    const btn = document.getElementById('tombolkirimtugas');
  
    if (re.test(val)) {
      // valid
      btn.removeAttribute('disabled');
    } else {
      // tidak valid
      btn.setAttribute('disabled', '');
    }
  }
  
  function getResponseFunction(result){
    if (result.status===200){
      result.data.forEach(proj => {
        const option = document.createElement('option');
        option.value = proj._id;
        option.textContent = proj.name;
        document.getElementById('project-name').appendChild(option);
      });
    } else {
      Swal.fire({
        icon: "error",
        title: result.data.status,
        text: result.data.response,
      });
    }
  }
  
  function actionfunctionname(){
    // sebelum submit, pastikan URL valid
    const url = getValue('tugas1').trim();
    if (!url.startsWith('https://github.com/')) {
      Swal.fire({
        icon: 'warning',
        title: 'URL tidak valid',
        text: 'Masukkan link repositori GitHub yang benar.',
      });
      return;
    }
  
    const payload = {
      kelas: getValue('kelas-name'),
      alltugas: [ url ],
    };
  
    if (!getCookie("login")) {
      window.location.href = "/signin";
      return;
    }
  
    postJSON(
      backend.project.kelasws,
      "login", getCookie("login"),
      payload,
      postResponseFunction
    );
  }
  
  function postResponseFunction(result){
    if (result.status === 200){
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Tugas Anda berhasil dikirim.',
        didClose: () => {
          setValue('tugas1','');
          document.getElementById('tombolkirimtugas').setAttribute('disabled','');
        }
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: result.data.status,
        text: result.data.response,
      });
    }
    console.log(result);
  }
  