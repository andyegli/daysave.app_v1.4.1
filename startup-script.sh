#!/bin/bash

# DaySave Production VM Startup Script
# This script runs when the VM boots up and installs necessary components

set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $USER
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
fi

# Install other utilities
apt-get install -y \
    curl \
    wget \
    unzip \
    git \
    htop \
    nano \
    jq \
    tree

# Create application directories
mkdir -p /opt/daysave/{logs,uploads,backup,ssl}
mkdir -p /var/www/html
chown -R 1001:1001 /opt/daysave

# Create log rotation for Docker containers
cat > /etc/logrotate.d/docker-containers << EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
EOF

# Configure systemd service for automatic container startup
cat > /etc/systemd/system/daysave.service << EOF
[Unit]
Description=DaySave Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/$USER
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl enable daysave.service

# Generate DH parameters for nginx (this takes a while)
openssl dhparam -out /opt/daysave/ssl/dhparam.pem 2048

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configure swap (helpful for multimedia processing)
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Configure kernel parameters for better performance
cat >> /etc/sysctl.conf << EOF
# Network optimizations
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# File handling
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288

# Memory management
vm.swappiness = 10
vm.dirty_ratio = 80
vm.dirty_background_ratio = 5
EOF

sysctl -p

# Configure security updates
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades
systemctl enable unattended-upgrades

# Set up log collection for Cloud Logging
mkdir -p /var/log/daysave
touch /var/log/daysave/application.log
chmod 666 /var/log/daysave/application.log

echo "VM startup script completed successfully at $(date)" | tee -a /var/log/startup.log 