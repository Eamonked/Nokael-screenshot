import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Screenshot functionality
  takeScreenshot: (captureType?: string, region?: { x: number; y: number; width: number; height: number }) => ipcRenderer.invoke('take-screenshot', captureType, region),
  
  // Settings management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('update-settings', settings),
  
  // File operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  saveScreenshot: (imageData: string) => ipcRenderer.invoke('save-screenshot', imageData),
  
  // API communication
  apiRequest: (options: any) => ipcRenderer.invoke('api-request', options),
  
  // Pill window functionality
  openDashboard: () => ipcRenderer.invoke('open-dashboard'),
  startDrag: (startX: number, startY: number) => ipcRenderer.invoke('start-drag', startX, startY),
  updateDrag: (currentX: number, currentY: number) => ipcRenderer.invoke('update-drag', currentX, currentY),
  stopDrag: () => ipcRenderer.invoke('stop-drag'),
  isDragging: () => ipcRenderer.invoke('is-dragging'),
  getScreenshotStats: () => ipcRenderer.invoke('get-screenshot-stats'),
  updateScreenshotMetadata: (file: string, data: any) => ipcRenderer.invoke('update-screenshot-metadata', { file, data }),
  openCaptureMenu: () => ipcRenderer.invoke('open-capture-menu'),
  openRegionOverlay: () => ipcRenderer.invoke('open-region-overlay'),
  sendRegionSelected: (region: { x: number; y: number; width: number; height: number }) => ipcRenderer.send('region-selected', region),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  saveIncidentMetadata: (metadata: any) => ipcRenderer.invoke('save-incident-metadata', metadata),
  getLocalIncidents: (options?: any) => ipcRenderer.invoke('get-local-incidents', options),
  getSyncStats: () => ipcRenderer.invoke('get-sync-stats'),
  searchLocalIncidents: (searchTerm: string) => ipcRenderer.invoke('search-local-incidents', searchTerm),
  hidePillAndOpenCaptureMenu: () => ipcRenderer.invoke('hide-pill-and-open-capture-menu'),
  showPill: () => ipcRenderer.invoke('show-pill'),
  addScreenshotToIncident: (incidentId: string, fileName: string, filePath: string) => ipcRenderer.invoke('add-screenshot-to-incident', { incidentId, fileName, filePath }),
  getScreenshotsForIncident: (incidentId: string) => ipcRenderer.invoke('get-screenshots-for-incident', incidentId),
  
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
      takeScreenshot: (captureType?: string, region?: { x: number; y: number; width: number; height: number }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      getSettings: () => Promise<any>;
      updateSettings: (settings: any) => Promise<any>;
      selectFolder: () => Promise<string | undefined>;
      saveScreenshot: (imageData: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      apiRequest: (options: any) => Promise<any>;
      openDashboard: () => Promise<void>;
      startDrag: (startX: number, startY: number) => Promise<void>;
      updateDrag: (currentX: number, currentY: number) => Promise<void>;
      stopDrag: () => Promise<void>;
      isDragging: () => Promise<boolean>;
      getScreenshotStats: () => Promise<any>;
      updateScreenshotMetadata: (file: string, data: any) => Promise<any>;
      openCaptureMenu: () => Promise<void>;
      openRegionOverlay: () => Promise<void>;
      sendRegionSelected: (region: { x: number; y: number; width: number; height: number }) => void;
      getSystemInfo: () => Promise<{ username: string; platform: string; arch: string }>;
      saveIncidentMetadata: (metadata: any) => Promise<{ success: boolean; incidentId?: string; error?: string }>;
      getLocalIncidents: (options?: any) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      getSyncStats: () => Promise<{ success: boolean; data?: any; error?: string }>;
      searchLocalIncidents: (searchTerm: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      hidePillAndOpenCaptureMenu: () => Promise<void>;
      showPill: () => Promise<void>;
      addScreenshotToIncident: (incidentId: string, fileName: string, filePath: string) => Promise<{ success: boolean; error?: string }>;
      getScreenshotsForIncident: (incidentId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      onScreenshotTaken: (callback: (data: any) => void) => void;
      onOpenSettings: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
} 