import { Request, Response } from 'express';
import { Event, IEvent } from '../models/Event';
import { logger } from '../utils/logger';
import { validationResult } from 'express-validator';

export class EventController {
  // Get all events with pagination and filtering
  public async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      const filter: any = {};
      
      // Apply filters
      if (req.query.type) {
        filter.type = req.query.type;
      }
      
      if (req.query.source) {
        filter.source = req.query.source;
      }
      
      if (req.query.processed !== undefined) {
        filter.processed = req.query.processed === 'true';
      }
      
      if (req.query.userId) {
        filter.userId = req.query.userId;
      }
      
      if (req.query.fromDate || req.query.toDate) {
        filter.timestamp = {};
        if (req.query.fromDate) {
          filter.timestamp.$gte = new Date(req.query.fromDate as string);
        }
        if (req.query.toDate) {
          filter.timestamp.$lte = new Date(req.query.toDate as string);
        }
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

      logger.info('Events retrieved successfully', { 
        count: events.length, 
        page, 
        limit, 
        total 
      });

    } catch (error) {
      logger.error('Error retrieving events:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get event by ID
  public async getEventById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const event = await Event.findById(id).lean();
      
      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { event }
      });

      logger.info('Event retrieved successfully', { eventId: id });

    } catch (error) {
      logger.error('Error retrieving event:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Create new event
  public async createEvent(req: Request, res: Response): Promise<void> {
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

      const eventData = {
        ...req.body,
        source: 'api',
        timestamp: new Date(),
        processed: true
      };

      const event = new Event(eventData);
      await event.save();

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: { event }
      });

      logger.info('Event created successfully', { 
        eventId: event._id, 
        type: event.type 
      });

    } catch (error) {
      logger.error('Error creating event:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get event statistics
  public async getEventStats(req: Request, res: Response): Promise<void> {
    try {
      const pipeline = [
        {
          $group: {
            _id: {
              type: '$type',
              source: '$source'
            },
            count: { $sum: 1 },
            processed: { $sum: { $cond: ['$processed', 1, 0] } },
            unprocessed: { $sum: { $cond: ['$processed', 0, 1] } }
          }
        },
        {
          $group: {
            _id: '$_id.type',
            sources: {
              $push: {
                source: '$_id.source',
                count: '$count',
                processed: '$processed',
                unprocessed: '$unprocessed'
              }
            },
            totalCount: { $sum: '$count' },
            totalProcessed: { $sum: '$processed' },
            totalUnprocessed: { $sum: '$unprocessed' }
          }
        },
        {
          $sort: { totalCount: -1 as any }
        }
      ];

      const stats = await Event.aggregate(pipeline);

      // Get total counts
      const totalEvents = await Event.countDocuments();
      const processedEvents = await Event.countDocuments({ processed: true });
      const unprocessedEvents = await Event.countDocuments({ processed: false });

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalEvents,
            processedEvents,
            unprocessedEvents,
            processingRate: totalEvents > 0 ? (processedEvents / totalEvents * 100).toFixed(2) : 0
          },
          byType: stats
        }
      });

      logger.info('Event statistics retrieved successfully');

    } catch (error) {
      logger.error('Error retrieving event statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Retry failed events
  public async retryFailedEvents(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;
      
      const failedEvents = await Event.find({
        processed: false,
        'metadata.retryCount': { $lt: 3 }
      })
      .sort({ timestamp: 1 })
      .limit(parseInt(limit as string))
      .lean();

      if (failedEvents.length === 0) {
        res.status(200).json({
          success: true,
          message: 'No failed events to retry',
          data: { retriedCount: 0 }
        });
        return;
      }

      let retriedCount = 0;
      const retryPromises = failedEvents.map(async (event) => {
        try {
          // Increment retry count
          await Event.findByIdAndUpdate(event._id, {
            $inc: { 'metadata.retryCount': 1 },
            $unset: { 'metadata.errorMessage': 1 }
          });

          // Here you would implement the actual retry logic
          // For now, we'll just mark it as processed
          await Event.findByIdAndUpdate(event._id, {
            processed: true
          });

          retriedCount++;
          logger.info('Event retried successfully', { eventId: event._id, type: event.type });
        } catch (error) {
          logger.error('Error retrying event:', { eventId: event._id, error: error.message });
        }
      });

      await Promise.all(retryPromises);

      res.status(200).json({
        success: true,
        message: `${retriedCount} events retried successfully`,
        data: { retriedCount }
      });

      logger.info('Failed events retry completed', { retriedCount });

    } catch (error) {
      logger.error('Error retrying failed events:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get events by type
  public async getEventsByType(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [events, total] = await Promise.all([
        Event.find({ type })
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Event.countDocuments({ type })
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

      logger.info('Events by type retrieved successfully', { 
        type, 
        count: events.length 
      });

    } catch (error) {
      logger.error('Error retrieving events by type:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export const eventController = new EventController();
