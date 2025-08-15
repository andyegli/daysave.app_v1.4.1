#!/bin/bash

# DaySave Zero-Downtime Production Update Script
# This script performs blue-green deployment for minimal service interruption

set -e

# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ID="daysave-v1412"
VM_NAME="daysave-production" 
ZONE="asia-southeast1-a"
HEALTH_CHECK_URL="https://your-domain.com/health"
ROLLBACK_IMAGE_TAG=""
MAX_HEALTH_CHECK_ATTEMPTS=10
HEALTH_CHECK_INTERVAL=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'  
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    exit 1
}

# Health check function
check_health() {
    local url=$1
    local max_attempts=$2
    local interval=$3
    
    log "Performing health checks on $url"
    
    for i in $(seq 1 $max_attempts); do
        if curl -f -s --max-time 10 "$url" > /dev/null; then
            log "✅ Health check passed (attempt $i/$max_attempts)"
            return 0
        else
            warn "⏳ Health check failed, attempt $i/$max_attempts. Retrying in ${interval}s..."
            sleep $interval
        fi
    done
    
    error "❌ Health check failed after $max_attempts attempts"
    return 1
}

# Backup current state
backup_current_state() {
    log "Creating backup of current deployment state..."
    
    # Get current image tag for rollback
    ROLLBACK_IMAGE_TAG=$(gcloud compute ssh $VM_NAME --zone=$ZONE --command="
        docker inspect daysave-app --format='{{.Config.Image}}' 2>/dev/null || echo 'unknown'
    " 2>/dev/null | tr -d '\r')
    
    log "Current image for rollback: $ROLLBACK_IMAGE_TAG"
    
    # Create database backup
    gcloud compute ssh $VM_NAME --zone=$ZONE --command="
        cd /home/\$(whoami)
        BACKUP_FILE=pre_update_backup_\$(date +%Y%m%d_%H%M%S).sql
        
        log 'Creating database backup...'
        docker-compose -f docker-compose.yml --env-file .env exec -T db mysqldump -u root -p\$DB_ROOT_PASSWORD --single-transaction --routines --triggers daysave_v141 > \$BACKUP_FILE
        
        # Upload backup to Cloud Storage
        if command -v gsutil &> /dev/null; then
            gsutil cp \$BACKUP_FILE gs://$PROJECT_ID-backups/pre-update/
            log 'Database backup uploaded to Cloud Storage'
        fi
        
        log 'Database backup completed: \$BACKUP_FILE'
    "
    
    log "✅ Backup completed"
}

# Build and push new image
build_and_push() {
    log "Building and pushing new Docker image..."
    
    # Generate timestamp tag
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local new_tag="gcr.io/$PROJECT_ID/daysave:$timestamp"
    
    # Configure Docker for GCR
    gcloud auth configure-docker --quiet
    
    # Build new image
    log "Building image: $new_tag"
    docker build -f Dockerfile.production -t $new_tag .
    docker tag $new_tag gcr.io/$PROJECT_ID/daysave:latest
    
    # Push to Container Registry
    log "Pushing image to GCR..."
    docker push $new_tag
    docker push gcr.io/$PROJECT_ID/daysave:latest
    
    log "✅ Image built and pushed: $new_tag"
    echo $new_tag
}

# Deploy with blue-green strategy
deploy_blue_green() {
    local new_image=$1
    
    log "Starting blue-green deployment with image: $new_image"
    
    gcloud compute ssh $VM_NAME --zone=$ZONE --command="
        cd /home/\$(whoami)
        
        # Pull the new image
        log 'Pulling new image...'
        docker pull $new_image
        
        # Update docker-compose.yml to use new image
        if [ -f docker-compose.yml ]; then
            sed -i 's|image: gcr.io/$PROJECT_ID/daysave:.*|image: $new_image|g' docker-compose.yml
        fi
        
        # Start new container alongside the current one
        log 'Starting new container (blue-green deployment)...'
        
        # Scale app service to 2 instances (current + new)
        docker-compose -f docker-compose.yml --env-file .env up -d --scale app=2 --no-recreate db nginx redis
        
        # Wait for the new container to be ready
        sleep 45
        
        # Get the new container ID
        NEW_CONTAINER=\$(docker-compose -f docker-compose.yml --env-file .env ps -q app | head -n 1)
        
        # Health check the new container directly
        log 'Checking new container health...'
        if docker exec \$NEW_CONTAINER curl -f http://localhost:3000/health; then
            log 'New container is healthy!'
            
            # Reload nginx to pick up new backend (if using load balancing)
            docker-compose -f docker-compose.yml --env-file .env exec nginx nginx -s reload 2>/dev/null || true
            
            # Wait a bit more for traffic to shift
            sleep 30
            
            # Scale back to 1 instance (removes old container)
            log 'Removing old container...'
            docker-compose -f docker-compose.yml --env-file .env up -d --scale app=1
            
            # Clean up old images (keep last 3)
            docker images gcr.io/$PROJECT_ID/daysave --format 'table {{.Tag}}' | tail -n +2 | head -n -3 | xargs -r docker rmi gcr.io/$PROJECT_ID/daysave: 2>/dev/null || true
            
            log 'Blue-green deployment completed successfully!'
        else
            error 'New container failed health check!'
            exit 1
        fi
    "
}

# Rollback function
rollback() {
    local rollback_image=$1
    
    warn "Starting rollback to previous version: $rollback_image"
    
    if [ "$rollback_image" = "unknown" ] || [ -z "$rollback_image" ]; then
        error "Cannot rollback: previous image tag unknown"
    fi
    
    gcloud compute ssh $VM_NAME --zone=$ZONE --command="
        cd /home/\$(whoami)
        
        log 'Rolling back to: $rollback_image'
        
        # Update docker-compose.yml to use rollback image
        sed -i 's|image: gcr.io/$PROJECT_ID/daysave:.*|image: $rollback_image|g' docker-compose.yml
        
        # Deploy rollback image
        docker-compose -f docker-compose.yml --env-file .env up -d app
        
        # Wait for rollback container to be ready
        sleep 30
        
        log 'Rollback completed'
    "
    
    # Verify rollback health
    if check_health $HEALTH_CHECK_URL $MAX_HEALTH_CHECK_ATTEMPTS $HEALTH_CHECK_INTERVAL; then
        log "✅ Rollback successful and healthy"
    else
        error "❌ Rollback failed health check"
    fi
}

# Run database migrations if needed
run_migrations() {
    log "Checking for database migrations..."
    
    gcloud compute ssh $VM_NAME --zone=$ZONE --command="
        cd /home/\$(whoami)
        
        # Check if there are pending migrations
        if docker-compose -f docker-compose.yml --env-file .env exec -T app npx sequelize-cli db:migrate:status | grep -q 'down'; then
            log 'Running database migrations...'
            docker-compose -f docker-compose.yml --env-file .env exec -T app npx sequelize-cli db:migrate
            log 'Migrations completed'
        else
            log 'No pending migrations'
        fi
    "
}

# Post-deployment verification
post_deployment_checks() {
    log "Running post-deployment verification..."
    
    # 1. Application health check
    if ! check_health $HEALTH_CHECK_URL $MAX_HEALTH_CHECK_ATTEMPTS $HEALTH_CHECK_INTERVAL; then
        error "Application health check failed"
    fi
    
    # 2. Database connectivity check
    gcloud compute ssh $VM_NAME --zone=$ZONE --command="
        cd /home/\$(whoami)
        
        log 'Checking database connectivity...'
        if docker-compose -f docker-compose.yml --env-file .env exec -T db mysql -u root -p\$DB_ROOT_PASSWORD -e 'SELECT 1' > /dev/null 2>&1; then
            log '✅ Database connectivity OK'
        else
            error '❌ Database connectivity failed'
            exit 1
        fi
        
        log 'Checking application logs for errors...'
        if docker-compose -f docker-compose.yml --env-file .env logs app --tail=50 | grep -i error; then
            warn 'Errors found in application logs - please review'
        else
            log '✅ No errors in recent application logs'
        fi
    "
    
    log "✅ Post-deployment verification completed"
}

# =============================================================================
# MAIN DEPLOYMENT FLOW
# =============================================================================

main() {
    local operation=${1:-"deploy"}
    
    case $operation in
        "deploy")
            log "🚀 Starting zero-downtime production update..."
            
            # Step 1: Backup current state
            backup_current_state
            
            # Step 2: Build and push new image
            local new_image=$(build_and_push)
            
            # Step 3: Deploy with blue-green strategy
            if deploy_blue_green "$new_image"; then
                log "✅ Blue-green deployment successful"
            else
                warn "❌ Blue-green deployment failed, initiating rollback..."
                rollback "$ROLLBACK_IMAGE_TAG"
                exit 1
            fi
            
            # Step 4: Run migrations if needed
            run_migrations
            
            # Step 5: Final health checks
            if post_deployment_checks; then
                log "🎉 Production update completed successfully!"
                log "Application is running with image: $new_image"
            else
                warn "⚠️ Post-deployment checks failed, consider rollback"
                exit 1
            fi
            ;;
            
        "rollback")
            if [ -z "$2" ]; then
                error "Usage: $0 rollback <image_tag>"
            fi
            rollback "$2"
            ;;
            
        "health-check")
            check_health $HEALTH_CHECK_URL $MAX_HEALTH_CHECK_ATTEMPTS $HEALTH_CHECK_INTERVAL
            ;;
            
        "logs")
            log "Fetching recent application logs..."
            gcloud compute ssh $VM_NAME --zone=$ZONE --command="
                cd /home/\$(whoami)
                docker-compose -f docker-compose.yml --env-file .env logs app --tail=100 -f
            "
            ;;
            
        *)
            echo "Usage: $0 {deploy|rollback <image_tag>|health-check|logs}"
            echo ""
            echo "Commands:"
            echo "  deploy           - Zero-downtime deployment with blue-green strategy"
            echo "  rollback <tag>   - Rollback to specific image tag"
            echo "  health-check     - Check application health"
            echo "  logs             - View application logs"
            exit 1
            ;;
    esac
}

# Check dependencies
if ! command -v gcloud &> /dev/null; then
    error "gcloud CLI is required but not installed"
fi

if ! command -v docker &> /dev/null; then
    error "Docker is required but not installed"
fi

# Run main function
main "$@" 