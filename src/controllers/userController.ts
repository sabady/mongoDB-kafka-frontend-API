import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { Event } from '../models/Event';
import { logger } from '../utils/logger';
import { validationResult } from 'express-validator';

export class UserController {
  // Get all users with pagination and filtering
  public async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      const filter: any = {};
      
      // Apply filters
      if (req.query.isActive !== undefined) {
        filter.isActive = req.query.isActive === 'true';
      }
      
      if (req.query.source) {
        filter['metadata.source'] = req.query.source;
      }
      
      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } }
        ];
      }

      const [users, total] = await Promise.all([
        User.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });

      logger.info('Users retrieved successfully', { 
        count: users.length, 
        page, 
        limit, 
        total 
      });

    } catch (error) {
      logger.error('Error retrieving users:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get user by ID
  public async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id).lean();
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { user }
      });

      logger.info('User retrieved successfully', { userId: id });

    } catch (error) {
      logger.error('Error retrieving user:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Create new user
  public async createUser(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const userData = {
        ...req.body,
        metadata: {
          source: 'api',
          tags: ['api-created'],
          preferences: {}
        }
      };

      const user = new User(userData);
      await user.save();

      // Create event for user creation
      await this.createUserEvent('user.created', user._id, userData);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { user }
      });

      logger.info('User created successfully', { 
        userId: user._id, 
        email: user.email 
      });

    } catch (error) {
      if (error.code === 11000) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      } else {
        logger.error('Error creating user:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  }

  // Update user
  public async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const user = await User.findByIdAndUpdate(
        id,
        { ...req.body, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Create event for user update
      await this.createUserEvent('user.updated', user._id, req.body);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: { user }
      });

      logger.info('User updated successfully', { 
        userId: id, 
        email: user.email 
      });

    } catch (error) {
      if (error.code === 11000) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      } else {
        logger.error('Error updating user:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  }

  // Delete user (soft delete)
  public async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const user = await User.findByIdAndUpdate(
        id,
        { isActive: false, updatedAt: new Date() },
        { new: true }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Create event for user deletion
      await this.createUserEvent('user.deleted', user._id, { isActive: false });

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        data: { user }
      });

      logger.info('User deleted successfully', { 
        userId: id, 
        email: user.email 
      });

    } catch (error) {
      logger.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get user events
  public async getUserEvents(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const filter = { userId: id };
      
      if (req.query.type) {
        (filter as any).type = req.query.type;
      }

      const [events, total] = await Promise.all([
        Event.find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Event.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: {
          events,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });

      logger.info('User events retrieved successfully', { 
        userId: id, 
        count: events.length 
      });

    } catch (error) {
      logger.error('Error retrieving user events:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Private helper method to create user events
  private async createUserEvent(type: string, userId: string, data: any): Promise<void> {
    try {
      const event = new Event({
        type,
        userId,
        data,
        source: 'api',
        timestamp: new Date(),
        processed: true
      });

      await event.save();
      logger.debug('User event created', { type, userId, eventId: event._id });
    } catch (error) {
      logger.error('Error creating user event:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }
}

export const userController = new UserController();
