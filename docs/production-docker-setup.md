# DaySave v1.4.2 - Production Docker Setup Guide

## 🚀 **Production-Ready Docker Configuration**

This guide covers enterprise-grade Docker deployment for DaySave v1.4.2 with comprehensive monitoring, security, SSL/TLS, automated backups, and scalability features.

---

## 🔒 **Security Hardening**

### **1. Container Security**

#### **Enhanced Dockerfile for Production**
```dockerfile
# Production Dockerfile with security hardening
FROM node:18-alpine AS base

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S daysave -u 1001

# Install security updates
RUN apk update && apk upgrade

# Set up secure directories
WORKDIR /usr/src/app
RUN chown daysave:nodejs /usr/src/app

# Switch to non-root user
USER daysave

# Copy and install dependencies as non-root
COPY --chown=daysave:nodejs package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=daysave:nodejs . .

# Remove unnecessary packages
RUN apk del make g++ python3 py3-pip

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["npm", "start"]
```

#### **Security Annotations**
```yaml
# docker-compose.production.yml
services:
  app:
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    read_only: true
    tmpfs:
      - /tmp
      - /var/tmp
      - /usr/src/app/temp
      - /usr/src/app/multimedia-temp
```

### **2. Network Security**

#### **Internal Network Configuration**
```yaml
# Secure internal networking
networks:
  daysave-internal:
    driver: bridge
    internal: true
  daysave-external:
    driver: bridge

services:
  app:
    networks:
      - daysave-internal
      - daysave-external
  
  db:
    networks:
      - daysave-internal
    # Database only accessible internally
```

#### **Firewall Rules**
```bash
# Production firewall configuration
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw deny 3000/tcp   # Block direct app access
ufw enable
```

---

## 🔐 **SSL/TLS Configuration**

### **1. Nginx Reverse Proxy with SSL**

#### **nginx.conf**
```nginx
upstream daysave_app {
    server app:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_trusted_certificate /etc/nginx/ssl/chain.pem;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # File Upload Limits
    client_max_body_size 100M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    location / {
        proxy_pass http://daysave_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static file serving
    location /static/ {
        alias /usr/src/app/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### **Docker Compose with SSL**
```yaml
# docker-compose.production.yml
services:
  nginx:
    image: nginx:alpine
    container_name: daysave-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx-cache:/var/cache/nginx
    depends_on:
      - app
    networks:
      - daysave-external
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    container_name: daysave-certbot
    volumes:
      - ./ssl:/etc/letsencrypt
      - ./ssl-webroot:/var/www/certbot
    command: certonly --webroot --webroot-path=/var/www/certbot --email admin@yourdomain.com --agree-tos --no-eff-email -d yourdomain.com -d www.yourdomain.com
```

### **2. Automated SSL Certificate Renewal**
```bash
# ssl-renewal.sh
#!/bin/bash
docker-compose exec certbot certbot renew --quiet
docker-compose exec nginx nginx -s reload

# Crontab entry for automatic renewal
0 12 * * * /path/to/ssl-renewal.sh >> /var/log/ssl-renewal.log 2>&1
```

---

## 📊 **Monitoring and Observability**

### **1. Comprehensive Monitoring Stack**

#### **docker-compose.monitoring.yml**
```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: daysave-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: daysave-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure-admin-password
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    container_name: daysave-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: daysave-cadvisor
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker:/var/lib/docker:ro
    networks:
      - monitoring

volumes:
  prometheus-data:
  grafana-data:

networks:
  monitoring:
    driver: bridge
```

#### **Application Metrics Integration**
```javascript
// Add to app.js for custom metrics
const promClient = require('prom-client');

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const activeUsers = new promClient.Gauge({
  name: 'daysave_active_users',
  help: 'Number of active users'
});

const fileUploads = new promClient.Counter({
  name: 'daysave_file_uploads_total',
  help: 'Total number of file uploads'
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

### **2. Logging Configuration**

#### **Centralized Logging with ELK Stack**
```yaml
# docker-compose.logging.yml
services:
  elasticsearch:
    image: elasticsearch:7.17.0
    container_name: daysave-elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  logstash:
    image: logstash:7.17.0
    container_name: daysave-logstash
    volumes:
      - ./logging/logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"
    depends_on:
      - elasticsearch

  kibana:
    image: kibana:7.17.0
    container_name: daysave-kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
```

---

## 🔄 **Automated Backup System**

### **1. Database Backup Strategy**

#### **Automated Backup Script**
```bash
#!/bin/bash
# backup-production.sh

set -e

# Configuration
BACKUP_DIR="/var/backups/daysave"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="daysave_backup_${DATE}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
docker-compose exec -T db mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --user=daysave \
  --password=$DB_USER_PASSWORD \
  daysave_v141 > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Upload to cloud storage
gsutil cp $BACKUP_DIR/${BACKUP_FILE}.gz gs://your-backup-bucket/database/

# Clean old backups
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup integrity
docker-compose exec -T db mysql \
  --user=daysave \
  --password=$DB_USER_PASSWORD \
  -e "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='daysave_v141'"

echo "Backup completed: ${BACKUP_FILE}.gz"
```

#### **Volume Backup Strategy**
```bash
#!/bin/bash
# backup-volumes.sh

# Backup uploads
docker run --rm \
  -v daysave_uploads:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz /data

# Backup logs
docker run --rm \
  -v daysave_logs:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/logs_$(date +%Y%m%d).tar.gz /data

# Upload to cloud storage
gsutil -m cp backups/*.tar.gz gs://your-backup-bucket/volumes/
```

### **2. Automated Backup Scheduling**
```bash
# Production crontab
# Database backup every 6 hours
0 */6 * * * /opt/daysave/scripts/backup-production.sh >> /var/log/daysave-backup.log 2>&1

# Volume backup daily at 2 AM
0 2 * * * /opt/daysave/scripts/backup-volumes.sh >> /var/log/daysave-volumes.log 2>&1

# Weekly full system backup
0 1 * * 0 /opt/daysave/scripts/backup-full-system.sh >> /var/log/daysave-full-backup.log 2>&1
```

---

## ⚡ **Performance Optimization**

### **1. Redis Caching Layer**
```yaml
# Add Redis to docker-compose.production.yml
services:
  redis:
    image: redis:7-alpine
    container_name: daysave-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
    networks:
      - daysave-internal
    restart: unless-stopped
```

### **2. Database Optimization**
```sql
-- Production MySQL configuration
-- Add to mysql.cnf or docker environment

[mysqld]
# Performance tuning
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Connection settings
max_connections = 200
wait_timeout = 300
interactive_timeout = 300

# Query cache
query_cache_size = 128M
query_cache_type = 1

# Slow query log
slow_query_log = 1
long_query_time = 2
slow_query_log_file = /var/log/mysql/slow.log
```

### **3. Application Performance**
```javascript
// Add to production config
module.exports = {
  // Compression middleware
  compression: {
    enabled: true,
    threshold: 1024,
    level: 6
  },
  
  // Caching
  cache: {
    redis: {
      enabled: true,
      host: 'redis',
      port: 6379,
      ttl: 3600
    }
  },
  
  // Session optimization
  session: {
    store: 'redis',
    saveUninitialized: false,
    resave: false,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 86400000  // 24 hours
    }
  }
};
```

---

## 🎯 **Health Checks and Monitoring**

### **1. Application Health Endpoints**
```javascript
// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  };

  try {
    // Database check
    await db.authenticate();
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    // Redis check
    await redis.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    // Google Cloud check
    await storage.getBuckets();
    health.services.gcs = 'healthy';
  } catch (error) {
    health.services.gcs = 'unhealthy';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### **2. Monitoring Alerts**
```yaml
# prometheus/alerts.yml
groups:
  - name: daysave.rules
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected

      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: Container memory usage is above 90%

      - alert: DatabaseDown
        expr: mysql_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: MySQL database is down
```

---

## 🚀 **Deployment Automation**

### **1. Blue-Green Deployment Script**
```bash
#!/bin/bash
# deploy-production.sh

set -e

BLUE_SERVICE="daysave-app-blue"
GREEN_SERVICE="daysave-app-green"
CURRENT_SERVICE=""

# Function to determine current active service
get_current_service() {
  if docker ps | grep -q $BLUE_SERVICE; then
    CURRENT_SERVICE=$BLUE_SERVICE
    NEW_SERVICE=$GREEN_SERVICE
  else
    CURRENT_SERVICE=$GREEN_SERVICE
    NEW_SERVICE=$BLUE_SERVICE
  fi
}

# Deploy new version
deploy_new_version() {
  echo "Deploying to $NEW_SERVICE..."
  
  # Build new image
  docker build -t daysave:latest .
  
  # Start new service
  docker-compose -f docker-compose.production.yml up -d $NEW_SERVICE
  
  # Wait for health check
  echo "Waiting for health check..."
  for i in {1..30}; do
    if curl -f http://localhost:3000/health; then
      echo "Health check passed"
      break
    fi
    sleep 10
  done
}

# Switch traffic
switch_traffic() {
  echo "Switching traffic to $NEW_SERVICE..."
  
  # Update nginx configuration
  sed -i "s/$CURRENT_SERVICE/$NEW_SERVICE/g" nginx/nginx.conf
  
  # Reload nginx
  docker-compose exec nginx nginx -s reload
  
  # Stop old service
  docker-compose stop $CURRENT_SERVICE
  docker-compose rm -f $CURRENT_SERVICE
}

# Main deployment process
get_current_service
deploy_new_version
switch_traffic

echo "Deployment completed successfully"
```

---

## 📚 **Production Checklist**

### **Pre-Deployment**
- [ ] Security scan completed
- [ ] SSL certificates installed and verified
- [ ] Backup system tested and verified
- [ ] Monitoring stack deployed and configured
- [ ] Load testing completed
- [ ] Database performance optimized
- [ ] All environment variables configured
- [ ] Firewall rules configured
- [ ] Log rotation configured

### **Post-Deployment**
- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] Backup verification completed
- [ ] Performance metrics baseline established
- [ ] SSL certificate auto-renewal tested
- [ ] Disaster recovery plan tested
- [ ] Documentation updated
- [ ] Team training completed

---

This production setup provides enterprise-grade reliability, security, and performance for DaySave v1.4.2 in production environments. 