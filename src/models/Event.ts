import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  _id: string;
  type: string;
  userId?: string;
  data: Record<string, any>;
  source: string;
  timestamp: Date;
  processed: boolean;
  metadata?: {
    kafkaOffset?: number;
    kafkaPartition?: number;
    kafkaTopic?: string;
    retryCount?: number;
    errorMessage?: string;
  };
}

const EventSchema = new Schema<IEvent>({
  type: {
    type: String,
    required: true,
    trim: true,
    enum: [
      'user.created',
      'user.updated',
      'user.deleted',
      'user.login',
      'user.logout',
      'order.created',
      'order.updated',
      'order.cancelled',
      'payment.processed',
      'notification.sent',
      'purchase.created',
      'purchase.updated',
      'purchase.cancelled',
      'system.health',
      'custom'
    ]
  },
  userId: {
    type: String,
    ref: 'User',
    index: true
  },
  data: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  source: {
    type: String,
    required: true,
    enum: ['api', 'kafka', 'system', 'webhook'],
    default: 'api'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  metadata: {
    kafkaOffset: Number,
    kafkaPartition: Number,
    kafkaTopic: String,
    retryCount: {
      type: Number,
      default: 0
    },
    errorMessage: String
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for better performance
EventSchema.index({ type: 1 });
EventSchema.index({ userId: 1 });
EventSchema.index({ source: 1 });
EventSchema.index({ processed: 1 });
EventSchema.index({ timestamp: -1 });
EventSchema.index({ type: 1, timestamp: -1 });
EventSchema.index({ userId: 1, timestamp: -1 });

// Compound index for Kafka metadata
EventSchema.index({ 
  'metadata.kafkaTopic': 1, 
  'metadata.kafkaPartition': 1, 
  'metadata.kafkaOffset': 1 
});

export const Event = mongoose.model<IEvent>('Event', EventSchema);
