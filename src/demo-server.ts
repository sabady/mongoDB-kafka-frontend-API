import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// HTTP request logging
app.use(morgan('combined'));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// In-memory storage for demo
let users: any[] = [];
let events: any[] = [];
let purchases: any[] = [];

// Basic route
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'API Server (Demo Mode)',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: 'demo',
      endpoints: {
        users: '/api/users',
        events: '/api/events',
        health: '/health',
        web: '/ (serves static files)'
      }
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: 'demo',
      mode: 'demo (no external dependencies)'
    }
  });
});

// Users API
app.get('/api/users', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  
  const paginatedUsers = users.slice(skip, skip + limit);
  
  res.json({
    success: true,
    data: {
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total: users.length,
        totalPages: Math.ceil(users.length / limit),
        hasNext: page < Math.ceil(users.length / limit),
        hasPrev: page > 1
      }
    }
  });
});

app.post('/api/users', (req, res) => {
  const user = {
    id: `user_${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  users.push(user);
  
  // Create event
  const event = {
    id: `event_${Date.now()}`,
    type: 'user.created',
    userId: user.id,
    data: user,
    source: 'api',
    timestamp: new Date().toISOString(),
    processed: true
  };
  events.push(event);
  
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: { user }
  });
});

// Events API
app.get('/api/events', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  
  let filteredEvents = events;
  
  // Apply filters
  if (req.query.userId) {
    filteredEvents = filteredEvents.filter(e => e.userId === req.query.userId);
  }
  if (req.query.type) {
    filteredEvents = filteredEvents.filter(e => e.type === req.query.type);
  }
  
  const paginatedEvents = filteredEvents.slice(skip, skip + limit);
  
  res.json({
    success: true,
    data: {
      events: paginatedEvents,
      pagination: {
        page,
        limit,
        total: filteredEvents.length,
        totalPages: Math.ceil(filteredEvents.length / limit),
        hasNext: page < Math.ceil(filteredEvents.length / limit),
        hasPrev: page > 1
      }
    }
  });
});

app.post('/api/events', (req, res) => {
  const event = {
    id: `event_${Date.now()}`,
    ...req.body,
    timestamp: new Date().toISOString(),
    processed: true
  };
  
  events.push(event);
  
  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: { event }
  });
});

// Demo purchase endpoint (simulates Kafka producer)
app.post('/api/demo/purchase', (req, res) => {
  const purchase = {
    id: `purchase_${Date.now()}`,
    type: 'purchase.created',
    userId: req.body.userId,
    username: req.body.username,
    data: {
      price: req.body.data.price,
      timestamp: req.body.data.timestamp,
      product: req.body.data.product || 'Premium Package',
      category: req.body.data.category || 'software',
      source: 'web'
    },
    source: 'web',
    timestamp: new Date().toISOString()
  };
  
  // Store as event
  const event = {
    id: `event_${Date.now()}`,
    type: 'purchase.created',
    userId: purchase.userId,
    data: purchase.data,
    source: 'web',
    timestamp: new Date().toISOString(),
    processed: true
  };
  
  events.push(event);
  purchases.push(purchase);
  
  res.json({
    success: true,
    message: 'Purchase processed successfully (demo mode)',
    data: {
      purchase,
      event
    }
  });
});

// Error handling middleware
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server (Demo Mode) running on port ${PORT}`);
  console.log(`📊 Environment: demo`);
  console.log(`🌐 Web Application: http://localhost:${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`📋 Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Demo mode features:');
  console.log('  - In-memory storage (no MongoDB required)');
  console.log('  - Simulated Kafka processing');
  console.log('  - Full web application interface');
  console.log('  - All API endpoints working');
  console.log('');
  console.log('To test the web application:');
  console.log('  1. Open http://localhost:3000 in your browser');
  console.log('  2. Enter username and user ID');
  console.log('  3. Click "Buy Now" to simulate purchase');
  console.log('  4. Click "View My Purchases" to see history');
});

export default app;


