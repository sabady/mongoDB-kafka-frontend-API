# MongoDB Kubernetes Deployment

This directory contains Kubernetes manifests for deploying MongoDB in a Kubernetes cluster for the API project.

## 🏗️ Components

### 1. **Namespace** (`namespace.yaml`)
- Creates a dedicated `api-database` namespace for database resources
- Provides logical separation and organization

### 2. **MongoDB Deployment** (`mongodb-deployment.yaml`)
- **Deployment**: MongoDB 7.0 with persistent storage and metrics exporter
- **Services**: 
  - `mongodb-service`: ClusterIP service for internal communication
  - `mongodb-external`: NodePort service for external access (port 30017)
  - `mongodb-metrics`: ClusterIP service for Prometheus metrics (port 9216)
- **PVC**: 10GB persistent volume claim for data persistence
- **ConfigMap**: MongoDB configuration settings
- **Secret**: Database credentials (username/password)

## 🚀 Deployment Instructions

### Prerequisites
- Kubernetes cluster running
- `kubectl` configured and accessible
- Default storage class available (or modify PVC accordingly)

### Step 1: Create Namespace
```bash
kubectl apply -f namespace.yaml
```

### Step 2: Deploy MongoDB
```bash
kubectl apply -f mongodb-deployment.yaml
```

### Step 3: Verify Deployment
```bash
# Check namespace
kubectl get namespace api-database

# Check all resources
kubectl get all -n api-database

# Check pods status
kubectl get pods -n api-database

# Check services
kubectl get services -n api-database

# Check persistent volume claims
kubectl get pvc -n api-database
```

## 🔧 Configuration

### Default Credentials
- **Username**: `mongo`
- **Password**: `mongopass`
- **Database**: `api`

### Resource Limits
- **Memory**: 256Mi request, 1Gi limit
- **CPU**: 250m request, 500m limit
- **Storage**: 10Gi persistent storage

### Security Features
- MongoDB authentication enabled
- Credentials stored in Kubernetes secrets
- Security headers and proper isolation

### Monitoring Features
- **MongoDB Exporter**: Percona MongoDB exporter for Prometheus metrics
- **Metrics Port**: 9216 with `/metrics` endpoint
- **Health Checks**: HTTP health checks on metrics endpoint
- **Resource Monitoring**: CPU, memory, and connection metrics

## 🌐 Accessing MongoDB

### From within the cluster:
- **Internal Service**: `mongodb-service.api-database.svc.cluster.local:27017`
- **Host**: `mongodb-service`
- **Port**: `27017`

### From outside the cluster (development/testing):
- **External Service**: `mongodb-external.api-database.svc.cluster.local:27017`
- **NodePort**: `30017` (accessible from any node IP)
- **Host**: `<node-ip>:30017`

### Metrics and Monitoring:
- **Metrics Service**: `mongodb-metrics.api-database.svc.cluster.local:9216`
- **Metrics Endpoint**: `/metrics` (Prometheus compatible)
- **Health Check**: `/health`

### Connection String Format:
```
mongodb://mongo:mongopass@mongodb-service:27017/api?authSource=admin
```

## 📊 Monitoring

### Health Checks
- **Liveness Probe**: TCP check on port 27017 every 10 seconds
- **Readiness Probe**: TCP check on port 27017 every 5 seconds

### Logs
```bash
# View MongoDB logs
kubectl logs -f deployment/mongodb -n api-database

# View specific pod logs
kubectl logs -f <pod-name> -n api-database
```

## 🔒 Security Notes

⚠️ **Important Security Considerations:**
- Default credentials are for development only
- In production, use proper secret management
- Consider using external secret operators
- Rotate credentials regularly
- Restrict network access as needed

## 🧹 Cleanup

### Remove MongoDB deployment:
```bash
kubectl delete -f mongodb-deployment.yaml
```

### Remove namespace (will delete all resources):
```bash
kubectl delete -f namespace.yaml
```

## 🔄 Updates and Maintenance

### Update MongoDB version:
1. Modify the image tag in `mongodb-deployment.yaml`
2. Apply the updated deployment
3. Monitor the rollout: `kubectl rollout status deployment/mongodb -n api-database`

### Scale replicas:
```bash
kubectl scale deployment mongodb --replicas=3 -n api-database
```

## 📝 Troubleshooting

### Common Issues:

1. **Pod stuck in Pending state**
   - Check storage class availability
   - Verify resource quotas

2. **Connection refused errors**
   - Verify service is running
   - Check pod readiness

3. **Authentication failures**
   - Verify secret exists and is correct
   - Check environment variables

### Debug Commands:
```bash
# Describe deployment
kubectl describe deployment mongodb -n api-database

# Describe pod
kubectl describe pod <pod-name> -n api-database

# Exec into MongoDB container
kubectl exec -it <pod-name> -n api-database -- mongosh
```
