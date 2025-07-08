const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../database/connection');
const { auditLog } = require('../services/auditService');
const { 
  AuthenticationError, 
  AuthorizationError,
  asyncHandler 
} = require('./errorHandler');
const { 
  USER_ROLES, 
  AUDIT_ACTIONS, 
  HTTP_STATUS 
} = require('../../../shared/types/index');

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
};

// Authentication middleware
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Access token required');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token);

  // Get user from database
  const result = await query(
    'SELECT id, username, role, is_active, last_login FROM users WHERE id = $1',
    [decoded.userId]
  );

  if (result.rows.length === 0) {
    throw new AuthenticationError('User not found');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw new AuthenticationError('User account is deactivated');
  }

  // Update last login if it's been more than 1 hour
  const lastLogin = user.last_login ? new Date(user.last_login) : null;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  if (!lastLogin || lastLogin < oneHourAgo) {
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
  }

  // Add user to request object
  req.user = user;
  next();
});

// Role-based authorization middleware
const authorize = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError(`Access denied. Required roles: ${roles.join(', ')}`);
    }

    next();
  });
};

// Admin only middleware
const adminOnly = authorize(USER_ROLES.ADMIN);

// Admin or operator middleware
const adminOrOperator = authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR);

// Admin, operator, or viewer middleware
const anyAuthenticatedUser = authorize(USER_ROLES.ADMIN, USER_ROLES.OPERATOR, USER_ROLES.VIEWER);

// Hash password
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate JWT token
const generateToken = (userId, role) => {
  const payload = {
    userId,
    role,
    type: 'access'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '2h'
  });
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  const payload = {
    userId,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

// Login with audit logging
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    throw new AuthenticationError('Username and password are required');
  }

  // Get user from database
  const result = await query(
    'SELECT id, username, password_hash, role, is_active FROM users WHERE username = $1',
    [username]
  );

  if (result.rows.length === 0) {
    // Log failed login attempt
    await auditLog({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      username,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { reason: 'User not found' }
    });

    throw new AuthenticationError('Invalid credentials');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    // Log failed login attempt
    await auditLog({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      username,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { reason: 'Account deactivated' }
    });

    throw new AuthenticationError('Account is deactivated');
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.password_hash);
  
  if (!isValidPassword) {
    // Log failed login attempt
    await auditLog({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      username,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { reason: 'Invalid password' }
    });

    throw new AuthenticationError('Invalid credentials');
  }

  // Update last login
  await query(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  // Generate tokens
  const accessToken = generateToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  // Log successful login
  await auditLog({
    action: AUDIT_ACTIONS.LOGIN,
    userId: user.id,
    username: user.username,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      accessToken,
      refreshToken
    }
  });
});

// Logout with audit logging
const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    // Log logout
    await auditLog({
      action: AUDIT_ACTIONS.LOGOUT,
      userId: req.user.id,
      username: req.user.username,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Logout successful'
  });
});

// Refresh token
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AuthenticationError('Refresh token required');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new AuthenticationError('Invalid token type');
    }

    // Get user from database
    const result = await query(
      'SELECT id, username, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      throw new AuthenticationError('User not found or inactive');
    }

    const user = result.rows[0];

    // Generate new access token
    const newAccessToken = generateToken(user.id, user.role);

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    throw new AuthenticationError('Invalid refresh token');
  }
});

module.exports = {
  authenticate,
  authorize,
  adminOnly,
  adminOrOperator,
  anyAuthenticatedUser,
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  login,
  logout,
  refreshToken
}; 