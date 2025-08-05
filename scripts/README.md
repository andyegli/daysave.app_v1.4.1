# DaySave Testing & Setup Scripts

This directory contains comprehensive scripts for testing and setting up DaySave in various environments.

## 🎯 Quick Start

```bash
# Complete health check
./scripts/health-check.sh

# Local HTTPS setup
./scripts/setup-local-ssl.sh

# Remote proxy testing
./scripts/test-remote-proxy.sh

# Production SSL setup
./scripts/setup-production-ssl.sh
```

## 📋 Script Overview

### 🔍 `health-check.sh`
**Comprehensive system health check**
- Tests all containers and services
- Verifies network connectivity
- Checks SSL certificates
- Monitors resource usage
- Analyzes recent logs

```bash
./scripts/health-check.sh
```

### 🔒 `setup-local-ssl.sh`
**Local HTTPS development setup**
- Installs mkcert for local certificates
- Generates SSL certificates for localhost
- Configures nginx for HTTPS
- Updates environment for HTTPS
- Tests SSL configuration

```bash
./scripts/setup-local-ssl.sh
```

### 🌐 `test-remote-proxy.sh`
**Remote proxy testing (ngrok/Cloudflare)**
- Interactive menu for proxy selection
- Automatic environment configuration
- OAuth callback URL setup
- Real-time tunnel testing
- Automatic cleanup on exit

```bash
./scripts/test-remote-proxy.sh
```

### 🏭 `setup-production-ssl.sh`
**Production SSL setup with Let's Encrypt**
- Domain verification
- DNS checks
- Let's Encrypt certificate generation
- HTTPS enforcement
- Automatic renewal setup

```bash
# Production setup
./scripts/setup-production-ssl.sh -d daysave.app -e your@email.com

# Staging setup (for testing)
./scripts/setup-production-ssl.sh -d daysave.app -e your@email.com --staging
```

### 📊 `test-letsencrypt-local.sh`
**Let's Encrypt testing options**
- Staging environment testing
- Local CA with mkcert
- Real domain testing

```bash
./scripts/test-letsencrypt-local.sh
```

## 🛠️ Prerequisites

### Required Tools
```bash
# Docker & Docker Compose
docker --version
docker-compose --version

# For local SSL testing
brew install mkcert  # macOS
# or follow: https://github.com/FiloSottile/mkcert#installation

# For remote proxy testing
brew install ngrok        # ngrok tunnel
brew install cloudflared  # Cloudflare tunnel
```

### Required Configuration
- `.env` file with proper configuration
- Docker containers running (`docker-compose up -d`)
- Domain DNS configured (for production)

## 🧪 Testing Scenarios

### 1. Local HTTP Testing
```bash
# Start services
docker-compose up -d

# Run health check
./scripts/health-check.sh

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:8080/health
```

### 2. Local HTTPS Testing
```bash
# Setup local SSL
./scripts/setup-local-ssl.sh

# Test HTTPS
curl https://daysave.local/health
open https://daysave.local
```

### 3. Remote Proxy Testing
```bash
# Setup ngrok tunnel
./scripts/test-remote-proxy.sh
# Select option 1 (ngrok) and follow prompts

# Test OAuth, file uploads, etc. through the tunnel
```

### 4. Production SSL Testing
```bash
# Setup production SSL
./scripts/setup-production-ssl.sh -d daysave.app -e admin@daysave.app

# Test production HTTPS
curl https://daysave.app/health
```

## 🔧 Configuration Files

### nginx Configurations
- `nginx/sites-available/daysave-local-proxy.conf` - Local HTTP proxy
- `nginx/sites-available/daysave-local-ssl.conf` - Local HTTPS
- `nginx/sites-available/daysave-https.conf` - Production HTTPS (auto-generated)

### Docker Compose Overrides
- `docker-compose.ssl.yml` - SSL override for local development
- `docker-compose.production.custom.yml` - Custom production config

## 📊 Monitoring & Debugging

### Health Monitoring
```bash
# Complete health check
./scripts/health-check.sh

# Container status
docker-compose ps

# Real-time logs
docker-compose logs -f

# Resource usage
docker stats
```

### SSL Certificate Monitoring
```bash
# Check certificate expiration
echo | openssl s_client -servername daysave.app -connect daysave.app:443 2>/dev/null | openssl x509 -noout -dates

# Verify certificate chain
echo | openssl s_client -servername daysave.app -connect daysave.app:443 -showcerts

# Test security headers
curl -s -I https://daysave.app | grep -E "(Strict-Transport-Security|X-Frame-Options)"
```

### Performance Testing
```bash
# Response time testing
for i in {1..10}; do
  curl -s -o /dev/null -w "Request $i: %{time_total}s (%{http_code})\n" https://daysave.app/health
  sleep 1
done

# File upload testing
time curl -X POST -F "file=@testfiles/images/test.jpg" https://daysave.app/upload
```

## 🔄 Certificate Renewal

### Automatic Renewal (Production)
```bash
# Generated automatically by setup-production-ssl.sh
./scripts/renew-ssl.sh

# Add to crontab for automation
crontab -e
# Add: 0 2 * * 0 cd /path/to/daysave && ./scripts/renew-ssl.sh
```

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   lsof -i :3000  # Check what's using the port
   kill -9 $(lsof -ti:3000)  # Kill process
   ```

2. **SSL certificate issues**
   ```bash
   docker run --rm -v letsencrypt_certs:/etc/letsencrypt certbot/certbot certificates
   ```

3. **nginx configuration errors**
   ```bash
   docker-compose exec nginx nginx -t  # Test config
   docker-compose restart nginx        # Restart nginx
   ```

4. **Database connection issues**
   ```bash
   docker-compose exec app mysql -h db -u daysave -p
   docker-compose restart db
   ```

### Debug Commands
```bash
# Test internal networking
docker-compose exec app ping db
docker-compose exec nginx ping daysave-app

# Check environment variables
docker-compose exec app env | grep -E "(DB_|GOOGLE_|OPENAI_)"

# Validate compose files
docker-compose config
```

## 📚 Additional Resources

- **Main Testing Guide**: `docs/TESTING_GUIDE.md` - Comprehensive step-by-step manual
- **Security Guidelines**: `docs/SECURITY_GUIDELINES.md`
- **Production Deployment**: `docs/production-docker-setup.md`
- **OAuth Setup**: `docs/oauth-setup-guide.md`

## 🆘 Need Help?

1. Run the health check: `./scripts/health-check.sh`
2. Check the logs: `docker-compose logs -f`
3. Review the comprehensive guide: `docs/TESTING_GUIDE.md`
4. Check container status: `docker-compose ps`

---

*All scripts are designed to be safe and provide detailed feedback. They create backups where appropriate and include cleanup functions.*