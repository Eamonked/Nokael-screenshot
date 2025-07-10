import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Container } from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  Settings as SettingsIcon, 
  PhotoCamera as CameraIcon,
  History as HistoryIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import ScreenshotHistory from './components/ScreenshotHistory';

interface AppSettings {
  apiUrl: string;
  authToken: string;
  autoStart: boolean;
  hotkey: string;
  uploadPath: string;
}

declare global {
  interface Window {
    electronAPI: any;
  }
}

const App: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'history'>('dashboard');
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    // Load settings on app start
    loadSettings();

    // Set up event listeners
    if (window.electronAPI) {
      window.electronAPI.onScreenshotTaken((data: any) => {
        toast.success(`Screenshot saved: ${data.filePath}`);
      });

      window.electronAPI.onOpenSettings(() => {
        setCurrentView('settings');
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('screenshot-taken');
        window.electronAPI.removeAllListeners('open-settings');
      }
    };
  }, []);

  const loadSettings = async () => {
    try {
      if (window.electronAPI) {
        const appSettings = await window.electronAPI.getSettings();
        setSettings(appSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleTakeScreenshot = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.takeScreenshot('full');
        if (result.success) {
          toast.success('Screenshot taken successfully!');
        } else {
          toast.error(`Failed to take screenshot: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Screenshot error:', error);
      toast.error('Failed to take screenshot');
    }
  };

  const handleSettingsUpdate = async (newSettings: Partial<AppSettings>) => {
    try {
      if (window.electronAPI) {
        const updatedSettings = await window.electronAPI.updateSettings(newSettings);
        setSettings(updatedSettings);
        toast.success('Settings updated successfully!');
      }
    } catch (error) {
      console.error('Settings update error:', error);
      toast.error('Failed to update settings');
    }
  };

  const handleViewHistory = () => setCurrentView('history');
  const handleOpenSettings = () => setCurrentView('settings');

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' as const },
    { text: 'Take Screenshot', icon: <CameraIcon />, action: handleTakeScreenshot },
    { text: 'History', icon: <HistoryIcon />, view: 'history' as const },
    { text: 'Settings', icon: <SettingsIcon />, view: 'settings' as const },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onTakeScreenshot={handleTakeScreenshot} onViewHistory={handleViewHistory} onOpenSettings={handleOpenSettings} />;
      case 'settings':
        return <Settings settings={settings} onUpdate={handleSettingsUpdate} />;
      case 'history':
        return <ScreenshotHistory />;
      default:
        return <Dashboard onTakeScreenshot={handleTakeScreenshot} onViewHistory={handleViewHistory} onOpenSettings={handleOpenSettings} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Screenshot Security
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            marginTop: '64px',
          },
        }}
      >
        <List>
          {menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else if (item.view) {
                  setCurrentView(item.view);
                }
                setDrawerOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          padding: 3,
          marginTop: '64px',
          backgroundColor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Container maxWidth="lg">
          {renderContent()}
        </Container>
      </Box>
    </Box>
  );
};

export default App; 