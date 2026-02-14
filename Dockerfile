FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install all dependencies
RUN npm ci

# Copy source
COPY client/ ./client/
COPY server/ ./server/

# Build client and server
RUN npm run build -w client && npm run build -w server

# Production image
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/

# Install production dependencies only
RUN npm ci --workspace=server --omit=dev

# Copy built assets
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/dist ./server/dist

# Create data directory
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3002
ENV DB_PATH=/app/data/board.db

EXPOSE 3002

CMD ["node", "server/dist/index.js"]
