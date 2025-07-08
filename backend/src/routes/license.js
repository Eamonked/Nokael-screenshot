const express = require('express');
const { body, param, query } = require('express-validator');
const { validateRequest, customValidators } = require('../middleware/validation');
const { authenticate, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { query: dbQuery } = require('../database/connection');
const { auditLog } = require('../services/auditService');
const { 
  NotFoundError, 
  ConflictError, 
  ValidationError,
  InternalServerError
} = require('../middleware/errorHandler');
const { 
  HTTP_STATUS, 
  AUDIT_ACTIONS, 
  LICENSE_STATUS 
} = require('../../shared/types');
const crypto = require('crypto');

const router = express.Router();

// Generate license key
const generateLicenseKey = () => {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return segments.join('-');
};

// License activation validation
const activationValidation = [
  body('licenseKey')
    .notEmpty()
    .withMessage('License key is required')
    .custom(customValidators.isLicenseKey)
    .withMessage('Invalid license key format'),
  
  body('workstationId')
    .notEmpty()
    .withMessage('Workstation ID is required')
    .custom(customValidators.isWorkstationId)
    .withMessage('Invalid workstation ID format'),
  
  body('hostname')
    .notEmpty()
    .withMessage('Hostname is required')
    .custom(customValidators.isHostname)
    .withMessage('Invalid hostname format')
];

// License status check validation
const statusCheckValidation = [
  query('licenseKey')
    .notEmpty()
    .withMessage('License key is required')
    .custom(customValidators.isLicenseKey)
    .withMessage('Invalid license key format'),
  
  query('workstationId')
    .notEmpty()
    .withMessage('Workstation ID is required')
    .custom(customValidators.isWorkstationId)
    .withMessage('Invalid workstation ID format')
];

// License generation validation
const generateLicenseValidation = [
  body('customerId')
    .notEmpty()
    .withMessage('Customer ID is required')
    .custom(customValidators.isUUID)
    .withMessage('Invalid customer ID format'),
  
  body('maxActivations')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max activations must be between 1 and 1000'),
  
  body('expiresAt')
    .optional()
    .custom(customValidators.isDate)
    .withMessage('Invalid expiration date format')
];

// POST /api/license/activate - Activate license for workstation
router.post('/activate', activationValidation, validateRequest, asyncHandler(async (req, res) => {
  const { licenseKey, workstationId, hostname } = req.body;
  const ipAddress = req.ip;

  // Check if license key exists and is active
  const licenseResult = await dbQuery(
    `SELECT lk.*, c.name as customer_name 
     FROM license_keys lk 
     JOIN customers c ON lk.customer_id = c.id 
     WHERE lk.license_key = $1 AND lk.status = $2`,
    [licenseKey, LICENSE_STATUS.ACTIVE]
  );

  if (licenseResult.rows.length === 0) {
    throw new ValidationError('Invalid or inactive license key');
  }

  const license = licenseResult.rows[0];

  // Check if license has expired
  if (license.expires_at && new Date(license.expires_at) < new Date()) {
    throw new ValidationError('License has expired');
  }

  // Check if workstation is already activated
  const existingActivation = await dbQuery(
    'SELECT * FROM activations WHERE license_key_id = $1 AND workstation_id = $2',
    [license.id, workstationId]
  );

  if (existingActivation.rows.length > 0) {
    const activation = existingActivation.rows[0];
    
    if (activation.status === LICENSE_STATUS.ACTIVE) {
      // Update last checkin
      await dbQuery(
        'UPDATE activations SET last_checkin = CURRENT_TIMESTAMP WHERE id = $1',
        [activation.id]
      );

      return res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: 'License already activated for this workstation',
        data: {
          activationId: activation.id,
          customerName: license.customer_name,
          maxActivations: license.max_activations,
          currentActivations: license.current_activations
        }
      });
    } else {
      throw new ValidationError('License activation has been revoked');
    }
  }

  // Check if license has available activations
  if (license.current_activations >= license.max_activations) {
    throw new ValidationError('Maximum number of activations reached for this license');
  }

  // Create activation
  const activationResult = await dbQuery(
    `INSERT INTO activations 
     (license_key_id, workstation_id, hostname, ip_address, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [license.id, workstationId, hostname, ipAddress, LICENSE_STATUS.ACTIVE]
  );

  // Update license activation count
  await dbQuery(
    'UPDATE license_keys SET current_activations = current_activations + 1 WHERE id = $1',
    [license.id]
  );

  // Log activation
  await auditLog({
    action: AUDIT_ACTIONS.LICENSE_ACTIVATED,
    resource: 'license',
    resourceId: license.id,
    details: {
      licenseKey: licenseKey,
      workstationId,
      hostname,
      ipAddress,
      customerName: license.customer_name
    },
    ipAddress
  });

  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'License activated successfully',
    data: {
      activationId: activationResult.rows[0].id,
      customerName: license.customer_name,
      maxActivations: license.max_activations,
      currentActivations: license.current_activations + 1
    }
  });
}));

// GET /api/license/status - Check license status
router.get('/status', statusCheckValidation, validateRequest, asyncHandler(async (req, res) => {
  const { licenseKey, workstationId } = req.query;

  // Check license and activation status
  const result = await dbQuery(
    `SELECT lk.*, c.name as customer_name, a.status as activation_status, a.last_checkin
     FROM license_keys lk 
     JOIN customers c ON lk.customer_id = c.id 
     LEFT JOIN activations a ON lk.id = a.license_key_id AND a.workstation_id = $2
     WHERE lk.license_key = $1`,
    [licenseKey, workstationId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('License not found');
  }

  const license = result.rows[0];

  // Check if license is active
  if (license.status !== LICENSE_STATUS.ACTIVE) {
    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: {
        isValid: false,
        reason: `License is ${license.status}`,
        customerName: license.customer_name
      }
    });
  }

  // Check if license has expired
  if (license.expires_at && new Date(license.expires_at) < new Date()) {
    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: {
        isValid: false,
        reason: 'License has expired',
        customerName: license.customer_name
      }
    });
  }

  // Check activation status
  if (!license.activation_status) {
    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: {
        isValid: false,
        reason: 'Workstation not activated',
        customerName: license.customer_name
      }
    });
  }

  if (license.activation_status !== LICENSE_STATUS.ACTIVE) {
    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: {
        isValid: false,
        reason: `Activation is ${license.activation_status}`,
        customerName: license.customer_name
      }
    });
  }

  // Update last checkin
  await dbQuery(
    'UPDATE activations SET last_checkin = CURRENT_TIMESTAMP WHERE license_key_id = $1 AND workstation_id = $2',
    [license.id, workstationId]
  );

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      isValid: true,
      customerName: license.customer_name,
      maxActivations: license.max_activations,
      currentActivations: license.current_activations,
      lastCheckin: license.last_checkin
    }
  });
}));

// POST /api/license/generate - Generate new license key (admin only)
router.post('/generate', authenticate, adminOnly, generateLicenseValidation, validateRequest, asyncHandler(async (req, res) => {
  const { customerId, maxActivations = 1, expiresAt = null } = req.body;

  // Check if customer exists
  const customerResult = await dbQuery(
    'SELECT * FROM customers WHERE id = $1 AND is_active = true',
    [customerId]
  );

  if (customerResult.rows.length === 0) {
    throw new NotFoundError('Customer not found or inactive');
  }

  // Generate unique license key
  let licenseKey;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    licenseKey = generateLicenseKey();
    const existingResult = await dbQuery(
      'SELECT id FROM license_keys WHERE license_key = $1',
      [licenseKey]
    );
    isUnique = existingResult.rows.length === 0;
    attempts++;
  }

  if (!isUnique) {
    throw new InternalServerError('Failed to generate unique license key');
  }

  // Create license key
  const licenseResult = await dbQuery(
    `INSERT INTO license_keys 
     (license_key, customer_id, max_activations, expires_at, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, license_key`,
    [licenseKey, customerId, maxActivations, expiresAt, LICENSE_STATUS.ACTIVE]
  );

  const license = licenseResult.rows[0];

  // Log license generation
  await auditLog({
    action: AUDIT_ACTIONS.LICENSE_GENERATED,
    userId: req.user.id,
    username: req.user.username,
    resource: 'license',
    resourceId: license.id,
    details: {
      licenseKey: license.license_key,
      customerId,
      maxActivations,
      expiresAt
    },
    ipAddress: req.ip
  });

  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'License key generated successfully',
    data: {
      id: license.id,
      licenseKey: license.license_key,
      maxActivations,
      expiresAt
    }
  });
}));

// POST /api/license/revoke - Revoke license activation (admin only)
router.post('/revoke', authenticate, adminOnly, [
  body('licenseKey').notEmpty().withMessage('License key is required'),
  body('workstationId').notEmpty().withMessage('Workstation ID is required')
], validateRequest, asyncHandler(async (req, res) => {
  const { licenseKey, workstationId } = req.body;

  // Find activation
  const result = await dbQuery(
    `SELECT a.*, lk.license_key, c.name as customer_name
     FROM activations a
     JOIN license_keys lk ON a.license_key_id = lk.id
     JOIN customers c ON lk.customer_id = c.id
     WHERE lk.license_key = $1 AND a.workstation_id = $2`,
    [licenseKey, workstationId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('License activation not found');
  }

  const activation = result.rows[0];

  if (activation.status !== LICENSE_STATUS.ACTIVE) {
    throw new ValidationError('Activation is already revoked');
  }

  // Revoke activation
  await dbQuery(
    'UPDATE activations SET status = $1 WHERE id = $2',
    [LICENSE_STATUS.REVOKED, activation.id]
  );

  // Update license activation count
  await dbQuery(
    'UPDATE license_keys SET current_activations = current_activations - 1 WHERE id = $1',
    [activation.license_key_id]
  );

  // Log revocation
  await auditLog({
    action: AUDIT_ACTIONS.LICENSE_REVOKED,
    userId: req.user.id,
    username: req.user.username,
    resource: 'license',
    resourceId: activation.license_key_id,
    details: {
      licenseKey,
      workstationId,
      customerName: activation.customer_name
    },
    ipAddress: req.ip
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'License activation revoked successfully'
  });
}));

// GET /api/license/list - List all licenses (admin only)
router.get('/list', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, customerId = null, status = null } = req.query;
  const offset = (page - 1) * limit;

  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  if (customerId) {
    whereConditions.push(`lk.customer_id = $${paramIndex++}`);
    queryParams.push(customerId);
  }

  if (status) {
    whereConditions.push(`lk.status = $${paramIndex++}`);
    queryParams.push(status);
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}` 
    : '';

  // Count total
  const countResult = await dbQuery(
    `SELECT COUNT(*) as total 
     FROM license_keys lk 
     ${whereClause}`,
    queryParams
  );

  const total = parseInt(countResult.rows[0].total);

  // Get licenses
  const licensesResult = await dbQuery(
    `SELECT lk.*, c.name as customer_name, c.email as customer_email
     FROM license_keys lk
     JOIN customers c ON lk.customer_id = c.id
     ${whereClause}
     ORDER BY lk.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...queryParams, limit, offset]
  );

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      licenses: licensesResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
}));

module.exports = router; 