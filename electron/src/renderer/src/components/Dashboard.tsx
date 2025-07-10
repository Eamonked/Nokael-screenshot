import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { 
  PhotoCamera as CameraIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';

interface DashboardProps {
  onTakeScreenshot: () => void;
  onViewHistory: () => void;
  onOpenSettings: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onTakeScreenshot, onViewHistory, onOpenSettings }) => {
  const [stats, setStats] = useState({ total: 0, size: 0, files: [] });

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getScreenshotStats) {
      window.electronAPI.getScreenshotStats().then(setStats);
    }
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<CameraIcon />}
                  onClick={onTakeScreenshot}
                  size="large"
                >
                  Take Screenshot
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  size="large"
                  onClick={onViewHistory}
                >
                  View History
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  size="large"
                  onClick={onOpenSettings}
                >
                  Settings
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {stats.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Screenshots Today
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="secondary">
                      {(stats.size / 1024).toFixed(2)} KB
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Size
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CameraIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="No recent screenshots"
                    secondary="Take your first screenshot to get started"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Tips */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tips
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CameraIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Use the global hotkey (Ctrl+Shift+S) to take screenshots quickly"
                    secondary="You can customize this in Settings"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <UploadIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Screenshots are automatically saved to your configured folder"
                    secondary="Configure the upload path in Settings"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 