import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  name: string;
  age?: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  metadata?: {
    source?: string;
    tags?: string[];
    preferences?: Record<string, any>;
  };
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  age: {
    type: Number,
    min: 0,
    max: 150
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    source: {
      type: String,
      enum: ['api', 'kafka', 'import', 'manual'],
      default: 'api'
    },
    tags: [{
      type: String,
      trim: true
    }],
    preferences: {
      type: Schema.Types.Mixed,
      default: {}
    }
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for better performance
UserSchema.index({ email: 1 });
UserSchema.index({ name: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'metadata.source': 1 });

// Virtual for full name (if needed)
UserSchema.virtual('fullName').get(function() {
  return this.name;
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const User = mongoose.model<IUser>('User', UserSchema);


