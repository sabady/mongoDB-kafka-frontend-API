s# Kafka KRaft Mode Setup

This document explains the Kafka KRaft mode deployment for the API project.

## Configuration

### Key KRaft Configuration Parameters

```yaml
env:
  # KRaft Mode Configuration
  - name: KAFKA_NODE_ID
    value: "1"
  - name: KAFKA_PROCESS_ROLES
    value: "broker,controller"
  - name: KAFKA_CONTROLLER_QUORUM_VOTERS
    value: "1@kafka-service:9093"
  - name: KAFKA_CONTROLLER_LISTENER_NAMES
    value: "CONTROLLER"
  - name: KAFKA_LISTENERS
    value: "PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093"
  - name: KAFKA_ADVERTISED_LISTENERS
    value: "PLAINTEXT://kafka-service:9092"
  - name: KAFKA_LISTENER_SECURITY_PROTOCOL_MAP
    value: "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT"
```

### Process Roles

- **broker**: Handles client connections and message storage
- **controller**: Manages cluster metadata and coordination
- **broker,controller**: Single node acts as both (our current setup)

## Deployment

### Single Node Setup (Current)
```bash
# Deploy Kafka in KRaft mode
kubectl apply -f Kubernetes/kafka-deployment.yaml

# Check deployment status
kubectl get pods -n api-database -l app=kafka

# Verify Kafka is running
./scripts/kafka-manager.sh status
```

### Multi-Node Setup (Production)
For production environments, you can scale to multiple nodes:

```yaml
# Example multi-node configuration
env:
  - name: KAFKA_NODE_ID
    value: "1"  # Unique for each node
  - name: KAFKA_PROCESS_ROLES
    value: "broker,controller"
  - name: KAFKA_CONTROLLER_QUORUM_VOTERS
    value: "1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093"
```

## Usage

### Basic Operations

```bash
# List topics
./scripts/kafka-manager.sh list-topics

# Create a topic
./scripts/kafka-manager.sh create-topic user-events 3 1

# Produce messages
./scripts/kafka-manager.sh produce user-events "Hello KRaft!"

# Consume messages
./scripts/kafka-manager.sh consume user-events

# Check cluster status
./scripts/kafka-manager.sh status
```

### Connection Strings

```bash
# Internal cluster access
kafka-service:9092

# External access (via NodePort)
<node-ip>:30092

# Port forwarding for local development
kubectl port-forward service/kafka-external 9092:9092 -n api-database
```

## Monitoring

### Health Checks
- **Liveness Probe**: TCP check on port 9092
- **Readiness Probe**: TCP check on port 9092
- **Startup Time**: ~60 seconds (KRaft initialization)

### Logs
```bash
# View Kafka logs
kubectl logs -f deployment/kafka -n api-database

# Or use the manager script
./scripts/kafka-manager.sh logs kafka
```

### Metrics
KRaft mode provides the same JMX metrics as traditional Kafka, with additional controller-specific metrics.

## Troubleshooting

### Common Issues

1. **Kafka won't start**
   - Check if the node ID is unique
   - Verify controller quorum voters configuration
   - Ensure ports 9092 and 9093 are available

2. **Topics not created**
   - Verify auto.create.topics.enable=true
   - Check replication factor (should be ≤ number of brokers)

3. **Connection refused**
   - Verify service endpoints
   - Check if Kafka is fully started (may take 60+ seconds)

### Debug Commands

```bash
# Check pod status
kubectl describe pod <kafka-pod> -n api-database

# Check service endpoints
kubectl get endpoints kafka-service -n api-database

# Test connectivity
kubectl exec -it <kafka-pod> -n api-database -- netstat -tlnp
```

## Security

### Current Setup
- **No Authentication**: PLAINTEXT protocol
- **No Authorization**: Open access
- **Network**: Internal cluster communication only

### Production Recommendations
- Enable SASL authentication
- Use TLS encryption
- Implement RBAC authorization
- Use network policies for access control

