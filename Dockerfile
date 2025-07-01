# Use official Node.js LTS image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

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

# Create log directories and set permissions
RUN mkdir -p /usr/src/app/logs /usr/src/app/app-logs /tmp/daysave-logs && \
    chown -R appuser:appgroup /usr/src/app/logs /usr/src/app/app-logs /tmp/daysave-logs && \
    chmod 755 /usr/src/app/logs /usr/src/app/app-logs /tmp/daysave-logs

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "app.js"] 