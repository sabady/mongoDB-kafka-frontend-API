import { Router } from 'express';
import { eventController } from '../controllers/eventController';
import { validateEvent } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();

// Apply rate limiting to all event routes
router.use(rateLimiter);

// GET /api/events - Get all events with pagination and filtering
router.get('/', async (req, res) => {
  logger.info('GET /api/events', { query: req.query });
  await eventController.getEvents(req, res);
});

// GET /api/events/stats - Get event statistics
router.get('/stats', async (req, res) => {
  logger.info('GET /api/events/stats');
  await eventController.getEventStats(req, res);
});

// GET /api/events/retry - Retry failed events
router.post('/retry', async (req, res) => {
  logger.info('POST /api/events/retry', { query: req.query });
  await eventController.retryFailedEvents(req, res);
});

// GET /api/events/type/:type - Get events by type
router.get('/type/:type', async (req, res) => {
  logger.info('GET /api/events/type/:type', { type: req.params.type, query: req.query });
  await eventController.getEventsByType(req, res);
});

// GET /api/events/:id - Get event by ID
router.get('/:id', async (req, res) => {
  logger.info('GET /api/events/:id', { id: req.params.id });
  await eventController.getEventById(req, res);
});

// POST /api/events - Create new event
router.post('/', validateEvent, async (req, res) => {
  logger.info('POST /api/events', { body: req.body });
  await eventController.createEvent(req, res);
});

export default router;


