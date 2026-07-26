# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies for tsc)
RUN npm ci

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript code to dist/
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy package descriptors and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Expose health check port
EXPOSE 8080

# Run entrypoint script
CMD ["node", "dist/index.js"]
