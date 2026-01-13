// Global state
let serverInfo = null;
let currentRemoteServer = null;
let isServerActive = false;
let nodejsMobile = null;
let API_BASE = ''; // Will be set based on environment

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOM LOADED ===');
    console.log('Location:', window.location.href);
    console.log('User agent:', navigator.userAgent);
    console.log('Cordova:', typeof cordova);
    console.log('Window.nodejs:', typeof window.nodejs);
    
    // Check if we're in Capacitor/Cordova environment
    const isMobile = window.location.protocol === 'capacitor:' || 
                     (window.location.hostname === 'localhost' && navigator.userAgent.indexOf('Android') > -1);
    
    console.log('Is mobile app:', isMobile);
    console.log('Cordova defined:', typeof cordova !== 'undefined');
    
    if (isMobile) {
        console.log('Mobile environment detected, waiting for deviceready...');
        let readyFired = false;
        
        document.addEventListener('deviceready', () => {
            if (!readyFired) {
                readyFired = true;
                console.log('deviceready event fired!');
                initMobileApp();
            }
        }, false);
        
        // Fallback in case deviceready doesn't fire
        setTimeout(() => {
            if (!readyFired) {
                console.warn('deviceready timeout, attempting init anyway...');
                readyFired = true;
                initMobileApp();
            }
        }, 3000);
    } else {
        console.log('Running in web mode');
        initWebApp();
    }
});

// Initialize mobile app with Node.js server
function initMobileApp() {
    console.log('=== MOBILE APP INIT ===');
    console.log('Running in mobile app mode');
    console.log('window.nodejs available:', typeof window.nodejs !== 'undefined');
    console.log('nodejs available:', typeof nodejs !== 'undefined');
    
    if (typeof nodejs !== 'undefined') {
        console.log('nodejs object:', nodejs);
        console.log('nodejs.start:', typeof nodejs.start);
        console.log('nodejs.channel:', typeof nodejs.channel);
    }
    
    // Set API base URL for mobile
    API_BASE = 'http://127.0.0.1:8000';
    console.log('API_BASE set to:', API_BASE);
    
    // Initialize UI first so user sees something
    initWebApp();
    
    // Start Node.js server
    if (typeof nodejs !== 'undefined' && nodejs.start) {
        console.log('Starting nodejs-mobile...');
        console.log('nodejs.start is a function:', typeof nodejs.start === 'function');
        
        // Listen for messages from Node.js first
        try {
            nodejs.channel.setListener((msg) => {
                console.log('=== Message from Node.js ===');
                console.log('Raw message:', msg);
                try {
                    const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
                    console.log('Parsed data:', data);
                    if (data.type === 'server-ready') {
                        console.log(`✓ Server started on port ${data.port}`);
                        showToast('Server ready!', 'success');
                        isServerActive = false;
                        loadServerInfo();
                    }
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            });
        } catch (e) {
            console.error('Failed to set channel listener:', e);
        }
        
        // Start the server
        console.log('Calling nodejs.start("main.js")...');
        try {
            nodejs.start('main.js', (err) => {
                console.log('===nodejs.start() callback===');
                console.log('err:', err);
                console.log('err type:', typeof err);
                
                if (err) {
                    console.error('START ERROR:', err);
                    console.error('Error message:', err.message || String(err));
                    showToast('Server failed: ' + (err.message || String(err)), 'error');
                } else {
                    console.log('nodejs.start() SUCCESS - no error');
                    showToast('Starting server...', 'success');
                    
                    // Server takes ~30 seconds to start, so poll until it's ready
                    let attempts = 0;
                    const maxAttempts = 40; // 40 attempts = up to 40 seconds
                    
                    const checkServer = () => {
                        attempts++;
                        console.log(`Checking server... attempt ${attempts}/${maxAttempts}`);
                        
                        fetch(`${API_BASE}/api/info`)
                            .then(r => r.json())
                            .then(data => {
                                console.log('✓ Server is running:', data);
                                showToast('Server ready!', 'success');
                                loadServerInfo();
                            })
                            .catch(e => {
                                if (attempts < maxAttempts) {
                                    console.log(`Retrying in 1 second... (${attempts}/${maxAttempts})`);
                                    setTimeout(checkServer, 1000);
                                } else {
                                    console.error('✗ Server failed to start after 40 seconds');
                                    showToast('Server startup timeout', 'error');
                                }
                            });
                    };
                    
                    // Start checking after 5 seconds
                    setTimeout(checkServer, 5000);
                }
            });
        } catch (e) {
            console.error('Exception during nodejs.start():', e);
            showToast('Failed to start: ' + e.message, 'error');
        }
    } else {
        console.error('nodejs-mobile not available!');
        console.log('typeof nodejs:', typeof nodejs);
        if (typeof nodejs !== 'undefined') {
            console.log('nodejs object exists but start method missing');
            console.log('nodejs keys:', Object.keys(nodejs));
        }
        showToast('nodejs-mobile plugin not loaded', 'error');
    }
}

// Initialize web app
function initWebApp() {
    console.log('=== WEB APP INIT ===');
    console.log('API_BASE:', API_BASE);
    initTabs();
    initUpload();
    initConnect();
    initScan();
    initShareButton();
    loadServerInfo();
    loadFiles();
}

// Tab Navigation
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });
}

// Share Button Control
function initShareButton() {
    const shareBtn = document.getElementById('shareBtn');
    const copyBtn = document.getElementById('copyUrlBtn');
    const refreshLogsBtn = document.getElementById('refreshLogs');
    
    shareBtn.addEventListener('click', toggleSharing);
    copyBtn.addEventListener('click', copyShareUrl);
    refreshLogsBtn.addEventListener('click', loadLogs);
}

async function toggleSharing() {
    try {
        const response = await fetch(`${API_BASE}/api/toggle-server`, {
            method: 'POST'
        });
        const result = await response.json();
        
        isServerActive = result.isActive;
        updateShareButton(isServerActive);
        
        if (isServerActive) {
            showToast('✅ Sharing started! Files are accessible on your network.', 'success');
            loadLogs();
        } else {
            showToast('🛑 Sharing stopped. Files removed from server.', 'success');
            // Reload to show files are cleared
            loadFiles();
        }
    } catch (error) {
        showToast('Failed to toggle sharing', 'error');
    }
}

function updateShareButton(active) {
    const shareBtn = document.getElementById('shareBtn');
    const shareUrlDisplay = document.getElementById('shareUrlDisplay');
    const logsSection = document.querySelector('.logs-section');
    
    if (active) {
        shareBtn.className = 'btn-share-large active';
        shareBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <div>
                <div class="btn-title">Stop Sharing</div>
                <div class="btn-subtitle">Files will be removed from server</div>
            </div>
        `;
        if (shareUrlDisplay) shareUrlDisplay.style.display = 'block';
        if (logsSection) logsSection.style.display = 'block';
    } else {
        shareBtn.className = 'btn-share-large inactive';
        shareBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <div>
                <div class="btn-title">Start Sharing</div>
                <div class="btn-subtitle">Make files accessible to other devices</div>
            </div>
        `;
        if (shareUrlDisplay) shareUrlDisplay.style.display = 'none';
        if (logsSection) logsSection.style.display = 'none';
    }
}

function copyShareUrl() {
    const urlInput = document.getElementById('shareUrl');
    urlInput.select();
    document.execCommand('copy');
    showToast('URL copied to clipboard!', 'success');
}

// Load server info
async function loadServerInfo() {
    console.log('=== Loading Server Info ===');
    console.log('API_BASE:', API_BASE);
    const url = `${API_BASE}/api/info`;
    console.log('Fetching:', url);
    
    try {
        const response = await fetch(url);
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        serverInfo = await response.json();
        console.log('Server info loaded:', serverInfo);
        
        document.getElementById('ipAddress').textContent = `${serverInfo.ip}:${serverInfo.port}`;
        
        // Update share URL
        const shareUrl = `http://${serverInfo.ip}:${serverInfo.port}`;
        document.getElementById('shareUrl').value = shareUrl;
        console.log('UI updated with server info');
    } catch (error) {
        console.error('Failed to load server info:', error);
        console.error('Error details:', error.message);
        document.getElementById('ipAddress').textContent = 'Server not started';
        showToast('Waiting for server...', 'error');
    }
}

// Upload functionality
function initUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const refreshBtn = document.getElementById('refreshFiles');
    const downloadAllBtn = document.getElementById('downloadAllBtn');

    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    // Refresh files
    refreshBtn.addEventListener('click', loadFiles);
    
    // Download all files
    downloadAllBtn.addEventListener('click', downloadAllFiles);
}

// Handle file uploads
async function handleFiles(files) {
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE}/api/upload`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (response.ok) {
                showToast(`${file.name} uploaded successfully`, 'success');
                loadFiles();
            } else {
                showToast(result.error || 'Upload failed', 'error');
            }
        } catch (error) {
            showToast(`Failed to upload ${file.name}`, 'error');
        }
    }
}

// Load connection logs
async function loadLogs() {
    if (!isServerActive) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/logs`);
        const logs = await response.json();
        
        const logsList = document.getElementById('logsList');
        
        if (logs.length === 0) {
            logsList.innerHTML = '<div class="empty-state"><p>No connections yet</p></div>';
            return;
        }
        
        logsList.innerHTML = logs.map(log => {
            const time = formatLogTime(log.timestamp);
            const methodClass = log.method.toLowerCase();
            return `
                <div class="log-item ${methodClass}">
                    <div class="log-details">
                        <div class="log-ip">${log.ip}</div>
                        <div class="log-action">
                            <span class="log-method">${log.method}</span>
                            <span class="log-path">${log.path}</span>
                        </div>
                    </div>
                    <div class="log-time">${time}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to load logs:', error);
    }
}

function formatLogTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

// Load files list
async function loadFiles() {
    try {
        const response = await fetch(`${API_BASE}/api/files`);
        const files = await response.json();
        
        const filesList = document.getElementById('filesList');
        const sharingControl = document.getElementById('sharingControl');
        const fileCount = document.getElementById('fileCount');
        const logsSection = document.querySelector('.logs-section');
        const downloadAllBtn = document.getElementById('downloadAllBtn');
        
        // Show/hide download all button
        if (files.length > 1 && downloadAllBtn) {
            downloadAllBtn.style.display = 'flex';
        } else if (downloadAllBtn) {
            downloadAllBtn.style.display = 'none';
        }
        
        // Show sharing control if files exist
        if (files.length > 0) {
            sharingControl.style.display = 'block';
            fileCount.textContent = files.length;
            // Update button state based on server status
            updateShareButton(isServerActive);
        } else {
            sharingControl.style.display = 'none';
            if (logsSection) logsSection.style.display = 'none';
        }
        
        if (files.length === 0) {
            filesList.innerHTML = '<div class="empty-state"><p>No files shared yet</p></div>';
            return;
        }

        filesList.innerHTML = files.map(file => `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-icon">${getFileExtension(file.name)}</div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <div class="file-meta">${formatBytes(file.size)} • ${formatDate(file.modified)}</div>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn-icon download" onclick="downloadFile('${file.url}', '${file.name}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                    </button>
                    <button class="btn-icon delete" onclick="deleteFile('${file.name}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showToast('Failed to load files', 'error');
    }
}

// Delete file
async function deleteFile(filename) {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
        const response = await fetch(`${API_BASE}/api/files/${filename}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('File deleted', 'success');
            loadFiles();
        } else {
            showToast('Failed to delete file', 'error');
        }
    } catch (error) {
        showToast('Failed to delete file', 'error');
    }
}

// Download file
function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Download started', 'success');
}

// Download all files as ZIP
function downloadAllFiles() {
    const a = document.createElement('a');
    a.href = `${API_BASE}/api/download-all`;
    a.download = 'PyShare-files.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Downloading all files as ZIP...', 'success');
}

// Connect to remote server
function initConnect() {
    const connectBtn = document.getElementById('connectBtn');
    const downloadAllRemoteBtn = document.getElementById('downloadAllRemoteBtn');
    
    connectBtn.addEventListener('click', async () => {
        const ip = document.getElementById('remoteIP').value.trim();
        const port = document.getElementById('remotePort').value.trim();
        
        if (!ip) {
            showToast('Please enter an IP address', 'error');
            return;
        }

        const serverUrl = `http://${ip}:${port}`;
        
        // Open in external browser using Capacitor Browser API
        console.log('Opening server in browser:', serverUrl);
        showToast('Opening browser...', 'success');
        
        try {
            const { Browser } = Capacitor.Plugins;
            await Browser.open({ url: serverUrl });
        } catch (error) {
            console.error('Error opening browser:', error);
            // Fallback to window.open
            window.open(serverUrl, '_blank');
        }
    });
    
    downloadAllRemoteBtn.addEventListener('click', () => {
        if (currentRemoteServer) {
            const a = document.createElement('a');
            a.href = `${currentRemoteServer}/api/download-all`;
            a.download = 'PyShare-remote-files.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('Downloading all remote files as ZIP...', 'success');
        }
    });
}

// Load remote files
async function loadRemoteFiles() {
    if (!currentRemoteServer) return;

    const remoteFilesList = document.getElementById('remoteFilesList');
    const remoteStatus = document.getElementById('remoteStatus');
    
    remoteStatus.textContent = 'Connecting...';
    console.log('Attempting to connect to:', currentRemoteServer);

    try {
        // Try API endpoint first (for advanced servers)
        console.log('Trying API:', `${currentRemoteServer}/api/files`);
        let response = await fetch(`${currentRemoteServer}/api/files`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        let files = [];
        let hasApiEndpoint = false;
        
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
            // Server has API endpoints
            console.log('API endpoint found');
            files = await response.json();
            hasApiEndpoint = true;
        } else {
            // Fallback: Parse Python's http.server HTML directory listing
            console.log('No API, trying HTML directory listing');
            response = await fetch(currentRemoteServer);
            const html = await response.text();
            console.log('HTML received, length:', html.length);
            files = await parseDirectoryListing(html, currentRemoteServer);
            hasApiEndpoint = false;
        }
        
        console.log('Received files:', files.length);
        console.log('Files:', files);
        const downloadAllRemoteBtn = document.getElementById('downloadAllRemoteBtn');
        
        remoteStatus.textContent = `Connected to ${currentRemoteServer}`;
        
        // Only show download all button if server has API endpoint
        if (files.length > 1 && hasApiEndpoint && downloadAllRemoteBtn) {
            downloadAllRemoteBtn.style.display = 'flex';
        } else if (downloadAllRemoteBtn) {
            downloadAllRemoteBtn.style.display = 'none';
        }

        if (files.length === 0) {
            remoteFilesList.innerHTML = '<div class="empty-state"><p>No files available on this device</p></div>';
            return;
        }

        remoteFilesList.innerHTML = files.map(file => {
            const escapedUrl = currentRemoteServer + file.url;
            const escapedName = file.name.replace(/'/g, "\\'");
            return `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-icon">${getFileExtension(file.name)}</div>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <div class="file-meta">${formatBytes(file.size)}${file.size > 0 ? ' • ' : ''}${formatDate(file.modified)}</div>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn-icon download" onclick="downloadRemoteFile('${escapedUrl}', '${escapedName}')" title="Download ${file.name}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                    </button>
                </div>
            </div>
            `;
        }).join('');

        showToast('Connected successfully', 'success');
    } catch (error) {
        console.error('Connection error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        remoteStatus.textContent = `Failed: ${error.message}`;
        remoteFilesList.innerHTML = `<div class="empty-state"><p>Connection failed: ${error.message}</p><p style="margin-top: 10px; font-size: 0.9em;">Make sure the device is on the same network and PyShare is running with sharing enabled.</p></div>`;
        showToast(`Connection failed: ${error.message}`, 'error');
    }
}

// Download remote file
function downloadRemoteFile(url, filename) {
    try {
        console.log('Opening file in browser:', filename, url);
        
        // Simply open the URL in the default browser
        // The browser will handle the download with Content-Disposition header
        window.location.href = url;
        
        showToast('Opening ' + filename + ' in browser...', 'success');
    } catch (error) {
        console.error('Error opening file:', error);
        showToast('Failed to open: ' + error.message, 'error');
    }
}

// Parse Python http.server directory listing HTML
async function parseDirectoryListing(html, baseUrl) {
    const files = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    console.log('Parsing directory listing...');
    console.log('HTML sample:', html.substring(0, 500));
    
    // Python's http.server uses <a> tags for file links
    const links = doc.querySelectorAll('a');
    console.log('Found links:', links.length);
    
    // Also try to parse from <ul> or <pre> tags which Python uses
    const listItems = doc.querySelectorAll('li, tr');
    console.log('Found list items:', listItems.length);
    
    // Process links and get file sizes
    const filePromises = Array.from(links).map(async (link, index) => {
        const href = link.getAttribute('href');
        const text = link.textContent.trim();
        
        // Skip parent directory, directories, and query strings
        if (!href || href === '../' || href.endsWith('/') || href.startsWith('?')) {
            console.log(`Skipping link ${index}:`, {href, text});
            return null;
        }
        
        console.log(`Processing link ${index}:`, {href, text});
        
        // Decode URL-encoded filenames
        let filename = decodeURIComponent(href.split('?')[0]); // Remove query params
        
        // Get file size from surrounding text
        let size = 0;
        const parent = link.parentElement;
        if (parent) {
            const parentText = parent.textContent;
            console.log('Full parent text:', parentText);
            
            // Remove the filename from the text to isolate size info
            const textAfterLink = parentText.substring(parentText.indexOf(text) + text.length);
            console.log('Text after link:', textAfterLink);
            
            // Check siblings (for table structures or adjacent elements)
            let sibling = link.nextSibling;
            let siblingAttempts = 0;
            while (sibling && siblingAttempts < 5) {
                const siblingText = sibling.textContent || sibling.nodeValue || '';
                console.log(`Sibling ${siblingAttempts}:`, siblingText.trim());
                
                // Try to find size in sibling
                const sizeMatch = siblingText.match(/(\d+(?:\.\d+)?)\s*(bytes?|KB|MB|GB|K|M|G|B)?\b/i);
                if (sizeMatch && sizeMatch[1]) {
                    let sizeValue = parseFloat(sizeMatch[1]);
                    const unit = sizeMatch[2] ? sizeMatch[2].toUpperCase() : 'B';
                    
                    if (unit.startsWith('K')) sizeValue *= 1024;
                    else if (unit.startsWith('M')) sizeValue *= 1024 * 1024;
                    else if (unit.startsWith('G')) sizeValue *= 1024 * 1024 * 1024;
                    
                    // Only accept if it looks like a reasonable file size (not a date/time)
                    if (sizeValue > 10 || unit !== 'B') {
                        size = Math.round(sizeValue);
                        console.log('Found size in sibling:', size, 'bytes');
                        break;
                    }
                }
                
                sibling = sibling.nextSibling;
                siblingAttempts++;
            }
            
            // Try text after link
            if (size === 0 && textAfterLink) {
                const patterns = [
                    /\s+(\d+)\s*$/,
                    /(\d+(?:\.\d+)?)\s*(bytes?|KB|MB|GB|K|M|G|B)\b/i,
                    /\d{2}[-:]\d{2}\s+(\d+)/,
                    /\s+(\d+)\s+/
                ];
                
                for (const pattern of patterns) {
                    const sizeMatch = textAfterLink.match(pattern);
                    if (sizeMatch) {
                        let sizeValue = parseFloat(sizeMatch[1]);
                        const unit = sizeMatch[2] ? sizeMatch[2].toUpperCase() : 'B';
                        
                        if (unit.startsWith('K')) sizeValue *= 1024;
                        else if (unit.startsWith('M')) sizeValue *= 1024 * 1024;
                        else if (unit.startsWith('G')) sizeValue *= 1024 * 1024 * 1024;
                        
                        size = Math.round(sizeValue);
                        console.log('Parsed size from text:', size, 'bytes');
                        break;
                    }
                }
            }
        }
        
        // If still no size, make HEAD request to get actual file size
        if (size === 0) {
            try {
                console.log('Making HEAD request for:', filename);
                const headResponse = await fetch(`${baseUrl}/${encodeURIComponent(filename)}`, {
                    method: 'HEAD',
                    mode: 'cors'
                });
                const contentLength = headResponse.headers.get('content-length');
                if (contentLength) {
                    size = parseInt(contentLength);
                    console.log('Got size from HEAD request:', size, 'bytes');
                }
            } catch (e) {
                console.error('HEAD request failed:', e);
            }
        }
        
        console.log('Final file:', filename, 'size:', size, 'bytes');
        
        return {
            name: filename,
            size: size,
            modified: Date.now(),
            url: `/${encodeURIComponent(filename)}`
        };
    });
    
    // Wait for all file processing to complete
    const processedFiles = await Promise.all(filePromises);
    
    // Filter out null values (skipped links)
    processedFiles.forEach(file => {
        if (file) files.push(file);
    });
    
    console.log('Total files found:', files.length);
    if (files.length === 0) {
        console.warn('No files parsed. HTML content:', html.substring(0, 1000));
    }
    return files;
}

// Network scan
function initScan() {
    const scanBtn = document.getElementById('scanBtn');
    
    scanBtn.addEventListener('click', async () => {
        if (!serverInfo) {
            showToast('Server info not loaded', 'error');
            return;
        }

        showToast('Network scan feature coming soon!', 'success');
        
        // Mock devices for demonstration
        const devicesList = document.getElementById('devicesList');
        const mockDevices = [
            { hostname: serverInfo.hostname, ip: serverInfo.ip, port: serverInfo.port }
        ];

        devicesList.innerHTML = mockDevices.map(device => `
            <div class="device-card" onclick="connectToDevice('${device.ip}', ${device.port})">
                <h3>📱 ${device.hostname}</h3>
                <p>${device.ip}:${device.port}</p>
            </div>
        `).join('');
    });
}

// Connect to device from scan
function connectToDevice(ip, port) {
    document.getElementById('remoteIP').value = ip;
    document.getElementById('remotePort').value = port;
    
    // Switch to receive tab
    document.querySelector('[data-tab="receive"]').click();
    
    // Auto connect
    setTimeout(() => {
        document.getElementById('connectBtn').click();
    }, 300);
}

// Utility functions
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
}

function getFileExtension(filename) {
    const ext = filename.split('.').pop().toUpperCase();
    return ext.length > 4 ? ext.substring(0, 4) : ext;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Copy to clipboard function
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Command copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback for clipboard API failure
            fallbackCopy(text);
        });
    } else {
        // Fallback for older browsers
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showToast('Command copied to clipboard!', 'success');
    } catch (err) {
        showToast('Failed to copy. Please copy manually.', 'error');
    }
    
    document.body.removeChild(textarea);
}
