import { onClick, setText, show, hide, addClass, removeClass } from "https://cdn.jsdelivr.net/gh/jscroot/element@0.1.7/croot.js";
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
    if (!token) {
        showNotification('Sesi Anda telah berakhir. Silakan login kembali.', 'is-danger');
        const generateBtnElement = document.getElementById(ID_GENERATE_BTN);
        if (generateBtnElement) {
            generateBtnElement.disabled = true;
        }
        return;
    }

    const generateBtnElement = document.getElementById(ID_GENERATE_BTN);
    generateBtnElement.disabled = true;
    addClass(generateBtnElement, 'is-loading');

    // Assuming the endpoint is defined in config.js as backend.bimbingan.generateEventCode
    // GET 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/generatecode'
    if (!backend.bimbingan || !backend.bimbingan.generateEventCode) {
        showNotification('Konfigurasi endpoint untuk generate code tidak ditemukan.', 'is-danger');
        generateBtnElement.disabled = false;
        removeClass(generateBtnElement, 'is-loading');
        return;
    }
    
    getJSON(backend.bimbingan.generateEventCode, 'login', token, (result) => {
        generateBtnElement.disabled = false;
        removeClass(generateBtnElement, 'is-loading');

        if (result.status === 200 && result.data && result.data.response) {
            setText(ID_GENERATED_CODE, result.data.response);
            show(ID_CODE_DISPLAY_AREA);
            showNotification('Kode event berhasil digenerate!', 'is-success');
        } else {
            const errorMessage = (result.data && result.data.response) ? result.data.response : 'Gagal generate code. Pastikan Anda adalah owner.';
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
        removeClass(copyBtnElement, 'is-info');
        addClass(copyBtnElement, 'is-success');
        showNotification('Kode berhasil disalin ke clipboard!', 'is-success');

        setTimeout(() => {
            setText(ID_COPY_BTN, originalText);
            removeClass(copyBtnElement, 'is-success');
            addClass(copyBtnElement, 'is-info');
        }, 2000);
    }).catch(err => {
        console.error('Error copying code: ', err);
        showNotification('Gagal menyalin kode. Silakan coba salin secara manual.', 'is-danger');
    });
}

function showNotification(message, type) {
    const notificationAreaElement = document.getElementById(ID_NOTIFICATION_AREA);
    
    setText(ID_NOTIFICATION_MESSAGE, message);

    // Remove existing type classes
    notificationAreaElement.classList.remove('is-success', 'is-danger', 'is-warning', 'is-info');
    // Add new type class
    addClass(notificationAreaElement, type);

    show(ID_NOTIFICATION_AREA);

    // Auto hide after 5 seconds
    setTimeout(() => {
        hide(ID_NOTIFICATION_AREA);
    }, 5000);
}