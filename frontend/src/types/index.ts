// TypeScript types for Security Incident Reporting System Frontend

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Incident Types
export interface Incident {
  id: string;
  areaId: string;
  areaName?: string;
  description: string;
  status: 'open' | 'in-progress' | 'closed' | 'archived';
  screenshotPath?: string;
  timestamp: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentRequest {
  area: string;
  description: string;
  screenshot?: File;
}

export interface UpdateIncidentRequest {
  status?: string;
  notes?: string;
}

// Area Types
export interface Area {
  id: string;
  name: string;
  description: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAreaRequest {
  name: string;
  description: string;
  location?: string;
}

// License Types
export interface License {
  id: string;
  licenseKey: string;
  customerName: string;
  maxWorkstations: number;
  status: 'active' | 'inactive' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseActivation {
  licenseKey: string;
  workstationId: string;
  hostname: string;
}

export interface LicenseStatus {
  status: 'active' | 'inactive' | 'expired' | 'revoked';
  message: string;
  expiresAt?: string;
  workstationId?: string;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  userId: string;
  username?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export interface AuditStats {
  totalLogs: number;
  logsToday: number;
  logsThisWeek: number;
  logsThisMonth: number;
  topActions: Array<{ action: string; count: number }>;
  topUsers: Array<{ username: string; count: number }>;
}

// API Response Types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard Types
export interface DashboardStats {
  totalIncidents: number;
  openIncidents: number;
  closedIncidents: number;
  totalAreas: number;
  activeAreas: number;
  totalUsers: number;
  activeUsers: number;
  recentIncidents: Incident[];
  recentAuditLogs: AuditLog[];
}

// File Upload Types
export interface FileUploadResponse {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

// Configuration Types
export interface AppConfig {
  apiUrl: string;
  deploymentMode: 'saas' | 'offline' | 'hybrid';
  licenseMode: 'remote' | 'local_only' | 'offline';
  syncEnabled: boolean;
  offlineMode: boolean;
}

// Form Types
export interface IncidentFilters {
  status?: string;
  areaId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface UserFilters {
  role?: string;
  isActive?: boolean;
  search?: string;
}

export interface AuditFilters {
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Error Types
export interface ApiError {
  status: number;
  message: string;
  errors?: string[];
}

// Navigation Types
export interface NavItem {
  label: string;
  path: string;
  icon: string;
  requiredRole?: string;
}

// Chart Data Types
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

export interface IncidentChartData {
  daily: ChartData;
  byStatus: ChartData;
  byArea: ChartData;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// Theme Types
export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
}

// All types are already exported above 