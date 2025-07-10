import React, { useEffect, useState, useCallback } from 'react';
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
  ListItemIcon,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  PhotoCamera as CameraIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

interface DashboardProps {
  onTakeScreenshot: () => void;
  onViewHistory: () => void;
  onOpenSettings: () => void;
}

interface SyncStats {
  total: number;
  synced: number;
  unsynced: number;
  failed: number;
}

interface ScreenshotStats {
  total: number;
  size: number;
  files: any[];
}

const Dashboard: React.FC<DashboardProps> = ({ onTakeScreenshot, onViewHistory, onOpenSettings }) => {
  const [stats, setStats] = useState<ScreenshotStats>({ total: 0, size: 0, files: [] });
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Load all data with error handling
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load screenshot stats (legacy JSON data)
      if (window.electronAPI && window.electronAPI.getScreenshotStats) {
        const screenshotResult = await window.electronAPI.getScreenshotStats();
        if (screenshotResult) {
          setStats(screenshotResult);
        }
      }

      // Load SQLite sync stats (new SQLite data)
      if (window.electronAPI && window.electronAPI.getSyncStats) {
        const syncResult = await window.electronAPI.getSyncStats();
        if (syncResult.success && syncResult.data) {
          setSyncStats(syncResult.data);
        }
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // Listen for screenshot events to refresh data
  useEffect(() => {
    const handleScreenshotTaken = () => {
      // Refresh data when a new screenshot is taken
      setTimeout(() => loadDashboardData(), 1000);
    };

    if (window.electronAPI) {
      window.electronAPI.onScreenshotTaken(handleScreenshotTaken);
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('screenshot-taken');
      }
    };
  }, [loadDashboardData]);

  const handleRefresh = () => {
    loadDashboardData();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSyncStatusColor = () => {
    if (!syncStats) return 'primary';
    if (syncStats.failed > 0) return 'error';
    if (syncStats.unsynced > 0) return 'warning';
    return 'success';
  };

  const getSyncStatusText = () => {
    if (!syncStats) return 'Loading...';
    if (syncStats.failed > 0) return `${syncStats.failed} failed`;
    if (syncStats.unsynced > 0) return `${syncStats.unsynced} pending`;
    return 'All synced';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Dashboard
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading Overlay */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Last Update Info */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Last updated: {lastUpdate.toLocaleTimeString()}
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
                Screenshot Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {stats.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Screenshots
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="secondary">
                      {formatFileSize(stats.size)}
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

        {/* Sync Status */}
        {syncStats && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Sync Status
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {syncStats.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Incidents
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                        {syncStats.failed > 0 ? (
                          <ErrorIcon color="error" />
                        ) : syncStats.unsynced > 0 ? (
                          <UploadIcon color="warning" />
                        ) : (
                          <SuccessIcon color="success" />
                        )}
                      </Box>
                      <Typography variant="h6" color={getSyncStatusColor()}>
                        {getSyncStatusText()}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Synced: {syncStats.synced} | Pending: {syncStats.unsynced} | Failed: {syncStats.failed}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              {stats.files.length === 0 ? (
                <Typography variant="body1" color="text.secondary" textAlign="center" p={3}>
                  No recent screenshots. Take your first screenshot to get started!
                </Typography>
              ) : (
                <List>
                  {stats.files.slice(0, 5).map((file: any, index: number) => (
                    <ListItem key={index} divider>
                      <ListItemIcon>
                        <CameraIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={`${formatFileSize(file.size)} • ${new Date(file.mtime).toLocaleString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
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
                    primary="Screenshots are automatically saved and synced to your backend"
                    secondary="Check the sync status above to monitor upload progress"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <HistoryIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="View detailed history with search and filter capabilities"
                    secondary="Use the View History button to access advanced features"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Success Snackbar for refresh */}
      <Snackbar
        open={!loading && !error && lastUpdate.getTime() > Date.now() - 5000}
        autoHideDuration={2000}
        message="Dashboard updated successfully"
      />
    </Box>
  );
};

export default Dashboard; 