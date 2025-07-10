const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_TYPES } = require('../../shared/types/index');

// Custom error classes
class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = ERROR_TYPES.VALIDATION;
    this.statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    this.details = details;
  }
}

class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = ERROR_TYPES.AUTHENTICATION;
    this.statusCode = HTTP_STATUS.UNAUTHORIZED;
  }
}

class AuthorizationError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = ERROR_TYPES.AUTHORIZATION;
    this.statusCode = HTTP_STATUS.FORBIDDEN;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = ERROR_TYPES.NOT_FOUND;
    this.statusCode = HTTP_STATUS.NOT_FOUND;
  }
}

class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = ERROR_TYPES.CONFLICT;
    this.statusCode = HTTP_STATUS.CONFLICT;
  }
}

class InternalServerError extends Error {
  constructor(message = 'Internal server error') {
    super(message);
    this.name = ERROR_TYPES.INTERNAL;
    this.statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }
}

// Centralized error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Handle specific error types
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    error = new ValidationError('Validation failed', error.message);
  }

  if (error.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }

  if (error.code === '23505') { // PostgreSQL unique constraint violation
    error = new ConflictError('Resource already exists');
  }

  if (error.code === '23503') { // PostgreSQL foreign key constraint violation
    error = new ValidationError('Referenced resource does not exist');
  }

  // Set default status code if not set
  if (!error.statusCode) {
    error.statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }

  // Set default error message if not set
  if (!error.message) {
    error.message = 'An unexpected error occurred';
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    status: 'error',
    message: error.message,
    ...(isDevelopment && { stack: error.stack }),
    ...(error.details && { details: error.details }),
    ...(isDevelopment && { name: error.name })
  };

  // Send error response
  res.status(error.statusCode).json(errorResponse);
};

// Async error wrapper for route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  res.status(error.statusCode).json({
    status: 'error',
    message: error.message
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InternalServerError
}; 