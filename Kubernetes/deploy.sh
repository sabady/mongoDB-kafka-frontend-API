#!/bin/bash

# MongoDB Kubernetes Deployment Script
# This script deploys MongoDB to Kubernetes for the Unity API project

set -e

echo "🚀 Starting MongoDB deployment for Unity API..."

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
if kubectl get namespace unity-database &> /dev/null; then
    print_warning "Namespace 'unity-database' already exists"
else
    print_status "Creating namespace 'unity-database'..."
    kubectl apply -f namespace.yaml
fi

# Deploy MongoDB using kustomize
print_status "Deploying MongoDB..."
kubectl apply -k .

# Wait for deployment to be ready
print_status "Waiting for MongoDB deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/mongodb -n unity-database

# Check deployment status
print_status "Checking deployment status..."
kubectl get all -n unity-database

# Check if pods are running
POD_STATUS=$(kubectl get pods -n unity-database -l app=mongodb -o jsonpath='{.items[0].status.phase}')
if [ "$POD_STATUS" = "Running" ]; then
    print_status "✅ MongoDB deployment successful!"
    print_status "MongoDB is now running in namespace 'unity-database'"
    
    # Display connection information
    echo ""
    print_status "Connection Information:"
    echo "  Service: mongodb-service.unity-database.svc.cluster.local:27017"
    echo "  Username: mongo"
    echo "  Password: mongopass"
    echo "  Database: unity"
    echo ""
    echo "  Connection String:"
    echo "  mongodb://mongo:mongopass@mongodb-service:27017/unity?authSource=admin"
    echo ""
    
    # Show how to access logs
    print_status "To view MongoDB logs:"
    echo "  kubectl logs -f deployment/mongodb -n unity-database"
    
    # Show how to exec into container
    print_status "To access MongoDB shell:"
    echo "  kubectl exec -it \$(kubectl get pods -n unity-database -l app=mongodb -o jsonpath='{.items[0].metadata.name}') -n unity-database -- mongosh"
    
else
    print_error "❌ MongoDB deployment failed or pod is not running"
    print_error "Pod status: $POD_STATUS"
    
    # Show pod details for debugging
    echo ""
    print_status "Pod details for debugging:"
    kubectl describe pods -n unity-database -l app=mongodb
    
    exit 1
fi

echo ""
print_status "🎉 MongoDB deployment completed successfully!"
