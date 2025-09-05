import { body, param, query, ValidationChain } from 'express-validator';

// User validation rules
export const validateUser: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('age')
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage('Age must be between 0 and 150'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  
  body('metadata.tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('metadata.tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  
  body('metadata.preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
];

export const validateUserUpdate: ValidationChain[] = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('age')
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage('Age must be between 0 and 150'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  
  body('metadata.tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('metadata.tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  
  body('metadata.preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
];

// Event validation rules
export const validateEvent: ValidationChain[] = [
  body('type')
    .isIn([
      'user.created',
      'user.updated',
      'user.deleted',
      'user.login',
      'user.logout',
      'order.created',
      'order.updated',
      'order.cancelled',
      'payment.processed',
      'notification.sent',
      'purchase.created',
      'purchase.updated',
      'purchase.cancelled',
      'system.health',
      'custom'
    ])
    .withMessage('Invalid event type'),
  
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('data')
    .isObject()
    .withMessage('Data must be an object'),
  
  body('source')
    .optional()
    .isIn(['api', 'kafka', 'system', 'webhook'])
    .withMessage('Invalid source type'),
  
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO 8601 date'),
  
  body('processed')
    .optional()
    .isBoolean()
    .withMessage('Processed must be a boolean value')
];

// Query parameter validation
export const validatePagination: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
];

export const validateDateRange: ValidationChain[] = [
  query('fromDate')
    .optional()
    .isISO8601()
    .withMessage('fromDate must be a valid ISO 8601 date'),
  
  query('toDate')
    .optional()
    .isISO8601()
    .withMessage('toDate must be a valid ISO 8601 date')
];

// MongoDB ID validation
export const validateMongoId = (paramName: string = 'id'): ValidationChain => {
  return param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`);
};

// Custom validation for user ID in events
export const validateUserId = (): ValidationChain => {
  return body('userId')
    .optional()
    .custom((value) => {
      if (value && !/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Invalid user ID format');
      }
      return true;
    });
};

// Custom validation for event type
export const validateEventType = (): ValidationChain => {
  return body('type')
    .custom((value) => {
      const validTypes = [
        'user.created',
        'user.updated',
        'user.deleted',
        'user.login',
        'user.logout',
        'order.created',
        'order.updated',
        'order.cancelled',
        'payment.processed',
        'notification.sent',
        'purchase.created',
        'purchase.updated',
        'purchase.cancelled',
        'system.health',
        'custom'
      ];
      
      if (!validTypes.includes(value)) {
        throw new Error(`Invalid event type. Must be one of: ${validTypes.join(', ')}`);
      }
      return true;
    });
};

// Validation for retry endpoint
export const validateRetryParams: ValidationChain[] = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];
