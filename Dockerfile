# Use official Node.js LTS image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install system dependencies including yt-dlp
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    && pip3 install --break-system-packages yt-dlp

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Add migrations and seeders
COPY migrations ./migrations
COPY seeders ./seeders

# Bundle app source
COPY . .

# Create non-root user first
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create log directories, uploads directory, and set permissions
RUN mkdir -p /usr/src/app/logs /usr/src/app/app-logs /tmp/daysave-logs /usr/src/app/uploads /usr/src/app/temp && \
    chown -R appuser:appgroup /usr/src/app/logs /usr/src/app/app-logs /tmp/daysave-logs /usr/src/app/uploads /usr/src/app/temp && \
    chmod 755 /usr/src/app/logs /usr/src/app/app-logs /tmp/daysave-logs /usr/src/app/uploads /usr/src/app/temp

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "app.js"] 