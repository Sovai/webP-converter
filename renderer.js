class WebPConverter {
    constructor() {
        this.config = {
            quality: 100,
            compressionType: 'lossless',
            effort: 6,
            alphaQuality: true,
            smartSubsample: true,
            autoCleanup: true
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupConfigListeners();
        this.setupNotifications();
        this.loadConvertedImages();
    }

    setupNotifications() {
        const notificationClose = document.getElementById('notificationClose');
        notificationClose.addEventListener('click', () => {
            this.hideNotification();
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const messageEl = document.getElementById('notificationMessage');

        notification.className = `notification ${type}`;
        messageEl.textContent = message;
        notification.classList.add('show');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    hideNotification() {
        const notification = document.getElementById('notification');
        notification.classList.remove('show');
    }

    setupConfigListeners() {
        const qualityInput = document.getElementById('qualityInput');
        const qualityValue = document.getElementById('qualityValue');
        const compressionType = document.getElementById('compressionType');
        const effort = document.getElementById('effort');
        const alphaQuality = document.getElementById('alphaQuality');
        const smartSubsample = document.getElementById('smartSubsample');

        // Quality slider
        qualityInput.addEventListener('input', (e) => {
            this.config.quality = parseInt(e.target.value);
            qualityValue.textContent = this.config.quality;
        });

        // Compression type
        compressionType.addEventListener('change', (e) => {
            this.config.compressionType = e.target.value;
            // Auto-adjust quality for lossless
            if (e.target.value === 'lossless') {
                qualityInput.value = 100;
                qualityInput.disabled = true;
                this.config.quality = 100;
                qualityValue.textContent = '100 (lossless)';
            } else {
                qualityInput.disabled = false;
                qualityValue.textContent = this.config.quality;
            }
        });

        // Set initial state for lossless
        if (this.config.compressionType === 'lossless') {
            qualityInput.disabled = true;
            qualityValue.textContent = '100 (lossless)';
        }

        // Other settings
        effort.addEventListener('change', (e) => {
            this.config.effort = parseInt(e.target.value);
        });

        alphaQuality.addEventListener('change', (e) => {
            this.config.alphaQuality = e.target.checked;
        });

        smartSubsample.addEventListener('change', (e) => {
            this.config.smartSubsample = e.target.checked;
        });
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const openFolderBtn = document.getElementById('openFolderBtn');

        let dragCounter = 0; // Track drag events to handle enter/leave properly

        // Upload area click
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Drag and drop events
        uploadArea.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                uploadArea.classList.remove('dragover');
            }
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // Open folder button
        openFolderBtn.addEventListener('click', () => {
            window.electronAPI.openOutputFolder();
        });

        // Prevent default drag behaviors on document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    async handleFiles(files) {
        console.log('handleFiles called with:', files);
        const fileArray = Array.from(files);
        console.log('File array:', fileArray);

        const imageFiles = fileArray.filter(file =>
            file.type.startsWith('image/') && !file.type.includes('webp')
        );

        console.log('Filtered image files:', imageFiles);

        if (imageFiles.length === 0) {
            this.showNotification('Please select valid image files (excluding WebP files).', 'error');
            return;
        }

        // Check if we can access file paths directly
        const filePaths = imageFiles.map(file => file.path).filter(Boolean);

        this.showProgress();

        try {
            console.log('Sending to conversion with config:', this.config);

            if (filePaths.length === imageFiles.length) {
                // We have file paths, use the direct method
                console.log('Using file paths:', filePaths);
                const results = await window.electronAPI.convertImages(filePaths, this.config);
                this.hideProgress();
                this.handleConversionResults(results);
            } else {
                // No file paths available, read files as buffers
                console.log('File paths not available, reading as buffers...');
                const fileData = await Promise.all(
                    imageFiles.map(async (file) => {
                        const buffer = await file.arrayBuffer();
                        return {
                            name: file.name,
                            buffer: buffer,
                            originalSize: file.size
                        };
                    })
                );

                const results = await window.electronAPI.convertImagesFromBuffer(fileData, this.config);
                this.hideProgress();
                this.handleConversionResults(results);
            }

            await this.loadConvertedImages();
        } catch (error) {
            this.hideProgress();
            console.error('Conversion error:', error);
            this.showNotification('An error occurred during conversion. Please try again.', 'error');
        }
    }

    showProgress() {
        const progressSection = document.getElementById('progressSection');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        progressSection.style.display = 'block';
        progressSection.scrollIntoView({ behavior: 'smooth' });

        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 90) {
                progress = 90;
                clearInterval(interval);
            }

            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }, 200);
    }

    hideProgress() {
        const progressSection = document.getElementById('progressSection');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        progressFill.style.width = '100%';
        progressText.textContent = '100%';

        setTimeout(() => {
            progressSection.style.display = 'none';
            progressFill.style.width = '0%';
            progressText.textContent = '0%';
        }, 500);
    }

    handleConversionResults(results) {
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.length - successCount;

        if (errorCount === 0) {
            this.showNotification(`Successfully converted ${successCount} image${successCount !== 1 ? 's' : ''} to WebP format.`, 'success');
        } else if (successCount === 0) {
            this.showNotification(`Failed to convert ${errorCount} image${errorCount !== 1 ? 's' : ''}. Check the console for details.`, 'error');
        } else {
            this.showNotification(`Converted ${successCount} image${successCount !== 1 ? 's' : ''} successfully, ${errorCount} failed.`, 'info');
        }
    }

    async loadConvertedImages() {
        try {
            const images = await window.electronAPI.getConvertedImages();
            this.displayConvertedImages(images);
        } catch (error) {
            console.error('Error loading converted images:', error);
        }
    }

    displayConvertedImages(images) {
        const resultsGrid = document.getElementById('resultsGrid');

        if (images.length === 0) {
            resultsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21,15 16,10 5,21"/>
                        </svg>
                    </div>
                    <h3>No converted images yet</h3>
                    <p>Drop some images above to get started!</p>
                </div>
            `;
            return;
        }

        resultsGrid.innerHTML = images.map(image => `
            <div class="result-item">
                <div class="result-header">
                    <div class="result-info">
                        <h4>${this.truncateFilename(image.name, 25)}</h4>
                        <div class="file-format">WebP</div>
                    </div>
                    <button class="delete-btn" onclick="converter.deleteImage('${image.path}')">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/>
                        </svg>
                    </button>
                </div>
                <div class="file-stats">
                    <div class="stat-item">
                        <div class="stat-label">Orig</div>
                        <div class="stat-value">${image.originalSize ? this.formatFileSize(image.originalSize) : '?'}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">WebP</div>
                        <div class="stat-value">${this.formatFileSize(image.size)}</div>
                    </div>
                </div>
                ${image.originalSize ? `<div class="savings-info">${this.getSavingsBadge(image.originalSize, image.size)}</div>` : ''}
                <div class="result-meta">
                    <span class="file-date">${this.formatDateShort(image.created)}</span>
                </div>
            </div>
        `).join('');
    }

    async deleteImage(filePath) {
        if (!confirm('Are you sure you want to delete this image?')) {
            return;
        }

        try {
            const result = await window.electronAPI.deleteConvertedImage(filePath);
            if (result.success) {
                await this.loadConvertedImages();
                this.showNotification('Image deleted successfully.', 'success');
            } else {
                this.showNotification('Failed to delete the image: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            this.showNotification('An error occurred while deleting the image.', 'error');
        }
    }

    getSavingsBadge(originalSize, newSize) {
        const savings = ((originalSize - newSize) / originalSize) * 100;
        const isNegative = savings < 0;
        const badgeClass = isNegative ? 'savings-badge negative' : 'savings-badge';
        const sign = isNegative ? '+' : '-';
        return `<div class="${badgeClass}">${sign}${Math.abs(savings).toFixed(1)}%</div>`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(date) {
        return new Date(date).toLocaleString();
    }

    formatDateShort(date) {
        return new Date(date).toLocaleDateString();
    }

    truncateFilename(filename, maxLength) {
        if (filename.length <= maxLength) return filename;
        const ext = filename.substring(filename.lastIndexOf('.'));
        const name = filename.substring(0, filename.lastIndexOf('.'));
        const truncated = name.substring(0, maxLength - ext.length - 3) + '...';
        return truncated + ext;
    }
}

// Initialize the converter when the page loads
const converter = new WebPConverter();
