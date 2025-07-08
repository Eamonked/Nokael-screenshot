const express = require('express');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { 
  login, 
  logout, 
  refreshToken, 
  authenticate 
} = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { HTTP_STATUS } = require('../../shared/types');

const router = express.Router();

// Login validation rules
const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
];

// Refresh token validation rules
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// POST /api/auth/login
router.post('/login', loginValidation, validateRequest, login);

// POST /api/auth/logout
router.post('/logout', authenticate, logout);

// POST /api/auth/refresh
router.post('/refresh', refreshTokenValidation, validateRequest, refreshToken);

// GET /api/auth/me - Get current user info
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: {
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      }
    }
  });
}));

module.exports = router; 