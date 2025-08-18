#!/bin/bash

# =============================================================================
# DaySave Production Persistent Storage Setup Script
# =============================================================================
# This script sets up persistent storage for the DaySave production deployment
# ensuring data persistence across VM restarts and deployments.

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ID=${GCP_PROJECT_ID:-"daysave"}
ZONE=${GCP_ZONE:-"asia-southeast1-a"}
VM_NAME=${VM_NAME:-"daysave-production"}
DISK_NAME="${VM_NAME}-data"
DISK_SIZE=${DISK_SIZE:-"100GB"}
MOUNT_POINT="/mnt/app-data"

# =============================================================================
# LOGGING FUNCTIONS
# =============================================================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1"
}

warn() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARN: $1" >&2
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
    exit 1
}

# =============================================================================
# PERSISTENT DISK MANAGEMENT
# =============================================================================

create_persistent_disk() {
    log "Creating persistent disk: $DISK_NAME"
    
    # Check if disk already exists
    if gcloud compute disks describe $DISK_NAME --zone=$ZONE --project=$PROJECT_ID &>/dev/null; then
        warn "Persistent disk $DISK_NAME already exists in zone $ZONE"
        return 0
    fi
    
    # Create the persistent disk
    gcloud compute disks create $DISK_NAME \
        --project=$PROJECT_ID \
        --zone=$ZONE \
        --size=$DISK_SIZE \
        --type=pd-standard \
        --description="Persistent storage for DaySave application data, Docker volumes, SSL certificates, and backups"
    
    log "✅ Persistent disk $DISK_NAME created successfully"
}

attach_persistent_disk() {
    log "Attaching persistent disk to VM: $VM_NAME"
    
    # Check if disk is already attached
    if gcloud compute instances describe $VM_NAME --zone=$ZONE --project=$PROJECT_ID --format="value(disks[].source)" | grep -q "$DISK_NAME"; then
        warn "Persistent disk $DISK_NAME is already attached to VM $VM_NAME"
        return 0
    fi
    
    # Attach the disk
    gcloud compute instances attach-disk $VM_NAME \
        --project=$PROJECT_ID \
        --zone=$ZONE \
        --disk=$DISK_NAME \
        --device-name=app-data
    
    log "✅ Persistent disk attached successfully"
}

setup_disk_on_vm() {
    log "Setting up persistent disk on VM..."
    
    gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID --command="
        # Check if disk is already formatted and mounted
        if mount | grep -q '$MOUNT_POINT'; then
            echo 'Persistent disk is already mounted at $MOUNT_POINT'
            exit 0
        fi
        
        # Format disk if not already formatted
        if ! sudo blkid /dev/sdb; then
            echo 'Formatting persistent disk...'
            sudo mkfs.ext4 -F /dev/sdb
        fi
        
        # Create mount point
        sudo mkdir -p $MOUNT_POINT
        
        # Mount the disk
        sudo mount /dev/sdb $MOUNT_POINT
        
        # Add to fstab for automatic mounting on boot
        if ! grep -q '/dev/sdb' /etc/fstab; then
            echo '/dev/sdb $MOUNT_POINT ext4 defaults 0 2' | sudo tee -a /etc/fstab
        fi
        
        # Create directory structure
        sudo mkdir -p $MOUNT_POINT/{docker-volumes,ssl-certs,backups,uploads,multimedia-temp}
        sudo chown -R \$(whoami):\$(whoami) $MOUNT_POINT
        
        echo '✅ Persistent disk setup completed'
    "
    
    log "✅ Persistent disk configured on VM"
}

setup_docker_volume_persistence() {
    log "Setting up Docker volume persistence..."
    
    gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID --command="
        # Ensure Docker volumes directory exists
        sudo mkdir -p /var/lib/docker/volumes
        
        # Create symlinks for Docker volumes to use persistent storage
        for vol in mysql_data app_uploads app_logs app_backup redis_data nginx_ssl nginx_conf; do
            if [ ! -L /var/lib/docker/volumes/\${vol} ]; then
                # Stop any containers using the volume
                docker-compose -f ~/daysave_v1.4.1/docker-compose.production.yml down 2>/dev/null || true
                
                # Remove existing volume directory if it exists
                sudo rm -rf /var/lib/docker/volumes/\${vol}
                
                # Create persistent storage directory
                sudo mkdir -p $MOUNT_POINT/docker-volumes/\${vol}
                sudo chown -R \$(whoami):\$(whoami) $MOUNT_POINT/docker-volumes/\${vol}
                
                # Create symlink
                sudo ln -sf $MOUNT_POINT/docker-volumes/\${vol} /var/lib/docker/volumes/\${vol}
                
                echo \"✅ Volume \${vol} linked to persistent storage\"
            fi
        done
    "
    
    log "✅ Docker volume persistence configured"
}

setup_ssl_persistence() {
    log "Setting up SSL certificate persistence..."
    
    gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID --command="
        # Create SSL certificate directory on persistent disk
        sudo mkdir -p $MOUNT_POINT/ssl-certs/letsencrypt
        sudo chown -R \$(whoami):\$(whoami) $MOUNT_POINT/ssl-certs
        
        # Move existing certificates if they exist
        if [ -d /etc/letsencrypt ] && [ ! -L /etc/letsencrypt ]; then
            echo 'Moving existing SSL certificates to persistent storage...'
            sudo cp -r /etc/letsencrypt/* $MOUNT_POINT/ssl-certs/letsencrypt/ 2>/dev/null || true
            sudo rm -rf /etc/letsencrypt
        fi
        
        # Create symlink for SSL certificates
        if [ ! -L /etc/letsencrypt ]; then
            sudo ln -sf $MOUNT_POINT/ssl-certs/letsencrypt /etc/letsencrypt
            echo '✅ SSL certificates linked to persistent storage'
        fi
    "
    
    log "✅ SSL certificate persistence configured"
}

create_backup_structure() {
    log "Creating backup directory structure..."
    
    gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID --command="
        # Create backup directories
        mkdir -p $MOUNT_POINT/backups/{automated,manual,pre-deploy}
        
        # Create backup retention script
        cat > $MOUNT_POINT/backups/cleanup-old-backups.sh << 'EOF'
#!/bin/bash
# Clean up old backups (keep last 30 days locally)
find $MOUNT_POINT/backups/automated -type d -name '*' -mtime +30 -exec rm -rf {} + 2>/dev/null || true
find $MOUNT_POINT/backups/pre-deploy -type d -name '*' -mtime +7 -exec rm -rf {} + 2>/dev/null || true

# Log cleanup
echo \"\$(date): Cleaned up old backups\" >> $MOUNT_POINT/backups/cleanup.log
EOF
        
        chmod +x $MOUNT_POINT/backups/cleanup-old-backups.sh
        
        # Add to crontab for daily cleanup
        (crontab -l 2>/dev/null; echo '0 2 * * * $MOUNT_POINT/backups/cleanup-old-backups.sh') | crontab -
        
        echo '✅ Backup structure created'
    "
    
    log "✅ Backup directory structure configured"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    log "Starting persistent storage setup for DaySave production..."
    
    case "${1:-all}" in
        "disk-only")
            create_persistent_disk
            attach_persistent_disk
            setup_disk_on_vm
            ;;
        "docker-only")
            setup_docker_volume_persistence
            ;;
        "ssl-only")
            setup_ssl_persistence
            ;;
        "backup-only")
            create_backup_structure
            ;;
        "all"|*)
            create_persistent_disk
            attach_persistent_disk
            setup_disk_on_vm
            setup_docker_volume_persistence
            setup_ssl_persistence
            create_backup_structure
            ;;
    esac
    
    log "🎉 Persistent storage setup completed successfully!"
    log "📊 Disk usage:"
    
    gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID --command="df -h $MOUNT_POINT"
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
