// Intro Overlay Logic
document.addEventListener('DOMContentLoaded', () => {
    const introOverlay = document.getElementById('intro-overlay');
    if (introOverlay) {
        setTimeout(() => {
            introOverlay.classList.add('fade-out');
            setTimeout(() => {
                introOverlay.style.display = 'none';
            }, 800); // Wait for fade-out transition
        }, 2200); // 2.2s display time (adjusted for better flow)
    }
});

const fileInput = document.getElementById('fileInput');
const dropArea = document.getElementById('dropArea');
const fileNameDisplay = document.getElementById('fileName');
const uploadForm = document.getElementById('uploadForm');
const textForm = document.getElementById('textForm'); // New form
const textInput = document.getElementById('textInput'); // New input
const resultSection = document.getElementById('resultSection');
const qrImage = document.getElementById('qrImage');
const downloadLink = document.getElementById('downloadLink');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('errorMsg');
const resetBtn = document.getElementById('resetBtn');

// Tab Switching Logic
const tabs = document.querySelectorAll('.tab-btn');
const imageMode = document.getElementById('imageMode');
const textMode = document.getElementById('textMode');
let currentMode = 'image';

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Update active tab UI
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Show/Hide sections
        const mode = tab.dataset.tab;
        currentMode = mode;
        if (mode === 'image') {
            imageMode.style.display = 'block';
            textMode.style.display = 'none';
        } else {
            imageMode.style.display = 'none';
            textMode.style.display = 'block';
        }
    });
});


// Drag and drop effects
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    dropArea.classList.add('dragover');
}

function unhighlight(e) {
    dropArea.classList.remove('dragover');
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

fileInput.addEventListener('change', function () {
    handleFiles(this.files);
});

function handleFiles(files) {
    if (files.length > 0) {
        // Validate all files
        let validFiles = [];
        for (let i = 0; i < files.length; i++) {
            if (validateFile(files[i])) {
                validFiles.push(files[i]);
            }
        }

        if (validFiles.length > 0) {
            if (validFiles.length === 1) {
                fileNameDisplay.textContent = validFiles[0].name;
            } else {
                fileNameDisplay.textContent = `${validFiles.length} files selected`;
            }
        }
    }
}

function validateFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showError(`File "${file.name}" is not a valid image. Skipping.`);
        return false;
    }
    errorMsg.classList.add('hidden');
    return true;
}

// ----- FORM SUBMISSION -----

// Image Upload
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const files = fileInput.files;
    if (!files || files.length === 0) {
        showError('No files selected.');
        return;
    }

    const formData = new FormData();
    const password = document.getElementById('passwordInput').value.trim();
    if (password) {
        formData.append('password', password);
    }

    for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
    }

    await handleGeneration('/upload', formData);
});

// Text/URL Generation
textForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    if (!text) {
        showError('Please enter some text or a URL.');
        return;
    }

    await handleGeneration('/generate', JSON.stringify({ text: text }), {
        'Content-Type': 'application/json'
    });
});

async function handleGeneration(url, body, headers = {}) {
    showLoading(true);
    resetUI();

    try {
        const options = {
            method: 'POST',
            body: body
        };

        if (Object.keys(headers).length > 0) {
            options.headers = headers;
        }

        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Generation failed');
        }

        console.log('Generated View URL:', data.viewUrl);

        displayResult(data.qrCode);

    } catch (error) {
        showError(error.message || 'An error occurred.');
    } finally {
        showLoading(false);
    }
}

function displayResult(qrCodeUrl) {
    qrImage.src = qrCodeUrl;
    downloadLink.href = qrCodeUrl;
    resultSection.classList.remove('hidden');
    document.querySelector('.input-container').style.display = 'none'; // Hide input during result
}

function showLoading(isLoading) {
    if (isLoading) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}

function resetUI() {
    resultSection.classList.add('hidden');
    errorMsg.classList.add('hidden');
}

resetBtn.addEventListener('click', () => {
    resetUI();
    fileInput.value = '';
    fileNameDisplay.textContent = '';
    textInput.value = '';
    textInput.value = '';
    document.getElementById('passwordInput').value = '';
    document.querySelector('.input-container').style.display = 'flex'; // Show input again
});
