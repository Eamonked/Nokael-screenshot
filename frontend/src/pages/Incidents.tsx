import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridValueGetter } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import apiService from '../services/api';
import { Incident, IncidentFilters } from '../types';

const Incidents: React.FC = () => {
  const theme = useTheme();
  const [filters, setFilters] = useState<IncidentFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Fetch incidents with filters
  const {
    data: incidentsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['incidents', filters],
    queryFn: async () => {
      const response = await apiService.getIncidents(1, 100, filters);
      return response.data.data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return theme.palette.error.main;
      case 'in-progress':
        return theme.palette.warning.main;
      case 'closed':
        return theme.palette.success.main;
      case 'archived':
        return theme.palette.grey[500];
      default:
        return theme.palette.grey[500];
    }
  };

  const handleFilterChange = (field: keyof IncidentFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm || undefined,
    }));
  };

  const handleViewIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setViewDialogOpen(true);
  };

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 100,
      renderCell: (params: any) => (
        <Typography variant="body2" fontWeight="bold">
          #{params.value}
        </Typography>
      ),
    },
    {
      field: 'areaName',
      headerName: 'Area',
      width: 150,
      valueGetter: (params: any) => params.row.areaName || 'Unknown',
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 200,
      renderCell: (params: any) => (
        <Typography variant="body2" sx={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          maxWidth: '100%'
        }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params: any) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            backgroundColor: getStatusColor(params.value) + '20',
            color: getStatusColor(params.value),
            fontWeight: 500,
          }}
        />
      ),
    },
    {
      field: 'timestamp',
      headerName: 'Timestamp',
      width: 180,
      valueGetter: (params: any) => format(new Date(params.value), 'MMM dd, yyyy HH:mm'),
    },
    {
      field: 'createdBy',
      headerName: 'Created By',
      width: 120,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: any) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleViewIncident(params.row)}
            sx={{ color: theme.palette.primary.main }}
          >
            <ViewIcon />
          </IconButton>
          <IconButton
            size="small"
            sx={{ color: theme.palette.secondary.main }}
          >
            <EditIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Incidents</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {/* TODO: Open create incident dialog */}}
        >
          New Incident
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Search"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              sx={{ minWidth: 200 }}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={handleSearch}>
                    <SearchIcon />
                  </IconButton>
                ),
              }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Date From"
              type="date"
              variant="outlined"
              size="small"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Date To"
              type="date"
              variant="outlined"
              size="small"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setFilters({})}
            >
              Clear Filters
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid
            rows={incidentsData?.items || []}
            columns={columns}
            loading={isLoading}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 25 },
              },
            }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderBottom: `1px solid ${theme.palette.divider}`,
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: theme.palette.grey[50],
                borderBottom: `2px solid ${theme.palette.divider}`,
              },
            }}
          />
        </CardContent>
      </Card>

      {/* View Incident Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Incident Details
          {selectedIncident && (
            <Typography variant="body2" color="text.secondary">
              #{selectedIncident.id}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Area</Typography>
                  <Typography variant="body1">{selectedIncident.areaName || 'Unknown'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedIncident.status}
                    size="small"
                    sx={{
                      backgroundColor: getStatusColor(selectedIncident.status) + '20',
                      color: getStatusColor(selectedIncident.status),
                    }}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Created By</Typography>
                  <Typography variant="body1">{selectedIncident.createdBy}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Timestamp</Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedIncident.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1">{selectedIncident.description}</Typography>
              </Box>

              {selectedIncident.notes && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Notes
                  </Typography>
                  <Typography variant="body1">{selectedIncident.notes}</Typography>
                </Box>
              )}

              {selectedIncident.screenshotPath && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Screenshot
                  </Typography>
                  <img
                    src={apiService.getScreenshotUrl(selectedIncident.id, selectedIncident.screenshotPath)}
                    alt="Incident Screenshot"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 300,
                      borderRadius: 8,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => {/* TODO: Edit incident */}}>
            Edit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Incidents; 