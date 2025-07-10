const { validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');
const { HTTP_STATUS } = require('../../shared/types/index');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    const error = new ValidationError('Validation failed', errorDetails);
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
      details: error.details
    });
  }
  
  next();
};

// Custom validation helpers
const isValidUUID = (value) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

const isValidDate = (value) => {
  const date = new Date(value);
  return date instanceof Date && !isNaN(date);
};

const isValidIP = (value) => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(value);
};

// Custom validators for express-validator
const customValidators = {
  isUUID: (value) => {
    if (!value) return true; // Allow empty values, use .notEmpty() if required
    return isValidUUID(value);
  },
  
  isDate: (value) => {
    if (!value) return true;
    return isValidDate(value);
  },
  
  isIP: (value) => {
    if (!value) return true;
    return isValidIP(value);
  },
  
  isLicenseKey: (value) => {
    if (!value) return true;
    // License key format: XXXX-XXXX-XXXX-XXXX
    const licenseRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return licenseRegex.test(value);
  },
  
  isWorkstationId: (value) => {
    if (!value) return true;
    // Workstation ID should be alphanumeric with hyphens/underscores
    const workstationRegex = /^[a-zA-Z0-9_-]+$/;
    return workstationRegex.test(value) && value.length <= 255;
  },
  
  isHostname: (value) => {
    if (!value) return true;
    // Hostname validation
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return hostnameRegex.test(value) && value.length <= 255;
  }
};

module.exports = {
  validateRequest,
  isValidUUID,
  isValidDate,
  isValidIP,
  customValidators
}; 