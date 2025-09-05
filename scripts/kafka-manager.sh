#!/bin/bash

# Kafka Management Script for API
# This script helps manage Kafka topics and operations

set -e

echo "🚀 Kafka Management for API..."

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

# Default values
NAMESPACE="api-database"
KAFKA_SERVICE="kafka-service"
KAFKA_PORT="9092"

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  create-topic <topic-name> [partitions] [replication-factor]  Create a new topic"
    echo "  list-topics                                                 List all topics"
    echo "  describe-topic <topic-name>                                 Describe a topic"
    echo "  delete-topic <topic-name>                                   Delete a topic"
    echo "  produce <topic-name> <message>                              Produce a message"
    echo "  consume <topic-name> [from-beginning]                       Consume messages"
    echo "  status                                                      Check Kafka status (KRaft mode)"
    echo "  logs                                                        Show Kafka logs"
    echo "  shell                                                       Open Kafka shell"
    echo ""
    echo "Options:"
    echo "  --namespace <namespace>     Kubernetes namespace (default: api-database)"
    echo "  --service <service-name>    Kafka service name (default: kafka-service)"
    echo "  --port <port>               Kafka port (default: 9092)"
    echo ""
    echo "Examples:"
    echo "  $0 create-topic user-events 3 1"
    echo "  $0 list-topics"
    echo "  $0 produce user-events 'Hello Kafka!'"
    echo "  $0 consume user-events"
}

# Function to check if Kafka is running
check_kafka_status() {
    print_step "Checking Kafka status..."
    
    if ! kubectl get pods -n "$NAMESPACE" -l app=kafka &> /dev/null; then
        print_error "Kafka pod not found in namespace $NAMESPACE"
        return 1
    fi
    
    KAFKA_POD=$(kubectl get pods -n "$NAMESPACE" -l app=kafka -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$KAFKA_POD" ]; then
        print_error "No Kafka pod found"
        return 1
    fi
    
    print_status "Found Kafka pod: $KAFKA_POD"
    
    # Check if pod is running
    STATUS=$(kubectl get pod "$KAFKA_POD" -n "$NAMESPACE" -o jsonpath='{.status.phase}')
    if [ "$STATUS" != "Running" ]; then
        print_error "Kafka pod is not running (status: $STATUS)"
        return 1
    fi
    
    print_status "✅ Kafka is running"
    return 0
}

# Function to create a topic
create_topic() {
    local topic_name="$1"
    local partitions="${2:-3}"
    local replication_factor="${3:-1}"
    
    if [ -z "$topic_name" ]; then
        print_error "Topic name is required"
        return 1
    fi
    
    print_step "Creating topic: $topic_name"
    print_status "Partitions: $partitions, Replication Factor: $replication_factor"
    
    if ! check_kafka_status; then
        return 1
    fi
    
    KAFKA_POD=$(kubectl get pods -n "$NAMESPACE" -l app=kafka -o jsonpath='{.items[0].metadata.name}')
    
    kubectl exec -it "$KAFKA_POD" -n "$NAMESPACE" -- kafka-topics \
        --bootstrap-server localhost:9092 \
        --create \
        --topic "$topic_name" \
        --partitions "$partitions" \
        --replication-factor "$replication_factor"
    
    print_status "✅ Topic '$topic_name' created successfully"
}

# Function to list topics
list_topics() {
    print_step "Listing all topics..."
    
    if ! check_kafka_status; then
        return 1
    fi
    
    KAFKA_POD=$(kubectl get pods -n "$NAMESPACE" -l app=kafka -o jsonpath='{.items[0].metadata.name}')
    
    kubectl exec -it "$KAFKA_POD" -n "$NAMESPACE" -- kafka-topics \
        --bootstrap-server localhost:9092 \
        --list
}

# Function to describe a topic
describe_topic() {
    local topic_name="$1"
    
    if [ -z "$topic_name" ]; then
        print_error "Topic name is required"
        return 1
    fi
    
    print_step "Describing topic: $topic_name"
    
    if ! check_kafka_status; then
        return 1
    fi
    
    KAFKA_POD=$(kubectl get pods -n "$NAMESPACE" -l app=kafka -o jsonpath='{.items[0].metadata.name}')
    
    kubectl exec -it "$KAFKA_POD" -n "$NAMESPACE" -- kafka-topics \
        --bootstrap-server localhost:9092 \
        --describe \
        --topic "$topic_name"
}

# Function to delete a topic
delete_topic() {
    local topic_name="$1"
    
    if [ -z "$topic_name" ]; then
        print_error "Topic name is required"
        return 1
    fi
    
    print_step "Deleting topic: $topic_name"
    print_warning "This action cannot be undone!"
    
    if ! check_kafka_status; then
        return 1
    fi
    
    KAFKA_POD=$(kubectl get pods -n "$NAMESPACE" -l app=kafka -o jsonpath='{.items[0].metadata.name}')
    
    kubectl exec -it "$KAFKA_POD" -n "$NAMESPACE" -- kafka-topics \
        --bootstrap-server localhost:9092 \
        --delete \
        --topic "$topic_name"
    
    print_status "✅ Topic '$topic_name' deleted successfully"
}

# Function to produce a message
produce_message() {
    local topic_name="$1"
    local message="$2"
    
    if [ -z "$topic_name" ] || [ -z "$message" ]; then
        print_error "Topic name and message are required"
        return 1
    fi
    
    print_step "Producing message to topic: $topic_name"
    print_status "Message: $message"
    
    if ! check_kafka_status; then
        return 1
    fi
    
    KAFKA_POD=$(kubectl get pods -n "$NAMESPACE" -l app=kafka -o jsonpath='{.items[0].metadata.name}')
    
    echo "$message" | kubectl exec -i "$KAFKA_POD" -n "$NAMESPACE" -- kafka-console-producer \
        --bootstrap-server localhost:9092 \
        --topic "$topic_name"
    
    print_status "✅ Message sent successfully"
}

# Function to consume messages
consume_messages() {
    local topic_name="$1"
    local from_beginning="$2"
    
    if [ -z "$topic_name" ]; then
        print_error "Topic name is required"
        return 1
    fi
    
    print_step "Consuming messages from topic: $topic_name"
    
    if ! check_kafka_status; then
        return 1
    fi
    
    KAFKA_POD=$(kubectl get pods -n "$NAMESPACE" -l app=kafka -o jsonpath='{.items[0].metadata.name}')
    
    local cmd="kafka-console-consumer --bootstrap-server localhost:9092 --topic $topic_name"
    
    if [ "$from_beginning" = "true" ] || [ "$from_beginning" = "1" ]; then
        cmd="$cmd --from-beginning"
        print_status "Reading from beginning of topic"
    fi
    
    kubectl exec -it "$KAFKA_POD" -n "$NAMESPACE" -- $cmd
}

# Function to show Kafka status
show_status() {
    print_step "Kafka Cluster Status (KRaft Mode)"
    
    # Check pods
    print_status "Checking pods..."
    kubectl get pods -n "$NAMESPACE" -l component=message-broker
    
    # Check services
    print_status "Checking services..."
    kubectl get services -n "$NAMESPACE" -l component=message-broker
    
    # Check PVCs
    print_status "Checking persistent volume claims..."
    kubectl get pvc -n "$NAMESPACE" -l component=message-broker
    
    # Check if Kafka is responding
    if check_kafka_status; then
        print_status "✅ Kafka is healthy and responding (KRaft mode)"
    else
        print_error "❌ Kafka is not responding"
    fi
}

# Function to show logs
show_logs() {
    local service="$1"
    
    if [ -z "$service" ]; then
        print_step "Available services: kafka"
        echo "Usage: $0 logs kafka"
        return 1
    fi
    
    print_step "Showing logs for: $service"
    
    kubectl logs -f -n "$NAMESPACE" -l app="$service" --tail=100
}

# Function to open Kafka shell
open_shell() {
    print_step "Opening Kafka shell..."
    
    if ! check_kafka_status; then
        return 1
    fi
    
    KAFKA_POD=$(kubectl get pods -n "$NAMESPACE" -l app=kafka -o jsonpath='{.items[0].metadata.name}')
    
    print_status "Opening shell in Kafka pod: $KAFKA_POD"
    print_status "Available commands: kafka-topics, kafka-console-producer, kafka-console-consumer"
    
    kubectl exec -it "$KAFKA_POD" -n "$NAMESPACE" -- /bin/bash
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --service)
            KAFKA_SERVICE="$2"
            shift 2
            ;;
        --port)
            KAFKA_PORT="$2"
            shift 2
            ;;
        create-topic)
            create_topic "$2" "$3" "$4"
            exit $?
            ;;
        list-topics)
            list_topics
            exit $?
            ;;
        describe-topic)
            describe_topic "$2"
            exit $?
            ;;
        delete-topic)
            delete_topic "$2"
            exit $?
            ;;
        produce)
            produce_message "$2" "$3"
            exit $?
            ;;
        consume)
            consume_messages "$2" "$3"
            exit $?
            ;;
        status)
            show_status
            exit $?
            ;;
        logs)
            show_logs "$2"
            exit $?
            ;;
        shell)
            open_shell
            exit $?
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
done

# If no command provided, show usage
show_usage
