import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Alert
} from '@mui/material';
import { FolderOpen as FolderIcon } from '@mui/icons-material';

interface AppSettings {
  apiUrl: string;
  authToken: string;
  autoStart: boolean;
  hotkey: string;
  uploadPath: string;
}

interface SettingsProps {
  settings: AppSettings | null;
  onUpdate: (settings: Partial<AppSettings>) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdate }) => {
  const [formData, setFormData] = useState<AppSettings>({
    apiUrl: settings?.apiUrl || 'http://localhost:3001',
    authToken: settings?.authToken || '',
    autoStart: settings?.autoStart || false,
    hotkey: settings?.hotkey || 'CommandOrControl+Shift+S',
    uploadPath: settings?.uploadPath || ''
  });

  const handleInputChange = (field: keyof AppSettings, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSelectFolder = async () => {
    try {
      if (window.electronAPI) {
        const folderPath = await window.electronAPI.selectFolder();
        if (folderPath) {
          handleInputChange('uploadPath', folderPath);
        }
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  const handleSave = () => {
    onUpdate(formData);
  };

  const handleReset = () => {
    if (settings) {
      setFormData(settings);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Grid container spacing={3}>
        {/* API Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                API Configuration
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="API URL"
                  value={formData.apiUrl}
                  onChange={(e) => handleInputChange('apiUrl', e.target.value)}
                  fullWidth
                  helperText="Backend API server URL"
                />
                <TextField
                  label="Auth Token"
                  value={formData.authToken}
                  onChange={(e) => handleInputChange('authToken', e.target.value)}
                  fullWidth
                  type="password"
                  helperText="JWT authentication token"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Application Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Application Settings
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Global Hotkey"
                  value={formData.hotkey}
                  onChange={(e) => handleInputChange('hotkey', e.target.value)}
                  fullWidth
                  helperText="Keyboard shortcut for taking screenshots"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.autoStart}
                      onChange={(e) => handleInputChange('autoStart', e.target.checked)}
                    />
                  }
                  label="Start with system"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* File Storage */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                File Storage
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <TextField
                    label="Upload Path"
                    value={formData.uploadPath}
                    onChange={(e) => handleInputChange('uploadPath', e.target.value)}
                    fullWidth
                    helperText="Folder where screenshots will be saved"
                  />
                  <Button
                    variant="outlined"
                    startIcon={<FolderIcon />}
                    onClick={handleSelectFolder}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    Browse
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={!settings}
                >
                  Save Settings
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleReset}
                  disabled={!settings}
                >
                  Reset to Default
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Information */}
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Note:</strong> Changes to the global hotkey will take effect immediately. 
              Make sure the hotkey combination is not already in use by another application.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings; 