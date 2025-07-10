const express = require('express');
const { body, param, query } = require('express-validator');
const { validateRequest, customValidators } = require('../middleware/validation');
const { authenticate, adminOrOperator, anyAuthenticatedUser } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { query: dbQuery } = require('../database/connection');
const { auditLog } = require('../services/auditService');
const { 
  NotFoundError, 
  ValidationError 
} = require('../middleware/errorHandler');
const { 
  HTTP_STATUS, 
  AUDIT_ACTIONS, 
  INCIDENT_STATUS,
  PAGINATION 
} = require('../../shared/types/index');

const router = express.Router();

// Incident creation validation
const createIncidentValidation = [
  body('areaId')
    .notEmpty()
    .withMessage('Area ID is required')
    .custom(customValidators.isUUID)
    .withMessage('Invalid area ID format'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('timestamp')
    .notEmpty()
    .withMessage('Timestamp is required')
    .custom(customValidators.isDate)
    .withMessage('Invalid timestamp format'),
  
  body('screenshotPath')
    .optional()
    .isString()
    .withMessage('Screenshot path must be a string')
];

// Incident update validation
const updateIncidentValidation = [
  param('id')
    .notEmpty()
    .withMessage('Incident ID is required')
    .custom(customValidators.isUUID)
    .withMessage('Invalid incident ID format'),
  
  body('areaId')
    .optional()
    .custom(customValidators.isUUID)
    .withMessage('Invalid area ID format'),
  
  body('description')
    .optional()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('timestamp')
    .optional()
    .custom(customValidators.isDate)
    .withMessage('Invalid timestamp format'),
  
  body('status')
    .optional()
    .isIn(Object.values(INCIDENT_STATUS))
    .withMessage('Invalid status value')
];

// POST /api/incidents - Create new incident
router.post('/', authenticate, anyAuthenticatedUser, createIncidentValidation, validateRequest, asyncHandler(async (req, res) => {
  const { areaId, description, timestamp, screenshotPath } = req.body;
  const operatorId = req.user.id;

  // Verify area exists and is active
  const areaResult = await dbQuery(
    'SELECT id FROM areas WHERE id = $1 AND is_active = true',
    [areaId]
  );

  if (areaResult.rows.length === 0) {
    throw new ValidationError('Area not found or inactive');
  }

  // Create incident
  const incidentResult = await dbQuery(
    `INSERT INTO incidents 
     (area_id, description, timestamp, operator_id, screenshot_path, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [areaId, description, timestamp, operatorId, screenshotPath, INCIDENT_STATUS.OPEN]
  );

  const incidentId = incidentResult.rows[0].id;

  // Log incident creation
  await auditLog({
    action: AUDIT_ACTIONS.INCIDENT_CREATED,
    userId: req.user.id,
    username: req.user.username,
    resource: 'incident',
    resourceId: incidentId,
    details: {
      areaId,
      description: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
      timestamp,
      hasScreenshot: !!screenshotPath
    },
    ipAddress: req.ip
  });

  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Incident created successfully',
    data: {
      id: incidentId
    }
  });
}));

// GET /api/incidents - List incidents with filtering and pagination
router.get('/', authenticate, anyAuthenticatedUser, asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    status = null,
    areaId = null,
    operatorId = null,
    startDate = null,
    endDate = null,
    search = null
  } = req.query;

  const offset = (page - 1) * limit;
  const actualLimit = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);

  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  // Build WHERE conditions
  if (status) {
    whereConditions.push(`i.status = $${paramIndex++}`);
    queryParams.push(status);
  }

  if (areaId) {
    whereConditions.push(`i.area_id = $${paramIndex++}`);
    queryParams.push(areaId);
  }

  if (operatorId) {
    whereConditions.push(`i.operator_id = $${paramIndex++}`);
    queryParams.push(operatorId);
  }

  if (startDate) {
    whereConditions.push(`i.timestamp >= $${paramIndex++}`);
    queryParams.push(startDate);
  }

  if (endDate) {
    whereConditions.push(`i.timestamp <= $${paramIndex++}`);
    queryParams.push(endDate);
  }

  if (search) {
    whereConditions.push(`i.description ILIKE $${paramIndex++}`);
    queryParams.push(`%${search}%`);
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}` 
    : '';

  // Count total
  const countResult = await dbQuery(
    `SELECT COUNT(*) as total 
     FROM incidents i 
     ${whereClause}`,
    queryParams
  );

  const total = parseInt(countResult.rows[0].total);

  // Get incidents with related data
  const incidentsResult = await dbQuery(
    `SELECT 
       i.id,
       i.area_id,
       i.description,
       i.timestamp,
       i.operator_id,
       i.screenshot_path,
       i.status,
       i.closed_by,
       i.closed_at,
       i.created_at,
       i.updated_at,
       a.name as area_name,
       u.username as operator_username,
       cb.username as closed_by_username
     FROM incidents i
     JOIN areas a ON i.area_id = a.id
     JOIN users u ON i.operator_id = u.id
     LEFT JOIN users cb ON i.closed_by = cb.id
     ${whereClause}
     ORDER BY i.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...queryParams, actualLimit, offset]
  );

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      incidents: incidentsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: actualLimit,
        total,
        totalPages: Math.ceil(total / actualLimit),
        hasNext: page < Math.ceil(total / actualLimit),
        hasPrev: page > 1
      }
    }
  });
}));

// GET /api/incidents/:id - Get incident by ID
router.get('/:id', authenticate, anyAuthenticatedUser, [
  param('id').custom(customValidators.isUUID).withMessage('Invalid incident ID format')
], validateRequest, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await dbQuery(
    `SELECT 
       i.id,
       i.area_id,
       i.description,
       i.timestamp,
       i.operator_id,
       i.screenshot_path,
       i.status,
       i.closed_by,
       i.closed_at,
       i.created_at,
       i.updated_at,
       a.name as area_name,
       a.description as area_description,
       u.username as operator_username,
       cb.username as closed_by_username
     FROM incidents i
     JOIN areas a ON i.area_id = a.id
     JOIN users u ON i.operator_id = u.id
     LEFT JOIN users cb ON i.closed_by = cb.id
     WHERE i.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Incident not found');
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      incident: result.rows[0]
    }
  });
}));

// PUT /api/incidents/:id - Update incident
router.put('/:id', authenticate, adminOrOperator, updateIncidentValidation, validateRequest, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { areaId, description, timestamp, status } = req.body;

  // Check if incident exists
  const existingResult = await dbQuery(
    'SELECT * FROM incidents WHERE id = $1',
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('Incident not found');
  }

  const existingIncident = existingResult.rows[0];

  // Verify area exists if being updated
  if (areaId) {
    const areaResult = await dbQuery(
      'SELECT id FROM areas WHERE id = $1 AND is_active = true',
      [areaId]
    );

    if (areaResult.rows.length === 0) {
      throw new ValidationError('Area not found or inactive');
    }
  }

  // Build update query
  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  if (areaId) {
    updateFields.push(`area_id = $${paramIndex++}`);
    updateValues.push(areaId);
  }

  if (description) {
    updateFields.push(`description = $${paramIndex++}`);
    updateValues.push(description);
  }

  if (timestamp) {
    updateFields.push(`timestamp = $${paramIndex++}`);
    updateValues.push(timestamp);
  }

  if (status) {
    updateFields.push(`status = $${paramIndex++}`);
    updateValues.push(status);

    // If status is being changed to closed, set closed_by and closed_at
    if (status === INCIDENT_STATUS.CLOSED && existingIncident.status !== INCIDENT_STATUS.CLOSED) {
      updateFields.push(`closed_by = $${paramIndex++}`);
      updateFields.push(`closed_at = CURRENT_TIMESTAMP`);
      updateValues.push(req.user.id);
    }
  }

  if (updateFields.length === 0) {
    throw new ValidationError('No fields to update');
  }

  updateValues.push(id);

  // Update incident
  await dbQuery(
    `UPDATE incidents 
     SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramIndex++}`,
    updateValues
  );

  // Log incident update
  await auditLog({
    action: AUDIT_ACTIONS.INCIDENT_UPDATED,
    userId: req.user.id,
    username: req.user.username,
    resource: 'incident',
    resourceId: id,
    details: {
      updatedFields: Object.keys(req.body),
      previousStatus: existingIncident.status,
      newStatus: status
    },
    ipAddress: req.ip
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Incident updated successfully'
  });
}));

// PATCH /api/incidents/:id/status - Update incident status
router.patch('/:id/status', authenticate, adminOrOperator, [
  param('id').custom(customValidators.isUUID).withMessage('Invalid incident ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(INCIDENT_STATUS))
    .withMessage('Invalid status value')
], validateRequest, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Check if incident exists
  const existingResult = await dbQuery(
    'SELECT status FROM incidents WHERE id = $1',
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('Incident not found');
  }

  const existingStatus = existingResult.rows[0].status;

  if (existingStatus === status) {
    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: 'Incident status unchanged'
    });
  }

  // Update status
  const updateFields = [`status = $1`, `updated_at = CURRENT_TIMESTAMP`];
  const updateValues = [status];

  // If status is being changed to closed, set closed_by and closed_at
  if (status === INCIDENT_STATUS.CLOSED) {
    updateFields.push(`closed_by = $2`, `closed_at = CURRENT_TIMESTAMP`);
    updateValues.push(req.user.id);
  }

  updateValues.push(id);

  await dbQuery(
    `UPDATE incidents 
     SET ${updateFields.join(', ')}
     WHERE id = $${updateValues.length}`,
    updateValues
  );

  // Log status change
  await auditLog({
    action: AUDIT_ACTIONS.INCIDENT_STATUS_CHANGED,
    userId: req.user.id,
    username: req.user.username,
    resource: 'incident',
    resourceId: id,
    details: {
      previousStatus: existingStatus,
      newStatus: status
    },
    ipAddress: req.ip
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Incident status updated successfully'
  });
}));

// GET /api/incidents/stats - Get incident statistics
router.get('/stats/overview', authenticate, anyAuthenticatedUser, asyncHandler(async (req, res) => {
  const { startDate = null, endDate = null } = req.query;

  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  if (startDate) {
    whereConditions.push(`created_at >= $${paramIndex++}`);
    queryParams.push(startDate);
  }

  if (endDate) {
    whereConditions.push(`created_at <= $${paramIndex++}`);
    queryParams.push(endDate);
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}` 
    : '';

  // Get status counts
  const statusStatsResult = await dbQuery(
    `SELECT status, COUNT(*) as count
     FROM incidents 
     ${whereClause}
     GROUP BY status`,
    queryParams
  );

  // Get total incidents
  const totalResult = await dbQuery(
    `SELECT COUNT(*) as total FROM incidents ${whereClause}`,
    queryParams
  );

  // Get incidents by area
  const areaStatsResult = await dbQuery(
    `SELECT a.name, COUNT(i.id) as count
     FROM areas a
     LEFT JOIN incidents i ON a.id = i.area_id ${whereClause ? `AND ${whereConditions.join(' AND ')}` : ''}
     WHERE a.is_active = true
     GROUP BY a.id, a.name
     ORDER BY count DESC`,
    queryParams
  );

  // Get recent incidents (last 7 days)
  const recentResult = await dbQuery(
    `SELECT COUNT(*) as count
     FROM incidents 
     WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'`
  );

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      total: parseInt(totalResult.rows[0].total),
      recent: parseInt(recentResult.rows[0].count),
      byStatus: statusStatsResult.rows,
      byArea: areaStatsResult.rows
    }
  });
}));

module.exports = router; 