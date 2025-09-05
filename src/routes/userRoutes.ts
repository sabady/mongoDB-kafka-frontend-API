import { Router } from 'express';
import { userController } from '../controllers/userController';
import { validateUser, validateUserUpdate } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();

// Apply rate limiting to all user routes
router.use(rateLimiter);

// GET /api/users - Get all users with pagination and filtering
router.get('/', async (req, res) => {
  logger.info('GET /api/users', { query: req.query });
  await userController.getUsers(req, res);
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
  logger.info('GET /api/users/:id', { id: req.params.id });
  await userController.getUserById(req, res);
});

// POST /api/users - Create new user
router.post('/', validateUser, async (req, res) => {
  logger.info('POST /api/users', { body: req.body });
  await userController.createUser(req, res);
});

// PUT /api/users/:id - Update user
router.put('/:id', validateUserUpdate, async (req, res) => {
  logger.info('PUT /api/users/:id', { id: req.params.id, body: req.body });
  await userController.updateUser(req, res);
});

// DELETE /api/users/:id - Delete user (soft delete)
router.delete('/:id', async (req, res) => {
  logger.info('DELETE /api/users/:id', { id: req.params.id });
  await userController.deleteUser(req, res);
});

// GET /api/users/:id/events - Get user events
router.get('/:id/events', async (req, res) => {
  logger.info('GET /api/users/:id/events', { id: req.params.id, query: req.query });
  await userController.getUserEvents(req, res);
});

export default router;


