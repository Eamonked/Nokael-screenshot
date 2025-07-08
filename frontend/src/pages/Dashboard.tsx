import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  useTheme,
} from '@mui/material';

import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import apiService from '../services/api';
import { DashboardStats, Incident } from '../types';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Fetch dashboard stats
  const {
    data: statsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await apiService.getDashboardStats();
      return response.data.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (statsData) {
      setStats(statsData);
    }
  }, [statsData]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <WarningIcon />;
      case 'in-progress':
        return <ScheduleIcon />;
      case 'closed':
        return <CheckCircleIcon />;
      case 'archived':
        return <SecurityIcon />;
      default:
        return <SecurityIcon />;
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    trend?: number;
  }> = ({ title, value, icon, color, trend }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {value.toLocaleString()}
            </Typography>
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend > 0 ? (
                  <TrendingUpIcon sx={{ color: theme.palette.success.main, fontSize: 16, mr: 0.5 }} />
                ) : (
                  <TrendingDownIcon sx={{ color: theme.palette.error.main, fontSize: 16, mr: 0.5 }} />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    color: trend > 0 ? theme.palette.success.main : theme.palette.error.main,
                    fontWeight: 500,
                  }}
                >
                  {Math.abs(trend)}% from last week
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              backgroundColor: color + '20',
              color: color,
              width: 56,
              height: 56,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const RecentIncidentItem: React.FC<{ incident: Incident }> = ({ incident }) => (
    <ListItem alignItems="flex-start">
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: getStatusColor(incident.status) + '20', color: getStatusColor(incident.status) }}>
          {getStatusIcon(incident.status)}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" component="span">
              {incident.areaName || 'Unknown Area'}
            </Typography>
            <Chip
              label={incident.status}
              size="small"
              sx={{
                backgroundColor: getStatusColor(incident.status) + '20',
                color: getStatusColor(incident.status),
                fontWeight: 500,
              }}
            />
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
              {incident.description}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(incident.timestamp), { addSuffix: true })}
            </Typography>
          </Box>
        }
      />
    </ListItem>
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load dashboard data. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      {stats && (
        <>
          {/* Statistics Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
            <StatCard
              title="Total Incidents"
              value={stats.totalIncidents}
              icon={<SecurityIcon />}
              color={theme.palette.primary.main}
              trend={5.2}
            />
            <StatCard
              title="Open Incidents"
              value={stats.openIncidents}
              icon={<WarningIcon />}
              color={theme.palette.error.main}
              trend={-2.1}
            />
            <StatCard
              title="Active Areas"
              value={stats.activeAreas}
              icon={<LocationIcon />}
              color={theme.palette.info.main}
            />
            <StatCard
              title="Active Users"
              value={stats.activeUsers}
              icon={<PeopleIcon />}
              color={theme.palette.success.main}
              trend={1.8}
            />
          </Box>

          {/* Recent Activity */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
            {/* Recent Incidents */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Incidents
                </Typography>
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {stats.recentIncidents.length > 0 ? (
                    stats.recentIncidents.map((incident, index) => (
                      <React.Fragment key={incident.id}>
                        <RecentIncidentItem incident={incident} />
                        {index < stats.recentIncidents.length - 1 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant="body2" color="text.secondary" align="center">
                            No recent incidents
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>

            {/* Recent Audit Logs */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {stats.recentAuditLogs.length > 0 ? (
                    stats.recentAuditLogs.map((log, index) => (
                      <React.Fragment key={log.id}>
                        <ListItem alignItems="flex-start">
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: theme.palette.primary.light + '20', color: theme.palette.primary.main }}>
                              <PeopleIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle2" component="span">
                                {log.username || 'Unknown User'}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                                  {log.action} {log.resource}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < stats.recentAuditLogs.length - 1 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant="body2" color="text.secondary" align="center">
                            No recent activity
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Box>

          {/* Quick Stats */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mt: 2 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Incident Status Distribution
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Open</Typography>
                    <Chip
                      label={stats.openIncidents}
                      size="small"
                      sx={{ backgroundColor: theme.palette.error.light + '20', color: theme.palette.error.main }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Closed</Typography>
                    <Chip
                      label={stats.closedIncidents}
                      size="small"
                      sx={{ backgroundColor: theme.palette.success.light + '20', color: theme.palette.success.main }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Total</Typography>
                    <Chip
                      label={stats.totalIncidents}
                      size="small"
                      sx={{ backgroundColor: theme.palette.primary.light + '20', color: theme.palette.primary.main }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Overview
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Areas</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {stats.totalAreas} total, {stats.activeAreas} active
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Users</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {stats.totalUsers} total, {stats.activeUsers} active
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    • View all incidents
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Manage areas
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Check audit logs
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • User management
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Dashboard; 