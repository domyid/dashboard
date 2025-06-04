import { onClick, setText, show, hide } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js"; // Removed addClass, removeClass
import { getJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";
import { backend } from "/dashboard/jscroot/url/config.js"; // Adjust path as necessary

// DOM Element IDs
const ID_GENERATE_BTN = 'generateBtn';
const ID_CODE_DISPLAY_AREA = 'codeDisplayArea';
const ID_GENERATED_CODE = 'generatedCode';
const ID_COPY_BTN = 'copyBtn';
const ID_NOTIFICATION_AREA = 'notificationArea';
const ID_NOTIFICATION_MESSAGE = 'notificationMessage';
const ID_CLOSE_NOTIFICATION = 'closeNotification';

export async function main() {
    const token = getCookie('login');
    const generateBtnElement = document.getElementById(ID_GENERATE_BTN);

    if (!token) {
        showNotification('Anda harus login terlebih dahulu untuk mengakses fitur ini.', 'is-danger');
        if (generateBtnElement) {
            generateBtnElement.disabled = true;
        }
        return;
    }

    onClick(ID_GENERATE_BTN, handleGenerateCode);
    onClick(ID_COPY_BTN, handleCopyCode);
    onClick(ID_CLOSE_NOTIFICATION, () => {
        hide(ID_NOTIFICATION_AREA);
    });
}

async function handleGenerateCode() {
    const token = getCookie('login');
    const generateBtnElement = document.getElementById(ID_GENERATE_BTN);

    if (!token) {
        showNotification('Sesi Anda telah berakhir. Silakan login kembali.', 'is-danger');
        if (generateBtnElement) {
            generateBtnElement.disabled = true;
        }
        return;
    }

    generateBtnElement.disabled = true;
    generateBtnElement.classList.add('is-loading'); // Use standard classList
    hide(ID_CODE_DISPLAY_AREA);

    if (!(backend && backend.bimbingan && backend.bimbingan.generateEventCode)) {
        const errorMessage = 'Konfigurasi endpoint untuk generate code tidak ditemukan. Harap periksa file config.js dan pastikan backend.bimbingan.generateEventCode sudah benar.';
        console.error(errorMessage);
        showNotification(errorMessage, 'is-danger');
        generateBtnElement.disabled = false;
        generateBtnElement.classList.remove('is-loading'); // Use standard classList
        return;
    }
    
    getJSON(backend.bimbingan.generateEventCode, 'login', token, (result) => {
        console.log("Backend response for generateEventCode:", result);

        generateBtnElement.disabled = false;
        generateBtnElement.classList.remove('is-loading'); // Use standard classList

        if (result.status === 200 && result.data && result.data.Status === "Success" && typeof result.data.Response === 'string') {
            setText(ID_GENERATED_CODE, result.data.Response);
            show(ID_CODE_DISPLAY_AREA);
            showNotification('Kode event berhasil digenerate!', 'is-success');
        } else {
            let errorMessage = 'Gagal generate code. Silakan coba lagi.';
            if (result.data && result.data.Response) {
                errorMessage = result.data.Response;
            } else if (result.data && result.data.Status) {
                 errorMessage = result.data.Status;
            } else if (result.status !== 200) {
                errorMessage = `Gagal menghubungi server (status: ${result.status}). Pastikan Anda adalah owner.`;
            }
            
            showNotification(errorMessage, 'is-danger');
            hide(ID_CODE_DISPLAY_AREA);
        }
    });
}

function handleCopyCode() {
    const codeToCopy = document.getElementById(ID_GENERATED_CODE).textContent;
    if (!codeToCopy) {
        showNotification('Tidak ada kode untuk disalin.', 'is-warning');
        return;
    }

    navigator.clipboard.writeText(codeToCopy).then(() => {
        const copyBtnElement = document.getElementById(ID_COPY_BTN);
        const originalText = copyBtnElement.textContent;
        
        setText(ID_COPY_BTN, 'Copied!');
        copyBtnElement.classList.remove('is-info'); // Use standard classList
        copyBtnElement.classList.add('is-success');   // Use standard classList
        showNotification('Kode berhasil disalin ke clipboard!', 'is-success');

        setTimeout(() => {
            setText(ID_COPY_BTN, originalText);
            copyBtnElement.classList.remove('is-success'); // Use standard classList
            copyBtnElement.classList.add('is-info');     // Use standard classList
        }, 2000);
    }).catch(err => {
        console.error('Error copying code: ', err);
        showNotification('Gagal menyalin kode. Silakan coba salin secara manual.', 'is-danger');
    });
}

function showNotification(message, type) {
    const notificationAreaElement = document.getElementById(ID_NOTIFICATION_AREA);
    if (!notificationAreaElement) {
        console.error("Element notifikasi (ID_NOTIFICATION_AREA) tidak ditemukan di HTML!");
        return;
    }
    const notificationMessageElement = document.getElementById(ID_NOTIFICATION_MESSAGE);
    if (!notificationMessageElement) {
        console.error("Elemen pesan notifikasi (ID_NOTIFICATION_MESSAGE) tidak ditemukan di HTML!");
        return;
    }
    
    setText(ID_NOTIFICATION_MESSAGE, message);

    // Use standard classList API
    notificationAreaElement.classList.remove('is-success', 'is-danger', 'is-warning', 'is-info', 'is-hidden');
    notificationAreaElement.classList.add(type);

    show(ID_NOTIFICATION_AREA);

    const autoHideDelay = 5000;
    setTimeout(() => {
        hide(ID_NOTIFICATION_AREA);
    }, autoHideDelay);
}