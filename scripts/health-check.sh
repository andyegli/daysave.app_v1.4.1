#!/bin/bash

# DaySave Comprehensive Health Check Script
# Tests all components and provides detailed status information

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

print_section() {
    echo ""
    echo -e "${CYAN}=== $1 ===${NC}"
}

# Initialize counters
TOTAL_CHECKS=0
PASSED_CHECKS=0

run_check() {
    local description="$1"
    local command="$2"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if eval "$command" > /dev/null 2>&1; then
        print_success "$description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        print_error "$description"
        return 1
    fi
}

run_check_with_output() {
    local description="$1"
    local command="$2"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    local output
    output=$(eval "$command" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        print_success "$description: $output"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        print_error "$description: $output"
        return 1
    fi
}

echo "🔍 DaySave Comprehensive Health Check"
echo "===================================="
echo "Timestamp: $(date)"

# 1. Docker Environment Check
print_section "Docker Environment"

run_check "Docker daemon running" "docker info"
run_check "Docker Compose available" "docker-compose version"

# Check if project directory is correct
if [ ! -f "docker-compose.yml" ]; then
    print_error "Not in DaySave project directory (docker-compose.yml not found)"
    exit 1
fi
print_success "In correct project directory"

# 2. Container Status Check
print_section "Container Status"

# Get container status
if docker-compose ps > /dev/null 2>&1; then
    containers=$(docker-compose ps --services)
    
    for container in $containers; do
        status=$(docker-compose ps $container | tail -n +2 | awk '{print $4}')
        if [[ "$status" == *"Up"* ]]; then
            if [[ "$status" == *"healthy"* ]]; then
                print_success "$container: $status"
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
            elif [[ "$status" == *"starting"* ]]; then
                print_warning "$container: $status"
            else
                print_success "$container: $status"
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
            fi
        else
            print_error "$container: $status"
        fi
        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    done
else
    print_error "Failed to get container status"
fi

# 3. Network Connectivity
print_section "Network Connectivity"

# Test internal container networking
if docker-compose exec -T app ping -c 1 db > /dev/null 2>&1; then
    print_success "App can reach database"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_error "App cannot reach database"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

if docker-compose exec -T nginx ping -c 1 daysave-app > /dev/null 2>&1; then
    print_success "Nginx can reach app"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_error "Nginx cannot reach app"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# 4. Port Accessibility
print_section "Port Accessibility"

ports=(3000 8080 3306)
for port in "${ports[@]}"; do
    if nc -z localhost $port 2>/dev/null; then
        print_success "Port $port: Open"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_error "Port $port: Closed"
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
done

# Check HTTPS port if SSL is configured
if [ -f "nginx/ssl/localhost.pem" ]; then
    if nc -z localhost 443 2>/dev/null; then
        print_success "Port 443 (HTTPS): Open"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_error "Port 443 (HTTPS): Closed"
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

# 5. HTTP/HTTPS Endpoint Testing
print_section "HTTP/HTTPS Endpoints"

# Test HTTP endpoints
endpoints=("http://localhost:3000/health" "http://localhost:8080/health")

for endpoint in "${endpoints[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}:%{time_total}" "$endpoint" 2>/dev/null || echo "000:0")
    status_code=$(echo $response | cut -d: -f1)
    response_time=$(echo $response | cut -d: -f2)
    
    if [ "$status_code" = "200" ]; then
        print_success "$endpoint: $status_code (${response_time}s)"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_error "$endpoint: $status_code"
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
done

# Test HTTPS if available
if [ -f "nginx/ssl/localhost.pem" ]; then
    https_endpoints=("https://localhost/health" "https://daysave.local/health")
    
    for endpoint in "${https_endpoints[@]}"; do
        response=$(curl -s -k -o /dev/null -w "%{http_code}:%{time_total}" "$endpoint" 2>/dev/null || echo "000:0")
        status_code=$(echo $response | cut -d: -f1)
        response_time=$(echo $response | cut -d: -f2)
        
        if [ "$status_code" = "200" ]; then
            print_success "$endpoint: $status_code (${response_time}s)"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            print_error "$endpoint: $status_code"
        fi
        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    done
fi

# 6. Database Connectivity
print_section "Database Connectivity"

# Test database connection from app
db_test=$(docker-compose exec -T app node -e "
const { sequelize } = require('./models');
sequelize.authenticate()
  .then(() => console.log('SUCCESS'))
  .catch(err => console.log('ERROR:', err.message));
" 2>/dev/null || echo "ERROR: Script failed")

if [[ "$db_test" == *"SUCCESS"* ]]; then
    print_success "Database connection from app"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_error "Database connection from app: $db_test"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Test direct database connection
if docker-compose exec -T db mysqladmin ping -h localhost > /dev/null 2>&1; then
    print_success "Database ping test"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_error "Database ping test failed"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# 7. SSL Certificate Status
if [ -f "nginx/ssl/localhost.pem" ]; then
    print_section "SSL Certificate Status"
    
    # Check certificate validity
    cert_info=$(openssl x509 -in nginx/ssl/localhost.pem -noout -dates 2>/dev/null || echo "ERROR")
    
    if [[ "$cert_info" != "ERROR" ]]; then
        print_success "Local SSL certificate is valid"
        echo "   $cert_info"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_error "Local SSL certificate is invalid"
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    # Test HTTPS connection
    if echo | openssl s_client -connect localhost:443 -servername localhost > /dev/null 2>&1; then
        print_success "HTTPS connection test"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_error "HTTPS connection test failed"
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

# 8. Environment Variables Check
print_section "Environment Configuration"

# Check critical environment variables
env_vars=("DB_HOST" "DB_USER" "DB_NAME" "SESSION_SECRET")

for var in "${env_vars[@]}"; do
    if docker-compose exec -T app printenv "$var" > /dev/null 2>&1; then
        print_success "Environment variable $var is set"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_error "Environment variable $var is missing"
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
done

# 9. External Service Connectivity
print_section "External Services"

# Test internet connectivity from container
if docker-compose exec -T app curl -s -f http://httpbin.org/ip > /dev/null 2>&1; then
    print_success "Internet connectivity from app container"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_error "No internet connectivity from app container"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# 10. Application Functionality
print_section "Application Functionality"

# Test login page
login_test=$(curl -s http://localhost:3000/auth/login | grep -i "login" || echo "ERROR")
if [[ "$login_test" != "ERROR" ]]; then
    print_success "Login page accessible"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_error "Login page not accessible"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# 11. Resource Usage
print_section "Resource Usage"

# Get container resource usage
resource_info=$(docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null || echo "ERROR")

if [[ "$resource_info" != "ERROR" ]]; then
    print_success "Resource monitoring available"
    echo "$resource_info"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_error "Resource monitoring failed"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# 12. Log Analysis
print_section "Recent Logs Analysis"

# Check for recent errors in app logs
error_count=$(docker-compose logs app --since 10m 2>/dev/null | grep -i error | wc -l || echo "0")
if [ "$error_count" -eq 0 ]; then
    print_success "No recent errors in app logs"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_warning "$error_count recent errors found in app logs"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Summary
print_section "Health Check Summary"

echo ""
echo "📊 Results: $PASSED_CHECKS/$TOTAL_CHECKS checks passed"

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    print_success "All checks passed! 🎉"
    echo ""
    echo "🚀 Your DaySave instance is healthy and ready for use!"
    exit 0
elif [ $PASSED_CHECKS -gt $((TOTAL_CHECKS * 3 / 4)) ]; then
    print_warning "Most checks passed, but some issues found"
    echo ""
    echo "⚠️  Your DaySave instance is mostly healthy with minor issues"
    exit 1
else
    print_error "Multiple issues found"
    echo ""
    echo "🔧 Your DaySave instance needs attention"
    echo ""
    echo "🛠️  Troubleshooting steps:"
    echo "   1. Check container logs: docker-compose logs"
    echo "   2. Restart services: docker-compose restart"
    echo "   3. Check .env configuration"
    echo "   4. Verify port availability"
    exit 2
fi