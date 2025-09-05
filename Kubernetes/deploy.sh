#!/bin/bash

# API Kubernetes Deployment Script
# This script deploys MongoDB and Kafka to Kubernetes for the API project

set -e

echo "🚀 Starting API infrastructure deployment (MongoDB + Kafka)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if kubectl can connect to cluster
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

print_status "Connected to Kubernetes cluster: $(kubectl cluster-info | head -n1)"

# Check if namespace already exists
if kubectl get namespace api-database &> /dev/null; then
    print_warning "Namespace 'api-database' already exists"
else
    print_status "Creating namespace 'api-database'..."
    kubectl apply -f namespace.yaml
fi

# Deploy MongoDB
print_status "Deploying MongoDB..."
kubectl apply -f mongodb-deployment.yaml

# Deploy Kafka
print_status "Deploying Kafka..."
kubectl apply -f kafka-deployment.yaml

# Deploy API
print_status "Deploying API..."
kubectl apply -f api-deployment.yaml

# Wait for deployments to be ready
print_status "Waiting for MongoDB deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/mongodb -n api-database


print_status "Waiting for Kafka deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/kafka -n api-database

print_status "Waiting for API deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/api -n api-database

# Check deployment status
print_status "Checking deployment status..."
kubectl get all -n api-database

# Check if pods are running
MONGODB_STATUS=$(kubectl get pods -n api-database -l app=mongodb -o jsonpath='{.items[0].status.phase}')
KAFKA_STATUS=$(kubectl get pods -n api-database -l app=kafka -o jsonpath='{.items[0].status.phase}')
API_STATUS=$(kubectl get pods -n api-database -l app=api -o jsonpath='{.items[0].status.phase}')

if [ "$MONGODB_STATUS" = "Running" ] && [ "$KAFKA_STATUS" = "Running" ] && [ "$API_STATUS" = "Running" ]; then
    print_status "✅ All deployments successful!"
    print_status "MongoDB, Kafka (KRaft mode), and API are now running in namespace 'api-database'"
    
    # Display connection information
    echo ""
    print_status "MongoDB Connection Information:"
    echo "  Internal Service: mongodb-service.api-database.svc.cluster.local:27017"
    echo "  External Service: mongodb-external.api-database.svc.cluster.local:27017"
    echo "  Metrics Service: mongodb-metrics.api-database.svc.cluster.local:9216"
    echo "  Username: mongo"
    echo "  Password: mongopass"
    echo "  Database: api"
    echo ""
    echo "  MongoDB Internal Connection String:"
    echo "  mongodb://mongo:mongopass@mongodb-service:27017/api?authSource=admin"
    echo ""
    echo "  MongoDB External Connection String (NodePort 30017):"
    echo "  mongodb://mongo:mongopass@<node-ip>:30017/api?authSource=admin"
    echo ""
    echo "  MongoDB Metrics Endpoint:"
    echo "  http://mongodb-metrics.api-database.svc.cluster.local:9216/metrics"
    echo ""
    
    print_status "Kafka Connection Information (KRaft Mode - No Zookeeper):"
    echo "  Internal Service: kafka-service.api-database.svc.cluster.local:9092"
    echo "  External Service: kafka-external.api-database.svc.cluster.local:9092"
    echo ""
    echo "  Kafka Internal Bootstrap Servers:"
    echo "  kafka-service:9092"
    echo ""
    echo "  Kafka External Bootstrap Servers (NodePort 30092):"
    echo "  <node-ip>:30092"
    echo ""
    echo "  Note: Kafka is running in KRaft mode (no Zookeeper required)"
    echo ""
    
    print_status "API Connection Information:"
    echo "  Internal Service: api-service.api-database.svc.cluster.local:3000"
    echo "  External Service: api-external.api-database.svc.cluster.local:3000"
    echo ""
    echo "  API Endpoints:"
    echo "    - Health Check: http://api-service:3000/health"
    echo "    - Users API: http://api-service:3000/api/users"
    echo "    - Events API: http://api-service:3000/api/events"
    echo ""
    echo "  External Access (NodePort 30300):"
    echo "    - API Base: http://<node-ip>:30300"
    echo "    - Health Check: http://<node-ip>:30300/health"
    echo ""
    
    # Show how to access logs
    print_status "To view logs:"
    echo "  MongoDB: kubectl logs -f deployment/mongodb -n unity-database"
    echo "  Kafka: kubectl logs -f deployment/kafka -n unity-database"
    echo "  Unity API: kubectl logs -f deployment/unity-api -n unity-database"
    
    # Show how to exec into containers
    print_status "To access shells:"
    echo "  MongoDB: kubectl exec -it \$(kubectl get pods -n unity-database -l app=mongodb -o jsonpath='{.items[0].metadata.name}') -n unity-database -- mongosh"
    echo "  Kafka: kubectl exec -it \$(kubectl get pods -n unity-database -l app=kafka -o jsonpath='{.items[0].metadata.name}') -n unity-database -- /bin/bash"
    echo "  Unity API: kubectl exec -it \$(kubectl get pods -n unity-database -l app=unity-api -o jsonpath='{.items[0].metadata.name}') -n unity-database -- /bin/sh"
    
    # Show Kafka management
    print_status "To manage Kafka topics:"
    echo "  ./scripts/kafka-manager.sh list-topics"
    echo "  ./scripts/kafka-manager.sh create-topic user-events 3 1"
    echo "  ./scripts/kafka-manager.sh produce user-events 'Hello Kafka!'"
    
else
    print_error "❌ Deployment failed or pods are not running"
    print_error "MongoDB status: $MONGODB_STATUS"
    print_error "Kafka status: $KAFKA_STATUS"
    print_error "Unity API status: $API_STATUS"
    
    # Show pod details for debugging
    echo ""
    print_status "Pod details for debugging:"
    kubectl describe pods -n unity-database -l component=message-broker
    kubectl describe pods -n unity-database -l app=mongodb
    kubectl describe pods -n unity-database -l app=unity-api
    
    exit 1
fi

echo ""
print_status "🎉 Unity API infrastructure deployment completed successfully!"
