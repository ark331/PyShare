# Contributing to PyShare

Thank you for considering contributing to PyShare! 🎉

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Android version, device model, etc.)

### Suggesting Features

We love new ideas! Open an issue with:
- Feature description
- Use case / why it's useful
- Any implementation ideas you have

### Pull Requests

1. **Fork the repo** and create your branch from `main`
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Comment complex logic

3. **Test thoroughly**
   - Test on Android device
   - Test file uploads/downloads
   - Test with different file sizes
   - Check cross-device compatibility

4. **Commit with clear messages**
   ```bash
   git commit -m "Add feature: QR code connection"
   ```

5. **Push and create Pull Request**
   ```bash
   git push origin feature/my-new-feature
   ```

### Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/PyShare.git
cd PyShare

# Install dependencies
npm install

# Run web version
npm start

# Build Android
npm run android:build:debug
```

### Code Style

- Use meaningful variable names
- Keep functions small and focused
- Add comments for complex logic
- Use ES6+ features (async/await, arrow functions)
- Follow existing indentation (2 spaces)

### Areas We Need Help With

- 🎨 UI/UX improvements
- 📱 iOS version
- 🔍 Network discovery feature
- 🔐 Optional security features
- 🌍 Internationalization
- 📖 Documentation improvements
- 🐛 Bug fixes

### Questions?

Open an issue with the "question" label, and we'll help you out!

## Code of Conduct

- Be respectful and inclusive
- Help others learn
- Focus on what's best for the community
- Show empathy

Thank you for making PyShare better! 💙
