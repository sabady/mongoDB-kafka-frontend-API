import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { kafkaProducer } from './kafka/producer';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.KAFKA_PRODUCER_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// HTTP request logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  const status = kafkaProducer.getStatus();
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      kafka: status
    }
  });
});

// Produce message endpoint
app.post('/produce', async (req, res) => {
  try {
    const { topic, message } = req.body;

    if (!topic || !message) {
      return res.status(400).json({
        success: false,
        message: 'Topic and message are required'
      });
    }

    // Validate message structure
    if (!message.type) {
      return res.status(400).json({
        success: false,
        message: 'Message type is required'
      });
    }

    logger.info('Received produce request', {
      topic,
      messageType: message.type,
      userId: message.userId
    });

    // Send message to Kafka
    await kafkaProducer.sendMessage(topic, message, message.userId);

    res.json({
      success: true,
      message: 'Message sent to Kafka successfully',
      data: {
        topic,
        messageType: message.type,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error producing message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message to Kafka',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Purchase event endpoint
app.post('/purchase', async (req, res) => {
  try {
    const purchaseData = req.body;

    // Validate required fields
    if (!purchaseData.userId || !purchaseData.username || !purchaseData.data) {
      return res.status(400).json({
        success: false,
        message: 'userId, username, and data are required'
      });
    }

    logger.info('Received purchase request', {
      userId: purchaseData.userId,
      username: purchaseData.username,
      price: purchaseData.data.price
    });

    // Send purchase event to Kafka
    await kafkaProducer.sendPurchaseEvent(purchaseData);

    res.json({
      success: true,
      message: 'Purchase event sent to Kafka successfully',
      data: {
        userId: purchaseData.userId,
        username: purchaseData.username,
        price: purchaseData.data.price,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error processing purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process purchase',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

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
    // Connect to Kafka producer
    await kafkaProducer.connect();
    logger.info('Kafka producer connected successfully');
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`🚀 Kafka Producer Service running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 CORS Origins: ${process.env.ALLOWED_ORIGINS || 'http://localhost:3000'}`);
  
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


