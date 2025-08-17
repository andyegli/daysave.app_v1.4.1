# GCP Service Account Setup for DaySave CI/CD

## 🔐 **Complete Service Account Configuration**

This guide covers setting up the Google Cloud service account with all required permissions for the DaySave CI/CD pipeline.

## **1. Service Account Creation**

### **Create the Service Account**
```bash
# Set your project ID
export PROJECT_ID="daysave"

# Create the CI/CD service account
gcloud iam service-accounts create daysave-cicd \
    --description="DaySave CI/CD pipeline service account" \
    --display-name="DaySave CI/CD" \
    --project=$PROJECT_ID
```

### **Create JSON Key File**
```bash
# Generate the JSON key file
gcloud iam service-accounts keys create daysave-cicd-key.json \
    --iam-account=daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com \
    --project=$PROJECT_ID

# Convert to base64 for GitHub secrets
cat daysave-cicd-key.json | base64 -w 0 > daysave-cicd-key-base64.txt

echo "✅ Base64 encoded key saved to: daysave-cicd-key-base64.txt"
echo "🔐 Copy this content to GitHub secret: GOOGLE_APPLICATION_CREDENTIALS"
```

## **2. Required IAM Roles & Permissions**

### **Core Compute & VM Management**
```bash
# Compute Admin - Full control over Compute Engine resources
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/compute.admin"

# Service Account User - Use service accounts
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
```

### **Container Registry & Docker**
```bash
# Container Registry Service Agent - Push/pull container images
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/containerregistry.ServiceAgent"

# Storage Admin - Full control over GCS (needed for Container Registry)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"
```

### **Cloud Storage (File Uploads & Backups)**
```bash
# Storage Object Admin - Manage storage objects
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"
```

### **Database Management (if using Cloud SQL)**
```bash
# Cloud SQL Admin - Manage Cloud SQL instances
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.admin"
```

### **Networking & Security**
```bash
# Security Admin - Manage security policies
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/compute.securityAdmin"

# Network Admin - Manage network resources
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/compute.networkAdmin"
```

### **Monitoring & Logging**
```bash
# Monitoring Editor - Write monitoring data
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/monitoring.editor"

# Logging Admin - Manage logs
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/logging.admin"
```

## **3. Production VM Service Account**

### **Create Production Service Account**
```bash
# Create service account for production VM
gcloud iam service-accounts create daysave-production \
    --description="DaySave production VM service account" \
    --display-name="DaySave Production VM" \
    --project=$PROJECT_ID
```

### **Production VM Permissions**
```bash
# Storage Admin - Access file uploads bucket
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-production@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# AI Platform User - Access Google AI services
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-production@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/ml.developer"

# Cloud Speech Client - Speech-to-Text API
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-production@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/speech.client"

# Cloud Vision Client - Vision API
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-production@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/vision.client"

# Monitoring Metric Writer - Send metrics
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-production@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/monitoring.metricWriter"
```

## **4. Enable Required APIs**

```bash
# Enable all required Google Cloud APIs
gcloud services enable compute.googleapis.com \
    containerregistry.googleapis.com \
    storage-api.googleapis.com \
    cloudsql.googleapis.com \
    speech.googleapis.com \
    vision.googleapis.com \
    monitoring.googleapis.com \
    logging.googleapis.com \
    cloudresourcemanager.googleapis.com \
    iam.googleapis.com \
    --project=$PROJECT_ID

echo "✅ All required APIs enabled"
```

## **5. Create Storage Buckets**

```bash
# Create file uploads bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l asia-southeast1 gs://daysave-uploads

# Create backups bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l asia-southeast1 gs://daysave-backups

# Set bucket permissions
gsutil iam ch serviceAccount:daysave-production@$PROJECT_ID.iam.gserviceaccount.com:objectAdmin gs://daysave-uploads
gsutil iam ch serviceAccount:daysave-production@$PROJECT_ID.iam.gserviceaccount.com:objectAdmin gs://daysave-backups

echo "✅ Storage buckets created and configured"
```

## **6. Verification Commands**

### **Test Service Account Permissions**
```bash
# Test authentication
gcloud auth activate-service-account --key-file=daysave-cicd-key.json

# Test compute access
gcloud compute instances list --project=$PROJECT_ID

# Test container registry access
gcloud container images list --project=$PROJECT_ID

# Test storage access
gsutil ls -p $PROJECT_ID

echo "✅ Service account permissions verified"
```

### **Check IAM Policies**
```bash
# List all IAM bindings for the service account
gcloud projects get-iam-policy $PROJECT_ID \
    --flatten="bindings[].members" \
    --format="table(bindings.role)" \
    --filter="bindings.members:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com"
```

## **7. Security Best Practices**

### **Key Management**
- ✅ Store JSON key securely in GitHub secrets
- ✅ Never commit service account keys to repository
- ✅ Rotate keys every 90 days
- ✅ Use principle of least privilege

### **Access Control**
- ✅ Separate CI/CD and production service accounts
- ✅ Monitor service account usage
- ✅ Enable audit logging
- ✅ Regular permission reviews

### **Monitoring**
```bash
# Enable audit logs for IAM
gcloud logging sinks create daysave-iam-audit \
    bigquery.googleapis.com/projects/$PROJECT_ID/datasets/security_audit \
    --log-filter='protoPayload.serviceName="iam.googleapis.com"'
```

## **8. Troubleshooting**

### **Common Permission Issues**

#### **Container Registry Access Denied**
```bash
# Fix: Add Container Registry Service Agent role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/containerregistry.ServiceAgent"
```

#### **VM Creation Failed**
```bash
# Fix: Add Compute Admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/compute.admin"
```

#### **Storage Access Denied**
```bash
# Fix: Add Storage Admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"
```

## **9. Complete Setup Script**

Save this as `setup-gcp-service-account.sh`:

```bash
#!/bin/bash
set -e

PROJECT_ID="daysave"
echo "Setting up GCP service accounts for project: $PROJECT_ID"

# Create CI/CD service account
gcloud iam service-accounts create daysave-cicd \
    --description="DaySave CI/CD pipeline service account" \
    --display-name="DaySave CI/CD" \
    --project=$PROJECT_ID

# Create production service account
gcloud iam service-accounts create daysave-production \
    --description="DaySave production VM service account" \
    --display-name="DaySave Production VM" \
    --project=$PROJECT_ID

# CI/CD permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/compute.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/containerregistry.ServiceAgent"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Production VM permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-production@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-production@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/speech.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:daysave-production@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/vision.client"

# Enable APIs
gcloud services enable compute.googleapis.com \
    containerregistry.googleapis.com \
    storage-api.googleapis.com \
    speech.googleapis.com \
    vision.googleapis.com \
    --project=$PROJECT_ID

# Create JSON key
gcloud iam service-accounts keys create daysave-cicd-key.json \
    --iam-account=daysave-cicd@$PROJECT_ID.iam.gserviceaccount.com \
    --project=$PROJECT_ID

# Convert to base64
cat daysave-cicd-key.json | base64 -w 0 > daysave-cicd-key-base64.txt

echo "✅ Setup complete!"
echo "🔐 Copy content of daysave-cicd-key-base64.txt to GitHub secret: GOOGLE_APPLICATION_CREDENTIALS"
```

Run with:
```bash
chmod +x setup-gcp-service-account.sh
./setup-gcp-service-account.sh
```

## **Summary**

Your service account now has all required permissions for:
- ✅ VM creation and management
- ✅ Container registry operations
- ✅ Storage bucket access
- ✅ Database operations
- ✅ AI service access
- ✅ Monitoring and logging

The base64 encoded key is ready for GitHub secrets configuration.
