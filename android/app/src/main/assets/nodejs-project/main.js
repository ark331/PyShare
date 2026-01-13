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

// Middleware
app.use(cors());
app.use(express.json());

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

// Handle shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    server.close();
    process.exit(0);
});
