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
        // Optional: clear the notification message and type if needed
        // setText(ID_NOTIFICATION_MESSAGE, '');
        // document.getElementById(ID_NOTIFICATION_AREA).classList.remove('is-success', 'is-danger', 'is-warning', 'is-info');
    });
}

async function handleGenerateCode() {
    const token = getCookie('login');
    const generateBtnElement = document.getElementById(ID_GENERATE_BTN);

    if (!token) {
        showNotification('Sesi Anda telah berakhir. Silakan login kembali.', 'is-danger');
        if (generateBtnElement) {
            generateBtnElement.disabled = true; // Ensure button is disabled
        }
        return;
    }

    generateBtnElement.disabled = true;
    addClass(generateBtnElement, 'is-loading');
    hide(ID_CODE_DISPLAY_AREA); // Hide previous code if any

    // More robust check for the backend configuration
    if (!(backend && backend.bimbingan && backend.bimbingan.generateEventCode)) {
        const errorMessage = 'Konfigurasi endpoint untuk generate code tidak ditemukan. Harap periksa file config.js dan pastikan backend.bimbingan.generateEventCode sudah benar.';
        console.error(errorMessage);
        showNotification(errorMessage, 'is-danger');
        generateBtnElement.disabled = false;
        removeClass(generateBtnElement, 'is-loading');
        return;
    }
    
    getJSON(backend.bimbingan.generateEventCode, 'login', token, (result) => {
        // CRITICAL FOR DEBUGGING: Log the entire result object from the backend
        console.log("Backend response for generateEventCode:", result);

        generateBtnElement.disabled = false;
        removeClass(generateBtnElement, 'is-loading');

        // Check HTTP status and the structure of data from your Go backend
        // Your Go backend (bimbinganevent.go) sends { Status: "...", Response: "..." } within result.data
        if (result.status === 200 && result.data && result.data.Status === "Success" && typeof result.data.Response === 'string') {
            setText(ID_GENERATED_CODE, result.data.Response); // result.data.Response should be the code string
            show(ID_CODE_DISPLAY_AREA);
            showNotification('Kode event berhasil digenerate!', 'is-success');
        } else {
            // Determine the error message
            let errorMessage = 'Gagal generate code. Silakan coba lagi.'; // Default error
            if (result.data && result.data.Response) { // If backend provided a specific error message in Response
                errorMessage = result.data.Response;
            } else if (result.data && result.data.Status) { // If backend provided a status message
                 errorMessage = result.data.Status;
            } else if (result.status !== 200) { // Network or HTTP error without specific backend message
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

    notificationAreaElement.classList.remove('is-success', 'is-danger', 'is-warning', 'is-info', 'is-hidden'); // Ensure is-hidden is removed before adding type
    addClass(notificationAreaElement, type); // Add the specified type (e.g., is-success)

    show(ID_NOTIFICATION_AREA); // Make it visible (jscroot show function should handle this)

    // Auto hide after 5 seconds
    const autoHideDelay = 5000;
    setTimeout(() => {
        // Check if the notification is still showing the same message and type before hiding,
        // to prevent hiding a newer notification. This is an advanced check, for now, simple hide is fine.
        hide(ID_NOTIFICATION_AREA);
    }, autoHideDelay);
}