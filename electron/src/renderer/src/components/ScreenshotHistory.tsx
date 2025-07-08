import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Button,
  Grid,
  Paper,
  Chip
} from '@mui/material';
import {
  PhotoCamera as CameraIcon,
  Folder as FolderIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenIcon
} from '@mui/icons-material';

interface ScreenshotItem {
  id: string;
  filePath: string;
  fileName: string;
  timestamp: string;
  size: number;
}

const ScreenshotHistory: React.FC = () => {
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScreenshots();
  }, []);

  const loadScreenshots = async () => {
    try {
      // This would typically load from the local storage or API
      // For now, we'll show a placeholder
      setScreenshots([]);
    } catch (error) {
      console.error('Failed to load screenshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFolder = () => {
    // This would open the screenshots folder
    console.log('Opening screenshots folder');
  };

  const handleOpenScreenshot = (filePath: string) => {
    // This would open the screenshot file
    console.log('Opening screenshot:', filePath);
  };

  const handleDeleteScreenshot = (id: string) => {
    // This would delete the screenshot
    console.log('Deleting screenshot:', id);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Screenshot History
        </Typography>
        <Button
          variant="outlined"
          startIcon={<FolderIcon />}
          onClick={handleOpenFolder}
        >
          Open Folder
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Statistics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {screenshots.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Screenshots
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="secondary">
                      {formatFileSize(screenshots.reduce((acc, item) => acc + item.size, 0))}
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

        {/* Screenshot List */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Screenshots
              </Typography>
              
              {loading ? (
                <Typography>Loading...</Typography>
              ) : screenshots.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CameraIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No screenshots yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Take your first screenshot to see it here
                  </Typography>
                </Box>
              ) : (
                <List>
                  {screenshots.map((screenshot) => (
                    <ListItem
                      key={screenshot.id}
                      secondaryAction={
                        <Box>
                          <IconButton
                            edge="end"
                            aria-label="open"
                            onClick={() => handleOpenScreenshot(screenshot.filePath)}
                          >
                            <OpenIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleDeleteScreenshot(screenshot.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemIcon>
                        <CameraIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={screenshot.fileName}
                        secondary={
                          <Box>
                            <Typography variant="body2" component="span">
                              {formatDate(screenshot.timestamp)}
                            </Typography>
                            <Chip
                              label={formatFileSize(screenshot.size)}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ScreenshotHistory; 