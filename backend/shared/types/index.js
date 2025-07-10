// Shared types and constants for the Security Incident Reporting System

// Deployment Modes
const DEPLOYMENT_MODES = {
  SAAS: 'saas',
  OFFLINE: 'offline',
  HYBRID: 'hybrid'
};

// License Modes
const LICENSE_MODES = {
  REMOTE: 'remote',
  LOCAL_ONLY: 'local_only',
  OFFLINE: 'offline'
};

// User Roles
const USER_ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
};

// Incident Status
const INCIDENT_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in-progress',
  CLOSED: 'closed',
  ARCHIVED: 'archived'
};

// License Status
const LICENSE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
  REVOKED: 'revoked'
};

// Audit Actions
const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  
  // User Management
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DEACTIVATED: 'user_deactivated',
  USER_REACTIVATED: 'user_reactivated',
  PASSWORD_RESET: 'password_reset',
  
  // Incident Management
  INCIDENT_CREATED: 'incident_created',
  INCIDENT_UPDATED: 'incident_updated',
  INCIDENT_STATUS_CHANGED: 'incident_status_changed',
  INCIDENT_DELETED: 'incident_deleted',
  
  // Area Management
  AREA_CREATED: 'area_created',
  AREA_UPDATED: 'area_updated',
  AREA_DEACTIVATED: 'area_deactivated',
  
  // License Management
  LICENSE_GENERATED: 'license_generated',
  LICENSE_ACTIVATED: 'license_activated',
  LICENSE_REVOKED: 'license_revoked',
  LICENSE_EXPIRED: 'license_expired',
  
  // System Events
  SYSTEM_BACKUP: 'system_backup',
  SYSTEM_RESTORE: 'system_restore',
  CONFIGURATION_CHANGED: 'configuration_changed'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Error Types
const ERROR_TYPES = {
  VALIDATION: 'ValidationError',
  AUTHENTICATION: 'AuthenticationError',
  AUTHORIZATION: 'AuthorizationError',
  NOT_FOUND: 'NotFoundError',
  CONFLICT: 'ConflictError',
  INTERNAL_SERVER: 'InternalServerError'
};

// Pagination Constants
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

// File Upload Constants
const FILE_TYPES = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif'
};

const MAX_FILE_SIZE = 5242880; // 5MB

// Configuration Types
const CONFIG_TYPES = {
  // Database Configuration
  DB_CONFIG: {
    HOST: 'DB_HOST',
    PORT: 'DB_PORT',
    NAME: 'DB_NAME',
    USER: 'DB_USER',
    PASSWORD: 'DB_PASSWORD',
    SSL: 'DB_SSL',
    URL: 'DB_URL' // For SaaS deployments
  },
  
  // License Configuration
  LICENSE_CONFIG: {
    MODE: 'LICENSE_MODE',
    SERVER_URL: 'LICENSE_SERVER_URL',
    LOCAL_KEY_PATH: 'LOCAL_LICENSE_KEY_PATH',
    CHECK_INTERVAL: 'LICENSE_CHECK_INTERVAL'
  },
  
  // Deployment Configuration
  DEPLOYMENT_CONFIG: {
    MODE: 'DEPLOYMENT_MODE',
    API_URL: 'API_URL',
    FRONTEND_URL: 'FRONTEND_URL',
    TENANT_ID: 'TENANT_ID'
  },
  
  // Sync Configuration (for hybrid mode)
  SYNC_CONFIG: {
    ENABLED: 'SYNC_ENABLED',
    INTERVAL: 'SYNC_INTERVAL',
    BATCH_SIZE: 'SYNC_BATCH_SIZE',
    RETRY_ATTEMPTS: 'SYNC_RETRY_ATTEMPTS'
  }
};

// Tenant Configuration
const TENANT_CONFIG = {
  SINGLE_TENANT: 'single',
  MULTI_TENANT: 'multi'
};

// Offline Queue Status
const QUEUE_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRY: 'retry'
};

// Environment Types
const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

// Feature Flags
const FEATURE_FLAGS = {
  OFFLINE_MODE: 'OFFLINE_MODE',
  LICENSE_CHECK: 'LICENSE_CHECK',
  AUDIT_LOGGING: 'AUDIT_LOGGING',
  FILE_UPLOAD: 'FILE_UPLOAD',
  MULTI_TENANT: 'MULTI_TENANT',
  SYNC_ENABLED: 'SYNC_ENABLED'
};

// Default Configuration Values
const DEFAULT_CONFIG = {
  [DEPLOYMENT_MODES.SAAS]: {
    LICENSE_MODE: LICENSE_MODES.REMOTE,
    TENANT_CONFIG: TENANT_CONFIG.MULTI_TENANT,
    SYNC_ENABLED: false,
    OFFLINE_MODE: false
  },
  [DEPLOYMENT_MODES.OFFLINE]: {
    LICENSE_MODE: LICENSE_MODES.LOCAL_ONLY,
    TENANT_CONFIG: TENANT_CONFIG.SINGLE_TENANT,
    SYNC_ENABLED: false,
    OFFLINE_MODE: true
  },
  [DEPLOYMENT_MODES.HYBRID]: {
    LICENSE_MODE: LICENSE_MODES.REMOTE,
    TENANT_CONFIG: TENANT_CONFIG.SINGLE_TENANT,
    SYNC_ENABLED: true,
    OFFLINE_MODE: true
  }
};

// Configuration validation schemas
const CONFIG_VALIDATION = {
  DEPLOYMENT_MODE: Object.values(DEPLOYMENT_MODES),
  LICENSE_MODE: Object.values(LICENSE_MODES),
  USER_ROLES: Object.values(USER_ROLES),
  INCIDENT_STATUS: Object.values(INCIDENT_STATUS),
  LICENSE_STATUS: Object.values(LICENSE_STATUS)
};

// Export all constants
module.exports = {
  DEPLOYMENT_MODES,
  LICENSE_MODES,
  USER_ROLES,
  INCIDENT_STATUS,
  LICENSE_STATUS,
  AUDIT_ACTIONS,
  HTTP_STATUS,
  ERROR_TYPES,
  PAGINATION,
  FILE_TYPES,
  MAX_FILE_SIZE,
  CONFIG_TYPES,
  TENANT_CONFIG,
  QUEUE_STATUS,
  ENVIRONMENT,
  FEATURE_FLAGS,
  DEFAULT_CONFIG,
  CONFIG_VALIDATION
}; 