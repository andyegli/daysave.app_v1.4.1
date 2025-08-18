#!/bin/bash

# DaySave Production VM Setup with SSL Automation
# This script creates and configures the production VM with Let's Encrypt SSL

set -e  # Exit on any error

# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ID="${GCP_PROJECT_ID:-daysave}"
VM_NAME="daysave-production"
ZONE="${GCP_ZONE:-asia-southeast1-a}"
MACHINE_TYPE="e2-standard-4"
DOMAIN="${DOMAIN_NAME:-daysave.app}"
EMAIL="${ADMIN_EMAIL:-admin@daysave.app}"

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

# =============================================================================
# VM CREATION AND SETUP
# =============================================================================

create_production_vm() {
    log "Creating production VM: $VM_NAME"
    
    # Check if VM already exists
    if gcloud compute instances describe $VM_NAME --zone=$ZONE --project=$PROJECT_ID &>/dev/null; then
        warn "VM $VM_NAME already exists in zone $ZONE"
        return 0
    fi
    
    # Create the VM
    gcloud compute instances create $VM_NAME \
        --project=$PROJECT_ID \
        --zone=$ZONE \
        --machine-type=$MACHINE_TYPE \
        --network-interface=network-tier=PREMIUM,stack-type=IPV4_ONLY,subnet=default \
        --maintenance-policy=MIGRATE \
        --provisioning-model=STANDARD \
        --service-account=daysave-production@$PROJECT_ID.iam.gserviceaccount.com \
        --scopes=https://www.googleapis.com/auth/cloud-platform \
        --tags=http-server,https-server \
        --create-disk=auto-delete=no,boot=yes,device-name=$VM_NAME,image=projects/ubuntu-os-cloud/global/images/family/ubuntu-2004-lts,mode=rw,size=50,type=projects/$PROJECT_ID/zones/$ZONE/diskTypes/pd-standard \
        --no-shielded-secure-boot \
        --shielded-vtpm \
        --shielded-integrity-monitoring \
        --labels=environment=production,app=daysave \
        --reservation-affinity=any
    
    log "✅ VM $VM_NAME created successfully"
    
    # Wait for VM to be ready
    log "Waiting for VM to be ready..."
    sleep 30
    
    # Get external IP
    EXTERNAL_IP=$(gcloud compute instances describe $VM_NAME --zone=$ZONE --project=$PROJECT_ID --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
    log "🌐 VM External IP: $EXTERNAL_IP"
    
    echo "⚠️  IMPORTANT: Update your DNS records to point $DOMAIN to $EXTERNAL_IP"
    echo "   A record: $DOMAIN → $EXTERNAL_IP"
    echo "   A record: www.$DOMAIN → $EXTERNAL_IP"
}

# =============================================================================
# VM CONFIGURATION
# =============================================================================

configure_vm() {
    log "Configuring production VM..."
    
    # Install Docker and Docker Compose
    gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID --command="
        # Update system
        sudo apt update && sudo apt upgrade -y
        
        # Install Docker
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker \$USER
        
        # Install Docker Compose
        sudo curl -L \"https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        # Install Certbot for Let's Encrypt
        sudo apt install -y certbot python3-certbot-nginx
        
        # Install Git
        sudo apt install -y git
        
        # Create application directory
        mkdir -p /home/\$(whoami)/daysave_v1.4.1
        
        echo '✅ VM configuration completed'
    "
    
    log "✅ VM configured with Docker, Docker Compose, and Certbot"
}

# =============================================================================
# SSL CERTIFICATE SETUP
# =============================================================================

setup_ssl_certificates() {
    log "Setting up SSL certificates with Let's Encrypt..."
    
    # Check if domain resolves to VM IP
    EXTERNAL_IP=$(gcloud compute instances describe $VM_NAME --zone=$ZONE --project=$PROJECT_ID --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
    
    log "Verifying DNS resolution for $DOMAIN..."
    RESOLVED_IP=$(dig +short $DOMAIN @8.8.8.8 | tail -n1)
    
    if [ "$RESOLVED_IP" != "$EXTERNAL_IP" ]; then
        warn "DNS not yet propagated. Domain $DOMAIN resolves to $RESOLVED_IP but VM IP is $EXTERNAL_IP"
        warn "Please update your DNS records and run this script again with 'ssl-only' parameter"
        return 1
    fi
    
    log "✅ DNS correctly resolves $DOMAIN to $EXTERNAL_IP"
    
    # Install SSL certificates
    gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID --command="
        # Stop any running nginx to free port 80
        sudo pkill nginx || true
        
        # Request SSL certificate
        sudo certbot certonly --standalone \
            --non-interactive \
            --agree-tos \
            --email $EMAIL \
            -d $DOMAIN \
            -d www.$DOMAIN
        
        # Create certificate renewal cron job
        echo '0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /home/\$(whoami)/daysave_v1.4.1/docker-compose.production.yml exec nginx nginx -s reload' | sudo crontab -
        
        echo '✅ SSL certificates installed and auto-renewal configured'
    "
    
    log "✅ SSL certificates configured for $DOMAIN"
}

# =============================================================================
# FIREWALL RULES
# =============================================================================

setup_firewall() {
    log "Setting up firewall rules..."
    
    # Create firewall rules if they don't exist
    if ! gcloud compute firewall-rules describe allow-http --project=$PROJECT_ID &>/dev/null; then
        gcloud compute firewall-rules create allow-http \
            --project=$PROJECT_ID \
            --allow tcp:80 \
            --source-ranges 0.0.0.0/0 \
            --description "Allow HTTP traffic"
    fi
    
    if ! gcloud compute firewall-rules describe allow-https --project=$PROJECT_ID &>/dev/null; then
        gcloud compute firewall-rules create allow-https \
            --project=$PROJECT_ID \
            --allow tcp:443 \
            --source-ranges 0.0.0.0/0 \
            --description "Allow HTTPS traffic"
    fi
    
    log "✅ Firewall rules configured"
}

# =============================================================================
# APPLICATION DEPLOYMENT
# =============================================================================

deploy_application() {
    log "Deploying DaySave application..."
    
    # Clone repository and deploy
    gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID --command="
        cd /home/\$(whoami)
        
        # Clone or update repository
        if [ ! -d \"daysave_v1.4.1\" ]; then
            git clone https://github.com/$GITHUB_REPOSITORY.git daysave_v1.4.1
        else
            cd daysave_v1.4.1
            git fetch origin
            git checkout main
            git pull origin main
            cd ..
        fi
        
        cd daysave_v1.4.1
        
        # Create production environment file (will be populated by GitHub Actions)
        touch .env.production
        
        echo '✅ Application code deployed'
    "
    
    log "✅ Application deployed to VM"
}

# =============================================================================
# MONITORING SETUP
# =============================================================================

setup_monitoring() {
    log "Setting up monitoring and health checks..."
    
    gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID --command="
        # Create monitoring script
        cat > /home/\$(whoami)/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for DaySave

HEALTH_URL=\"https://$DOMAIN/health\"
LOG_FILE=\"/home/\$(whoami)/health-check.log\"

# Check application health
if curl -f \$HEALTH_URL > /dev/null 2>&1; then
    echo \"\$(date): Health check passed\" >> \$LOG_FILE
else
    echo \"\$(date): Health check failed\" >> \$LOG_FILE
    # Restart containers if health check fails
    cd /home/\$(whoami)/daysave_v1.4.1
    docker-compose -f docker-compose.production.yml restart app
fi
EOF
        
        chmod +x /home/\$(whoami)/health-check.sh
        
        # Add health check to crontab (every 5 minutes)
        (crontab -l 2>/dev/null; echo '*/5 * * * * /home/\$(whoami)/health-check.sh') | crontab -
        
        echo '✅ Monitoring configured'
    "
    
    log "✅ Monitoring and health checks configured"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    local operation=${1:-"full"}
    
    log "🚀 Starting DaySave production VM setup..."
    log "Project: $PROJECT_ID"
    log "VM: $VM_NAME"
    log "Zone: $ZONE"
    log "Domain: $DOMAIN"
    
    case $operation in
        "vm-only")
            setup_firewall
            create_production_vm
            configure_vm
            ;;
        "ssl-only")
            setup_ssl_certificates
            ;;
        "deploy-only")
            deploy_application
            ;;
        "full")
            setup_firewall
            create_production_vm
            configure_vm
            deploy_application
            setup_monitoring
            
            # Try SSL setup (may fail if DNS not ready)
            if setup_ssl_certificates; then
                log "🎉 Complete setup finished successfully!"
                log "🌐 Your application will be available at: https://$DOMAIN"
            else
                warn "⚠️  SSL setup skipped due to DNS propagation"
                warn "Run './setup-production-vm.sh ssl-only' after DNS propagates"
            fi
            ;;
        *)
            echo "Usage: $0 {vm-only|ssl-only|deploy-only|full}"
            echo ""
            echo "  vm-only     - Create and configure VM only"
            echo "  ssl-only    - Setup SSL certificates only (requires DNS)"
            echo "  deploy-only - Deploy application code only"
            echo "  full        - Complete setup (default)"
            exit 1
            ;;
    esac
    
    # Get final VM IP for reference
    EXTERNAL_IP=$(gcloud compute instances describe $VM_NAME --zone=$ZONE --project=$PROJECT_ID --format='get(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null || echo "N/A")
    
    log "📋 Setup Summary:"
    log "   VM Name: $VM_NAME"
    log "   External IP: $EXTERNAL_IP"
    log "   Domain: $DOMAIN"
    log "   Zone: $ZONE"
    log "   Project: $PROJECT_ID"
    
    if [ "$operation" = "full" ] || [ "$operation" = "vm-only" ]; then
        echo ""
        echo "🔧 Next Steps:"
        echo "1. Update DNS records: $DOMAIN → $EXTERNAL_IP"
        echo "2. Wait for DNS propagation (5-30 minutes)"
        echo "3. Run: ./setup-production-vm.sh ssl-only"
        echo "4. Configure GitHub secrets and run CI/CD pipeline"
    fi
}

# Check dependencies
if ! command -v gcloud &> /dev/null; then
    error "gcloud CLI is required but not installed"
fi

if ! command -v dig &> /dev/null; then
    warn "dig command not found, DNS verification will be skipped"
fi

# Run main function
main "$@"
