# Changelog

All notable changes to PyShare will be documented in this file.

## [1.0.0] - 2026-01-13

### 🎉 Initial Release

#### Added
- **Android App** with embedded Node.js server
- **Share Files** tab - Upload and share files from mobile
- **Receive Files** tab - Connect to other devices and download files
- **Connection Logs** - Monitor who's accessing your files
- **Drag & Drop** upload support
- **Download All** as ZIP feature
- **Dark theme** UI with smooth animations
- **Auto-cleanup** when sharing stops
- **Python HTTP Server** integration support
- **Capacitor Browser** integration for external browsing
- **File size detection** for Python server listings
- **Large file support** (100MB+)

#### Features
- Start/stop sharing with one button
- Real-time connection monitoring
- Cross-platform compatibility (Android, PC, laptop)
- No internet required - local network only
- Beautiful, modern UI
- Responsive design for all screen sizes

#### Security
- Designed for trusted networks only
- Files auto-delete when sharing stops
- HTTP-only (no encryption) - suitable for home networks
- No authentication - ease of use priority

#### Technical
- Built with Capacitor 8.0
- Node.js + Express backend
- nodejs-mobile-cordova for mobile Node.js runtime
- Multer for file uploads
- Archiver for ZIP creation
- CORS enabled for cross-device access

---

## Future Versions

### Planned for v1.1.0
- [ ] QR code scanning for easy connection
- [ ] Upload progress indicators
- [ ] File preview support
- [ ] Better error messages

### Planned for v1.2.0
- [ ] Network auto-discovery
- [ ] Optional password protection
- [ ] Folder upload support

### Planned for v2.0.0
- [ ] iOS version
- [ ] HTTPS support
- [ ] File encryption option
- [ ] Multi-language support

---

## Version History

- **v1.0.0** (2026-01-13) - Initial public release
