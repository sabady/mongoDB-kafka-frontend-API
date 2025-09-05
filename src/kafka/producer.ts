import { Kafka, Producer } from 'kafkajs';
import { logger } from '../utils/logger';

export class KafkaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor() {
    const kafkaConfig = {
      clientId: 'api-producer',
      brokers: [process.env.KAFKA_BROKERS || 'kafka-service:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      },
      connectionTimeout: 3000,
      requestTimeout: 25000,
    };

    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    });
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Kafka producer already connected');
      return;
    }

    try {
      logger.info('Connecting Kafka producer...', { 
        brokers: (this.kafka as any).config.brokers 
      });

      await this.producer.connect();
      this.isConnected = true;
      
      logger.info('Kafka producer connected successfully');

    } catch (error) {
      logger.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      logger.info('Kafka producer not connected');
      return;
    }

    try {
      logger.info('Disconnecting Kafka producer...');
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('Kafka producer disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting Kafka producer:', error);
      throw error;
    }
  }

  public async sendMessage(topic: string, message: any, key?: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    try {
      const messageValue = JSON.stringify(message);
      
      logger.info('Sending message to Kafka', {
        topic,
        key,
        messageSize: messageValue.length,
        messageType: message.type
      });

      const result = await this.producer.send({
        topic,
        messages: [{
          key: key || message.userId || 'default',
          value: messageValue,
          timestamp: Date.now().toString(),
          headers: {
            'content-type': 'application/json',
            'source': 'api',
            'message-type': message.type || 'unknown'
          }
        }]
      });

      logger.info('Message sent successfully', {
        topic,
        partition: result[0].partition,
        offset: result[0].offset,
        messageType: message.type
      });

    } catch (error) {
      logger.error('Error sending message to Kafka:', {
        topic,
        error: error.message,
        message: message
      });
      throw error;
    }
  }

  public async sendPurchaseEvent(purchaseData: any): Promise<void> {
    const message = {
      type: 'purchase.created',
      userId: purchaseData.userId,
      username: purchaseData.username,
      data: {
        price: purchaseData.data.price,
        timestamp: purchaseData.data.timestamp,
        product: purchaseData.data.product,
        category: purchaseData.data.category,
        source: 'web'
      },
      source: 'web',
      timestamp: new Date().toISOString()
    };

    await this.sendMessage('purchase-events', message, purchaseData.userId);
  }

  public async sendUserEvent(eventType: string, userId: string, data: any): Promise<void> {
    const message = {
      type: eventType,
      userId,
      data,
      source: 'api',
      timestamp: new Date().toISOString()
    };

    await this.sendMessage('user-events', message, userId);
  }

  public async sendSystemEvent(eventType: string, data: any): Promise<void> {
    const message = {
      type: eventType,
      data,
      source: 'system',
      timestamp: new Date().toISOString()
    };

    await this.sendMessage('system-events', message);
  }

  public getStatus() {
    return {
      isConnected: this.isConnected,
      brokers: (this.kafka as any).config.brokers,
      clientId: (this.kafka as any).config.clientId
    };
  }
}

export const kafkaProducer = new KafkaProducer();
