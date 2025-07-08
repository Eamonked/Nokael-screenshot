const express = require('express');
const { body, param } = require('express-validator');
const { validateRequest, customValidators } = require('../middleware/validation');
const { authenticate, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { query: dbQuery } = require('../database/connection');
const { auditLog } = require('../services/auditService');
const { 
  NotFoundError, 
  ValidationError,
  ConflictError 
} = require('../middleware/errorHandler');
const { 
  HTTP_STATUS, 
  AUDIT_ACTIONS 
} = require('../../../shared/types/index');

const router = express.Router();

// Area creation validation
const createAreaValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Area name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
];

// Area update validation
const updateAreaValidation = [
  param('id')
    .custom(customValidators.isUUID)
    .withMessage('Invalid area ID format'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Area name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// POST /api/areas - Create new area (admin only)
router.post('/', authenticate, adminOnly, createAreaValidation, validateRequest, asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // Check if area name already exists
  const existingArea = await dbQuery(
    'SELECT id FROM areas WHERE name = $1',
    [name]
  );

  if (existingArea.rows.length > 0) {
    throw new ConflictError('Area name already exists');
  }

  // Create area
  const areaResult = await dbQuery(
    `INSERT INTO areas (name, description, is_active)
     VALUES ($1, $2, true)
     RETURNING id, name, description, is_active, created_at`,
    [name, description]
  );

  const newArea = areaResult.rows[0];

  // Log area creation
  await auditLog({
    action: AUDIT_ACTIONS.AREA_CREATED,
    userId: req.user.id,
    username: req.user.username,
    resource: 'area',
    resourceId: newArea.id,
    details: {
      areaName: name,
      description
    },
    ipAddress: req.ip
  });

  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Area created successfully',
    data: {
      area: {
        id: newArea.id,
        name: newArea.name,
        description: newArea.description,
        isActive: newArea.is_active,
        createdAt: newArea.created_at
      }
    }
  });
}));

// GET /api/areas - List all areas
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { isActive = null } = req.query;

  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  // Filter by active status if provided
  if (isActive !== null && isActive !== undefined) {
    whereConditions.push(`is_active = $${paramIndex++}`);
    queryParams.push(isActive === 'true');
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}` 
    : '';

  // Get areas
  const areasResult = await dbQuery(
    `SELECT 
       id,
       name,
       description,
       is_active,
       created_at,
       updated_at
     FROM areas 
     ${whereClause}
     ORDER BY name ASC`,
    queryParams
  );

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      areas: areasResult.rows
    }
  });
}));

// GET /api/areas/:id - Get area by ID
router.get('/:id', authenticate, [
  param('id').custom(customValidators.isUUID).withMessage('Invalid area ID format')
], validateRequest, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await dbQuery(
    `SELECT 
       id,
       name,
       description,
       is_active,
       created_at,
       updated_at
     FROM areas 
     WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Area not found');
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      area: result.rows[0]
    }
  });
}));

// PUT /api/areas/:id - Update area (admin only)
router.put('/:id', authenticate, adminOnly, updateAreaValidation, validateRequest, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  // Check if area exists
  const existingResult = await dbQuery(
    'SELECT * FROM areas WHERE id = $1',
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('Area not found');
  }

  const existingArea = existingResult.rows[0];

  // Check if name is being changed and if it already exists
  if (name && name !== existingArea.name) {
    const nameCheck = await dbQuery(
      'SELECT id FROM areas WHERE name = $1 AND id != $2',
      [name, id]
    );

    if (nameCheck.rows.length > 0) {
      throw new ConflictError('Area name already exists');
    }
  }

  // Build update query
  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  if (name) {
    updateFields.push(`name = $${paramIndex++}`);
    updateValues.push(name);
  }

  if (description !== undefined) {
    updateFields.push(`description = $${paramIndex++}`);
    updateValues.push(description);
  }

  if (isActive !== undefined) {
    updateFields.push(`is_active = $${paramIndex++}`);
    updateValues.push(isActive);
  }

  if (updateFields.length === 0) {
    throw new ValidationError('No fields to update');
  }

  updateValues.push(id);

  // Update area
  await dbQuery(
    `UPDATE areas 
     SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramIndex++}`,
    updateValues
  );

  // Log area update
  await auditLog({
    action: AUDIT_ACTIONS.AREA_UPDATED,
    userId: req.user.id,
    username: req.user.username,
    resource: 'area',
    resourceId: id,
    details: {
      updatedFields: Object.keys(req.body),
      previousName: existingArea.name,
      newName: name,
      previousDescription: existingArea.description,
      newDescription: description,
      previousIsActive: existingArea.is_active,
      newIsActive: isActive
    },
    ipAddress: req.ip
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Area updated successfully'
  });
}));

// PATCH /api/areas/:id/deactivate - Deactivate area (admin only)
router.patch('/:id/deactivate', authenticate, adminOnly, [
  param('id').custom(customValidators.isUUID).withMessage('Invalid area ID format')
], validateRequest, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if area exists and is currently active
  const existingResult = await dbQuery(
    'SELECT name, is_active FROM areas WHERE id = $1',
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('Area not found');
  }

  const existingArea = existingResult.rows[0];

  if (!existingArea.is_active) {
    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: 'Area is already inactive'
    });
  }

  // Check if area has active incidents
  const activeIncidentsResult = await dbQuery(
    'SELECT COUNT(*) as count FROM incidents WHERE area_id = $1 AND status IN ($2, $3)',
    [id, 'open', 'in-progress']
  );

  const activeIncidents = parseInt(activeIncidentsResult.rows[0].count);

  if (activeIncidents > 0) {
    throw new ValidationError(`Cannot deactivate area with ${activeIncidents} active incidents`);
  }

  // Deactivate area
  await dbQuery(
    'UPDATE areas SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

  // Log area deactivation
  await auditLog({
    action: AUDIT_ACTIONS.AREA_DEACTIVATED,
    userId: req.user.id,
    username: req.user.username,
    resource: 'area',
    resourceId: id,
    details: {
      areaName: existingArea.name
    },
    ipAddress: req.ip
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Area deactivated successfully'
  });
}));

// GET /api/areas/:id/incidents - Get incidents for specific area
router.get('/:id/incidents', authenticate, [
  param('id').custom(customValidators.isUUID).withMessage('Invalid area ID format')
], validateRequest, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20, status = null } = req.query;
  const offset = (page - 1) * limit;

  // Check if area exists
  const areaResult = await dbQuery(
    'SELECT name FROM areas WHERE id = $1',
    [id]
  );

  if (areaResult.rows.length === 0) {
    throw new NotFoundError('Area not found');
  }

  let whereConditions = ['i.area_id = $1'];
  let queryParams = [id];
  let paramIndex = 2;

  if (status) {
    whereConditions.push(`i.status = $${paramIndex++}`);
    queryParams.push(status);
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  // Count total incidents for this area
  const countResult = await dbQuery(
    `SELECT COUNT(*) as total 
     FROM incidents i 
     ${whereClause}`,
    queryParams
  );

  const total = parseInt(countResult.rows[0].total);

  // Get incidents for this area
  const incidentsResult = await dbQuery(
    `SELECT 
       i.id,
       i.description,
       i.timestamp,
       i.status,
       i.created_at,
       u.username as operator_username
     FROM incidents i
     JOIN users u ON i.operator_id = u.id
     ${whereClause}
     ORDER BY i.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...queryParams, limit, offset]
  );

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      areaName: areaResult.rows[0].name,
      incidents: incidentsResult.rows,
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