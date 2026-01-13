const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const archiver = require('archiver');

const app = express();
const PORT = 8000;

// Connection logs
let connectionLogs = [];
let isServerActive = false;

// Create uploads directory if it doesn't exist
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
app.use(express.static('public'));

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
        if (connectionLogs.length > 50) connectionLogs.pop(); // Keep last 50 logs
        console.log(`[${timestamp}] ${clientIP} - ${req.method} ${req.path}`);
    }
    next();
});

app.use('/files', (req, res, next) => {
    // Check if server is active for file downloads from external devices
    const isLocalRequest = req.socket.remoteAddress === '::1' || 
                          req.socket.remoteAddress === '127.0.0.1' ||
                          req.socket.remoteAddress === '::ffff:127.0.0.1' ||
                          req.headers.referer; // Allow requests from the web interface
    
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
        connectionLogs = []; // Clear logs too
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

// Scan network for other servers
app.post('/api/scan', async (req, res) => {
    const { startIP, endIP } = req.body;
    const localIP = getLocalIP();
    const baseIP = localIP.substring(0, localIP.lastIndexOf('.'));
    
    res.json({ 
        message: 'Scan initiated',
        info: `Scanning ${baseIP}.1-254 on port ${PORT}`
    });
});

// Fetch files from remote server
app.post('/api/fetch', async (req, res) => {
    const { url } = req.body;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch from remote server');
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 PyShare Server Running`);
    console.log(`📡 Local: http://localhost:${PORT}`);
    console.log(`🌐 Network: http://${getLocalIP()}:${PORT}`);
    console.log(`📁 Shared folder: ${uploadsDir}\n`);
});
