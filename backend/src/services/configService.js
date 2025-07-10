const { 
  DEPLOYMENT_MODES, 
  LICENSE_MODES, 
  TENANT_CONFIG, 
  DEFAULT_CONFIG,
  CONFIG_VALIDATION 
} = require('../../shared/types/index');

class ConfigService {
  constructor() {
    this.config = this.loadConfiguration();
  }

  // Load and validate configuration
  loadConfiguration() {
    const deploymentMode = process.env.DEPLOYMENT_MODE || DEPLOYMENT_MODES.SAAS;
    const licenseMode = process.env.LICENSE_MODE || DEFAULT_CONFIG[deploymentMode].LICENSE_MODE;
    const tenantConfig = process.env.TENANT_CONFIG || DEFAULT_CONFIG[deploymentMode].TENANT_CONFIG;
    const syncEnabled = process.env.SYNC_ENABLED === 'true' || DEFAULT_CONFIG[deploymentMode].SYNC_ENABLED;
    const offlineMode = process.env.OFFLINE_MODE === 'true' || DEFAULT_CONFIG[deploymentMode].OFFLINE_MODE;

    // Validate configuration
    if (!CONFIG_VALIDATION.DEPLOYMENT_MODE.includes(deploymentMode)) {
      throw new Error(`Invalid deployment mode: ${deploymentMode}`);
    }

    if (!CONFIG_VALIDATION.LICENSE_MODE.includes(licenseMode)) {
      throw new Error(`Invalid license mode: ${licenseMode}`);
    }

    return {
      // Deployment Configuration
      deployment: {
        mode: deploymentMode,
        environment: process.env.NODE_ENV || 'development',
        apiUrl: process.env.API_URL || 'http://localhost:3000',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
        tenantId: process.env.TENANT_ID || null,
        tenantConfig: tenantConfig
      },

      // License Configuration
      license: {
        mode: licenseMode,
        serverUrl: process.env.LICENSE_SERVER_URL || null,
        localKeyPath: process.env.LOCAL_LICENSE_KEY_PATH || './license.key',
        checkInterval: parseInt(process.env.LICENSE_CHECK_INTERVAL) || 604800000, // 7 days
        offlineKey: process.env.OFFLINE_LICENSE_KEY || null
      },

      // Database Configuration
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME || 'screenshot_db',
        user: process.env.DB_USER || 'screenshot_user',
        password: process.env.DB_PASSWORD || 'your_secure_password',
        ssl: process.env.DB_SSL === 'true',
        url: process.env.DB_URL || null // For SaaS deployments
      },

      // Sync Configuration (for hybrid mode)
      sync: {
        enabled: syncEnabled,
        interval: parseInt(process.env.SYNC_INTERVAL) || 300000, // 5 minutes
        batchSize: parseInt(process.env.SYNC_BATCH_SIZE) || 50,
        retryAttempts: parseInt(process.env.SYNC_RETRY_ATTEMPTS) || 3,
        maxQueueSize: parseInt(process.env.SYNC_MAX_QUEUE_SIZE) || 1000
      },

      // Feature Flags
      features: {
        offlineMode: offlineMode,
        licenseCheck: process.env.LICENSE_CHECK !== 'false',
        auditLogging: process.env.AUDIT_LOGGING !== 'false',
        fileUpload: process.env.FILE_UPLOAD !== 'false',
        multiTenant: tenantConfig === TENANT_CONFIG.MULTI_TENANT,
        syncEnabled: syncEnabled
      },

      // Security Configuration
      security: {
        jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
        jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key',
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
      },

      // File Upload Configuration
      upload: {
        path: process.env.UPLOAD_PATH || './uploads',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
        allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif'],
        enableS3: process.env.ENABLE_S3 === 'true',
        s3Bucket: process.env.S3_BUCKET || null,
        s3Region: process.env.S3_REGION || null,
        s3AccessKey: process.env.S3_ACCESS_KEY || null,
        s3SecretKey: process.env.S3_SECRET_KEY || null
      }
    };
  }

  // Get configuration
  get() {
    return this.config;
  }

  // Get specific configuration section
  getSection(section) {
    return this.config[section];
  }

  // Check if running in SaaS mode
  isSaaS() {
    return this.config.deployment.mode === DEPLOYMENT_MODES.SAAS;
  }

  // Check if running in offline mode
  isOffline() {
    return this.config.deployment.mode === DEPLOYMENT_MODES.OFFLINE;
  }

  // Check if running in hybrid mode
  isHybrid() {
    return this.config.deployment.mode === DEPLOYMENT_MODES.HYBRID;
  }

  // Check if license checking is enabled
  isLicenseCheckEnabled() {
    return this.config.features.licenseCheck && 
           this.config.license.mode !== LICENSE_MODES.OFFLINE;
  }

  // Check if offline mode is enabled
  isOfflineModeEnabled() {
    return this.config.features.offlineMode;
  }

  // Check if sync is enabled
  isSyncEnabled() {
    return this.config.features.syncEnabled;
  }

  // Check if multi-tenant mode is enabled
  isMultiTenant() {
    return this.config.features.multiTenant;
  }

  // Get database connection string
  getDatabaseUrl() {
    if (this.config.database.url) {
      return this.config.database.url;
    }

    const { host, port, name, user, password, ssl } = this.config.database;
    const sslParam = ssl ? '?sslmode=require' : '';
    return `postgresql://${user}:${password}@${host}:${port}/${name}${sslParam}`;
  }

  // Get license validation URL
  getLicenseValidationUrl() {
    if (this.config.license.mode === LICENSE_MODES.LOCAL_ONLY) {
      return null;
    }
    return this.config.license.serverUrl || `${this.config.deployment.apiUrl}/api/license`;
  }

  // Get tenant context (for multi-tenant deployments)
  getTenantContext(req) {
    if (!this.isMultiTenant()) {
      return null;
    }

    // Try to get tenant from header, query param, or config
    const tenantId = req.headers['x-tenant-id'] || 
                    req.query.tenant || 
                    this.config.deployment.tenantId;

    return tenantId;
  }

  // Validate configuration
  validate() {
    const errors = [];

    // Validate required fields based on deployment mode
    if (this.isSaaS()) {
      if (!this.config.database.url && !this.config.database.host) {
        errors.push('Database configuration required for SaaS mode');
      }
    }

    if (this.isOffline()) {
      if (!this.config.license.offlineKey) {
        errors.push('Offline license key required for offline mode');
      }
    }

    if (this.isHybrid()) {
      if (!this.config.sync.enabled) {
        errors.push('Sync must be enabled for hybrid mode');
      }
    }

    // Validate license configuration
    if (this.config.license.mode === LICENSE_MODES.REMOTE && !this.config.license.serverUrl) {
      errors.push('License server URL required for remote license mode');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get configuration summary for logging
  getSummary() {
    return {
      deploymentMode: this.config.deployment.mode,
      environment: this.config.deployment.environment,
      licenseMode: this.config.license.mode,
      tenantConfig: this.config.deployment.tenantConfig,
      features: {
        offlineMode: this.config.features.offlineMode,
        licenseCheck: this.config.features.licenseCheck,
        syncEnabled: this.config.features.syncEnabled,
        multiTenant: this.config.features.multiTenant
      }
    };
  }

  // Reload configuration (useful for testing)
  reload() {
    this.config = this.loadConfiguration();
    return this.config;
  }
}

// Create singleton instance
const configService = new ConfigService();

module.exports = configService; 