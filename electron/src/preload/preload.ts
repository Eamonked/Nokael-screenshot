import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Screenshot functionality
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  
  // Settings management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('update-settings', settings),
  
  // File operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  saveScreenshot: (imageData: string) => ipcRenderer.invoke('save-screenshot', imageData),
  
  // API communication
  apiRequest: (options: any) => ipcRenderer.invoke('api-request', options),
  
  // Event listeners
  onScreenshotTaken: (callback: (data: any) => void) => {
    ipcRenderer.on('screenshot-taken', (event, data) => callback(data));
  },
  
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on('open-settings', () => callback());
  },
  
  // Remove event listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      takeScreenshot: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
      getSettings: () => Promise<any>;
      updateSettings: (settings: any) => Promise<any>;
      selectFolder: () => Promise<string | undefined>;
      saveScreenshot: (imageData: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      apiRequest: (options: any) => Promise<any>;
      onScreenshotTaken: (callback: (data: any) => void) => void;
      onOpenSettings: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
} 