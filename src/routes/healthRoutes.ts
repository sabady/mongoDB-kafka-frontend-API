import { Router } from 'express';
import { healthController } from '../controllers/healthController';
import { logger } from '../utils/logger';

const router = Router();

// GET /health - Basic health check
router.get('/', async (req, res) => {
  logger.info('GET /health');
  await healthController.healthCheck(req, res);
});

// GET /health/detailed - Detailed health check with dependencies
router.get('/detailed', async (req, res) => {
  logger.info('GET /health/detailed');
  await healthController.detailedHealthCheck(req, res);
});

// GET /health/ready - Readiness check for Kubernetes
router.get('/ready', async (req, res) => {
  logger.info('GET /health/ready');
  await healthController.readinessCheck(req, res);
});

// GET /health/live - Liveness check for Kubernetes
router.get('/live', async (req, res) => {
  logger.info('GET /health/live');
  await healthController.livenessCheck(req, res);
});

// GET /health/metrics - Get system metrics
router.get('/metrics', async (req, res) => {
  logger.info('GET /health/metrics');
  await healthController.getMetrics(req, res);
});

export default router;


