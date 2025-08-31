FROM node:18-alpine AS builder

# Install Python and build dependencies (needed for bcrypt and other native modules)
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY package*.json ./

# Install dependencies
WORKDIR /app/backend
RUN npm ci --only=production
RUN npm install -g @nestjs/cli
RUN npm install

# Copy backend source
COPY backend/ ./

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy built application
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/prisma ./prisma

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the application
CMD ["node", "dist/main"]
