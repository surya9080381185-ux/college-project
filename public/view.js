document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('grid');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    // Get Album ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const albumId = urlParams.get('id');

    if (!albumId) {
        showError('No album ID provided.');
        return;
    }

    fetchImages(albumId);

    async function fetchImages(id, password = null) {
        try {
            let url = `/api/album/${id}`;
            if (password) {
                url += `?password=${encodeURIComponent(password)}`;
            }

            const response = await fetch(url);

            if (response.status === 403 || response.status === 401) {
                const data = await response.json();
                if (data.locked) {
                    showPasswordModal(id, data.error);
                    return;
                }
            }

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Album not found.');
                }
                throw new Error('Failed to load images.');
            }

            const data = await response.json();

            if (!data.images || data.images.length === 0) {
                showError('No images found in this album.');
                return;
            }

            // Hide modal if open
            document.getElementById('passwordModal').style.display = 'none';
            renderGallery(data.images);

        } catch (err) {
            showError(err.message);
        } finally {
            if (!document.getElementById('passwordModal').style.display || document.getElementById('passwordModal').style.display === 'none') {
                loading.style.display = 'none';
            }
        }
    }

    function showPasswordModal(id, errorMsg) {
        const modal = document.getElementById('passwordModal');
        const submitBtn = document.getElementById('submitPasswordBtn');
        const input = document.getElementById('modalPasswordInput');
        const errorText = document.getElementById('passwordError');

        modal.style.display = 'flex';
        loading.style.display = 'none';

        if (errorMsg && errorMsg !== 'Password required') {
            errorText.textContent = errorMsg;
            errorText.style.display = 'block';
        } else {
            errorText.style.display = 'none';
        }

        // Clear previous event listeners to avoid duplicates
        const newBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newBtn, submitBtn);

        newBtn.addEventListener('click', () => {
            const password = input.value.trim();
            if (password) {
                loading.style.display = 'block';
                fetchImages(id, password);
            }
        });

        // Also submit on Enter
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                newBtn.click();
            }
        };
    }

    function renderGallery(images) {
        images.forEach(imgUrl => {
            const item = document.createElement('div');
            item.className = 'grid-item';

            // High Quality Badge
            const badge = document.createElement('div');
            badge.className = 'hq-badge';
            badge.innerHTML = '<span class="badge-icon">✨</span> ORIGINAL HQ';
            item.appendChild(badge);

            const img = document.createElement('img');
            img.src = imgUrl;
            img.loading = 'lazy';
            img.alt = 'Uploaded image';

            // Allow clicking to view full size (optional simple implementation)
            img.onclick = () => window.open(imgUrl, '_blank');
            img.style.cursor = 'pointer';

            const info = document.createElement('div');
            info.className = 'item-info';

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-btn';
            downloadBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download Original
            `;
            downloadBtn.onclick = (e) => {
                e.stopPropagation();
                downloadImage(imgUrl);
            };

            info.appendChild(downloadBtn);
            item.appendChild(img);
            item.appendChild(info);
            grid.appendChild(item);
        });
    }

    async function downloadImage(url) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            // Extract filename from URL
            const filename = url.split('/').pop();
            link.download = filename || 'image.jpg';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up the blob URL
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download image. Please try again.');
        }
    }

    function showError(msg) {
        loading.style.display = 'none';
        errorDiv.textContent = msg;
        errorDiv.style.display = 'block';
    }
});
