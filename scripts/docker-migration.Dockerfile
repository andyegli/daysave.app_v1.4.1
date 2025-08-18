FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production
RUN npm install -g sequelize-cli

# Copy application code
COPY . .

# Set proper permissions
RUN chown -R node:node /app
USER node

# Default command
CMD ["npx", "sequelize-cli", "db:migrate"]
