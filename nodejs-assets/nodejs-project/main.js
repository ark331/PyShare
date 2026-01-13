// Log startup
console.log('========================================');
console.log('PyShare Node.js Mobile Server Starting...');
console.log('========================================');

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const archiver = require('archiver');

console.log('All modules loaded successfully');

const app = express();
const PORT = 8000;
console.log('Express app created, port:', PORT);

// Connection logs
let connectionLogs = [];
let isServerActive = false;

// Mobile-specific paths
const isMobile = true;
const uploadsDir = path.join(__dirname, 'shared_files');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Middleware - Configure CORS for mobile WebView
app.use(cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Additional CORS headers for all responses
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Connection logging middleware
app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/files/')) {
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const timestamp = new Date().toISOString();
        const log = {
            ip: clientIP,
            path: req.path,
            method: req.method,
            timestamp: timestamp,
            userAgent: req.headers['user-agent'] || 'Unknown'
        };
        connectionLogs.unshift(log);
        if (connectionLogs.length > 50) connectionLogs.pop();
        console.log(`[${timestamp}] ${clientIP} - ${req.method} ${req.path}`);
    }
    next();
});

app.use('/files', (req, res, next) => {
    const isLocalRequest = req.socket.remoteAddress === '::1' || 
                          req.socket.remoteAddress === '127.0.0.1' ||
                          req.socket.remoteAddress === '::ffff:127.0.0.1' ||
                          req.headers.referer;
    
    if (!isServerActive && !isLocalRequest) {
        return res.status(503).send('Sharing is currently inactive');
    }
    next();
}, express.static(uploadsDir));

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// Root route - Serve a simple file listing page
app.get('/', (req, res) => {
    const files = fs.readdirSync(uploadsDir).map(filename => {
        const stats = fs.statSync(path.join(uploadsDir, filename));
        return {
            name: filename,
            size: stats.size,
            url: `/files/${filename}`
        };
    });
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PyShare - Network File Sharing</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        header {
            text-align: center;
            padding: 40px 0;
        }
        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .subtitle {
            color: #a0a0a0;
            font-size: 1.1em;
        }
        .card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 30px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 20px;
        }
        .status {
            display: inline-block;
            padding: 8px 16px;
            background: ${isServerActive ? '#10b981' : '#ef4444'};
            border-radius: 20px;
            font-size: 0.9em;
            margin-bottom: 20px;
        }
        .file-list {
            list-style: none;
        }
        .file-item {
            background: rgba(255, 255, 255, 0.03);
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.3s;
        }
        .file-item:hover {
            background: rgba(255, 255, 255, 0.08);
            transform: translateX(5px);
        }
        .file-name {
            flex: 1;
            font-weight: 500;
        }
        .file-size {
            color: #888;
            margin-right: 15px;
            font-size: 0.9em;
        }
        .download-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
            font-size: 0.9em;
            transition: transform 0.2s;
        }
        .download-btn:hover {
            transform: scale(1.05);
        }
        .empty {
            text-align: center;
            color: #666;
            padding: 40px;
            font-size: 1.1em;
        }
        .info {
            color: #888;
            font-size: 0.9em;
            text-align: center;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📱 PyShare</h1>
            <p class="subtitle">Network File Sharing</p>
        </header>
        
        <div class="card">
            <div class="status">
                ${isServerActive ? '🟢 Sharing Active' : '🔴 Sharing Inactive'}
            </div>
            <h2 style="margin-bottom: 20px;">Shared Files (${files.length})</h2>
            
            ${files.length > 0 ? `
                <ul class="file-list">
                    ${files.map(file => `
                        <li class="file-item">
                            <span class="file-name">📄 ${file.name}</span>
                            <span class="file-size">${formatBytes(file.size)}</span>
                            <a href="${file.url}" class="download-btn" download>Download</a>
                        </li>
                    `).join('')}
                </ul>
            ` : '<div class="empty">No files shared yet</div>'}
        </div>
        
        <div class="info">
            <p>Server: ${getLocalIP()}:${PORT}</p>
            <p>Hostname: ${os.hostname()}</p>
        </div>
    </div>
    
    <script>
        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }
        
        // Update file sizes on page load
        document.querySelectorAll('.file-size').forEach((el, i) => {
            const sizes = ${JSON.stringify(files.map(f => f.size))};
            el.textContent = formatBytes(sizes[i]);
        });
    </script>
</body>
</html>
    `;
    
    res.send(html);
});

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// API Routes

// Get server info
app.get('/api/info', (req, res) => {
    res.json({
        ip: getLocalIP(),
        port: PORT,
        hostname: os.hostname(),
        isActive: isServerActive
    });
});

// Get connection logs
app.get('/api/logs', (req, res) => {
    res.json(connectionLogs);
});

// Toggle server status
app.post('/api/toggle-server', (req, res) => {
    isServerActive = !isServerActive;
    const status = isServerActive ? 'activated' : 'deactivated';
    
    // Clear all files when stopping sharing
    if (!isServerActive) {
        fs.readdir(uploadsDir, (err, files) => {
            if (!err) {
                files.forEach(file => {
                    fs.unlink(path.join(uploadsDir, file), (err) => {
                        if (err) console.error('Error deleting file:', err);
                    });
                });
                console.log('\n🗑️  Cleared all shared files\n');
            }
        });
        connectionLogs = [];
    }
    
    connectionLogs.unshift({
        ip: 'SYSTEM',
        path: '/system',
        method: 'SYSTEM',
        timestamp: new Date().toISOString(),
        userAgent: `Sharing ${status}`
    });
    if (connectionLogs.length > 50) connectionLogs.pop();
    
    console.log(`\n🔄 Sharing ${status}\n`);
    
    res.json({ 
        isActive: isServerActive,
        message: `Sharing ${status}` 
    });
});

// Get list of shared files
app.get('/api/files', (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to read files' });
        }
        
        const fileDetails = files.map(filename => {
            const filePath = path.join(uploadsDir, filename);
            const stats = fs.statSync(filePath);
            return {
                name: filename,
                size: stats.size,
                modified: stats.mtime,
                url: `/files/${filename}`
            };
        });
        
        res.json(fileDetails);
    });
});

// Upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ 
        message: 'File uploaded successfully',
        file: {
            name: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
        }
    });
});

// Delete file
app.delete('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to delete file' });
        }
        res.json({ message: 'File deleted successfully' });
    });
});

// Download all files as ZIP
app.get('/api/download-all', (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err || files.length === 0) {
            return res.status(404).json({ error: 'No files to download' });
        }

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        res.attachment(`PyShare-${timestamp}.zip`);

        archive.on('error', (err) => {
            res.status(500).send({ error: err.message });
        });

        archive.pipe(res);

        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            archive.file(filePath, { name: file });
        });

        archive.finalize();
    });
});

// Start server
console.log('Attempting to start server on 0.0.0.0:', PORT);
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 PyShare Mobile Server Running`);
    console.log(`📡 Local: http://localhost:${PORT}`);
    console.log(`🌐 Network: http://${getLocalIP()}:${PORT}`);
    console.log(`📁 Shared folder: ${uploadsDir}\n`);
    
    // Multiple ways to notify the app that server is ready
    const message = {
        type: 'server-ready',
        port: PORT,
        ip: getLocalIP()
    };
    
    // Method 1: Using cordova bridge (primary)
    try {
        if (typeof cordova !== 'undefined' && cordova.channel) {
            console.log('Sending via cordova.channel.post()');
            cordova.channel.post('server-ready', JSON.stringify(message));
        }
    } catch (e) {
        console.error('cordova.channel.post failed:', e);
    }
    
    // Method 2: Direct channel send (fallback)
    try {
        if (typeof channel !== 'undefined') {
            console.log('Sending via channel.send()');
            channel.send(JSON.stringify(message));
        }
    } catch (e) {
        console.error('channel.send failed:', e);
    }
    
    console.log('Server initialization complete');
});

// Server error handling
server.on('error', (err) => {
    console.error('❌ Server error:', err);
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught exception:', err);
    console.error('Stack:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled rejection at:', promise);
    console.error('Reason:', reason);
});

// Handle shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    server.close();
    process.exit(0);
});

console.log('✓ Server setup complete, waiting for listen callback...');
