import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import apiService from '../services/api';
import { Area, CreateAreaRequest } from '../types';

const Areas: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<CreateAreaRequest>({
    name: '',
    description: '',
    location: '',
  });

  // Fetch areas
  const {
    data: areas,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const response = await apiService.getAreas();
      return response.data.data;
    },
  });

  // Create area mutation
  const createAreaMutation = useMutation({
    mutationFn: async (data: CreateAreaRequest) => {
      const response = await apiService.createArea(data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      toast.success('Area created successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create area');
    },
  });

  // Update area mutation
  const updateAreaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateAreaRequest> }) => {
      const response = await apiService.updateArea(id, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      toast.success('Area updated successfully');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update area');
    },
  });

  // Deactivate area mutation
  const deactivateAreaMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.deactivateArea(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      toast.success('Area deactivated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate area');
    },
  });

  const handleOpenCreateDialog = () => {
    setIsEditMode(false);
    setFormData({ name: '', description: '', location: '' });
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (area: Area) => {
    setIsEditMode(true);
    setSelectedArea(area);
    setFormData({
      name: area.name,
      description: area.description,
      location: area.location || '',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedArea(null);
    setFormData({ name: '', description: '', location: '' });
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Name and description are required');
      return;
    }

    if (isEditMode && selectedArea) {
      updateAreaMutation.mutate({ id: selectedArea.id, data: formData });
    } else {
      createAreaMutation.mutate(formData);
    }
  };

  const handleDeactivate = (area: Area) => {
    if (window.confirm(`Are you sure you want to deactivate "${area.name}"?`)) {
      deactivateAreaMutation.mutate(area.id);
    }
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
      field: 'name',
      headerName: 'Name',
      width: 200,
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 300,
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
      field: 'location',
      headerName: 'Location',
      width: 200,
      renderCell: (params: any) => params.value || 'N/A',
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 120,
      renderCell: (params: any) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          size="small"
          sx={{
            backgroundColor: params.value 
              ? theme.palette.success.light + '20' 
              : theme.palette.error.light + '20',
            color: params.value 
              ? theme.palette.success.main 
              : theme.palette.error.main,
          }}
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 150,
      valueGetter: (params: any) => format(new Date(params.value), 'MMM dd, yyyy'),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: any) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenEditDialog(params.row)}
            sx={{ color: theme.palette.primary.main }}
          >
            <EditIcon />
          </IconButton>
          {params.row.isActive && (
            <IconButton
              size="small"
              onClick={() => handleDeactivate(params.row)}
              sx={{ color: theme.palette.error.main }}
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Areas</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
        >
          New Area
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load areas. Please try again.
        </Alert>
      )}

      {/* Data Grid */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <DataGrid
            rows={areas || []}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditMode ? 'Edit Area' : 'Create New Area'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              variant="outlined"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              label="Description"
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <TextField
              label="Location (Optional)"
              variant="outlined"
              fullWidth
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createAreaMutation.isPending || updateAreaMutation.isPending}
          >
            {isEditMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Areas; 