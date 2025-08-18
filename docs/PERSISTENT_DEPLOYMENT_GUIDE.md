# 🔄 **DaySave Persistent Deployment Guide**

## 🎯 **Overview**

This guide documents the persistent deployment strategy implemented for DaySave production, ensuring data persistence across VM restarts, deployments, and infrastructure changes.

## 🏗️ **Persistent Storage Architecture**

### **1. VM Boot Disk Persistence**
- **Boot Disk**: `auto-delete=no` ensures VM disk survives VM deletion
- **Size**: 50GB for OS and application code
- **Type**: `pd-standard` for cost-effective persistent storage

### **2. Application Data Disk**
- **Persistent Disk**: `daysave-production-data` (100GB)
- **Mount Point**: `/mnt/app-data`
- **Purpose**: Stores all application data, Docker volumes, SSL certificates, and backups

### **3. Directory Structure**
```
/mnt/app-data/
├── docker-volumes/          # Docker named volumes
│   ├── mysql_data/          # Database data
│   ├── app_uploads/         # User uploads
│   ├── app_logs/            # Application logs
│   ├── app_backup/          # Database backups
│   ├── redis_data/          # Redis cache data
│   ├── nginx_ssl/           # Nginx SSL configs
│   └── nginx_conf/          # Nginx configurations
├── ssl-certs/               # SSL certificates
│   └── letsencrypt/         # Let's Encrypt certificates
├── backups/                 # Automated backups
│   ├── automated/           # Daily automated backups
│   ├── pre-deploy/          # Pre-deployment backups
│   └── manual/              # Manual backups
├── uploads/                 # Application file uploads
└── multimedia-temp/         # Multimedia processing temp files
```

## 🔧 **Implementation Details**

### **CI/CD Pipeline Enhancements**

#### **1. Persistent Storage Setup**
```yaml
- name: Setup production VM with persistent storage
  run: |
    # Create VM with persistent boot disk
    ./scripts/setup-production-vm.sh vm-only
    
    # Setup persistent data disk and directory structure
    ./scripts/setup-persistent-storage.sh all
```

#### **2. Enhanced Backup Strategy**
```yaml
- name: Deploy with persistent blue-green strategy
  run: |
    # Comprehensive pre-deployment backup
    - Database backup (full dump with routines/triggers)
    - Docker volumes backup (tar.gz)
    - Application uploads backup
    - Upload to Cloud Storage for disaster recovery
```

#### **3. Blue-Green Deployment with Persistence**
- **Zero Downtime**: Scale up → Health check → Scale down
- **Data Persistence**: All data remains on persistent disk
- **Rollback Capability**: Previous backups available for quick recovery

### **Key Scripts**

#### **1. `scripts/setup-persistent-storage.sh`**
- Creates and attaches persistent disk
- Sets up mount points and directory structure
- Configures Docker volume symlinks
- Establishes SSL certificate persistence
- Creates backup retention policies

#### **2. Enhanced `docker-compose.production.yml`**
- Uses persistent disk mount for multimedia temp files
- All Docker volumes linked to persistent storage
- SSL certificates mounted from persistent location

## 🛡️ **Data Protection Features**

### **1. Automated Backups**
- **Pre-deployment**: Full backup before each deployment
- **Database**: Complete MySQL dump with routines and triggers
- **Volumes**: Compressed tar archives of Docker volumes
- **Uploads**: User file uploads backup
- **Cloud Storage**: All backups uploaded to GCS for disaster recovery

### **2. Backup Retention**
- **Local**: 7 days for pre-deployment, 30 days for automated
- **Cloud Storage**: 90 days retention policy
- **Automated Cleanup**: Daily cron job removes old backups

### **3. Rollback Capabilities**
- **Health Check Failures**: Automatic rollback to previous container
- **Data Recovery**: Restore from any backup point
- **SSL Certificates**: Persistent across deployments

## 🚀 **Deployment Process**

### **1. Pre-Deployment**
1. **VM Setup**: Create VM with persistent boot disk (`auto-delete=no`)
2. **Storage Setup**: Create and attach 100GB persistent data disk
3. **Directory Structure**: Setup `/mnt/app-data` with proper permissions
4. **Volume Linking**: Symlink Docker volumes to persistent storage
5. **SSL Setup**: Link certificates to persistent location

### **2. During Deployment**
1. **Backup Creation**: Comprehensive backup of current state
2. **Image Pull**: Download latest Docker images
3. **Blue-Green Deploy**: Scale up → Health check → Scale down
4. **Migration**: Run database migrations on new container
5. **Cleanup**: Remove old images (keep 24h history)

### **3. Post-Deployment**
1. **Health Verification**: Comprehensive smoke tests
2. **Backup Upload**: Upload backups to Cloud Storage
3. **Monitoring**: Verify all services are healthy
4. **Cleanup**: Remove old local backups per retention policy

## 📊 **Persistence Benefits**

### **✅ Data Persistence**
- **Database**: MySQL data survives VM restarts/recreations
- **User Uploads**: Files persist across deployments
- **SSL Certificates**: No need to regenerate certificates
- **Application Logs**: Historical logs maintained
- **Configuration**: Settings persist across updates

### **✅ Disaster Recovery**
- **VM Deletion**: Data survives on persistent disk
- **Deployment Failures**: Automatic rollback capability
- **Data Corruption**: Multiple backup points available
- **Regional Outages**: Cloud Storage backups in different region

### **✅ Performance Benefits**
- **Faster Deployments**: No data migration needed
- **Reduced Downtime**: Blue-green deployment with persistent data
- **Cache Persistence**: Redis cache survives deployments
- **SSL Performance**: Certificates don't need regeneration

## 🔍 **Monitoring & Verification**

### **Disk Usage Monitoring**
```bash
# Check persistent disk usage
df -h /mnt/app-data

# Monitor Docker volume sizes
du -sh /mnt/app-data/docker-volumes/*

# Check backup sizes
du -sh /mnt/app-data/backups/*
```

### **Backup Verification**
```bash
# List recent backups
ls -la /mnt/app-data/backups/pre-deploy/

# Verify Cloud Storage backups
gsutil ls gs://daysave-backups/automated/

# Test database backup integrity
mysql < /mnt/app-data/backups/latest/database.sql --dry-run
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Persistent Disk Not Mounted**
```bash
# Check if disk is attached
lsblk

# Mount manually if needed
sudo mount /dev/sdb /mnt/app-data

# Verify fstab entry
grep "/mnt/app-data" /etc/fstab
```

#### **2. Docker Volume Issues**
```bash
# Check symlinks
ls -la /var/lib/docker/volumes/

# Recreate symlinks if needed
./scripts/setup-persistent-storage.sh docker-only
```

#### **3. SSL Certificate Problems**
```bash
# Check SSL symlink
ls -la /etc/letsencrypt

# Recreate SSL persistence
./scripts/setup-persistent-storage.sh ssl-only
```

## 📈 **Future Enhancements**

### **Planned Improvements**
1. **Automated Disk Expansion**: Auto-resize when usage > 80%
2. **Cross-Region Replication**: Real-time backup to secondary region
3. **Snapshot Scheduling**: Daily disk snapshots for point-in-time recovery
4. **Monitoring Integration**: Alerts for disk usage and backup failures
5. **Encryption**: Enable disk encryption for sensitive data

### **Scalability Considerations**
- **Multi-Zone Deployment**: Regional persistent disks for HA
- **Database Clustering**: MySQL cluster with persistent storage
- **Load Balancer Integration**: Multiple VMs with shared persistent storage
- **Container Orchestration**: Kubernetes with persistent volume claims

---

## 🎉 **Summary**

The persistent deployment strategy ensures:
- **100% Data Persistence** across all deployments and VM operations
- **Zero Data Loss** with comprehensive backup strategy
- **Minimal Downtime** through blue-green deployment
- **Quick Recovery** with automated rollback capabilities
- **Cost Efficiency** with optimized storage allocation

This implementation provides enterprise-grade data persistence while maintaining the flexibility and efficiency of containerized deployments.
