#!/bin/bash

# MongoDB Services Verification Script
# This script verifies that all MongoDB services are running correctly

set -e

echo "🔍 Verifying MongoDB services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if we can connect to the cluster
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

print_status "Connected to Kubernetes cluster"

# Check namespace
print_step "Checking namespace..."
if kubectl get namespace unity-database &> /dev/null; then
    print_status "Namespace 'unity-database' exists"
else
    print_error "Namespace 'unity-database' not found"
    exit 1
fi

# Check services
print_step "Checking MongoDB services..."

# Internal service
if kubectl get service mongodb-service -n unity-database &> /dev/null; then
    print_status "✅ Internal service (mongodb-service) exists"
    kubectl get service mongodb-service -n unity-database -o wide
else
    print_error "❌ Internal service (mongodb-service) not found"
fi

# External service
if kubectl get service mongodb-external -n unity-database &> /dev/null; then
    print_status "✅ External service (mongodb-external) exists"
    kubectl get service mongodb-external -n unity-database -o wide
else
    print_error "❌ External service (mongodb-external) not found"
fi

# Metrics service
if kubectl get service mongodb-metrics -n unity-database &> /dev/null; then
    print_status "✅ Metrics service (mongodb-metrics) exists"
    kubectl get service mongodb-metrics -n unity-database -o wide
else
    print_error "❌ Metrics service (mongodb-metrics) not found"
fi

print_step "Checking Kafka services..."

# Kafka internal service
if kubectl get service kafka-service -n unity-database &> /dev/null; then
    print_status "✅ Kafka internal service (kafka-service) exists"
    kubectl get service kafka-service -n unity-database -o wide
else
    print_error "❌ Kafka internal service (kafka-service) not found"
fi

# Kafka external service
if kubectl get service kafka-external -n unity-database &> /dev/null; then
    print_status "✅ Kafka external service (kafka-external) exists"
    kubectl get service kafka-external -n unity-database -o wide
else
    print_error "❌ Kafka external service (kafka-external) not found"
fi


# Check pods
print_step "Checking MongoDB pods..."
MONGODB_PODS=$(kubectl get pods -n unity-database -l app=mongodb -o jsonpath='{.items[*].metadata.name}')

print_step "Checking Kafka pods..."
KAFKA_PODS=$(kubectl get pods -n unity-database -l app=kafka -o jsonpath='{.items[*].metadata.name}')


# Check MongoDB pods
if [ -n "$MONGODB_PODS" ]; then
    print_status "Found MongoDB pods: $MONGODB_PODS"
    
    for pod in $MONGODB_PODS; do
        print_step "Checking MongoDB pod: $pod"
        kubectl get pod "$pod" -n unity-database -o wide
        
        # Check pod status
        STATUS=$(kubectl get pod "$pod" -n unity-database -o jsonpath='{.status.phase}')
        if [ "$STATUS" = "Running" ]; then
            print_status "✅ MongoDB pod $pod is running"
        else
            print_warning "⚠️  MongoDB pod $pod status: $STATUS"
        fi
        
        # Check container status
        kubectl get pod "$pod" -n unity-database -o jsonpath='{.status.containerStatuses[*].name}' | tr ' ' '\n' | while read -r container; do
            if [ -n "$container" ]; then
                READY=$(kubectl get pod "$pod" -n unity-database -o jsonpath="{.status.containerStatuses[?(@.name=='$container')].ready}")
                if [ "$READY" = "true" ]; then
                    print_status "✅ MongoDB container $container is ready"
                else
                    print_warning "⚠️  MongoDB container $container is not ready"
                fi
            fi
        done
    done
else
    print_error "❌ No MongoDB pods found"
fi

# Check Kafka pods
if [ -n "$KAFKA_PODS" ]; then
    print_status "Found Kafka pods: $KAFKA_PODS"
    
    for pod in $KAFKA_PODS; do
        print_step "Checking Kafka pod: $pod"
        kubectl get pod "$pod" -n unity-database -o wide
        
        # Check pod status
        STATUS=$(kubectl get pod "$pod" -n unity-database -o jsonpath='{.status.phase}')
        if [ "$STATUS" = "Running" ]; then
            print_status "✅ Kafka pod $pod is running"
        else
            print_warning "⚠️  Kafka pod $pod status: $STATUS"
        fi
        
        # Check container status
        kubectl get pod "$pod" -n unity-database -o jsonpath='{.status.containerStatuses[*].name}' | tr ' ' '\n' | while read -r container; do
            if [ -n "$container" ]; then
                READY=$(kubectl get pod "$pod" -n unity-database -o jsonpath="{.status.containerStatuses[?(@.name=='$container')].ready}")
                if [ "$READY" = "true" ]; then
                    print_status "✅ Kafka container $container is ready"
                else
                    print_warning "⚠️  Kafka container $container is not ready"
                fi
            fi
        done
    done
else
    print_error "❌ No Kafka pods found"
fi


# Check endpoints
print_step "Checking service endpoints..."
for service in mongodb-service mongodb-external mongodb-metrics kafka-service kafka-external; do
    if kubectl get endpoints "$service" -n unity-database &> /dev/null; then
        print_status "✅ Endpoints for $service:"
        kubectl get endpoints "$service" -n unity-database
    else
        print_warning "⚠️  No endpoints found for $service"
    fi
done

# Test connectivity (if possible)
print_step "Testing service connectivity..."

# Test internal service
if kubectl get service mongodb-service -n unity-database &> /dev/null; then
    print_status "Testing internal service connectivity..."
    if kubectl run test-connection --image=busybox --rm -i --restart=Never -n unity-database -- wget -qO- mongodb-service:27017 &> /dev/null; then
        print_status "✅ Internal service is reachable"
    else
        print_warning "⚠️  Internal service connectivity test failed"
    fi
fi

# Test metrics service
if kubectl get service mongodb-metrics -n unity-database &> /dev/null; then
    print_status "Testing metrics service connectivity..."
    if kubectl run test-metrics --image=busybox --rm -i --restart=Never -n unity-database -- wget -qO- mongodb-metrics:9216/metrics &> /dev/null; then
        print_status "✅ Metrics service is reachable"
    else
        print_warning "⚠️  Metrics service connectivity test failed"
    fi
fi

# Show service summary
echo ""
print_status "📊 Service Summary:"
echo "  MongoDB Services:"
echo "    - Internal: mongodb-service:27017 (ClusterIP)"
echo "    - External: mongodb-external:27017 (NodePort:30017)"
echo "    - Metrics: mongodb-metrics:9216 (ClusterIP)"
echo ""
echo "  Kafka Services (KRaft Mode):"
echo "    - Internal: kafka-service:9092 (ClusterIP)"
echo "    - External: kafka-external:9092 (NodePort:30092)"
echo ""
echo "  To access from outside the cluster:"
echo "    MongoDB: kubectl port-forward service/mongodb-external 27017:27017 -n unity-database"
echo "    Kafka: kubectl port-forward service/kafka-external 9092:9092 -n unity-database"
echo ""
echo "  To view metrics:"
echo "    kubectl port-forward service/mongodb-metrics 9216:9216 -n unity-database"
echo "    curl http://localhost:9216/metrics"
echo ""

print_status "🎉 Service verification completed!"
