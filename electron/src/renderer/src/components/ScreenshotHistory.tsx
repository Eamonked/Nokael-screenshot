import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { 
  Search as SearchIcon,
  CloudSync as SyncIcon,
  CloudOff as OfflineIcon,
  CheckCircle as SyncedIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import './ScreenshotHistory.css';

interface LocalIncident {
  id: string;
  imageFileName: string;
  imagePath: string;
  remarks?: string;
  incident?: string;
  area?: string;
  operator?: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  syncAttempts: number;
  lastSyncAttempt?: string;
  hash: string;
}

interface SyncStats {
  total: number;
  synced: number;
  unsynced: number;
  failed: number;
}

const ScreenshotHistory: React.FC = () => {
  const [incidents, setIncidents] = useState<LocalIncident[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadIncidents();
    loadSyncStats();
  }, []);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.getLocalIncidents) {
        const result = await window.electronAPI.getLocalIncidents();
        if (result.success) {
          setIncidents(result.data || []);
        } else {
          console.error('Failed to load incidents:', result.error);
        }
      }
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStats = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getSyncStats) {
        const result = await window.electronAPI.getSyncStats();
        if (result.success) {
          setSyncStats(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading sync stats:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadIncidents();
      return;
    }

    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.searchLocalIncidents) {
        const result = await window.electronAPI.searchLocalIncidents(searchTerm);
        if (result.success) {
          setIncidents(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error searching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSyncStatusIcon = (incident: LocalIncident) => {
    if (incident.synced) {
      return <SyncedIcon color="success" />;
    } else if (incident.syncAttempts >= 3) {
      return <ErrorIcon color="error" />;
    } else {
      return <OfflineIcon color="warning" />;
    }
  };

  const getSyncStatusText = (incident: LocalIncident) => {
    if (incident.synced) {
      return 'Synced';
    } else if (incident.syncAttempts >= 3) {
      return 'Failed';
    } else {
      return 'Pending';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Screenshot History
      </Typography>

      {/* Sync Status Card */}
      {syncStats && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sync Status
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {syncStats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Incidents
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {syncStats.synced}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Synced
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {syncStats.unsynced}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error.main">
                    {syncStats.failed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Search and Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Search incidents"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
            >
              Search
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadIncidents}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Incidents List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Incidents
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : incidents.length === 0 ? (
            <Typography variant="body1" color="text.secondary" textAlign="center" p={3}>
              No incidents found
            </Typography>
          ) : (
            <List>
              {incidents.map((incident) => (
                <ListItem key={incident.id} divider>
                  <ListItemIcon>
                    {getSyncStatusIcon(incident)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {incident.imageFileName}
                        </Typography>
                        <Chip 
                          label={getSyncStatusText(incident)} 
                          size="small" 
                          color={incident.synced ? 'success' : incident.syncAttempts >= 3 ? 'error' : 'warning'}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {incident.remarks && `Remarks: ${incident.remarks}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {incident.area && `Area: ${incident.area}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {incident.operator && `Operator: ${incident.operator}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Created: {formatDate(incident.createdAt)}
                        </Typography>
                        {incident.lastSyncAttempt && (
                          <Typography variant="body2" color="text.secondary">
                            Last sync: {formatDate(incident.lastSyncAttempt)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ScreenshotHistory; 