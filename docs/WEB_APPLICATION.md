# Store Web Application

This document explains how to use the customer-facing web application that integrates with our API, MongoDB, and Kafka.

## 🎯 **What We Built**

A complete customer-facing web application with:
- **UI** - Modern, responsive web interface
- **Purchase System** - Send purchase requests to Kafka
- **Purchase History** - View all user purchases
- **Real-time Processing** - Kafka message processing
- **Data Persistence** - MongoDB storage

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │  Kafka Producer │    │      API        │    │    MongoDB      │
│                 │    │   (Port 3001)   │    │   (Port 3000)   │    │                 │
│ - HTML/CSS/JS   │───►│                 │───►│                 │───►│                 │
│ - Buy Button    │    │ - Sends to      │    │ - Consumes from │    │ - Stores Events │
│ - View History  │    │   Kafka         │    │   Kafka         │    │ - Stores Users  │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │     Kafka       │    │   Event Logs    │
                       │  (KRaft Mode)   │    │                 │
                       │                 │    │ - Purchase Logs │
                       │ - purchase-     │    │ - User Logs     │
                       │   events        │    │ - System Logs   │
                       │ - user-events   │    │                 │
                       └─────────────────┘    └─────────────────┘
```

## 🚀 **Quick Start**

### **1. Start All Services**
```bash
# Make sure MongoDB and Kafka are running first
./Kubernetes/deploy.sh

# Start the web application
./scripts/start-web-app.sh
```

### **2. Access the Web Application**
Open your browser and go to: **http://localhost:3000**

### **3. Test the Application**
1. **Enter User Information:**
   - Username: `john_doe`
   - User ID: `507f1f77bcf86cd799439011`

2. **Click "Buy Now"** - Sends purchase request to Kafka
3. **Click "View My Purchases"** - Shows purchase history

## 🎨 **Web Application Features**

### **User Interface**
- **Modern Design** - Clean, professional look
- **Responsive Layout** - Works on desktop and mobile
- **Real-time Feedback** - Status messages and loading indicators
- **Error Handling** - User-friendly error messages

### **Purchase System**
- **Random Pricing** - Generates random prices for demo
- **Product Information** - Includes product name and category
- **Timestamp Tracking** - Records exact purchase time
- **Kafka Integration** - Sends messages to Kafka for processing

### **Purchase History**
- **User-specific** - Shows only purchases for the logged-in user
- **Detailed Information** - Price, product, category, timestamp
- **Real-time Updates** - Fetches latest data from API
- **Pagination Support** - Handles large purchase histories

## 🔧 **Technical Details**

### **Frontend (HTML/CSS/JavaScript)**
- **Location**: `public/index.html`
- **Framework**: Vanilla JavaScript (no frameworks needed)
- **Styling**: Modern CSS with gradients and animations
- **API Calls**: Fetch API for HTTP requests

### **Backend Services**
- **Main API**: `src/index.ts` (Port 3000)
- **Kafka Producer**: `src/kafka-producer-service.ts` (Port 3001)
- **Static Files**: Served from `public/` directory

### **Data Flow**
1. **User clicks "Buy Now"**
2. **Frontend sends request to Kafka Producer Service**
3. **Producer Service sends message to Kafka**
4. **API consumes message from Kafka**
5. **API stores event in MongoDB**
6. **User can view purchase history via API**

## 📊 **API Endpoints Used**

### **Kafka Producer Service (Port 3001)**
```bash
# Send purchase request to Kafka
POST http://localhost:3001/purchase
{
  "userId": "507f1f77bcf86cd799439011",
  "username": "john_doe",
  "data": {
    "price": 45.99,
    "product": "Premium Package",
    "category": "software"
  }
}

# Health check
GET http://localhost:3001/health
```

### **API (Port 3000)**
```bash
# Get user purchase events
GET http://localhost:3000/api/events?userId=507f1f77bcf86cd799439011&type=purchase.created

# Create event directly
POST http://localhost:3000/api/events
{
  "type": "purchase.created",
  "userId": "507f1f77bcf86cd799439011",
  "data": {
    "price": 45.99,
    "product": "Premium Package"
  }
}
```

## 🎯 **Purchase Event Structure**

### **Kafka Message Format**
```json
{
  "type": "purchase.created",
  "userId": "507f1f77bcf86cd799439011",
  "username": "john_doe",
  "data": {
    "price": 45.99,
    "timestamp": "2023-12-01T10:00:00.000Z",
    "product": "Premium Package",
    "category": "software",
    "source": "web"
  },
  "source": "web",
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

### **MongoDB Event Document**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "type": "purchase.created",
  "userId": "507f1f77bcf86cd799439011",
  "data": {
    "price": 45.99,
    "timestamp": "2023-12-01T10:00:00.000Z",
    "product": "Premium Package",
    "category": "software",
    "source": "web"
  },
  "source": "kafka",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "processed": true,
  "metadata": {
    "kafkaOffset": 123,
    "kafkaPartition": 0,
    "kafkaTopic": "purchase-events",
    "retryCount": 0
  }
}
```

## 🛠️ **Development**

### **Running in Development Mode**
```bash
# Start both services with auto-reload
npm run dev:all

# Or start them separately
npm run dev          # Main API (port 3000)
npm run dev:producer # Kafka Producer (port 3001)
```

### **Building for Production**
```bash
# Build TypeScript to JavaScript
npm run build

# Start production services
npm start           # Main API
npm run start:producer # Kafka Producer
```

### **File Structure**
```
├── public/
│   └── index.html          # Web application frontend
├── src/
│   ├── index.ts            # Main API server
│   ├── kafka-producer-service.ts  # Kafka producer service
│   ├── kafka/
│   │   ├── producer.ts     # Kafka producer class
│   │   └── consumer.ts     # Kafka consumer class
│   └── ...
├── scripts/
│   └── start-web-app.sh    # Startup script
└── docs/
    └── WEB_APPLICATION.md  # This documentation
```

## 🧪 **Testing the Application**

### **Manual Testing**
1. **Start the application**: `./scripts/start-web-app.sh`
2. **Open browser**: http://localhost:3000
3. **Test purchase flow**:
   - Enter username and user ID
   - Click "Buy Now"
   - Check console logs for Kafka messages
   - Click "View My Purchases"
   - Verify purchase appears in history

### **API Testing**
```bash
# Test purchase via API
curl -X POST http://localhost:3001/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "username": "test_user",
    "data": {
      "price": 29.99,
      "product": "Test Product",
      "category": "test"
    }
  }'

# Check purchase history
curl "http://localhost:3000/api/events?userId=507f1f77bcf86cd799439011&type=purchase.created"
```

### **Kafka Testing**
```bash
# List Kafka topics
./scripts/kafka-manager.sh list-topics

# Create purchase-events topic
./scripts/kafka-manager.sh create-topic purchase-events 3 1

# Produce test message
./scripts/kafka-manager.sh produce purchase-events '{"type":"purchase.created","userId":"123","data":{"price":99.99}}'

# Consume messages
./scripts/kafka-manager.sh consume purchase-events
```

## 🔍 **Monitoring and Debugging**

### **Logs**
- **API Server**: `logs/combined.log` and `logs/error.log`
- **Console Output**: Real-time logs in terminal
- **Kafka Logs**: Check Kafka container logs

### **Health Checks**
```bash
# API health
curl http://localhost:3000/health/detailed

# Producer health
curl http://localhost:3001/health

# Kafka status
./scripts/kafka-manager.sh status
```

### **Common Issues**

1. **"Connection refused" errors**
   - Check if MongoDB and Kafka are running
   - Verify ports 3000 and 3001 are available

2. **"Kafka not responding"**
   - Check Kafka container status
   - Verify Kafka is running in KRaft mode

3. **"No purchases found"**
   - Check if events are being stored in MongoDB
   - Verify user ID matches between purchase and query

## 🚀 **Production Deployment**

### **Docker Deployment**
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### **Kubernetes Deployment**
```bash
# Deploy to Kubernetes
./Kubernetes/deploy.sh

# Access via NodePort
# Web App: http://<node-ip>:30300
# API: http://<node-ip>:30300/api
```

## 📈 **Future Enhancements**

### **Potential Features**
- **User Authentication** - Login/logout system
- **Payment Integration** - Real payment processing
- **Inventory Management** - Product stock tracking
- **Email Notifications** - Purchase confirmations
- **Analytics Dashboard** - Sales and user analytics
- **Mobile App** - React Native or Flutter app

### **Technical Improvements**
- **Caching** - Redis for faster data access
- **Load Balancing** - Multiple API instances
- **Database Sharding** - Scale MongoDB
- **Message Queuing** - Dead letter queues
- **Monitoring** - Prometheus and Grafana

## 🆘 **Support**

### **Getting Help**
1. **Check logs** for error messages
2. **Verify services** are running
3. **Test endpoints** individually
4. **Check Kafka topics** and messages
5. **Review MongoDB** data

### **Useful Commands**
```bash
# Check all services
kubectl get all -n api-database

# View API logs
kubectl logs -f deployment/api -n api-database

# Check Kafka topics
./scripts/kafka-manager.sh list-topics

# Test API endpoints
curl http://localhost:3000/health
curl http://localhost:3001/health
```

This web application demonstrates a complete end-to-end system with real-time message processing, data persistence, and a beautiful user interface! 🎉


