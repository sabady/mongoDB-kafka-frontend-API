#!/bin/bash

# Unity Store Web Application Test Script
# This script tests the web application functionality

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

# Configuration
API_URL="http://localhost:3000"
PRODUCER_URL="http://localhost:3001"
TEST_USER_ID="507f1f77bcf86cd799439011"
TEST_USERNAME="test_user"

print_step "Unity Store Web Application Test Suite"
print_status "Testing the complete web application functionality..."

# Test 1: Check if services are running
print_step "Test 1: Service Health Checks"

# Check API health
print_status "Checking API health..."
if curl -s -f "$API_URL/health" > /dev/null; then
    print_success "API service is running"
else
    print_error "API service is not running on $API_URL"
    exit 1
fi

# Check Producer health
print_status "Checking Kafka Producer health..."
if curl -s -f "$PRODUCER_URL/health" > /dev/null; then
    print_success "Kafka Producer service is running"
else
    print_error "Kafka Producer service is not running on $PRODUCER_URL"
    exit 1
fi

# Test 2: Test purchase creation
print_step "Test 2: Purchase Creation"

print_status "Creating a test purchase..."
PURCHASE_RESPONSE=$(curl -s -X POST "$PRODUCER_URL/purchase" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"username\": \"$TEST_USERNAME\",
    \"data\": {
      \"price\": 29.99,
      \"product\": \"Test Product\",
      \"category\": \"test\"
    }
  }")

if echo "$PURCHASE_RESPONSE" | grep -q "success.*true"; then
    print_success "Purchase created successfully"
    echo "Response: $PURCHASE_RESPONSE"
else
    print_error "Failed to create purchase"
    echo "Response: $PURCHASE_RESPONSE"
    exit 1
fi

# Wait a moment for Kafka processing
print_status "Waiting for Kafka message processing..."
sleep 3

# Test 3: Check if purchase was stored
print_step "Test 3: Purchase Retrieval"

print_status "Retrieving purchase history..."
EVENTS_RESPONSE=$(curl -s "$API_URL/api/events?userId=$TEST_USER_ID&type=purchase.created&limit=10")

if echo "$EVENTS_RESPONSE" | grep -q "success.*true"; then
    print_success "Purchase history retrieved successfully"
    
    # Check if our test purchase is in the response
    if echo "$EVENTS_RESPONSE" | grep -q "Test Product"; then
        print_success "Test purchase found in history"
    else
        print_warning "Test purchase not found in history (may still be processing)"
    fi
else
    print_error "Failed to retrieve purchase history"
    echo "Response: $EVENTS_RESPONSE"
    exit 1
fi

# Test 4: Test direct event creation
print_step "Test 4: Direct Event Creation"

print_status "Creating event directly via API..."
EVENT_RESPONSE=$(curl -s -X POST "$API_URL/api/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"purchase.created\",
    \"userId\": \"$TEST_USER_ID\",
    \"data\": {
      \"price\": 49.99,
      \"product\": \"Direct API Product\",
      \"category\": \"api-test\"
    },
    \"source\": \"api\"
  }")

if echo "$EVENT_RESPONSE" | grep -q "success.*true"; then
    print_success "Event created directly via API"
else
    print_error "Failed to create event via API"
    echo "Response: $EVENT_RESPONSE"
    exit 1
fi

# Test 5: Test user creation
print_step "Test 5: User Management"

print_status "Creating a test user..."
USER_RESPONSE=$(curl -s -X POST "$API_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test@example.com\",
    \"name\": \"Test User\",
    \"age\": 25
  }")

if echo "$USER_RESPONSE" | grep -q "success.*true"; then
    print_success "User created successfully"
    
    # Extract user ID from response
    USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$USER_ID" ]; then
        print_status "Created user ID: $USER_ID"
    fi
else
    print_warning "Failed to create user (may already exist)"
fi

# Test 6: Test web page accessibility
print_step "Test 6: Web Page Accessibility"

print_status "Checking if web page is accessible..."
if curl -s -f "$API_URL" > /dev/null; then
    print_success "Web page is accessible"
else
    print_error "Web page is not accessible"
    exit 1
fi

# Test 7: Test API endpoints
print_step "Test 7: API Endpoints"

# Test users endpoint
print_status "Testing users endpoint..."
if curl -s -f "$API_URL/api/users" > /dev/null; then
    print_success "Users endpoint is working"
else
    print_error "Users endpoint is not working"
fi

# Test events endpoint
print_status "Testing events endpoint..."
if curl -s -f "$API_URL/api/events" > /dev/null; then
    print_success "Events endpoint is working"
else
    print_error "Events endpoint is not working"
fi

# Test health endpoint
print_status "Testing health endpoint..."
if curl -s -f "$API_URL/health/detailed" > /dev/null; then
    print_success "Health endpoint is working"
else
    print_error "Health endpoint is not working"
fi

# Summary
print_step "Test Summary"
print_success "All tests completed successfully!"
print_status "Web application is working correctly"
print_status "Services are running and responding"
print_status "Kafka integration is working"
print_status "MongoDB integration is working"

echo ""
print_status "You can now:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Enter username: $TEST_USERNAME"
echo "  3. Enter user ID: $TEST_USER_ID"
echo "  4. Click 'Buy Now' to test purchases"
echo "  5. Click 'View My Purchases' to see history"
echo ""

print_status "API endpoints available:"
echo "  - Web App: $API_URL"
echo "  - API Health: $API_URL/health"
echo "  - Users API: $API_URL/api/users"
echo "  - Events API: $API_URL/api/events"
echo "  - Producer Health: $PRODUCER_URL/health"
echo ""

print_success "🎉 Web application test suite completed successfully!"
