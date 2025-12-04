````markdown:docs/deploy-k8s.md
# Kubernetes Deployment Guide for Connect Career

This guide covers deploying the Connect Career backend services to Kubernetes (Minikube).

## Prerequisites

- Minikube installed and running
- kubectl configured
- kubeseal CLI installed (for Sealed Secrets)
- Docker installed

## 1. Start Minikube

```bash
# Start minikube
minikube start

# Enable ingress addon (optional, for external access)
minikube addons enable ingress

# Verify kubectl can connect
kubectl get nodes
````

## 2. Build and Load Docker Images

Since minikube has its own Docker daemon, build images inside minikube or load them:

```bash
# Option A: Use minikube's Docker daemon
eval $(minikube docker-env)
cd services/connect-career-be
docker build -t connect-career-be:latest .
cd ../ai-service
docker build -t ai-service:latest .

# Option B: Build locally and load into minikube
docker build -t connect-career-be:latest ./services/connect-career-be
docker build -t ai-service:latest ./services/ai-service
minikube image load connect-career-be:latest
minikube image load ai-service:latest

# Reset Docker environment (if using Option A)
eval $(minikube docker-env -u)
```

## 3. Install Sealed Secrets Controller

```bash
# Install Sealed Secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Wait for it to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=sealed-secrets -n kube-system --timeout=300s

# Verify installation
kubectl get pods -n kube-system | grep sealed-secrets
```

## 4. Create Sealed Secrets (First Time Setup)

If you haven't created sealed secrets yet:

```bash
# Make sure you're in the project root
cd infra/k8s

# Create sealed secret for connect-career-be
kubeseal -o yaml < connect-career-be-secret.yaml > connect-career-be-sealed-secret.yaml

# Create sealed secret for ai-service
kubeseal -o yaml < ai-service-secret.yaml > ai-service-sealed-secret.yaml
```

**Note:** Update the plain secret files (`*-secret.yaml`) with your actual values before sealing. Never commit plain secret files to Git.

## 5. Deploy to Kubernetes

### Create Namespace

```bash
kubectl apply -f infra/k8s/namespace.yaml
```

### Create ConfigMaps

```bash
kubectl apply -f infra/k8s/connect-career-be-config.yaml
kubectl apply -f infra/k8s/ai-service-config.yaml
```

### Create Sealed Secrets

```bash
kubectl apply -f infra/k8s/connect-career-be-sealed-secret.yaml
kubectl apply -f infra/k8s/ai-service-sealed-secret.yaml

# Verify that regular secrets were created from sealed secrets
kubectl get secrets -n connect-career
kubectl get sealedsecrets -n connect-career
```

### Deploy Services

```bash
kubectl apply -f infra/k8s/connect-career-be-deployment.yaml
kubectl apply -f infra/k8s/ai-service-deployment.yaml
```

### Deploy Ingress (Optional)

```bash
kubectl apply -f infra/k8s/ingress.yaml
```

## 6. Verify Deployment

```bash
# Check pod status
kubectl get pods -n connect-career

# Check services
kubectl get services -n connect-career

# Check deployments
kubectl get deployments -n connect-career

# Check ingress
kubectl get ingress -n connect-career

# View pod logs
kubectl logs -f deployment/connect-career-be -n connect-career
kubectl logs -f deployment/ai-service -n connect-career

# Describe a pod for troubleshooting
kubectl describe pod <pod-name> -n connect-career
```

## 7. Access Services

### Option A: Port Forwarding (Quick Testing)

```bash
# For connect-career-be (in one terminal)
kubectl port-forward -n connect-career svc/connect-career-be-service 8080:80

# For ai-service (in another terminal)
kubectl port-forward -n connect-career svc/ai-service-service 8000:80
```

Access:

- connect-career-be: http://localhost:8080
- ai-service: http://localhost:8000

### Option B: Using Minikube Service

```bash
# Open in browser
minikube service connect-career-be-service -n connect-career
minikube service ai-service-service -n connect-career
```

### Option C: Using Ingress

```bash
# Get minikube IP
minikube ip

# Add to your /etc/hosts (or C:\Windows\System32\drivers\etc\hosts on Windows)
# <minikube-ip> connect-career.local
```

Access:

- connect-career-be: http://connect-career.local/api
- ai-service: http://connect-career.local/ai

## 8. Common Operations

### Scale Deployments

```bash
kubectl scale deployment/connect-career-be --replicas=3 -n connect-career
kubectl scale deployment/ai-service --replicas=3 -n connect-career
```

### Restart Deployments

```bash
kubectl rollout restart deployment/connect-career-be -n connect-career
kubectl rollout restart deployment/ai-service -n connect-career
```

### Update ConfigMaps

```bash
# Edit configmap
kubectl edit configmap connect-career-be-config -n connect-career

# Or apply updated file
kubectl apply -f infra/k8s/connect-career-be-config.yaml

# Restart deployment to pick up changes (or use Reloader if installed)
kubectl rollout restart deployment/connect-career-be -n connect-career
```

### Update Secrets

```bash
# 1. Edit the plain secret file (DO NOT COMMIT)
# Edit infra/k8s/connect-career-be-secret.yaml with new values

# 2. Regenerate the sealed secret
kubeseal -o yaml < infra/k8s/connect-career-be-secret.yaml > infra/k8s/connect-career-be-sealed-secret.yaml

# 3. Apply the sealed secret
kubectl apply -f infra/k8s/connect-career-be-sealed-secret.yaml

# 4. Restart deployment to pick up changes
kubectl rollout restart deployment/connect-career-be -n connect-career
```

### View Events

```bash
kubectl get events -n connect-career --sort-by='.lastTimestamp'
```

### Debug Pod Issues

```bash
# Get pod logs
kubectl logs <pod-name> -n connect-career

# Get previous container logs (if pod crashed)
kubectl logs <pod-name> -n connect-career --previous

# Execute into pod
kubectl exec -it <pod-name> -n connect-career -- /bin/sh

# Describe pod for detailed information
kubectl describe pod <pod-name> -n connect-career
```

## 9. Cleanup

### Delete All Resources

```bash
# Delete entire namespace (removes everything)
kubectl delete namespace connect-career

# Or delete individual resources
kubectl delete -f infra/k8s/connect-career-be-deployment.yaml
kubectl delete -f infra/k8s/ai-service-deployment.yaml
kubectl delete -f infra/k8s/ingress.yaml
kubectl delete -f infra/k8s/connect-career-be-config.yaml
kubectl delete -f infra/k8s/ai-service-config.yaml
kubectl delete -f infra/k8s/connect-career-be-sealed-secret.yaml
kubectl delete -f infra/k8s/ai-service-sealed-secret.yaml
kubectl delete -f infra/k8s/namespace.yaml
```

### Stop Minikube

```bash
minikube stop
```

## 10. Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n connect-career

# Check pod events
kubectl describe pod <pod-name> -n connect-career

# Check logs
kubectl logs <pod-name> -n connect-career
```

### Image Pull Errors

```bash
# Verify images are loaded in minikube
minikube image ls

# Rebuild and reload images
eval $(minikube docker-env)
docker build -t connect-career-be:latest ./services/connect-career-be
docker build -t ai-service:latest ./services/ai-service
```

### Secrets Not Working

```bash
# Check if sealed secrets controller is running
kubectl get pods -n kube-system | grep sealed-secrets

# Check sealed secrets
kubectl get sealedsecrets -n connect-career

# Check regular secrets (created from sealed secrets)
kubectl get secrets -n connect-career

# View secret (base64 encoded)
kubectl get secret connect-career-be-secret -n connect-career -o yaml
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints -n connect-career

# Check service details
kubectl describe service connect-career-be-service -n connect-career

# Test service from within cluster
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup connect-career-be-service
```

## 11. Reloader (Auto-reload on Config/Secret Changes)

If you have Reloader installed, deployments will automatically restart when ConfigMaps or Secrets change:

```bash
# Install Reloader (if not already installed)
kubectl apply -f https://raw.githubusercontent.com/stakater/Reloader/master/deployments/kubernetes/reloader.yaml

# Verify installation
kubectl get pods -n reloader-system
```

The deployments already have the annotation `reloader.stakater.com/auto: "true"` which enables auto-reload.

## 12. File Structure

```
infra/k8s/
├── namespace.yaml                          # Namespace definition
├── connect-career-be-config.yaml          # ConfigMap for connect-career-be
├── connect-career-be-secret.yaml          # Plain secret (DO NOT COMMIT)
├── connect-career-be-sealed-secret.yaml   # Sealed secret (safe to commit)
├── connect-career-be-deployment.yaml      # Deployment for connect-career-be
├── ai-service-config.yaml                 # ConfigMap for ai-service
├── ai-service-secret.yaml                 # Plain secret (DO NOT COMMIT)
├── ai-service-sealed-secret.yaml          # Sealed secret (safe to commit)
├── ai-service-deployment.yaml             # Deployment for ai-service
└── ingress.yaml                           # Ingress configuration
```

## Notes

- **Never commit plain secret files** (`*-secret.yaml`) to Git
- **Always commit sealed secret files** (`*-sealed-secret.yaml`) - they are encrypted
- Sealed secrets are cluster-specific - you'll need separate sealed secrets for different clusters
- Update the plain secret files with actual values before sealing
- The Sealed Secrets controller automatically converts sealed secrets to regular secrets

```

```
