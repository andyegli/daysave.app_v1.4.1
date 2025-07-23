#!/bin/bash

# DaySave Production Deployment Script
# This script handles VM setup, SSL certificates, and zero-downtime deployment

set -e  # Exit on any error

# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ID="daysave-v1412"
VM_NAME="daysave-production"
ZONE="asia-southeast1-a"
MACHINE_TYPE="e2-standard-4"
SERVICE_ACCOUNT="daysave-production@${PROJECT_ID}.iam.gserviceaccount.com"
DOMAIN="your-domain.com"  # Replace with your actual domain
EMAIL="admin@your-domain.com"  # Replace with your email for Let's Encrypt

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v gcloud &> /dev/null; then
        error "gcloud CLI is required but not installed"
    fi
    
    if ! command -v docker &> /dev/null; then
        error "Docker is required but not installed"
    fi
    
    log "✅ All dependencies found"
}

# =============================================================================
# SERVICE ACCOUNT SETUP
# =============================================================================

setup_service_account() {
    log "Setting up service account..."
    
    # Create service account if it doesn't exist
    if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT &> /dev/null; then
        log "Creating service account..."
        gcloud iam service-accounts create daysave-production \
            --description="DaySave production service account" \
            --display-name="DaySave Production"
    else
        log "Service account already exists"
    fi
    
    # Grant necessary permissions
    log "Granting permissions..."
    
    # Storage permissions for file uploads and thumbnails
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/storage.admin"
    
    # AI/ML permissions for multimedia analysis
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/speech.client"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/vision.client"
    
    # Monitoring and logging
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/monitoring.metricWriter"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/logging.logWriter"
    
    log "✅ Service account configured"
}

# =============================================================================
# VM CREATION AND SETUP
# =============================================================================

create_vm() {
    log "Creating production VM..."
    
    # Check if VM already exists
    if gcloud compute instances describe $VM_NAME --zone=$ZONE &> /dev/null; then
        warn "VM $VM_NAME already exists in zone $ZONE"
        return 0
    fi
    
    # Create firewall rules for HTTP/HTTPS
    log "Creating firewall rules..."
    
    if ! gcloud compute firewall-rules describe allow-http-https &> /dev/null; then
        gcloud compute firewall-rules create allow-http-https \
            --allow tcp:80,tcp:443 \
            --source-ranges 0.0.0.0/0 \
            --description "Allow HTTP and HTTPS traffic"
    fi
    
    # Create VM with Container-Optimized OS
    log "Creating VM instance..."
    gcloud compute instances create $VM_NAME \
        --zone=$ZONE \
        --machine-type=$MACHINE_TYPE \
        --network-interface=network-tier=PREMIUM,subnet=default \
        --metadata-from-file startup-script=startup-script.sh \
        --maintenance-policy=MIGRATE \
        --service-account=$SERVICE_ACCOUNT \
        --scopes=https://www.googleapis.com/auth/cloud-platform \
        --image-family=cos-stable \
        --image-project=cos-cloud \
        --boot-disk-size=50GB \
        --boot-disk-type=pd-standard \
        --boot-disk-device-name=$VM_NAME \
        --labels=environment=production,application=daysave \
        --tags=http-server,https-server
    
    log "✅ VM created successfully"
}

# =============================================================================
# SSL CERTIFICATE SETUP
# =============================================================================

setup_ssl() {
    log "Setting up SSL certificates with Let's Encrypt..."
    
    # Get VM external IP
    EXTERNAL_IP=$(gcloud compute instances describe $VM_NAME \
        --zone=$ZONE \
        --format="get(networkInterfaces[0].accessConfigs[0].natIP)")
    
    log "VM External IP: $EXTERNAL_IP"
    warn "Please ensure $DOMAIN points to $EXTERNAL_IP before continuing"
    read -p "Press Enter when DNS is configured..."
    
    # Install and configure Let's Encrypt on VM
    log "Installing Let's Encrypt on VM..."
    gcloud compute ssh $VM_NAME --zone=$ZONE --command="
        # Install docker-compose if not present
        sudo curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m) -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        # Install certbot
        sudo apt-get update
        sudo apt-get install -y snapd
        sudo snap install core; sudo snap refresh core
        sudo snap install --classic certbot
        sudo ln -sf /snap/bin/certbot /usr/bin/certbot
        
        # Generate SSL certificate
        sudo certbot certonly --standalone \
            --email $EMAIL \
            --agree-tos \
            --no-eff-email \
            -d $DOMAIN
    "
    
    log "✅ SSL certificate configured"
}

# =============================================================================
# DOCKER IMAGE BUILD AND PUSH
# =============================================================================

build_and_push() {
    log "Building and pushing Docker image..."
    
    # Configure Docker for GCR
    gcloud auth configure-docker
    
    # Build production image
    docker build -f Dockerfile.production -t gcr.io/$PROJECT_ID/daysave:latest .
    docker tag gcr.io/$PROJECT_ID/daysave:latest gcr.io/$PROJECT_ID/daysave:$(date +%Y%m%d-%H%M%S)
    
    # Push to Container Registry
    docker push gcr.io/$PROJECT_ID/daysave:latest
    docker push gcr.io/$PROJECT_ID/daysave:$(date +%Y%m%d-%H%M%S)
    
    log "✅ Docker image pushed to GCR"
}

# =============================================================================
# ZERO-DOWNTIME DEPLOYMENT
# =============================================================================

deploy_application() {
    log "Deploying application with zero downtime..."
    
    # Copy deployment files to VM
    log "Copying deployment files..."
    gcloud compute scp docker-compose.production.yml $VM_NAME:~/docker-compose.yml --zone=$ZONE
    gcloud compute scp nginx/ $VM_NAME:~/nginx --zone=$ZONE --recurse
    gcloud compute scp .env.production $VM_NAME:~/.env --zone=$ZONE
    
    # Deploy with blue-green strategy
    log "Performing blue-green deployment..."
    gcloud compute ssh $VM_NAME --zone=$ZONE --command="
        # Pull latest images
        docker-compose pull
        
        # Start new containers alongside old ones
        docker-compose up -d --no-deps --scale app=2 app
        
        # Wait for health check
        sleep 30
        
        # Check if new container is healthy
        if docker-compose exec -T app curl -f http://localhost:3000/health; then
            echo 'New container is healthy, switching traffic...'
            
            # Update nginx config and reload
            docker-compose exec nginx nginx -s reload
            
            # Remove old container
            docker-compose up -d --scale app=1 app
            
            # Clean up old images
            docker image prune -f
            
            echo 'Deployment completed successfully!'
        else
            echo 'New container failed health check, rolling back...'
            docker-compose up -d --scale app=1 app
            exit 1
        fi
    "
    
    log "✅ Application deployed successfully"
}

# =============================================================================
# MONITORING AND ALERTS SETUP
# =============================================================================

setup_monitoring() {
    log "Setting up monitoring and alerts..."
    
    # Install monitoring agent on VM
    gcloud compute ssh $VM_NAME --zone=$ZONE --command="
        # Install Cloud Monitoring agent
        curl -sSO https://dl.google.com/cloudagents/add-monitoring-agent-repo.sh
        sudo bash add-monitoring-agent-repo.sh
        sudo apt-get update
        sudo apt-get install -y stackdriver-agent
        sudo service stackdriver-agent start
        
        # Install Cloud Logging agent
        curl -sSO https://dl.google.com/cloudagents/add-logging-agent-repo.sh
        sudo bash add-logging-agent-repo.sh
        sudo apt-get update
        sudo apt-get install -y google-fluentd
        sudo service google-fluentd start
    "
    
    log "✅ Monitoring configured"
}

# =============================================================================
# BACKUP SETUP
# =============================================================================

setup_backups() {
    log "Setting up automated backups..."
    
    # Create backup storage bucket
    gsutil mb gs://$PROJECT_ID-backups 2>/dev/null || true
    
    # Setup backup cron job on VM
    gcloud compute ssh $VM_NAME --zone=$ZONE --command="
        # Create backup script
        cat > ~/backup.sh << 'EOF'
#!/bin/bash
DATE=\$(date +%Y%m%d-%H%M%S)
BACKUP_FILE=daysave_backup_\$DATE.sql

# Create database backup
docker-compose exec -T db mysqldump -u root -p\$DB_ROOT_PASSWORD daysave_v141 > \$BACKUP_FILE

# Upload to Cloud Storage
gsutil cp \$BACKUP_FILE gs://$PROJECT_ID-backups/

# Keep only last 30 days locally
find . -name 'daysave_backup_*.sql' -mtime +30 -delete

# Clean up old backups in Cloud Storage (keep 90 days)
gsutil -m rm gs://$PROJECT_ID-backups/daysave_backup_\$(date -d '90 days ago' +%Y%m%d)*.sql 2>/dev/null || true
EOF

        chmod +x ~/backup.sh
        
        # Add to crontab (daily at 2 AM)
        (crontab -l 2>/dev/null; echo '0 2 * * * ~/backup.sh') | crontab -
    "
    
    log "✅ Backup system configured"
}

# =============================================================================
# MAIN DEPLOYMENT FLOW
# =============================================================================

main() {
    log "Starting DaySave production deployment..."
    
    check_dependencies
    
    case ${1:-"full"} in
        "service-account")
            setup_service_account
            ;;
        "vm")
            create_vm
            ;;
        "ssl")
            setup_ssl
            ;;
        "build")
            build_and_push
            ;;
        "deploy")
            deploy_application
            ;;
        "monitoring")
            setup_monitoring
            ;;
        "backups")
            setup_backups
            ;;
        "full")
            setup_service_account
            create_vm
            log "Waiting 2 minutes for VM to fully initialize..."
            sleep 120
            setup_ssl
            build_and_push
            deploy_application
            setup_monitoring
            setup_backups
            ;;
        "update")
            log "Performing zero-downtime update..."
            build_and_push
            deploy_application
            ;;
        *)
            echo "Usage: $0 {service-account|vm|ssl|build|deploy|monitoring|backups|full|update}"
            echo ""
            echo "Commands:"
            echo "  service-account  - Setup Google Cloud service account"
            echo "  vm              - Create and configure VM"
            echo "  ssl             - Setup Let's Encrypt SSL certificates"
            echo "  build           - Build and push Docker image"
            echo "  deploy          - Deploy application"
            echo "  monitoring      - Setup monitoring and logging"
            echo "  backups         - Setup automated backups"
            echo "  full            - Complete deployment (all steps)"
            echo "  update          - Zero-downtime application update"
            exit 1
            ;;
    esac
    
    log "🎉 Deployment completed successfully!"
    log "Your application should be available at: https://$DOMAIN"
}

# Run main function with all arguments
main "$@" 