// Capacitor-compatible app.js with server integration

// Global state
let serverInfo = null;
let currentRemoteServer = null;
let isServerActive = false;
const API_BASE = window.API_BASE_URL || '';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initUpload();
    initConnect();
    initScan();
    initShareButton();
    
    // Start local server if in Capacitor
    if (window.location.protocol === 'http:' && window.location.hostname === 'localhost') {
        initLocalServer();
    }
    
    loadServerInfo();
    loadFiles();
});

// Initialize local Node.js server within app
async function initLocalServer() {
    // Note: For production, you'll need to bundle the Node.js server with the app
    // using something like nodejs-mobile-cordova or run it as a separate service
    console.log('Running in Capacitor mode');
}

// All API calls now use API_BASE prefix
async function loadServerInfo() {
    try {
        const response = await fetch(`${API_BASE}/api/info`);
        serverInfo = await response.json();
        document.getElementById('ipAddress').textContent = `${serverInfo.ip}:${serverInfo.port}`;
        
        const shareUrl = `http://${serverInfo.ip}:${serverInfo.port}`;
        document.getElementById('shareUrl').value = shareUrl;
    } catch (error) {
        showToast('Failed to load server info', 'error');
    }
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
            loadFiles();
        }
    } catch (error) {
        showToast('Failed to toggle sharing', 'error');
    }
}

// Rest of the functions remain the same but with API_BASE prefix...
// (Copy all functions from original app.js and add API_BASE to fetch calls)
