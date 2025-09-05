import { Request, Response } from 'express';
import { databaseConnection } from '../database/connection';
import { kafkaConsumer } from '../kafka/consumer';
import { logger } from '../utils/logger';

export class HealthController {
  // Basic health check
  public async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      res.status(200).json({
        success: true,
        data: health
      });

    } catch (error) {
      logger.error('Health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Detailed health check with dependencies
  public async detailedHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const checks = {
        api: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        },
        database: await this.checkDatabase(),
        kafka: await this.checkKafka(),
        system: {
          status: 'healthy',
          platform: process.platform,
          nodeVersion: process.version,
          pid: process.pid,
          cpuUsage: process.cpuUsage()
        }
      };

      // Determine overall status
      const overallStatus = this.determineOverallStatus(checks);
      const statusCode = overallStatus === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: overallStatus === 'healthy',
        data: {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          checks
        }
      });

    } catch (error) {
      logger.error('Detailed health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Readiness check for Kubernetes
  public async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      const checks = {
        database: await this.checkDatabase(),
        kafka: await this.checkKafka()
      };

      const isReady = checks.database.status === 'healthy' && 
                     checks.kafka.status === 'healthy';

      const statusCode = isReady ? 200 : 503;

      res.status(statusCode).json({
        success: isReady,
        data: {
          ready: isReady,
          timestamp: new Date().toISOString(),
          checks
        }
      });

    } catch (error) {
      logger.error('Readiness check error:', error);
      res.status(503).json({
        success: false,
        message: 'Service not ready',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Liveness check for Kubernetes
  public async livenessCheck(req: Request, res: Response): Promise<void> {
    try {
      // Simple liveness check - if the process is running, it's alive
      res.status(200).json({
        success: true,
        data: {
          alive: true,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          pid: process.pid
        }
      });

    } catch (error) {
      logger.error('Liveness check error:', error);
      res.status(500).json({
        success: false,
        message: 'Service not alive',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get system metrics
  public async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: process.memoryUsage().rss,
          heapTotal: process.memoryUsage().heapTotal,
          heapUsed: process.memoryUsage().heapUsed,
          external: process.memoryUsage().external,
          arrayBuffers: process.memoryUsage().arrayBuffers
        },
        cpu: process.cpuUsage(),
        database: await this.getDatabaseMetrics(),
        kafka: await this.getKafkaMetrics()
      };

      res.status(200).json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Private helper methods
  private async checkDatabase(): Promise<any> {
    try {
      const isConnected = databaseConnection.getConnectionStatus();
      const connectionInfo = databaseConnection.getConnectionInfo();

      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        connected: isConnected,
        connectionInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async checkKafka(): Promise<any> {
    try {
      const kafkaStatus = kafkaConsumer.getStatus();

      return {
        status: kafkaStatus.isRunning ? 'healthy' : 'unhealthy',
        running: kafkaStatus.isRunning,
        topics: kafkaStatus.topics,
        groupId: kafkaStatus.groupId,
        brokers: kafkaStatus.brokers,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        running: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async getDatabaseMetrics(): Promise<any> {
    try {
      const connectionInfo = databaseConnection.getConnectionInfo();
      
      return {
        connected: connectionInfo.isConnected,
        readyState: connectionInfo.readyState,
        host: connectionInfo.host,
        port: connectionInfo.port,
        database: connectionInfo.name
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  private async getKafkaMetrics(): Promise<any> {
    try {
      const kafkaStatus = kafkaConsumer.getStatus();
      
      return {
        running: kafkaStatus.isRunning,
        topics: kafkaStatus.topics.length,
        groupId: kafkaStatus.groupId,
        brokers: kafkaStatus.brokers.length
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  private determineOverallStatus(checks: any): string {
    const statuses = [
      checks.api.status,
      checks.database.status,
      checks.kafka.status,
      checks.system.status
    ];

    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    } else if (statuses.includes('degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }
}

export const healthController = new HealthController();


