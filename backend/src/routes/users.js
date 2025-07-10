const express = require('express');
const { body, param, query } = require('express-validator');
const { validateRequest, customValidators } = require('../middleware/validation');
const { authenticate, adminOnly, hashPassword } = require('../middleware/auth');
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
  AUDIT_ACTIONS, 
  USER_ROLES,
  PAGINATION 
} = require('../../shared/types/index');

const router = express.Router();

// User creation validation
const createUserValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('role')
    .isIn(Object.values(USER_ROLES))
    .withMessage('Invalid role value')
];

// User update validation
const updateUserValidation = [
  param('id')
    .custom(customValidators.isUUID)
    .withMessage('Invalid user ID format'),
  
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  
  body('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Invalid role value'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Password reset validation
const resetPasswordValidation = [
  param('id')
    .custom(customValidators.isUUID)
    .withMessage('Invalid user ID format'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// POST /api/users - Create new user (admin only)
router.post('/', authenticate, adminOnly, createUserValidation, validateRequest, asyncHandler(async (req, res) => {
  const { username, password, role } = req.body;

  // Check if username already exists
  const existingUser = await dbQuery(
    'SELECT id FROM users WHERE username = $1',
    [username]
  );

  if (existingUser.rows.length > 0) {
    throw new ConflictError('Username already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const userResult = await dbQuery(
    `INSERT INTO users (username, password_hash, role, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING id, username, role, is_active, created_at`,
    [username, passwordHash, role]
  );

  const newUser = userResult.rows[0];

  // Log user creation
  await auditLog({
    action: AUDIT_ACTIONS.USER_CREATED,
    userId: req.user.id,
    username: req.user.username,
    resource: 'user',
    resourceId: newUser.id,
    details: {
      createdUsername: username,
      role
    },
    ipAddress: req.ip
  });

  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'User created successfully',
    data: {
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        isActive: newUser.is_active,
        createdAt: newUser.created_at
      }
    }
  });
}));

// GET /api/users - List users with pagination and filtering (admin only)
router.get('/', authenticate, adminOnly, asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    role = null,
    isActive = null,
    search = null
  } = req.query;

  const offset = (page - 1) * limit;
  const actualLimit = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);

  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  // Build WHERE conditions
  if (role) {
    whereConditions.push(`role = $${paramIndex++}`);
    queryParams.push(role);
  }

  if (isActive !== null && isActive !== undefined) {
    whereConditions.push(`is_active = $${paramIndex++}`);
    queryParams.push(isActive === 'true');
  }

  if (search) {
    whereConditions.push(`username ILIKE $${paramIndex++}`);
    queryParams.push(`%${search}%`);
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}` 
    : '';

  // Count total
  const countResult = await dbQuery(
    `SELECT COUNT(*) as total FROM users ${whereClause}`,
    queryParams
  );

  const total = parseInt(countResult.rows[0].total);

  // Get users
  const usersResult = await dbQuery(
    `SELECT 
       id,
       username,
       role,
       is_active,
       created_at,
       last_login
     FROM users 
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...queryParams, actualLimit, offset]
  );

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      users: usersResult.rows,
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

// GET /api/users/:id - Get user by ID (admin only)
router.get('/:id', authenticate, adminOnly, [
  param('id').custom(customValidators.isUUID).withMessage('Invalid user ID format')
], validateRequest, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await dbQuery(
    `SELECT 
       id,
       username,
       role,
       is_active,
       created_at,
       last_login
     FROM users 
     WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      user: result.rows[0]
    }
  });
}));

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', authenticate, adminOnly, updateUserValidation, validateRequest, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { username, role, isActive } = req.body;

  // Check if user exists
  const existingResult = await dbQuery(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const existingUser = existingResult.rows[0];

  // Check if username is being changed and if it already exists
  if (username && username !== existingUser.username) {
    const usernameCheck = await dbQuery(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, id]
    );

    if (usernameCheck.rows.length > 0) {
      throw new ConflictError('Username already exists');
    }
  }

  // Build update query
  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  if (username) {
    updateFields.push(`username = $${paramIndex++}`);
    updateValues.push(username);
  }

  if (role) {
    updateFields.push(`role = $${paramIndex++}`);
    updateValues.push(role);
  }

  if (isActive !== undefined) {
    updateFields.push(`is_active = $${paramIndex++}`);
    updateValues.push(isActive);
  }

  if (updateFields.length === 0) {
    throw new ValidationError('No fields to update');
  }

  updateValues.push(id);

  // Update user
  await dbQuery(
    `UPDATE users 
     SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramIndex++}`,
    updateValues
  );

  // Log user update
  await auditLog({
    action: AUDIT_ACTIONS.USER_UPDATED,
    userId: req.user.id,
    username: req.user.username,
    resource: 'user',
    resourceId: id,
    details: {
      updatedFields: Object.keys(req.body),
      previousUsername: existingUser.username,
      newUsername: username,
      previousRole: existingUser.role,
      newRole: role,
      previousIsActive: existingUser.is_active,
      newIsActive: isActive
    },
    ipAddress: req.ip
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'User updated successfully'
  });
}));

// POST /api/users/:id/reset-password - Reset user password (admin only)
router.post('/:id/reset-password', authenticate, adminOnly, resetPasswordValidation, validateRequest, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  // Check if user exists
  const existingResult = await dbQuery(
    'SELECT username FROM users WHERE id = $1',
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const existingUser = existingResult.rows[0];

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  await dbQuery(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, id]
  );

  // Log password reset
  await auditLog({
    action: AUDIT_ACTIONS.PASSWORD_RESET,
    userId: req.user.id,
    username: req.user.username,
    resource: 'user',
    resourceId: id,
    details: {
      targetUsername: existingUser.username
    },
    ipAddress: req.ip
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Password reset successfully'
  });
}));

// PATCH /api/users/:id/activate - Activate user (admin only)
router.patch('/:id/activate', authenticate, adminOnly, [
  param('id').custom(customValidators.isUUID).withMessage('Invalid user ID format')
], validateRequest, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user exists and is currently inactive
  const existingResult = await dbQuery(
    'SELECT username, is_active FROM users WHERE id = $1',
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const existingUser = existingResult.rows[0];

  if (existingUser.is_active) {
    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: 'User is already active'
    });
  }

  // Activate user
  await dbQuery(
    'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

  // Log user activation
  await auditLog({
    action: AUDIT_ACTIONS.USER_REACTIVATED,
    userId: req.user.id,
    username: req.user.username,
    resource: 'user',
    resourceId: id,
    details: {
      targetUsername: existingUser.username
    },
    ipAddress: req.ip
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'User activated successfully'
  });
}));

// PATCH /api/users/:id/deactivate - Deactivate user (admin only)
router.patch('/:id/deactivate', authenticate, adminOnly, [
  param('id').custom(customValidators.isUUID).withMessage('Invalid user ID format')
], validateRequest, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user exists and is currently active
  const existingResult = await dbQuery(
    'SELECT username, is_active FROM users WHERE id = $1',
    [id]
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const existingUser = existingResult.rows[0];

  if (!existingUser.is_active) {
    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: 'User is already inactive'
    });
  }

  // Prevent deactivating self
  if (id === req.user.id) {
    throw new ValidationError('Cannot deactivate your own account');
  }

  // Deactivate user
  await dbQuery(
    'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

  // Log user deactivation
  await auditLog({
    action: AUDIT_ACTIONS.USER_DEACTIVATED,
    userId: req.user.id,
    username: req.user.username,
    resource: 'user',
    resourceId: id,
    details: {
      targetUsername: existingUser.username
    },
    ipAddress: req.ip
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'User deactivated successfully'
  });
}));

module.exports = router; 