import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { logger } from '../utils/logger';
import { Event } from '../models/Event';
import { User } from '../models/User';

export class KafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private isRunning = false;
  private topics: string[] = [];

  constructor() {
    const kafkaConfig = {
      clientId: 'api-consumer',
      brokers: [process.env.KAFKA_BROKERS || 'kafka-service:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      },
      connectionTimeout: 3000,
      requestTimeout: 25000,
    };

    this.kafka = new Kafka(kafkaConfig);
    this.consumer = this.kafka.consumer({ 
      groupId: 'api-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576, // 1MB
      allowAutoTopicCreation: true,
    });

    // Set default topics
    this.topics = [
      'user-events',
      'system-events',
      'notification-events',
      'order-events',
      'purchase-events'
    ];
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Kafka consumer is already running');
      return;
    }

    try {
      logger.info('Starting Kafka consumer...', { 
        brokers: (this.kafka as any).config.brokers,
        groupId: (this.consumer as any).config.groupId 
      });

      await this.consumer.connect();
      logger.info('Connected to Kafka cluster');

      // Subscribe to topics
      await this.consumer.subscribe({ 
        topics: this.topics,
        fromBeginning: false 
      });

      logger.info('Subscribed to topics:', this.topics);

      // Start consuming messages
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      this.isRunning = true;
      logger.info('Kafka consumer started successfully');

    } catch (error) {
      logger.error('Failed to start Kafka consumer:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Kafka consumer is not running');
      return;
    }

    try {
      logger.info('Stopping Kafka consumer...');
      await this.consumer.disconnect();
      this.isRunning = false;
      logger.info('Kafka consumer stopped successfully');
    } catch (error) {
      logger.error('Error stopping Kafka consumer:', error);
      throw error;
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    
    try {
      const messageValue = message.value?.toString();
      if (!messageValue) {
        logger.warn('Received empty message', { topic, partition, offset: message.offset });
        return;
      }

      logger.info('Processing Kafka message', {
        topic,
        partition,
        offset: message.offset,
        timestamp: message.timestamp,
        key: message.key?.toString()
      });

      // Parse the message
      const eventData = JSON.parse(messageValue);
      
      // Store the event in MongoDB
      await this.storeEvent({
        type: eventData.type || 'custom',
        userId: eventData.userId,
        data: eventData.data || eventData,
        source: 'kafka',
        timestamp: new Date(message.timestamp || Date.now()),
        processed: false,
        metadata: {
          kafkaOffset: parseInt(message.offset),
          kafkaPartition: partition,
          kafkaTopic: topic,
          retryCount: 0
        }
      });

      // Process the event based on type
      await this.processEvent(eventData, topic);

      logger.info('Successfully processed Kafka message', {
        topic,
        partition,
        offset: message.offset
      });

    } catch (error) {
      logger.error('Error processing Kafka message:', {
        error: error.message,
        topic,
        partition,
        offset: message.offset,
        message: message.value?.toString()
      });

      // Store failed event for retry
      await this.storeFailedEvent(payload, error);
    }
  }

  private async storeEvent(eventData: any): Promise<void> {
    try {
      const event = new Event(eventData);
      await event.save();
      logger.debug('Event stored in MongoDB', { eventId: event._id, type: event.type });
    } catch (error) {
      logger.error('Failed to store event in MongoDB:', error);
      throw error;
    }
  }

  private async processEvent(eventData: any, topic: string): Promise<void> {
    const { type, data, userId } = eventData;

    try {
      switch (type) {
        case 'user.created':
          await this.handleUserCreated(data);
          break;
        case 'user.updated':
          await this.handleUserUpdated(userId, data);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(userId);
          break;
        case 'order.created':
          await this.handleOrderCreated(data);
          break;
        case 'notification.sent':
          await this.handleNotificationSent(data);
          break;
        case 'purchase.created':
          await this.handlePurchaseCreated(data);
          break;
        default:
          logger.info('No specific handler for event type', { type, topic });
      }
    } catch (error) {
      logger.error('Error processing event:', { type, error: error.message });
      throw error;
    }
  }

  private async handleUserCreated(data: any): Promise<void> {
    try {
      const user = new User({
        ...data,
        metadata: {
          source: 'kafka',
          tags: ['kafka-import'],
          preferences: {}
        }
      });
      
      await user.save();
      logger.info('User created from Kafka event', { userId: user._id, email: user.email });
    } catch (error) {
      if (error.code === 11000) {
        logger.warn('User already exists, skipping creation', { email: data.email });
      } else {
        throw error;
      }
    }
  }

  private async handleUserUpdated(userId: string, data: any): Promise<void> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { 
          ...data,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      if (user) {
        logger.info('User updated from Kafka event', { userId, email: user.email });
      } else {
        logger.warn('User not found for update', { userId });
      }
    } catch (error) {
      logger.error('Error updating user from Kafka:', error);
      throw error;
    }
  }

  private async handleUserDeleted(userId: string): Promise<void> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
      );

      if (user) {
        logger.info('User deactivated from Kafka event', { userId, email: user.email });
      } else {
        logger.warn('User not found for deletion', { userId });
      }
    } catch (error) {
      logger.error('Error deleting user from Kafka:', error);
      throw error;
    }
  }

  private async handleOrderCreated(data: any): Promise<void> {
    // Handle order creation logic
    logger.info('Order created from Kafka event', { orderId: data.id, userId: data.userId });
  }

  private async handleNotificationSent(data: any): Promise<void> {
    // Handle notification sent logic
    logger.info('Notification sent from Kafka event', { 
      notificationId: data.id, 
      userId: data.userId,
      type: data.notificationType 
    });
  }

  private async handlePurchaseCreated(data: any): Promise<void> {
    try {
      logger.info('Purchase created from Kafka event', { 
        userId: data.userId,
        username: data.username,
        price: data.data.price,
        product: data.data.product
      });

      // Here you could add additional business logic like:
      // - Update user purchase history
      // - Send confirmation email
      // - Update inventory
      // - Trigger payment processing
      // - Send analytics events

      // For now, we'll just log the purchase details
      logger.info('Purchase processed successfully', {
        userId: data.userId,
        username: data.username,
        price: data.data.price,
        product: data.data.product,
        category: data.data.category,
        timestamp: data.data.timestamp
      });

    } catch (error) {
      logger.error('Error processing purchase:', error);
      throw error;
    }
  }

  private async storeFailedEvent(payload: EachMessagePayload, error: any): Promise<void> {
    try {
      const { topic, partition, message } = payload;
      
      const failedEvent = new Event({
        type: 'system.error',
        data: {
          originalMessage: message.value?.toString(),
          error: error.message,
          topic,
          partition,
          offset: message.offset
        },
        source: 'kafka',
        timestamp: new Date(),
        processed: false,
        metadata: {
          kafkaOffset: parseInt(message.offset),
          kafkaPartition: partition,
          kafkaTopic: topic,
          retryCount: 1,
          errorMessage: error.message
        }
      });

      await failedEvent.save();
      logger.info('Failed event stored for retry', { eventId: failedEvent._id });
    } catch (storeError) {
      logger.error('Failed to store failed event:', storeError);
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      topics: this.topics,
      groupId: (this.consumer as any).config.groupId,
      brokers: (this.kafka as any).config.brokers
    };
  }

  public async addTopic(topic: string): Promise<void> {
    if (!this.topics.includes(topic)) {
      this.topics.push(topic);
      if (this.isRunning) {
        await this.consumer.subscribe({ topics: [topic], fromBeginning: false });
        logger.info('Added new topic to consumer', { topic });
      }
    }
  }

  public async removeTopic(topic: string): Promise<void> {
    const index = this.topics.indexOf(topic);
    if (index > -1) {
      this.topics.splice(index, 1);
      logger.info('Removed topic from consumer', { topic });
    }
  }
}

export const kafkaConsumer = new KafkaConsumer();
