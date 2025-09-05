#!/bin/bash

# Unity Store Web Application Startup Script
# This script starts all necessary services for the web application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

print_step "Unity Store Web Application Startup"
print_status "Starting all services for the customer-facing web application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js version: $(node -v)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_step "Installing Dependencies"
    print_status "Installing npm dependencies..."
    npm install
    print_success "Dependencies installed successfully"
else
    print_status "Dependencies already installed"
fi

# Check if MongoDB and Kafka are running (optional check)
print_step "Checking External Dependencies"
print_status "Note: Make sure MongoDB and Kafka are running before starting the web app"

# Check MongoDB connection (optional)
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.runCommand('ping')" --quiet &> /dev/null; then
        print_success "MongoDB is accessible"
    else
        print_warning "MongoDB connection failed. Make sure MongoDB is running."
    fi
else
    print_warning "mongosh not found. Skipping MongoDB connection check."
fi

# Build the application
print_step "Building Application"
print_status "Building TypeScript to JavaScript..."
npm run build
print_success "Application built successfully"

# Create logs directory
mkdir -p logs

# Start services
print_step "Starting Services"
print_status "Starting Unity API Server (port 3000)..."
print_status "Starting Kafka Producer Service (port 3001)..."

# Function to handle cleanup on exit
cleanup() {
    print_step "Shutting Down Services"
    print_status "Stopping all services..."
    
    # Kill all background processes
    jobs -p | xargs -r kill
    
    print_success "All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start the main API server in background
npm start &
API_PID=$!

# Wait a moment for the API to start
sleep 3

# Start the Kafka producer service in background
npm run start:producer &
PRODUCER_PID=$!

# Wait a moment for the producer to start
sleep 3

print_success "All services started successfully!"
print_status "Services running:"
echo "  - Unity API Server: http://localhost:3000"
echo "  - Kafka Producer Service: http://localhost:3001"
echo "  - Web Application: http://localhost:3000 (serves static files)"
echo ""

print_status "Available endpoints:"
echo "  - Web App: http://localhost:3000"
echo "  - API Health: http://localhost:3000/health"
echo "  - Users API: http://localhost:3000/api/users"
echo "  - Events API: http://localhost:3000/api/events"
echo "  - Producer Health: http://localhost:3001/health"
echo ""

print_status "To test the web application:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Enter a username and user ID"
echo "  3. Click 'Buy Now' to send a purchase request to Kafka"
echo "  4. Click 'View My Purchases' to see purchase history"
echo ""

print_status "To view logs:"
echo "  - API Server: tail -f logs/combined.log"
echo "  - Producer Service: check console output"
echo ""

print_status "Press Ctrl+C to stop all services"

# Wait for background processes
wait $API_PID $PRODUCER_PID
