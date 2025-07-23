# DaySave v1.4.2 - Docker Deployment Guide

## 🐳 **Complete Docker Deployment Guide**

This guide covers the complete setup and deployment of DaySave v1.4.2 using Docker containers with all enhanced features including multimedia processing, document analysis, Google Cloud integration, and database operations.

---

## 📋 **Prerequisites**

### **System Requirements**
- Docker Engine 20.10+
- Docker Compose 2.0+
- Minimum 4GB RAM (8GB recommended for multimedia processing)
- 20GB free disk space (for containers, volumes, and multimedia temp files)

### **Required External Services**
- MySQL 8.0+ database (can use Docker service or external)
- Google Cloud Project with enabled APIs:
  - Cloud Storage API
  - Vision API (for image analysis)
  - Speech-to-Text API (for audio transcription)
  - Maps API (for address completion)
- Optional: Redis for caching (included in compose)

---

## 🚀 **Quick Start**

### **1. Environment Setup**

```bash
# Clone the repository
git clone <repository-url>
cd daysave_v1.4.1

# Copy Docker environment template
cp docker-env.example .env

# Edit environment variables
nano .env  # or your preferred editor
```

### **2. Configure Environment Variables**

Edit `.env` with your specific configuration:

```bash
# ===== APPLICATION CONFIGURATION =====
NODE_ENV=production
APP_PORT=3000
ANALYZER_PORT=3001  # Currently unused - reserved for future microservice

# ===== DATABASE CONFIGURATION =====
DB_HOST=db  # Use 'db' for Docker service, or external host
DB_PORT=3306
DB_USER=daysave
DB_USER_PASSWORD=your-secure-password-change-this
DB_NAME=daysave_v141
DB_ROOT_PASSWORD=your-secure-root-password-change-this

# ===== GOOGLE CLOUD CONFIGURATION =====
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/usr/src/app/gcp-credentials/service-account.json
GOOGLE_API_KEY=your-google-api-key

# ===== OAUTH CONFIGURATION =====
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# ===== SECURITY =====
SESSION_SECRET=your-very-secure-session-secret
JWT_SECRET=your-jwt-secret
API_KEY_ENCRYPTION_SECRET=your-api-key-encryption-secret
```

### **3. Google Cloud Service Account Setup**

```bash
# Create credentials directory
mkdir -p gcp-credentials

# Place your Google Cloud service account JSON file
cp /path/to/your/service-account.json gcp-credentials/service-account.json

# Ensure proper permissions
chmod 600 gcp-credentials/service-account.json
```

### **4. Deploy with Docker Compose**

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f app
```

---

## 🔧 **Advanced Configuration**

### **Production Deployment**

#### **1. Production Environment Variables**

```bash
# Production-specific settings
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_COMPRESSION=true
ENABLE_RATE_LIMITING=true

# Security enhancements
SECURE_COOKIES=true
TRUST_PROXY=true
HELMET_ENABLED=true

# Performance optimization
MYSQL_POOL_MAX=20
MYSQL_POOL_MIN=5
REDIS_ENABLED=true
```

#### **2. SSL/TLS Configuration**

```yaml
# Add to docker-compose.yml for SSL termination
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
```

#### **3. Resource Limits**

```yaml
# Add resource limits to services
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
  
  db:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
```

---

## 🧪 **Testing Docker Deployment**

### **1. Basic Health Checks**

```bash
# Test application health
curl http://localhost:3000/health

# Test database connection
docker-compose exec app node scripts/health-check.js

# Test Google Cloud services
docker-compose exec app node scripts/test-startup-validation.js
```

### **2. Feature Testing**

```bash
# Test file upload and processing
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@testfiles/images/test-image.jpg"

# Test document processing
docker-compose exec app node scripts/test-document-processing.js

# Test multimedia analysis
docker-compose exec app node scripts/test-multimedia-workflow.js
```

### **3. Database Operations**

```bash
# Test database backup
docker-compose exec app node scripts/backup-database.js

# Test migrations
docker-compose exec npx sequelize-cli db:migrate

# Verify table structure
docker-compose exec db mysql -u daysave -p daysave_v141 -e "SHOW TABLES;"
```

---

## 📊 **Monitoring and Maintenance**

### **1. Container Monitoring**

```bash
# Monitor resource usage
docker stats

# Check container health
docker-compose ps
docker-compose logs --tail=100 app

# Inspect container details
docker inspect daysave-app
```

### **2. Volume Management**

```bash
# Check volume usage
docker volume ls
docker system df

# Backup volumes
docker run --rm -v daysave_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz /data

# Restore volumes
docker run --rm -v daysave_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads-backup.tar.gz -C /
```

### **3. Log Management**

```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f db

# Export logs for analysis
docker-compose logs --no-color app > app-logs.txt
```

---

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Container Won't Start**

```bash
# Check Docker daemon
sudo systemctl status docker

# Verify Docker Compose version
docker-compose --version

# Check for port conflicts
sudo netstat -tulpn | grep :3000
```

#### **2. Database Connection Issues**

```bash
# Test database connectivity
docker-compose exec app ping db

# Check database logs
docker-compose logs db

# Verify database credentials
docker-compose exec db mysql -u root -p -e "SELECT User, Host FROM mysql.user;"
```

#### **3. Google Cloud Integration Issues**

```bash
# Verify service account file
docker-compose exec app ls -la gcp-credentials/

# Test Google Cloud authentication
docker-compose exec app node -e "
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
storage.getBuckets().then(console.log).catch(console.error);
"

# Check API quotas
# Visit Google Cloud Console > APIs & Services > Quotas
```

#### **4. Multimedia Processing Issues**

```bash
# Test FFmpeg installation
docker-compose exec app ffmpeg -version

# Test ImageMagick
docker-compose exec app convert -version

# Test Tesseract OCR
docker-compose exec app tesseract --version

# Check temp directory permissions
docker-compose exec app ls -la multimedia-temp/
```

### **Performance Optimization**

#### **1. Container Optimization**

```bash
# Remove unused images
docker image prune -a

# Clean up volumes
docker volume prune

# Optimize Docker build cache
docker builder prune
```

#### **2. Database Performance**

```sql
-- Optimize MySQL performance
SET GLOBAL innodb_buffer_pool_size = 1073741824;  -- 1GB
SET GLOBAL query_cache_size = 67108864;  -- 64MB
SET GLOBAL max_connections = 200;

-- Monitor slow queries
SET GLOBAL slow_query_log = 1;
SET GLOBAL long_query_time = 2;
```

---

## 🔄 **Backup and Recovery**

### **1. Automated Backups**

```bash
# Set up automated database backups
docker-compose exec app node scripts/backup-database.js

# Schedule backups with cron
0 2 * * * docker-compose -f /path/to/docker-compose.yml exec app node scripts/backup-database.js
```

### **2. Disaster Recovery**

```bash
# Stop services
docker-compose down

# Restore from backup
docker-compose up -d db
docker-compose exec db mysql -u root -p daysave_v141 < db_backup/latest-backup.sql

# Restart all services
docker-compose up -d
```

---

## 🚀 **Scaling for Production**

### **1. Horizontal Scaling**

```yaml
# docker-compose.yml for scaling
services:
  app:
    deploy:
      replicas: 3
    depends_on:
      - db
      - redis

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx-load-balancer.conf:/etc/nginx/nginx.conf
```

### **2. External Database**

```bash
# For production, use external managed database
DB_HOST=your-cloud-sql-instance
DB_PORT=3306
DB_SSL_CA=/path/to/server-ca.pem
DB_SSL_CERT=/path/to/client-cert.pem
DB_SSL_KEY=/path/to/client-key.pem
```

---

## 📚 **Additional Resources**

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Security Guide](https://docs.docker.com/engine/security/)
- [Google Cloud Docker Integration](https://cloud.google.com/container-registry/docs)
- [Production Deployment Checklist](../DEVELOPMENT_PROCESS.md)

---

## 🆘 **Support**

For additional support:
1. Check application logs: `docker-compose logs app`
2. Review troubleshooting section above
3. Verify all environment variables are correctly set
4. Ensure all external services (Google Cloud, database) are properly configured

**Remember**: Always test thoroughly in a staging environment before deploying to production! 