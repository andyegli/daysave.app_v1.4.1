#!/bin/bash

# DaySave Health Dashboard
# A visual interface to check system health

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed. Please install it with: brew install jq${NC}"
    exit 1
fi

# Function to print colored status
print_status() {
    local status=$1
    case $status in
        "success")
            echo -e "${GREEN}✓ SUCCESS${NC}"
            ;;
        "error")
            echo -e "${RED}✗ ERROR${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠ WARNING${NC}"
            ;;
        "healthy")
            echo -e "${GREEN}✓ HEALTHY${NC}"
            ;;
        "unhealthy")
            echo -e "${RED}✗ UNHEALTHY${NC}"
            ;;
        *)
            echo -e "${BLUE}? $status${NC}"
            ;;
    esac
}

# Default endpoint
ENDPOINT="http://localhost:8080"
if [ ! -z "$1" ]; then
    ENDPOINT="$1"
fi

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}       DaySave Health Check Dashboard${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

# Test endpoint availability
echo -e "${BLUE}Testing endpoint: $ENDPOINT/health${NC}"
if ! curl -s -f "$ENDPOINT/health" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to $ENDPOINT/health${NC}"
    echo "Make sure the server is running on the correct port."
    exit 1
fi

# Get health data
HEALTH_DATA=$(curl -s "$ENDPOINT/health")

# Overall status
OVERALL_STATUS=$(echo "$HEALTH_DATA" | jq -r '.status')
TIMESTAMP=$(echo "$HEALTH_DATA" | jq -r '.timestamp')

echo -e "Overall Status: $(print_status $OVERALL_STATUS)"
echo -e "Timestamp: $TIMESTAMP"
echo ""

# Critical services
echo -e "${BLUE}=== CRITICAL SERVICES ===${NC}"
echo "$HEALTH_DATA" | jq -r '.services | to_entries[] | select(.value.critical == true) | "\(.key): \(.value.status) - \(.value.message)"' | while read line; do
    service=$(echo "$line" | cut -d: -f1)
    status=$(echo "$line" | cut -d: -f2 | cut -d' ' -f2)
    message=$(echo "$line" | cut -d: -f2- | cut -d'-' -f2-)
    printf "%-15s " "$service"
    print_status "$status"
    echo "$message"
done

echo ""

# Non-critical services with errors
echo -e "${BLUE}=== NON-CRITICAL SERVICE ISSUES ===${NC}"
echo "$HEALTH_DATA" | jq -r '.services | to_entries[] | select(.value.critical == false and .value.status == "error") | "\(.key): \(.value.message)"' | while read line; do
    if [ ! -z "$line" ]; then
        service=$(echo "$line" | cut -d: -f1)
        message=$(echo "$line" | cut -d: -f2-)
        printf "%-15s " "$service"
        print_status "error"
        echo "$message"
    fi
done

# Check if detailed endpoint exists
echo ""
echo -e "${BLUE}=== QUICK OPTIONS ===${NC}"
echo "1. Full JSON output:     curl -s $ENDPOINT/health | jq"
echo "2. Detailed health:      curl -s $ENDPOINT/health/detailed | jq"
echo "3. Critical services:    curl -s $ENDPOINT/health | jq '.services | to_entries[] | select(.value.critical == true)'"
echo "4. Service errors:       curl -s $ENDPOINT/health | jq '.services | to_entries[] | select(.value.status == \"error\")'"
echo ""

# Option to show full JSON
if [ "$2" = "--full" ] || [ "$2" = "-f" ]; then
    echo -e "${BLUE}=== FULL HEALTH DATA ===${NC}"
    echo "$HEALTH_DATA" | jq
fi

echo -e "${BLUE}===============================================${NC}"
echo "Usage: $0 [endpoint] [--full]"
echo "Example: $0 http://localhost:3000 --full"
echo -e "${BLUE}===============================================${NC}"