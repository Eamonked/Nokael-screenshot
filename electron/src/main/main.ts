import { app, BrowserWindow, ipcMain, globalShortcut, Menu, Tray, nativeImage, dialog, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
// @ts-ignore
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import Store from 'electron-store';
import { SQLiteService, LocalIncident } from './sqliteService';

// Initialize electron store for settings
const store = new Store();

interface AppSettings {
  apiUrl: string;
  authToken: string;
  autoStart: boolean;
  hotkey: string;
  uploadPath: string;
  pillPosition?: { x: number; y: number };
}

class ScreenshotApp {
  private mainWindow: BrowserWindow | null = null;
  private pillWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private settings: AppSettings;
  private isDragging = false;
  private dragStartPosition = { x: 0, y: 0 };
  private pillPosition: { x: number; y: number } | undefined;
  private captureMenuWindow: BrowserWindow | null = null;
  private regionOverlayWindow: BrowserWindow | null = null;
  private incidentFormWindow: BrowserWindow | null = null;
  private sqliteService: SQLiteService | null = null;
  private modalOpen: boolean = false;

  constructor() {
    this.settings = this.loadSettings();
    this.setupApp();
    this.setupMenuBar(); // Add this line to set up the menu bar
  }

  private loadSettings(): AppSettings {
    const savedPosition = store.get('pillPosition') as { x: number; y: number } | undefined;
    return {
      apiUrl: store.get('apiUrl', 'http://localhost:3001') as string,
      authToken: store.get('authToken', '') as string,
      autoStart: store.get('autoStart', false) as boolean,
      hotkey: store.get('hotkey', 'CommandOrControl+Shift+S') as string,
      uploadPath: store.get('uploadPath', path.join(app.getPath('pictures'), 'Screenshots')) as string,
      pillPosition: savedPosition
    };
  }

  private getDefaultPillPosition(): { x: number; y: number } {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    return {
      x: width - 320,
      y: height - 100
    };
  }

  private setupApp(): void {
    app.whenReady().then(async () => {
      // Initialize SQLite service
      await this.initializeSQLiteService();
      
      if (!this.settings.pillPosition) {
        this.pillPosition = this.getDefaultPillPosition();
      } else {
        this.pillPosition = this.settings.pillPosition;
      }
      this.createPillWindow();
      this.createMainWindow();
      this.setupTray();
      this.setupGlobalShortcuts();
      this.setupIPC();
      this.setupMenu();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createPillWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.cleanup();
    });
  }

  private async initializeSQLiteService(): Promise<void> {
    try {
      this.sqliteService = new SQLiteService(this.settings.uploadPath);
      
      // Migrate existing JSON metadata to SQLite
      const metadataPath = path.join(this.settings.uploadPath, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        console.log('Migrating existing JSON metadata to SQLite...');
        const migratedCount = await this.sqliteService.migrateFromJSON(metadataPath);
        console.log(`Migrated ${migratedCount} incidents to SQLite`);
        
        // Backup the old metadata file
        const backupPath = path.join(this.settings.uploadPath, 'metadata.json.backup');
        fs.copyFileSync(metadataPath, backupPath);
        console.log('Backed up original metadata to metadata.json.backup');
      }
    } catch (error) {
      console.error('Error initializing SQLite service:', error);
    }
  }

  private createPillWindow(): void {
    const { x, y } = this.pillPosition!;
    
    this.pillWindow = new BrowserWindow({
      width: 300,
      height: 80,
      x,
      y,
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js')
      },
      show: false
    });

    this.pillWindow.loadFile(path.join(__dirname, '../renderer/pill.html'));

    this.pillWindow.once('ready-to-show', () => {
      // Only show pill if main window is not visible
      if (!this.mainWindow || this.mainWindow.isDestroyed() || !this.mainWindow.isVisible()) {
        this.pillWindow?.show();
      }
      this.pillWindow?.webContents.openDevTools({ mode: 'detach' });
    });

    this.pillWindow.on('closed', () => {
      this.pillWindow = null;
    });

    this.setupPillWindowEvents();
  }

  private setupPillWindowEvents(): void {
    if (!this.pillWindow) return;

    this.pillWindow.webContents.on('dom-ready', () => {
      this.pillWindow?.webContents.executeJavaScript(`
        const pill = document.getElementById('pill');
        
        pill.addEventListener('mousedown', (e) => {
          if (e.button === 0) {
            window.electronAPI.startDrag(e.clientX, e.clientY);
          } else if (e.button === 2) {
            window.electronAPI.startDrag(e.clientX, e.clientY);
          }
        });

        pill.addEventListener('contextmenu', (e) => {
          e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
          if (window.electronAPI.isDragging()) {
            window.electronAPI.updateDrag(e.clientX, e.clientY);
          }
        });

        document.addEventListener('mouseup', () => {
          if (window.electronAPI.isDragging()) {
            window.electronAPI.stopDrag();
          }
        });
      `);
    });
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js')
      },
      icon: path.join(__dirname, '../../assets/icon.png'),
      show: false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
    });

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3002');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      // Show pill when main window is closed
      this.showPill();
    });

    this.mainWindow.on('hide', () => {
      // Show pill when main window is hidden
      this.showPill();
    });
  }

  private setupTray(): void {
    const iconPath = path.join(__dirname, '../../assets/icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    
    this.tray = new Tray(icon);
    this.tray.setToolTip('Screenshot Security');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Take Screenshot',
        click: () => this.takeScreenshot('full')
      },
      {
        label: 'Open Dashboard',
        click: () => this.showMainWindow()
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => this.openSettings()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit()
      }
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.on('double-click', () => this.showMainWindow());
  }

  private setupGlobalShortcuts(): void {
    try {
      globalShortcut.register(this.settings.hotkey, () => {
        this.takeScreenshot('full');
      });
    } catch (error) {
      console.error('Failed to register global shortcut:', error);
    }
  }

  private createCaptureMenuWindow(): void {
    if (this.captureMenuWindow) {
      this.captureMenuWindow.focus();
      return;
    }
    this.captureMenuWindow = new BrowserWindow({
      width: 400,
      height: 350,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      fullscreenable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js')
      },
      show: false
    });
    this.modalOpen = true;
    this.captureMenuWindow.loadFile(path.join(__dirname, '../renderer/capture-menu.html'));
    this.captureMenuWindow.once('ready-to-show', () => {
      this.captureMenuWindow?.show();
    });
    this.captureMenuWindow.on('closed', () => {
      this.captureMenuWindow = null;
      this.modalOpen = false;
    });
  }

  private createRegionOverlayWindow(): void {
    if (this.regionOverlayWindow) {
      this.regionOverlayWindow.focus();
      return;
    }
    this.regionOverlayWindow = new BrowserWindow({
      width: 800, // will be set to display bounds
      height: 600, // will be set to display bounds
      x: 0,
      y: 0,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      fullscreen: true,
      hasShadow: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js')
      },
      show: false
    });
    this.regionOverlayWindow.setIgnoreMouseEvents(false);
    this.regionOverlayWindow.loadFile(path.join(__dirname, '../renderer/region-overlay.html'));
    this.regionOverlayWindow.once('ready-to-show', () => {
      this.regionOverlayWindow?.show();
    });
    this.regionOverlayWindow.on('closed', () => {
      this.regionOverlayWindow = null;
    });
  }

  private createIncidentFormWindow(imagePath: string): void {
    if (this.incidentFormWindow) {
      this.incidentFormWindow.focus();
      return;
    }
    this.incidentFormWindow = new BrowserWindow({
      width: 500,
      height: 600,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      fullscreenable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js')
      },
      show: false
    });
    this.modalOpen = true;
    this.incidentFormWindow.loadFile(path.join(__dirname, '../renderer/incident-form.html'));
    this.incidentFormWindow.once('ready-to-show', () => {
      this.incidentFormWindow?.show();
      // Pass the image path to the renderer
      this.incidentFormWindow?.webContents.executeJavaScript(`
        window.incidentImagePath = '${imagePath}';
      `);
    });
    this.incidentFormWindow.on('closed', () => {
      this.incidentFormWindow = null;
      this.modalOpen = false;
    });
  }

  private setupIPC(): void {
    ipcMain.handle('take-screenshot', async (event, captureType: string = 'full', region?: { x: number; y: number; width: number; height: number }) => {
      return await this.takeScreenshot(captureType, region);
    });

    ipcMain.handle('get-settings', () => {
      return this.settings;
    });

    ipcMain.handle('update-settings', async (event, newSettings: Partial<AppSettings>) => {
      this.settings = { ...this.settings, ...newSettings };
      store.set('apiUrl', this.settings.apiUrl);
      store.set('authToken', this.settings.authToken);
      store.set('autoStart', this.settings.autoStart);
      store.set('hotkey', this.settings.hotkey);
      store.set('uploadPath', this.settings.uploadPath);
      
      globalShortcut.unregisterAll();
      this.setupGlobalShortcuts();
      
      return this.settings;
    });

    ipcMain.handle('select-folder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory']
      });
      return result.filePaths[0];
    });

    ipcMain.handle('save-screenshot', async (event, imageData: string) => {
      return await this.saveScreenshot(imageData);
    });

    ipcMain.handle('api-request', async (event, options: any) => {
      return await this.makeAPIRequest(options);
    });

    ipcMain.handle('open-dashboard', () => {
      console.log('open-dashboard IPC received');
      this.showMainWindow();
    });

    ipcMain.handle('start-drag', (event, startX: number, startY: number) => {
      this.isDragging = true;
      this.dragStartPosition = { x: startX, y: startY };
    });

    ipcMain.handle('update-drag', (event, currentX: number, currentY: number) => {
      if (this.isDragging && this.pillWindow) {
        const [x, y] = this.pillWindow.getPosition();
        const deltaX = currentX - this.dragStartPosition.x;
        const deltaY = currentY - this.dragStartPosition.y;
        
        this.pillWindow.setPosition(x + deltaX, y + deltaY);
        this.dragStartPosition = { x: currentX, y: currentY };
      }
    });

    ipcMain.handle('stop-drag', () => {
      if (this.isDragging && this.pillWindow) {
        const [x, y] = this.pillWindow.getPosition();
        this.settings.pillPosition = { x, y };
        store.set('pillPosition', { x, y });
      }
      this.isDragging = false;
    });

    ipcMain.handle('is-dragging', () => {
      return this.isDragging;
    });

    ipcMain.handle('open-capture-menu', () => {
      this.createCaptureMenuWindow();
    });

    ipcMain.handle('open-region-overlay', () => {
      this.createRegionOverlayWindow();
    });
    ipcMain.on('region-selected', async (event, region) => {
      // region: { x, y, width, height }
      if (this.regionOverlayWindow) {
        this.regionOverlayWindow.close();
      }
      // Take screenshot with the selected region
      await this.takeScreenshot('region', region);
    });

    ipcMain.handle('capture-menu-dismissed', () => {
      // Do not show pill when capture menu is dismissed; modalOpen will be false, pill will only show if dashboard is closed and no modal is open
    });

    ipcMain.handle('show-pill', () => {
      this.showPill();
    });

    ipcMain.handle('hide-pill-and-open-capture-menu', () => {
      this.hidePill();
      this.createCaptureMenuWindow();
    });

    ipcMain.handle('hide-incident-form', () => {
      if (this.incidentFormWindow && !this.incidentFormWindow.isDestroyed()) {
        this.incidentFormWindow.hide();
        this.modalOpen = false;
      }
    });

    const getMetadataPath = (uploadPath: string) => path.join(uploadPath, 'metadata.json');

    function readMetadata(uploadPath: string) {
      const metaPath = getMetadataPath(uploadPath);
      if (!fs.existsSync(metaPath)) return {};
      try {
        return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      } catch {
        return {};
      }
    }

    function writeMetadata(uploadPath: string, metadata: any) {
      const metaPath = getMetadataPath(uploadPath);
      fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
    }

    ipcMain.handle('get-screenshot-stats', async () => {
      const uploadPath = store.get('uploadPath', path.join(app.getPath('pictures'), 'Screenshots')) as string;
      if (!fs.existsSync(uploadPath)) return { total: 0, size: 0, files: [] };
      const files = fs.readdirSync(uploadPath).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
      let totalSize = 0;
      const metadata = readMetadata(uploadPath);
      const fileInfos = files.map(f => {
        const stat = fs.statSync(path.join(uploadPath, f));
        totalSize += stat.size;
        return { name: f, size: stat.size, mtime: stat.mtime, ...metadata[f] };
      });
      return { total: files.length, size: totalSize, files: fileInfos };
    });

    ipcMain.handle('update-screenshot-metadata', async (event, { file, data }) => {
      const uploadPath = store.get('uploadPath', path.join(app.getPath('pictures'), 'Screenshots')) as string;
      const metadata = readMetadata(uploadPath);
      metadata[file] = { ...metadata[file], ...data };
      writeMetadata(uploadPath, metadata);
      return { success: true };
    });

    ipcMain.handle('get-system-info', () => {
      return {
        username: os.userInfo().username,
        platform: process.platform,
        arch: process.arch
      };
    });

    ipcMain.handle('save-incident-metadata', async (event, metadata) => {
      try {
        // Use SQLite if available, fallback to JSON
        if (this.sqliteService) {
          const imageFileName = path.basename(metadata.imagePath);
          const incidentData = {
            imageFileName,
            imagePath: metadata.imagePath,
            remarks: metadata.remarks || '',
            incident: metadata.incident || '',
            area: metadata.area || '',
            operator: metadata.operator || '',
            timestamp: new Date().toISOString()
          };
          
          const incidentId = await this.sqliteService.addIncident(incidentData);
          // Notify renderer of new incidentId if form is open
          if (this.incidentFormWindow && !this.incidentFormWindow.isDestroyed()) {
            this.incidentFormWindow.webContents.executeJavaScript(`window.setIncidentId && window.setIncidentId('${incidentId}')`);
          }
          return { success: true, incidentId };
        } else {
          // Fallback to JSON metadata
          const uploadPath = store.get('uploadPath', path.join(app.getPath('pictures'), 'Screenshots')) as string;
          const existingMetadata = readMetadata(uploadPath);
          
          // Extract filename from imagePath
          const imageFileName = path.basename(metadata.imagePath);
          
          // Save incident metadata
          existingMetadata[imageFileName] = {
            ...existingMetadata[imageFileName],
            ...metadata,
            incidentId: uuidv4(),
            createdAt: new Date().toISOString()
          };
          // Notify renderer of new incidentId if form is open
          if (this.incidentFormWindow && !this.incidentFormWindow.isDestroyed()) {
            this.incidentFormWindow.webContents.executeJavaScript(`window.setIncidentId && window.setIncidentId('${existingMetadata[imageFileName].incidentId}')`);
          }
          
          writeMetadata(uploadPath, existingMetadata);
          
          return { success: true, incidentId: existingMetadata[imageFileName].incidentId };
        }
      } catch (error) {
        console.error('Save incident metadata error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // New SQLite-specific IPC handlers
    ipcMain.handle('get-local-incidents', async (event, options = {}) => {
      try {
        if (this.sqliteService) {
          const incidents = await this.sqliteService.getIncidents(options);
          return { success: true, data: incidents };
        } else {
          return { success: false, error: 'SQLite service not available' };
        }
      } catch (error) {
        console.error('Get local incidents error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('get-sync-stats', async () => {
      try {
        if (this.sqliteService) {
          const stats = await this.sqliteService.getSyncStats();
          return { success: true, data: stats };
        } else {
          return { success: false, error: 'SQLite service not available' };
        }
      } catch (error) {
        console.error('Get sync stats error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('search-local-incidents', async (event, searchTerm: string) => {
      try {
        if (this.sqliteService) {
          const incidents = await this.sqliteService.getIncidents({ search: searchTerm });
          return { success: true, data: incidents };
        } else {
          return { success: false, error: 'SQLite service not available' };
        }
      } catch (error) {
        console.error('Search local incidents error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('add-screenshot-to-incident', async (event, { incidentId, fileName, filePath }) => {
      if (!this.sqliteService) return { success: false, error: 'SQLite not initialized' };
      try {
        const id = await this.sqliteService.addScreenshot(incidentId, fileName, filePath);
        return { success: true, id };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('get-screenshots-for-incident', async (event, incidentId) => {
      if (!this.sqliteService) return { success: false, error: 'SQLite not initialized' };
      try {
        const screenshots = await this.sqliteService.getScreenshotsForIncident(incidentId);
        return { success: true, data: screenshots };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Take Screenshot',
            accelerator: this.settings.hotkey,
            click: () => this.takeScreenshot('full')
          },
          { type: 'separator' },
          {
            label: 'Settings',
            click: () => this.openSettings()
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupMenuBar(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Dashboard',
            accelerator: 'CmdOrCtrl+D',
            click: () => {
              this.showMainWindow();
            }
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      // You can add more menus here if needed
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private async takeScreenshot(captureType: string = 'full', region?: { x: number; y: number; width: number; height: number }): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      if (this.mainWindow) {
        this.mainWindow.hide();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const img = await screenshot();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `screenshot-${timestamp}.png`;
      const filePath = path.join(this.settings.uploadPath, fileName);

      if (!fs.existsSync(this.settings.uploadPath)) {
        fs.mkdirSync(this.settings.uploadPath, { recursive: true });
      }

      let processedImage = img;

      // If region capture is requested, crop the image
      if (captureType === 'region' && region) {
        try {
          // Get screen dimensions for bounds checking
          const displays = screen.getAllDisplays();
          const primaryDisplay = displays.find(d => d.id === screen.getPrimaryDisplay().id) || displays[0];
          const screenWidth = primaryDisplay.size.width;
          const screenHeight = primaryDisplay.size.height;
          
          // Ensure region coordinates are within screen bounds
          const left = Math.max(0, Math.min(region.x, screenWidth - 1));
          const top = Math.max(0, Math.min(region.y, screenHeight - 1));
          const width = Math.min(region.width, screenWidth - left);
          const height = Math.min(region.height, screenHeight - top);
          
          processedImage = await sharp(img)
            .extract({
              left,
              top,
              width,
              height
            })
            .png()
            .toBuffer();
        } catch (cropError) {
          console.error('Region cropping error:', cropError);
          // Fall back to full screenshot if cropping fails
          processedImage = img;
        }
      }

      fs.writeFileSync(filePath, processedImage);

      if (this.mainWindow) {
        this.mainWindow.show();
      }

      this.mainWindow?.webContents.send('screenshot-taken', {
        filePath,
        timestamp: new Date().toISOString(),
        captureType,
        region
      });

      // Open incident form after screenshot is taken
      this.createIncidentFormWindow(filePath);

      return { success: true, filePath };
    } catch (error) {
      console.error('Screenshot error:', error);
      
      if (this.mainWindow) {
        this.mainWindow.show();
      }

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async saveScreenshot(imageData: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `screenshot-${timestamp}.png`;
      const filePath = path.join(this.settings.uploadPath, fileName);

      if (!fs.existsSync(this.settings.uploadPath)) {
        fs.mkdirSync(this.settings.uploadPath, { recursive: true });
      }

      const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

      return { success: true, filePath };
    } catch (error) {
      console.error('Save screenshot error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async makeAPIRequest(options: any): Promise<any> {
    try {
      const { default: axios } = await import('axios');
      
      const response = await axios({
        ...options,
        baseURL: this.settings.apiUrl,
        headers: {
          ...options.headers,
          'Authorization': this.settings.authToken ? `Bearer ${this.settings.authToken}` : undefined
        }
      });

      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('API request error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'API request failed' 
      };
    }
  }

  private showMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isDestroyed()) {
        this.createMainWindow();
      }
      if (this.mainWindow && this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
        // Hide pill when dashboard is shown
        this.hidePill();
      }
    } else {
      this.createMainWindow();
      this.mainWindow!.show();
      this.mainWindow!.focus();
      // Hide pill when dashboard is shown
      this.hidePill();
    }
  }

  private hidePill(): void {
    if (this.pillWindow && !this.pillWindow.isDestroyed()) {
      this.pillWindow.hide();
    }
  }

  private showPill(): void {
    if (
      this.pillWindow &&
      !this.pillWindow.isDestroyed() &&
      (!this.mainWindow || this.mainWindow.isDestroyed() || !this.mainWindow.isVisible() || this.mainWindow.isMinimized()) &&
      !this.modalOpen
    ) {
      this.pillWindow.show();
    }
  }

  private openSettings(): void {
    this.showMainWindow();
    this.mainWindow?.webContents.send('open-settings');
  }

  private cleanup(): void {
    globalShortcut.unregisterAll();
    if (this.sqliteService) {
      this.sqliteService.close();
    }
    if (this.tray) {
      this.tray.destroy();
    }
  }
}

new ScreenshotApp(); 