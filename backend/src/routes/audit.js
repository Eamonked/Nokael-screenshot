const express = require('express');
const { query } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { authenticate, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getAuditLogs, getAuditLogById, getAuditStats } = require('../services/auditService');
const { 
  NotFoundError 
} = require('../middleware/errorHandler');
const { 
  HTTP_STATUS, 
  PAGINATION 
} = require('../../shared/types');

const router = express.Router();

// Audit log filtering validation
const auditFilterValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: PAGINATION.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${PAGINATION.MAX_LIMIT}`),
  
  query('action')
    .optional()
    .isString()
    .withMessage('Action must be a string'),
  
  query('resource')
    .optional()
    .isString()
    .withMessage('Resource must be a string'),
  
  query('userId')
    .optional()
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  
  query('username')
    .optional()
    .isString()
    .withMessage('Username must be a string'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('ipAddress')
    .optional()
    .isIP()
    .withMessage('IP address must be a valid IP address')
];

// GET /api/audit - List audit logs with filtering and pagination (admin only)
router.get('/', authenticate, adminOnly, auditFilterValidation, validateRequest, asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    action = null,
    resource = null,
    userId = null,
    username = null,
    startDate = null,
    endDate = null,
    ipAddress = null
  } = req.query;

  const options = {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), PAGINATION.MAX_LIMIT),
    action,
    resource,
    userId,
    username,
    startDate,
    endDate,
    ipAddress
  };

  const result = await getAuditLogs(options);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: result
  });
}));

// GET /api/audit/:id - Get audit log by ID (admin only)
router.get('/:id', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const auditLog = await getAuditLogById(id);

  if (!auditLog) {
    throw new NotFoundError('Audit log not found');
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      auditLog
    }
  });
}));

// GET /api/audit/stats/overview - Get audit statistics (admin only)
router.get('/stats/overview', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const { startDate = null, endDate = null } = req.query;

  const options = {
    startDate,
    endDate
  };

  const stats = await getAuditStats(options);

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: stats
  });
}));

// GET /api/audit/actions - Get list of available audit actions (admin only)
router.get('/actions/list', authenticate, adminOnly, asyncHandler(async (req, res) => {
  // Return all available audit actions from shared types
  const { AUDIT_ACTIONS } = require('../../shared/types');
  
  const actions = Object.entries(AUDIT_ACTIONS).map(([key, value]) => ({
    key,
    value,
    category: key.includes('LOGIN') || key.includes('LOGOUT') ? 'Authentication' :
              key.includes('USER') ? 'User Management' :
              key.includes('INCIDENT') ? 'Incident Management' :
              key.includes('AREA') ? 'Area Management' :
              key.includes('LICENSE') ? 'License Management' : 'Other'
  }));

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      actions
    }
  });
}));

// GET /api/audit/resources - Get list of available audit resources (admin only)
router.get('/resources/list', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const resources = [
    { key: 'user', value: 'User Management' },
    { key: 'incident', value: 'Incident Management' },
    { key: 'area', value: 'Area Management' },
    { key: 'license', value: 'License Management' },
    { key: 'audit', value: 'Audit System' }
  ];

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      resources
    }
  });
}));

module.exports = router; 