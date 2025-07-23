# Use official Node.js LTS image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install system dependencies for all current features
RUN apk add --no-cache \
    # Core multimedia processing
    python3 \
    py3-pip \
    ffmpeg \
    # MySQL client for database operations
    mysql-client \
    # Document processing dependencies
    poppler-utils \
    antiword \
    unrtf \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    # Image processing
    imagemagick \
    # Google Cloud SDK dependencies
    curl \
    bash \
    # Text processing
    libxml2-dev \
    libxslt-dev \
    # For native modules compilation
    make \
    g++ \
    && pip3 install --break-system-packages yt-dlp

# Install Google Cloud SDK (optional but recommended for better GCS integration)
RUN curl -sSL https://sdk.cloud.google.com | bash
ENV PATH $PATH:/root/google-cloud-sdk/bin

# Install app dependencies
COPY package*.json ./

# Install all dependencies (including dev dependencies for complete functionality)
RUN npm install

# Install document processing dependencies explicitly
RUN npm install pdf-parse mammoth textract

# Add migrations and seeders
COPY migrations ./migrations
COPY seeders ./seeders

# Bundle app source
COPY . .

# Create non-root user first
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create comprehensive directory structure with proper permissions
RUN mkdir -p \
    /usr/src/app/logs \
    /usr/src/app/app-logs \
    /tmp/daysave-logs \
    /usr/src/app/uploads \
    /usr/src/app/temp \
    /usr/src/app/db_backup \
    /usr/src/app/multimedia-temp \
    /usr/src/app/gcp-credentials \
    /usr/src/app/testfiles \
    && chown -R appuser:appgroup \
        /usr/src/app/logs \
        /usr/src/app/app-logs \
        /tmp/daysave-logs \
        /usr/src/app/uploads \
        /usr/src/app/temp \
        /usr/src/app/db_backup \
        /usr/src/app/multimedia-temp \
        /usr/src/app/gcp-credentials \
        /usr/src/app/testfiles \
    && chmod 755 \
        /usr/src/app/logs \
        /usr/src/app/app-logs \
        /tmp/daysave-logs \
        /usr/src/app/uploads \
        /usr/src/app/temp \
        /usr/src/app/db_backup \
        /usr/src/app/multimedia-temp \
        /usr/src/app/gcp-credentials \
        /usr/src/app/testfiles

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose ports
EXPOSE 3000
EXPOSE 3001

# Start the application with proper environment
CMD ["node", "app.js"] 