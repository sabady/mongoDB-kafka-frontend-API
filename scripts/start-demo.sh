#!/bin/bash

# Unity API Demo Startup Script
# This script starts the demo version of the Unity API with web application

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

print_step "Unity API Demo Startup"
print_status "Starting the demo version of Unity API with web application..."

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

# Build the application
print_step "Building Application"
print_status "Building TypeScript to JavaScript..."
npm run build
print_success "Application built successfully"

# Create logs directory
mkdir -p logs

# Start demo server
print_step "Starting Demo Server"
print_status "Starting Unity API Demo Server (port 3000)..."

# Function to handle cleanup on exit
cleanup() {
    print_step "Shutting Down Demo Server"
    print_status "Stopping demo server..."
    
    # Kill all background processes
    jobs -p | xargs -r kill
    
    print_success "Demo server stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start the demo server in background
npm run start:demo &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 3

# Check if server is running
if curl -s http://localhost:3000/health > /dev/null; then
    print_success "Demo server started successfully!"
else
    print_error "Failed to start demo server"
    exit 1
fi

print_status "Demo server running:"
echo "  - Unity API Demo: http://localhost:3000"
echo "  - Web Application: http://localhost:3000 (serves static files)"
echo ""

print_status "Available endpoints:"
echo "  - Web App: http://localhost:3000"
echo "  - API Health: http://localhost:3000/health"
echo "  - Users API: http://localhost:3000/api/users"
echo "  - Events API: http://localhost:3000/api/events"
echo "  - Demo Purchase: http://localhost:3000/api/demo/purchase"
echo ""

print_status "Demo features:"
echo "  - In-memory storage (no MongoDB required)"
echo "  - Simulated Kafka processing"
echo "  - Full web application interface"
echo "  - All API endpoints working"
echo ""

print_status "To test the web application:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Enter a username and user ID"
echo "  3. Click 'Buy Now' to simulate purchase"
echo "  4. Click 'View My Purchases' to see history"
echo ""

print_status "To test the API directly:"
echo "  # Create a user"
echo "  curl -X POST http://localhost:3000/api/users \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"test@example.com\",\"name\":\"Test User\",\"age\":25}'"
echo ""
echo "  # Make a purchase"
echo "  curl -X POST http://localhost:3000/api/demo/purchase \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"userId\":\"user_123\",\"username\":\"Test User\",\"data\":{\"price\":29.99}}'"
echo ""

print_status "Press Ctrl+C to stop the demo server"

# Wait for background process
wait $SERVER_PID
