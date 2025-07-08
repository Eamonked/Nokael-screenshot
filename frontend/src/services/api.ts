import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  User,
  LoginCredentials,
  AuthResponse,
  Incident,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  Area,
  CreateAreaRequest,
  License,
  LicenseActivation,
  LicenseStatus,
  AuditLog,
  AuditStats,
  ApiResponse,
  PaginatedResponse,
  DashboardStats,
  FileUploadResponse,
  IncidentFilters,
  UserFilters,
  AuditFilters,
  ApiError,
} from '../types';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const response = await this.refreshToken(refreshToken);
              const { accessToken } = response.data.data!;
              localStorage.setItem('accessToken', accessToken);
              
              // Retry original request
              error.config.headers.Authorization = `Bearer ${accessToken}`;
              return this.api.request(error.config);
            } catch (refreshError) {
              // Refresh failed, redirect to login
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }
          } else {
            // No refresh token, redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(credentials: LoginCredentials): Promise<AxiosResponse<ApiResponse<AuthResponse>>> {
    return this.api.post('/auth/login', credentials);
  }

  async logout(): Promise<AxiosResponse<ApiResponse<void>>> {
    return this.api.post('/auth/logout');
  }

  async refreshToken(refreshToken: string): Promise<AxiosResponse<ApiResponse<{ accessToken: string }>>> {
    return this.api.post('/auth/refresh', { refreshToken });
  }

  // Health Check
  async healthCheck(): Promise<AxiosResponse<{ status: string; timestamp: string }>> {
    return axios.get(`${API_BASE_URL}/health`);
  }

  // Incidents
  async getIncidents(
    page: number = 1,
    limit: number = 20,
    filters?: IncidentFilters
  ): Promise<AxiosResponse<ApiResponse<PaginatedResponse<Incident>>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.areaId && { areaId: filters.areaId }),
      ...(filters?.dateFrom && { dateFrom: filters.dateFrom }),
      ...(filters?.dateTo && { dateTo: filters.dateTo }),
      ...(filters?.search && { search: filters.search }),
    });
    return this.api.get(`/incidents?${params}`);
  }

  async getIncident(id: string): Promise<AxiosResponse<ApiResponse<Incident>>> {
    return this.api.get(`/incidents/${id}`);
  }

  async createIncident(data: CreateIncidentRequest): Promise<AxiosResponse<ApiResponse<Incident>>> {
    const formData = new FormData();
    formData.append('area', data.area);
    formData.append('description', data.description);
    if (data.screenshot) {
      formData.append('screenshot', data.screenshot);
    }
    return this.api.post('/incidents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async updateIncident(
    id: string,
    data: UpdateIncidentRequest
  ): Promise<AxiosResponse<ApiResponse<Incident>>> {
    return this.api.patch(`/incidents/${id}`, data);
  }

  async updateIncidentStatus(
    id: string,
    status: string,
    notes?: string
  ): Promise<AxiosResponse<ApiResponse<Incident>>> {
    return this.api.patch(`/incidents/${id}/status`, { status, notes });
  }

  // Areas
  async getAreas(): Promise<AxiosResponse<ApiResponse<Area[]>>> {
    return this.api.get('/areas');
  }

  async getArea(id: string): Promise<AxiosResponse<ApiResponse<Area>>> {
    return this.api.get(`/areas/${id}`);
  }

  async createArea(data: CreateAreaRequest): Promise<AxiosResponse<ApiResponse<Area>>> {
    return this.api.post('/areas', data);
  }

  async updateArea(id: string, data: Partial<CreateAreaRequest>): Promise<AxiosResponse<ApiResponse<Area>>> {
    return this.api.patch(`/areas/${id}`, data);
  }

  async deactivateArea(id: string): Promise<AxiosResponse<ApiResponse<void>>> {
    return this.api.patch(`/areas/${id}/deactivate`);
  }

  // Users
  async getUsers(
    page: number = 1,
    limit: number = 20,
    filters?: UserFilters
  ): Promise<AxiosResponse<ApiResponse<PaginatedResponse<User>>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.role && { role: filters.role }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive.toString() }),
      ...(filters?.search && { search: filters.search }),
    });
    return this.api.get(`/users?${params}`);
  }

  async getUser(id: string): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.api.get(`/users/${id}`);
  }

  async createUser(data: Partial<User>): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.api.post('/users', data);
  }

  async updateUser(id: string, data: Partial<User>): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.api.patch(`/users/${id}`, data);
  }

  async deactivateUser(id: string): Promise<AxiosResponse<ApiResponse<void>>> {
    return this.api.patch(`/users/${id}/deactivate`);
  }

  async reactivateUser(id: string): Promise<AxiosResponse<ApiResponse<void>>> {
    return this.api.patch(`/users/${id}/reactivate`);
  }

  // License Management
  async activateLicense(data: LicenseActivation): Promise<AxiosResponse<ApiResponse<LicenseStatus>>> {
    return this.api.post('/license/activate', data);
  }

  async checkLicenseStatus(workstationId: string, licenseKey: string): Promise<AxiosResponse<ApiResponse<LicenseStatus>>> {
    return this.api.get(`/license/status?workstation_id=${workstationId}&license_key=${licenseKey}`);
  }

  async getLicenses(): Promise<AxiosResponse<ApiResponse<License[]>>> {
    return this.api.get('/license');
  }

  // Audit Logs
  async getAuditLogs(
    page: number = 1,
    limit: number = 20,
    filters?: AuditFilters
  ): Promise<AxiosResponse<ApiResponse<PaginatedResponse<AuditLog>>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.action && { action: filters.action }),
      ...(filters?.userId && { userId: filters.userId }),
      ...(filters?.dateFrom && { dateFrom: filters.dateFrom }),
      ...(filters?.dateTo && { dateTo: filters.dateTo }),
      ...(filters?.search && { search: filters.search }),
    });
    return this.api.get(`/audit?${params}`);
  }

  async getAuditStats(): Promise<AxiosResponse<ApiResponse<AuditStats>>> {
    return this.api.get('/audit/stats');
  }

  // File Upload
  async uploadFile(file: File): Promise<AxiosResponse<ApiResponse<FileUploadResponse>>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  // Dashboard
  async getDashboardStats(): Promise<AxiosResponse<ApiResponse<DashboardStats>>> {
    return this.api.get('/dashboard/stats');
  }

  // Utility methods
  getFileUrl(path: string): string {
    return `${API_BASE_URL}/uploads/${path}`;
  }

  getScreenshotUrl(incidentId: string, filename: string): string {
    return `${API_BASE_URL}/uploads/incidents/${incidentId}/${filename}`;
  }

  // Error handling
  handleError(error: any): ApiError {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.data?.message || 'An error occurred',
        errors: error.response.data?.errors,
      };
    }
    return {
      status: 0,
      message: error.message || 'Network error',
    };
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService; 