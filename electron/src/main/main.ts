import { app, BrowserWindow, ipcMain, globalShortcut, Menu, Tray, nativeImage, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
// @ts-ignore - screenshot-desktop doesn't have types
import * as screenshot from 'screenshot-desktop';
import { v4 as uuidv4 } from 'uuid';
import Store from 'electron-store';

// Initialize electron store for settings
const store = new Store();

interface AppSettings {
  apiUrl: string;
  authToken: string;
  autoStart: boolean;
  hotkey: string;
  uploadPath: string;
}

class ScreenshotApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private settings: AppSettings;

  constructor() {
    this.settings = this.loadSettings();
    this.setupApp();
  }

  private loadSettings(): AppSettings {
    return {
      apiUrl: store.get('apiUrl', 'http://localhost:3001') as string,
      authToken: store.get('authToken', '') as string,
      autoStart: store.get('autoStart', false) as boolean,
      hotkey: store.get('hotkey', 'CommandOrControl+Shift+S') as string,
      uploadPath: store.get('uploadPath', path.join(app.getPath('pictures'), 'Screenshots')) as string
    };
  }

  private setupApp(): void {
    app.whenReady().then(() => {
      this.createWindow();
      this.setupTray();
      this.setupGlobalShortcuts();
      this.setupIPC();
      this.setupMenu();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
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

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js')
      },
      icon: path.join(__dirname, '../../assets/icon.png'),
      show: false,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3002');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
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
        click: () => this.takeScreenshot()
      },
      {
        label: 'Open Dashboard',
        click: () => this.showWindow()
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
    this.tray.on('double-click', () => this.showWindow());
  }

  private setupGlobalShortcuts(): void {
    try {
      globalShortcut.register(this.settings.hotkey, () => {
        this.takeScreenshot();
      });
    } catch (error) {
      console.error('Failed to register global shortcut:', error);
    }
  }

  private setupIPC(): void {
    // Screenshot handling
    ipcMain.handle('take-screenshot', async () => {
      return await this.takeScreenshot();
    });

    // Settings handling
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
      
      // Re-register global shortcut if hotkey changed
      globalShortcut.unregisterAll();
      this.setupGlobalShortcuts();
      
      return this.settings;
    });

    // File operations
    ipcMain.handle('select-folder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory']
      });
      return result.filePaths[0];
    });

    ipcMain.handle('save-screenshot', async (event, imageData: string) => {
      return await this.saveScreenshot(imageData);
    });

    // API communication
    ipcMain.handle('api-request', async (event, options: any) => {
      return await this.makeAPIRequest(options);
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
            click: () => this.takeScreenshot()
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

  private async takeScreenshot(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Hide the main window temporarily
      if (this.mainWindow) {
        this.mainWindow.hide();
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for window to hide
      }

      // Take screenshot
      const img = await screenshot();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `screenshot-${timestamp}.png`;
      const filePath = path.join(this.settings.uploadPath, fileName);

      // Ensure directory exists
      if (!fs.existsSync(this.settings.uploadPath)) {
        fs.mkdirSync(this.settings.uploadPath, { recursive: true });
      }

      // Save screenshot
      fs.writeFileSync(filePath, img);

      // Show window again
      if (this.mainWindow) {
        this.mainWindow.show();
      }

      // Send notification to renderer
      this.mainWindow?.webContents.send('screenshot-taken', {
        filePath,
        timestamp: new Date().toISOString()
      });

      return { success: true, filePath };
    } catch (error) {
      console.error('Screenshot error:', error);
      
      // Show window again in case of error
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

      // Ensure directory exists
      if (!fs.existsSync(this.settings.uploadPath)) {
        fs.mkdirSync(this.settings.uploadPath, { recursive: true });
      }

      // Remove data URL prefix and save
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

  private showWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    } else {
      this.createWindow();
    }
  }

  private openSettings(): void {
    this.showWindow();
    this.mainWindow?.webContents.send('open-settings');
  }

  private cleanup(): void {
    globalShortcut.unregisterAll();
    if (this.tray) {
      this.tray.destroy();
    }
  }
}

// Start the application
new ScreenshotApp(); 