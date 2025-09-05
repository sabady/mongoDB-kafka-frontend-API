import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Rate limiting configuration
const rateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.url.startsWith('/health');
  }
};

// Create rate limiter instance
export const rateLimiter = rateLimit(rateLimitConfig);

// Strict rate limiter for sensitive operations
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many sensitive requests from this IP, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Strict rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      success: false,
      message: 'Too many sensitive requests from this IP, please try again later.',
      retryAfter: 900
    });
  }
});

// Login rate limiter
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Login rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      success: false,
      message: 'Too many login attempts from this IP, please try again later.',
      retryAfter: 900
    });
  }
});

// API key rate limiter (for external API access)
export const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each API key to 60 requests per minute
  keyGenerator: (req: Request) => {
    // Use API key from header or query parameter
    return req.headers['x-api-key'] as string || req.query.apiKey as string || req.ip;
  },
  message: {
    success: false,
    message: 'API rate limit exceeded, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const apiKey = req.headers['x-api-key'] as string || req.query.apiKey as string;
    
    logger.warn('API key rate limit exceeded:', {
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'none',
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      success: false,
      message: 'API rate limit exceeded, please try again later.',
      retryAfter: 60
    });
  }
});

// Custom rate limiter factory
export const createCustomRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skip?: (req: Request) => boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      message: options.message || 'Rate limit exceeded, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: options.skip,
    handler: (req: Request, res: Response) => {
      logger.warn('Custom rate limit exceeded:', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        limit: options.max,
        windowMs: options.windowMs
      });

      res.status(429).json({
        success: false,
        message: options.message || 'Rate limit exceeded, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  });
};


