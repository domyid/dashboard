import { getJSON } from "https://cdn.jsdelivr.net/gh/jscroot/api@0.0.7/croot.js";
import { getCookie } from "https://cdn.jsdelivr.net/gh/jscroot/cookie@0.0.1/croot.js";

// Backend URL - sesuaikan dengan konfigurasi Anda
const backend = {
    generateCode: 'https://asia-southeast2-awangga.cloudfunctions.net/domyid/api/event/generatecode'
};

// DOM Elements
const generateBtn = document.getElementById('generateBtn');
const codeContainer = document.getElementById('codeContainer');
const generatedCode = document.getElementById('generatedCode');
const copyBtn = document.getElementById('copyBtn');
const errorNotification = document.getElementById('errorNotification');
const errorMessage = document.getElementById('errorMessage');
const closeError = document.getElementById('closeError');

// Close error notification
closeError.addEventListener('click', () => {
    errorNotification.style.display = 'none';
});

// Generate code function
generateBtn.addEventListener('click', async () => {
    // Check if user is logged in
    const token = getCookie('login');
    if (!token) {
        showError('Anda harus login terlebih dahulu');
        return;
    }
    
    // Disable button while processing
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    
    try {
        getJSON(backend.generateCode, 'login', token, (result) => {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Code';
            
            if (result.status === 200) {
                // Show the generated code
                generatedCode.textContent = result.data.response;
                codeContainer.style.display = 'block';
                errorNotification.style.display = 'none';
            } else {
                // Show error
                showError(result.data.response || 'Gagal generate code');
            }
        });
    } catch (error) {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Code';
        showError('Terjadi kesalahan: ' + error.message);
    }
});

// Copy code function
copyBtn.addEventListener('click', () => {
    const code = generatedCode.textContent;
    
    // Copy to clipboard
    navigator.clipboard.writeText(code).then(() => {
        // Change button text temporarily
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.remove('is-info');
        copyBtn.classList.add('is-success');
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('is-success');
            copyBtn.classList.add('is-info');
        }, 2000);
    }).catch(err => {
        showError('Gagal menyalin kode: ' + err.message);
    });
});

// Show error function
function showError(message) {
    errorMessage.textContent = message;
    errorNotification.style.display = 'block';
    codeContainer.style.display = 'none';
}

// Check login on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = getCookie('login');
    if (!token) {
        generateBtn.disabled = true;
        showError('Silakan login terlebih dahulu untuk menggunakan fitur ini');
    }
});