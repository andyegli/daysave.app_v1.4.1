# DaySave Production Deployment on Google Cloud Platform

## 🏭 **Production-Ready GCP Deployment Guide**

This guide covers secure deployment of DaySave v1.4.2 to Google Cloud Platform with proper credential management, security, and scalability.

---

## 🔐 **Credential Management for Production**

### **🥇 Method 1: Service Account Attached to Compute Instance (Recommended)**

#### **Setup Steps:**

1. **Create a Service Account**
```bash
# Create service account
gcloud iam service-accounts create daysave-production \
    --description="DaySave production service account" \
    --display-name="DaySave Production"

# Grant necessary permissions
gcloud projects add-iam-policy-binding daysave-v1412 \
    --member="serviceAccount:daysave-production@daysave-v1412.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding daysave-v1412 \
    --member="serviceAccount:daysave-production@daysave-v1412.iam.gserviceaccount.com" \
    --role="roles/speech.client"

gcloud projects add-iam-policy-binding daysave-v1412 \
    --member="serviceAccount:daysave-production@daysave-v1412.iam.gserviceaccount.com" \
    --role="roles/vision.client"
```

2. **Production Docker Compose (docker-compose.production.yml)**
```yaml
version: '3.8'

services:
  app:
    image: gcr.io/daysave-v1412/daysave:latest
    environment:
      # ===== NO GOOGLE_APPLICATION_CREDENTIALS needed! =====
      # GCP provides automatic authentication via attached service account
      
      - NODE_ENV=production
      - GOOGLE_CLOUD_PROJECT_ID=daysave-v1412
      - GOOGLE_CLOUD_STORAGE_BUCKET=daysave-uploads
      - GOOGLE_CLOUD_SPEECH_LANGUAGE=en-US
      - GOOGLE_CLOUD_VISION_LANGUAGE=en
      
      # Other production settings
      - SESSION_SECRET=${SESSION_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}
      
    # ===== NO VOLUME MOUNTS for credentials =====
    # volumes:
    #   - ./config/credentials/... ← NOT NEEDED in production
    
    ports:
      - "8080:3000"
    restart: unless-stopped
    
  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=${DB_NAME}
      - MYSQL_USER=${DB_USER}
      - MYSQL_PASSWORD=${DB_USER_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

3. **Deploy to Compute Engine with Service Account**
```bash
# Create VM with attached service account
gcloud compute instances create daysave-production \
    --image-family=cos-stable \
    --image-project=cos-cloud \
    --machine-type=e2-standard-2 \
    --service-account=daysave-production@daysave-v1412.iam.gserviceaccount.com \
    --scopes=cloud-platform \
    --zone=asia-southeast1-a
```

---

### **🥈 Method 2: Google Cloud Secret Manager**

#### **Setup Steps:**

1. **Store secrets in Secret Manager**
```bash
# Store service account key in Secret Manager
gcloud secrets create daysave-service-account-key \
    --data-file=config/credentials/daysave-v1412-storage-a1e112ca7a82.json

# Store other secrets
echo "your-openai-key" | gcloud secrets create openai-api-key --data-file=-
echo "your-session-secret" | gcloud secrets create session-secret --data-file=-
```

2. **Production Dockerfile with Secret Manager**
```dockerfile
# Multi-stage production Dockerfile
FROM google/cloud-sdk:alpine AS secrets
WORKDIR /tmp
RUN gcloud secrets versions access latest --secret="daysave-service-account-key" > /tmp/service-account.json

FROM node:18-alpine AS production
WORKDIR /usr/src/app

# Copy application
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .

# Copy secrets from previous stage
COPY --from=secrets /tmp/service-account.json /usr/src/app/gcp-credentials/service-account.json

# Set production environment
ENV GOOGLE_APPLICATION_CREDENTIALS=/usr/src/app/gcp-credentials/service-account.json
ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "start"]
```

---

### **🥉 Method 3: Cloud Run Deployment (Serverless)**

#### **Deploy to Cloud Run**

1. **Build and Push Container**
```bash
# Build for production
docker build -t gcr.io/daysave-v1412/daysave:latest .

# Push to Google Container Registry
docker push gcr.io/daysave-v1412/daysave:latest
```

2. **Deploy to Cloud Run**
```bash
gcloud run deploy daysave \
    --image=gcr.io/daysave-v1412/daysave:latest \
    --service-account=daysave-production@daysave-v1412.iam.gserviceaccount.com \
    --set-env-vars="GOOGLE_CLOUD_PROJECT_ID=daysave-v1412,GOOGLE_CLOUD_STORAGE_BUCKET=daysave-uploads" \
    --set-secrets="OPENAI_API_KEY=openai-api-key:latest,SESSION_SECRET=session-secret:latest" \
    --platform=managed \
    --region=asia-southeast1 \
    --allow-unauthenticated
```

---

## 🏗️ **Google Kubernetes Engine (GKE) with Workload Identity**

### **Setup Workload Identity**

1. **Create GKE cluster with Workload Identity**
```bash
gcloud container clusters create daysave-cluster \
    --workload-pool=daysave-v1412.svc.id.goog \
    --zone=asia-southeast1-a
```

2. **Configure Workload Identity**
```bash
# Create Kubernetes service account
kubectl create serviceaccount daysave-ksa

# Bind to Google Cloud service account
gcloud iam service-accounts add-iam-policy-binding \
    daysave-production@daysave-v1412.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:daysave-v1412.svc.id.goog[default/daysave-ksa]"

kubectl annotate serviceaccount daysave-ksa \
    iam.gke.io/gcp-service-account=daysave-production@daysave-v1412.iam.gserviceaccount.com
```

3. **Kubernetes Deployment**
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: daysave
spec:
  replicas: 3
  selector:
    matchLabels:
      app: daysave
  template:
    metadata:
      labels:
        app: daysave
    spec:
      serviceAccountName: daysave-ksa  # Uses Workload Identity
      containers:
      - name: daysave
        image: gcr.io/daysave-v1412/daysave:latest
        env:
        - name: GOOGLE_CLOUD_PROJECT_ID
          value: "daysave-v1412"
        - name: GOOGLE_CLOUD_STORAGE_BUCKET
          value: "daysave-uploads"
        # No GOOGLE_APPLICATION_CREDENTIALS needed!
        ports:
        - containerPort: 3000
```

---

## 🔒 **Security Best Practices for Production**

### **1. Remove Development Configurations**

```bash
# Remove local development files from production image
echo "
# Production .dockerignore additions
docker-compose.override.yml
config/credentials/
*.env
.env.*
" >> .dockerignore
```

### **2. Use Environment-Specific Configurations**

```yaml
# docker-compose.production.yml - NO credential volumes
services:
  app:
    environment:
      # Production environment variables only
      - NODE_ENV=production
      - GOOGLE_CLOUD_PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID}
      - GOOGLE_CLOUD_STORAGE_BUCKET=${GOOGLE_CLOUD_STORAGE_BUCKET}
    # NO volumes for credentials in production
    volumes:
      - app_uploads:/usr/src/app/uploads
      - app_logs:/usr/src/app/logs
```

### **3. Network Security**

```yaml
# VPC and firewall rules
gcloud compute networks create daysave-vpc --subnet-mode=custom

gcloud compute networks subnets create daysave-subnet \
    --network=daysave-vpc \
    --range=10.0.0.0/24 \
    --region=asia-southeast1

# Firewall rules
gcloud compute firewall-rules create daysave-allow-http \
    --network=daysave-vpc \
    --allow=tcp:80,tcp:443 \
    --source-ranges=0.0.0.0/0

gcloud compute firewall-rules create daysave-allow-internal \
    --network=daysave-vpc \
    --allow=tcp:3306,tcp:6379 \
    --source-ranges=10.0.0.0/24
```

---

## 📊 **Monitoring and Logging**

### **1. Cloud Monitoring Setup**

```yaml
# monitoring/docker-compose.monitoring.yml
services:
  app:
    environment:
      - GOOGLE_CLOUD_MONITORING_ENABLED=true
      - GOOGLE_CLOUD_LOGGING_ENABLED=true
    logging:
      driver: gcplogs
      options:
        gcp-project: daysave-v1412
        gcp-log-cmd: "true"
```

### **2. Health Check Configuration**

```yaml
# Health check for load balancer
gcloud compute health-checks create http daysave-health-check \
    --port=3000 \
    --request-path=/health \
    --check-interval=30s \
    --timeout=10s \
    --healthy-threshold=2 \
    --unhealthy-threshold=3
```

---

## 🚀 **CI/CD Pipeline with Cloud Build**

### **Cloud Build Configuration**

```yaml
# cloudbuild.yaml
steps:
  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: [
      'build', 
      '-t', 'gcr.io/$PROJECT_ID/daysave:$COMMIT_SHA',
      '-t', 'gcr.io/$PROJECT_ID/daysave:latest',
      '.'
    ]
  
  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/daysave:$COMMIT_SHA']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/daysave:latest']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args: [
      'run', 'deploy', 'daysave',
      '--image', 'gcr.io/$PROJECT_ID/daysave:$COMMIT_SHA',
      '--region', 'asia-southeast1',
      '--service-account', 'daysave-production@$PROJECT_ID.iam.gserviceaccount.com',
      '--platform', 'managed',
      '--allow-unauthenticated'
    ]

# Build triggers
trigger:
  branch:
    name: '^main$'
  includedFiles:
    - '**'
  ignoredFiles:
    - 'docs/**'
    - '*.md'
```

---

## 📋 **Production Deployment Checklist**

### **Pre-Deployment:**
- [ ] Service account created with minimal required permissions
- [ ] Secrets stored in Secret Manager (not in code)
- [ ] Environment variables configured for production
- [ ] Docker image built without development credentials
- [ ] Health check endpoints configured
- [ ] Database configured with Cloud SQL or Cloud SQL Proxy
- [ ] SSL/TLS certificates configured
- [ ] Monitoring and alerting set up

### **Security Checklist:**
- [ ] No credential files in Docker image
- [ ] Service account has minimal required permissions
- [ ] Network security rules configured
- [ ] HTTPS enforced
- [ ] Environment variables secured
- [ ] Database connections encrypted
- [ ] Regular security updates scheduled

### **Post-Deployment:**
- [ ] Health check passing
- [ ] Thumbnails displaying correctly from Cloud Storage
- [ ] All API integrations working
- [ ] Monitoring dashboards active
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan tested

---

## 🔄 **Migration from Development to Production**

1. **Test locally with production configuration**
2. **Deploy to staging environment first**
3. **Run integration tests**
4. **Migrate data if needed**
5. **Deploy to production with zero downtime**
6. **Monitor and verify all services**

This approach ensures your production deployment is secure, scalable, and follows Google Cloud best practices! 