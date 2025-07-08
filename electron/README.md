# Screenshot Security - Desktop Client

A cross-platform Electron desktop application for capturing screenshots and reporting security incidents.

## Features

- **Global Hotkey Support**: Take screenshots instantly with customizable keyboard shortcuts
- **System Tray Integration**: Access the app from the system tray with quick actions
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Modern UI**: Built with React and Material-UI for a beautiful, responsive interface
- **Settings Management**: Configure API endpoints, authentication, and file storage
- **Screenshot History**: View and manage your captured screenshots
- **Offline Capability**: Works without internet connection for local screenshot capture

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd Screenshot/electron
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install app dependencies** (required for native modules):
   ```bash
   npm run postinstall
   ```

## Development

### Start Development Server

```bash
npm start
```

This will:
- Start the Vite dev server for the renderer process
- Compile the main process TypeScript
- Launch the Electron app in development mode

### Build for Production

```bash
npm run build
```

### Package for Distribution

#### All Platforms
```bash
npm run dist
```

#### Platform Specific
```bash
# macOS
npm run dist:mac

# Windows
npm run dist:win

# Linux
npm run dist:linux
```

## Project Structure

```
electron/
├── src/
│   ├── main/           # Main Electron process
│   │   └── main.ts     # App entry point
│   ├── renderer/       # Renderer process (React app)
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   ├── App.tsx      # Main app component
│   │   │   └── main.tsx     # React entry point
│   │   └── index.html       # HTML template
│   └── preload/       # Preload scripts
│       └── preload.ts # IPC bridge
├── dist/              # Compiled output
├── release/           # Distribution packages
└── assets/            # App icons and resources
```

## Configuration

### Settings

The app stores settings locally using `electron-store`. Available settings:

- **API URL**: Backend server URL (default: `http://localhost:3001`)
- **Auth Token**: JWT authentication token for API access
- **Global Hotkey**: Keyboard shortcut for taking screenshots (default: `Ctrl+Shift+S`)
- **Auto Start**: Start app with system boot
- **Upload Path**: Folder where screenshots are saved

### Environment Variables

- `NODE_ENV`: Set to `development` for dev mode
- `ELECTRON_IS_DEV`: Automatically set based on NODE_ENV

## Usage

### Taking Screenshots

1. **Global Hotkey**: Press the configured hotkey (default: `Ctrl+Shift+S`)
2. **System Tray**: Right-click tray icon → "Take Screenshot"
3. **App Interface**: Click "Take Screenshot" button in the dashboard

### Managing Screenshots

- **View History**: Access the History tab to see all captured screenshots
- **Open Folder**: Click "Open Folder" to view screenshots in file explorer
- **Delete**: Remove screenshots from the history view

### Settings

1. Open the app and go to Settings
2. Configure API connection details
3. Set your preferred global hotkey
4. Choose screenshot storage location
5. Save settings

## API Integration

The desktop client can integrate with the backend API for:

- **Incident Reporting**: Upload screenshots with incident details
- **User Authentication**: JWT token-based authentication
- **Data Synchronization**: Sync screenshots and metadata

### API Endpoints

- `POST /api/incidents` - Create new incident with screenshot
- `GET /api/areas` - Get available areas for incident assignment
- `POST /api/upload` - Upload screenshot files

## Building for Distribution

### macOS

```bash
npm run dist:mac
```

Creates:
- `.dmg` installer
- `.zip` archive

### Windows

```bash
npm run dist:win
```

Creates:
- `.exe` installer (NSIS)
- Portable `.exe`

### Linux

```bash
npm run dist:linux
```

Creates:
- `.AppImage` executable
- `.deb` package

## Troubleshooting

### Common Issues

1. **Global Hotkey Not Working**
   - Check if the hotkey is already in use by another application
   - Try a different hotkey combination
   - Restart the app after changing hotkey settings

2. **Screenshots Not Saving**
   - Verify the upload path exists and is writable
   - Check file permissions
   - Ensure sufficient disk space

3. **API Connection Issues**
   - Verify the API URL is correct
   - Check if the backend server is running
   - Validate authentication token

4. **Build Errors**
   - Run `npm run postinstall` to rebuild native modules
   - Clear `node_modules` and reinstall dependencies
   - Check Node.js version compatibility

### Development Debugging

- Open DevTools: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS)
- Check main process logs in terminal
- Use `console.log()` for debugging renderer process

## Security Considerations

- **Context Isolation**: Renderer process runs in isolated context
- **Preload Scripts**: Safe API exposure through preload scripts
- **File System Access**: Limited to configured upload directory
- **Network Access**: Only to configured API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the troubleshooting section
- Review the backend API documentation
- Open an issue on GitHub 