# 📱 PyShare - Cross-Platform Network File Sharing

<div align="center">

**Fast, simple, and beautiful file sharing across all your devices on your local network**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Android](https://img.shields.io/badge/Platform-Android-green.svg)](https://www.android.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-brightgreen.svg)](https://nodejs.org/)

</div>

---

## ✨ Features

### 📤 **Share Files from Mobile**
- Upload files from your Android device
- Built-in Node.js server runs directly on your phone
- Share with any device on your network (PC, laptop, other phones)
- Start/stop sharing with one tap
- Real-time connection logs

### 📥 **Receive Files**
- Connect to any device running PyShare or Python's HTTP server
- Browse files in your browser
- Download individual files or all at once
- Support for large files (100MB+)

### 🎨 **Beautiful UI**
- Modern dark theme design
- Smooth animations and transitions
- Responsive layout for all screen sizes
- Intuitive drag-and-drop upload

### 🔒 **Privacy First**
- All transfers happen on your local network
- No cloud, no internet required
- Files never leave your network
- Designed for trusted home/office networks

---

## 📦 Installation

### Android APK
1. Download the latest APK from [Releases](https://github.com/ark331/PyShare/releases)
2. Install on your Android device
3. Start sharing!

### Build from Source

**Prerequisites:**
- Node.js 16+
- npm or yarn
- Android Studio (for Android build)
- JDK 11 or higher
- Gradle 8.14+

**Clone and Install:**
```bash
git clone https://github.com/yourusername/PyShare.git
cd PyShare
npm install
```

**Build Android APK:**
```bash
npm run android:build:debug
```

The APK will be in `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🚀 Quick Start

### Sharing Files from Your Phone

1. **Open PyShare** on your Android device
2. Go to **"Share Files"** tab
3. **Upload files** by tapping the upload area or drag-and-drop
4. Tap **"Start Sharing"** button
5. Your phone's IP address is displayed (e.g., `192.168.1.100:8000`)
6. **On any device** (PC/laptop/phone), open a browser and enter that URL
7. Browse and download files!

### Receiving Files from Another Device

#### Option 1: From Another PyShare Device
1. Go to **"Receive Files"** tab
2. Enter the **IP address** shown on the other device
3. Tap **"Connect"**
4. Browser opens with file listing
5. Tap any file to download

#### Option 2: From Python HTTP Server
1. On your PC/laptop, navigate to a folder:
   ```bash
   cd ~/Downloads
   ```
2. Run this command (copy from app's **Steps** section):
   ```bash
   python3 -c "import http.server as h,socketserver as s,os;exec('class C(h.SimpleHTTPRequestHandler):\n def end_headers(x):\n  x.send_header(\"Access-Control-Allow-Origin\",\"*\")\n  p=x.translate_path(x.path)\n  if os.path.isfile(p):x.send_header(\"Content-Disposition\",\"attachment\")\n  super().end_headers()');s.TCPServer((\"\",8000),C).serve_forever()"
   ```
3. Find your PC's IP: `192.168.x.x`
4. On phone, enter that IP in **"Receive Files"** tab
5. Download files!

---

## 🛠️ Technology Stack

- **Frontend:** Vanilla JavaScript, CSS3, HTML5
- **Backend:** Node.js + Express
- **Mobile:** Capacitor 8.0 + Android SDK
- **File Processing:** Multer, Archiver
- **Mobile Node.js:** nodejs-mobile-cordova

---

## 📱 Architecture

```
PyShare/
├── android/                 # Android native project
│   ├── app/
│   │   └── src/main/
│   │       ├── assets/www/ # Web assets (HTML/CSS/JS)
│   │       └── java/       # Native Android code
│   └── build.gradle
├── nodejs-assets/
│   └── nodejs-project/
│       └── main.js         # Node.js server (runs on mobile)
├── public/                 # Web version assets
│   ├── index.html
│   ├── app.js
│   └── style.css
├── package.json
└── capacitor.config.json
```

**How it works:**
1. Android app embeds Node.js runtime via `nodejs-mobile-cordova`
2. On app start, Node.js server starts on `localhost:8000`
3. Capacitor WebView loads the web UI
4. UI communicates with local Node.js server via `fetch()` API
5. Files are stored in app's internal storage

---

## 🔧 Development

### Running Web Version Locally
```bash
npm start
```
Open http://localhost:8000

### Android Development

**Sync Changes:**
```bash
npm run android:sync
```

**Open in Android Studio:**
```bash
npm run android:open
```

**Build Debug APK:**
```bash
npm run android:build:debug
```

**Install on Device:**
```bash
npm run android:install
```

**Clean Build:**
```bash
npm run android:clean
```

---

## 🔐 Security Considerations

**✅ Designed for Trusted Networks Only**

PyShare is built for home and office networks where you trust all connected devices.

**Security Features:**
- All transfers on local network only
- No internet/cloud connection
- Files auto-deleted when sharing stops
- Connection logs for monitoring

**⚠️ Important Limitations:**
- **No authentication** - Anyone on network can access
- **No encryption** - All HTTP traffic is plaintext
- **No file validation** - Upload any file type

**DO NOT USE ON:**
- ❌ Public WiFi (coffee shops, airports)
- ❌ Untrusted networks
- ❌ Corporate networks without permission
- ❌ Any network with unknown devices

**Safe to use on:**
- ✅ Home WiFi with WPA2/WPA3 encryption
- ✅ Private office networks
- ✅ Personal hotspot

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🐛 Known Issues

- Large files (>500MB) may cause memory issues on older devices
- Connection logs limited to 50 entries
- No progress indicator for large downloads

---

## 💡 Future Improvements

- [ ] QR code for easy connection
- [ ] File preview before download
- [ ] Upload progress indicator
- [ ] Folder upload support
- [ ] Optional password protection
- [ ] Network auto-discovery
- [ ] iOS version

---

## 📧 Contact

For questions, issues, or suggestions, please open an issue on GitHub.

---

<div align="center">

**Made with ❤️ for easy local file sharing**

⭐ Star this repo if you find it useful!

</div>

## License

MIT
