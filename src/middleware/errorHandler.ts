import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler middleware
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message } = error;

  // Log error details
  logger.error('API Error:', {
    message: error.message,
    statusCode,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry found';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && !error.isOperational) {
    message = 'Something went wrong';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    })
  });
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn('Route not found:', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error formatter
export const formatValidationErrors = (errors: any[]) => {
  return errors.map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value
  }));
};

// Database error handler
export const handleDatabaseError = (error: any): AppError => {
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((err: any) => err.message);
    return new AppError(`Validation Error: ${messages.join(', ')}`, 400);
  }
  
  if (error.name === 'CastError') {
    return new AppError('Invalid ID format', 400);
  }
  
  if (error.name === 'MongoError' && error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return new AppError(`${field} already exists`, 409);
  }
  
  return new AppError('Database operation failed', 500);
};

// Kafka error handler
export const handleKafkaError = (error: any): AppError => {
  if (error.name === 'KafkaJSError') {
    return new AppError('Kafka operation failed', 503);
  }
  
  return new AppError('Message processing failed', 500);
};

// Custom error creators
export const createNotFoundError = (resource: string = 'Resource'): AppError => {
  return new AppError(`${resource} not found`, 404);
};

export const createUnauthorizedError = (message: string = 'Unauthorized'): AppError => {
  return new AppError(message, 401);
};

export const createForbiddenError = (message: string = 'Forbidden'): AppError => {
  return new AppError(message, 403);
};

export const createBadRequestError = (message: string = 'Bad request'): AppError => {
  return new AppError(message, 400);
};

export const createConflictError = (message: string = 'Conflict'): AppError => {
  return new AppError(message, 409);
};

export const createInternalServerError = (message: string = 'Internal server error'): AppError => {
  return new AppError(message, 500);
};


