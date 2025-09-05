# API Documentation

This document provides comprehensive documentation for the API, including endpoints, data models, and integration with MongoDB and Kafka.

## 🚀 Overview

The API is a Node.js/TypeScript REST API that provides:
- **User Management**: CRUD operations for users
- **Event Processing**: Event tracking and management
- **MongoDB Integration**: Data persistence and retrieval
- **Kafka Integration**: Real-time message consumption and processing
- **Health Monitoring**: Comprehensive health checks and metrics

## 📋 Table of Contents

- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Health Checks](#health-checks)
- [Kafka Integration](#kafka-integration)
- [Deployment](#deployment)
- [Examples](#examples)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      API        │    │    MongoDB      │    │     Kafka       │
│   (Node.js)     │◄──►│   (Database)    │    │  (KRaft Mode)   │
│                 │    │                 │    │                 │
│ - REST API      │    │ - Users         │    │ - user-events   │
│ - Controllers   │    │ - Events        │    │ - system-events │
│ - Middleware    │    │ - Indexes       │    │ - order-events  │
│ - Validation    │    │ - Aggregations  │    │ - notifications │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔗 API Endpoints

### Base URL
- **Internal**: `http://api-service:3000`
- **External**: `http://<node-ip>:30300`

### Users API

#### Get All Users
```http
GET /api/users
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `isActive` (optional): Filter by active status (true/false)
- `source` (optional): Filter by source (api, kafka, import, manual)
- `search` (optional): Search in name and email

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "507f1f77bcf86cd799439011",
        "email": "user@example.com",
        "name": "John Doe",
        "age": 30,
        "isActive": true,
        "createdAt": "2023-12-01T10:00:00.000Z",
        "updatedAt": "2023-12-01T10:00:00.000Z",
        "metadata": {
          "source": "api",
          "tags": ["api-created"],
          "preferences": {}
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

#### Get User by ID
```http
GET /api/users/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe",
      "age": 30,
      "isActive": true,
      "createdAt": "2023-12-01T10:00:00.000Z",
      "updatedAt": "2023-12-01T10:00:00.000Z",
      "metadata": {
        "source": "api",
        "tags": ["api-created"],
        "preferences": {}
      }
    }
  }
}
```

#### Create User
```http
POST /api/users
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "name": "Jane Doe",
  "age": 25,
  "isActive": true,
  "metadata": {
    "tags": ["new-user"],
    "preferences": {
      "theme": "dark",
      "notifications": true
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439012",
      "email": "newuser@example.com",
      "name": "Jane Doe",
      "age": 25,
      "isActive": true,
      "createdAt": "2023-12-01T11:00:00.000Z",
      "updatedAt": "2023-12-01T11:00:00.000Z",
      "metadata": {
        "source": "api",
        "tags": ["api-created", "new-user"],
        "preferences": {
          "theme": "dark",
          "notifications": true
        }
      }
    }
  }
}
```

#### Update User
```http
PUT /api/users/:id
```

**Request Body:**
```json
{
  "name": "Jane Smith",
  "age": 26,
  "metadata": {
    "tags": ["updated"],
    "preferences": {
      "theme": "light",
      "notifications": false
    }
  }
}
```

#### Delete User (Soft Delete)
```http
DELETE /api/users/:id
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe",
      "isActive": false,
      "updatedAt": "2023-12-01T12:00:00.000Z"
    }
  }
}
```

#### Get User Events
```http
GET /api/users/:id/events
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `type` (optional): Filter by event type

### Events API

#### Get All Events
```http
GET /api/events
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `type` (optional): Filter by event type
- `source` (optional): Filter by source (api, kafka, system, webhook)
- `processed` (optional): Filter by processed status (true/false)
- `userId` (optional): Filter by user ID
- `fromDate` (optional): Filter events from date (ISO 8601)
- `toDate` (optional): Filter events to date (ISO 8601)

#### Get Event by ID
```http
GET /api/events/:id
```

#### Create Event
```http
POST /api/events
```

**Request Body:**
```json
{
  "type": "user.login",
  "userId": "507f1f77bcf86cd799439011",
  "data": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2023-12-01T10:00:00.000Z"
  },
  "source": "api"
}
```

#### Get Event Statistics
```http
GET /api/events/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalEvents": 1000,
      "processedEvents": 950,
      "unprocessedEvents": 50,
      "processingRate": "95.00"
    },
    "byType": [
      {
        "_id": "user.created",
        "sources": [
          {
            "source": "api",
            "count": 100,
            "processed": 100,
            "unprocessed": 0
          },
          {
            "source": "kafka",
            "count": 50,
            "processed": 45,
            "unprocessed": 5
          }
        ],
        "totalCount": 150,
        "totalProcessed": 145,
        "totalUnprocessed": 5
      }
    ]
  }
}
```

#### Retry Failed Events
```http
POST /api/events/retry
```

**Query Parameters:**
- `limit` (optional): Number of events to retry (default: 10, max: 50)

#### Get Events by Type
```http
GET /api/events/type/:type
```

### Health API

#### Basic Health Check
```http
GET /health
```

#### Detailed Health Check
```http
GET /health/detailed
```

#### Readiness Check (Kubernetes)
```http
GET /health/ready
```

#### Liveness Check (Kubernetes)
```http
GET /health/live
```

#### Metrics
```http
GET /health/metrics
```

## 📊 Data Models

### User Model
```typescript
interface IUser {
  _id: string;
  email: string;
  name: string;
  age?: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  metadata?: {
    source?: 'api' | 'kafka' | 'import' | 'manual';
    tags?: string[];
    preferences?: Record<string, any>;
  };
}
```

### Event Model
```typescript
interface IEvent {
  _id: string;
  type: string;
  userId?: string;
  data: Record<string, any>;
  source: 'api' | 'kafka' | 'system' | 'webhook';
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
```

## 🔐 Authentication

Currently, the API does not implement authentication. For production use, consider implementing:
- JWT tokens
- API keys
- OAuth 2.0
- Basic authentication

## ⚠️ Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "name": "ValidationError",
    "message": "Detailed error message",
    "stack": "Error stack trace (development only)"
  }
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

## 🚦 Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Strict**: 10 requests per 15 minutes for sensitive operations
- **Login**: 5 requests per 15 minutes for authentication
- **API Key**: 60 requests per minute per API key

Rate limit headers are included in responses:
- `RateLimit-Limit`
- `RateLimit-Remaining`
- `RateLimit-Reset`

## 🏥 Health Checks

### Health Check Types

1. **Basic Health Check** (`/health`)
   - Simple status check
   - Returns basic information

2. **Detailed Health Check** (`/health/detailed`)
   - Checks all dependencies
   - Returns comprehensive status

3. **Readiness Check** (`/health/ready`)
   - Kubernetes readiness probe
   - Checks if service is ready to accept traffic

4. **Liveness Check** (`/health/live`)
   - Kubernetes liveness probe
   - Checks if service is alive

5. **Metrics** (`/health/metrics`)
   - System and application metrics
   - Performance data

## 📨 Kafka Integration

### Supported Event Types
- `user.created`
- `user.updated`
- `user.deleted`
- `user.login`
- `user.logout`
- `order.created`
- `order.updated`
- `order.cancelled`
- `payment.processed`
- `notification.sent`
- `system.health`
- `custom`

### Kafka Topics
- `user-events`
- `system-events`
- `notification-events`
- `order-events`

### Message Format
```json
{
  "type": "user.created",
  "userId": "507f1f77bcf86cd799439011",
  "data": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

## 🚀 Deployment

### Docker
```bash
# Build image
docker build -t api .

# Run container
docker run -p 3000:3000 \
  -e MONGO_URI="mongodb://mongo:mongopass@mongodb-service:27017/api?authSource=admin" \
  -e KAFKA_BROKERS="kafka-service:9092" \
  api
```

### Kubernetes
```bash
# Deploy all services
./Kubernetes/deploy.sh

# Check status
kubectl get all -n api-database
```

### Environment Variables
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
MONGO_URI=mongodb://mongo:mongopass@mongodb-service:27017/api?authSource=admin
KAFKA_BROKERS=kafka-service:9092
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 💡 Examples

### Create a User and Track Events
```bash
# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "name": "John Doe",
    "age": 30
  }'

# Get user events
curl http://localhost:3000/api/users/{userId}/events

# Create custom event
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user.login",
    "userId": "{userId}",
    "data": {
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  }'
```

### Kafka Message Production
```bash
# Using Kafka manager script
./scripts/kafka-manager.sh create-topic user-events 3 1
./scripts/kafka-manager.sh produce user-events '{"type":"user.created","data":{"email":"test@example.com","name":"Test User"}}'
```

### Health Monitoring
```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed

# Metrics
curl http://localhost:3000/health/metrics
```

## 🔧 Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Testing
```bash
# Run tests
npm test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

## 🆘 Support

For issues and questions:
1. Check the logs: `kubectl logs -f deployment/api -n api-database`
2. Verify health status: `curl http://localhost:3000/health/detailed`
3. Check service connectivity: `./scripts/verify-services.sh`
4. Review Kafka topics: `./scripts/kafka-manager.sh list-topics`
