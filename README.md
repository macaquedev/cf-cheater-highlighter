# CF Cheater Database & Highlighter

A comprehensive solution for managing and highlighting Codeforces cheaters. This project includes:

- **Web Application**: React-based database for reporting and managing cheaters
- **Chrome Extension**: Highlights cheaters on Codeforces pages
- **Import Scripts**: Tools to import cheaters from various sources

## 🌐 Web Application

A React web app built with Chakra UI v3 and Firebase for:
- Reporting cheaters with evidence
- Admin review and approval system
- Search and browse cheaters
- User authentication

### Features
- **Report Cheaters**: Submit reports with rich text evidence
- **Admin Panel**: Review and approve/decline reports
- **Search**: Find cheaters with filtering and evidence display
- **Dark Mode**: Full dark mode support
- **Responsive Design**: Works on all devices

### Tech Stack
- React 19
- Chakra UI v3
- Firebase (Firestore + Auth)
- React Router DOM

## 🔌 Chrome Extension

A browser extension that highlights cheaters on Codeforces pages.

### Installation

#### Chrome
1. Download the latest release from [releases page](https://github.com/macaquedev/cf-cheater-highlighter/releases/latest)
2. Extract the ZIP file
3. Go to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the `extension` folder

#### Firefox (Temporary)
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `extension/manifest.json`

## 🚀 Quick Start

### Web App Development
```bash
npm install
npm start
```

### Import Cheaters
```bash
npm run import-cheaters
```

### Build for Production
```bash
npm run build
```

## 📁 Project Structure

```
cf-cheater-database/
├── src/                    # React web application
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── utils/            # Utility functions
│   └── firebase.js       # Firebase configuration
├── extension/            # Chrome extension
│   ├── manifest.json     # Extension manifest
│   └── styles.css        # Extension styles
├── scripts/              # Import and utility scripts
│   └── importCheaters.js # Import script for cheaters
├── cheaters.json         # Cheaters data file
└── fetch-cheaters.js     # Fetch script for cheaters
```

## 🔧 Configuration

### Firebase Setup
The app uses Firebase for:
- **Firestore**: Database for cheaters and reports
- **Authentication**: Admin login system

Environment variables (optional):
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Manual Deployment
```bash
npm run build
# Deploy the 'build' folder to your hosting service
```

## 📊 Data Management

### Importing Cheaters
Use the import script to add cheaters from external sources:
```bash
npm run import-cheaters
```

The script will:
- Fetch cheaters from the GitHub repository
- Check for duplicates
- Add new cheaters to the database
- Clean up pending reports for accepted cheaters

### Chrome Extension Data
The extension uses the same `cheaters.json` file that's updated via the import script.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

WTFPL License - See LICENSE file for details

## 🙏 Acknowledgments

- Original Chrome extension by [macaquedev](https://github.com/macaquedev)
- Built with React and Chakra UI
- Powered by Firebase
