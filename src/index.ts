import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { databaseConnection } from './database/connection';
import { kafkaConsumer } from './kafka/consumer';
import { kafkaProducer } from './kafka/producer';
import { logger, morganStream } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import path from 'path';

// Import routes
import userRoutes from './routes/userRoutes';
import eventRoutes from './routes/eventRoutes';
import healthRoutes from './routes/healthRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// HTTP request logging
app.use(morgan('combined', { stream: morganStream }));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      (res as any).status(400).json({
        success: false,
        message: 'Invalid JSON payload'
      });
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Basic route
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'API Server',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        users: '/api/users',
        events: '/api/events',
        health: '/health'
      }
    }
  });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/health', healthRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  try {
    // Stop accepting new requests
    server.close(async () => {
      logger.info('HTTP server closed');
      
      // Close database connection
      await databaseConnection.disconnect();
      logger.info('Database connection closed');
      
      // Stop Kafka consumer
      await kafkaConsumer.stop();
      logger.info('Kafka consumer stopped');
      
      // Disconnect Kafka producer
      await kafkaProducer.disconnect();
      logger.info('Kafka producer disconnected');
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Initialize services
const initializeServices = async () => {
  try {
    // Connect to database
    await databaseConnection.connect();
    logger.info('Database connected successfully');
    
    // Connect to Kafka producer
    await kafkaProducer.connect();
    logger.info('Kafka producer connected successfully');
    
    // Start Kafka consumer
    await kafkaConsumer.start();
    logger.info('Kafka consumer started successfully');
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`🚀 API Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 CORS Origins: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000'}`);
  logger.info(`📝 Log Level: ${process.env.LOG_LEVEL || 'info'}`);
  
  // Initialize services after server starts
  await initializeServices();
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

export default app;