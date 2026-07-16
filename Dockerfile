# Dockerfile for the HTTP-only EDR site (Fly.io deployment)

# ---------- Build Stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# ---- Client ----
# Copy the entire client source (including tsconfig files) first
COPY client/ ./client/
WORKDIR /app/client
# Install client deps and build the frontend (Vite/React)
RUN npm ci && npm run build

# ---- Server ----
WORKDIR /app/server
# Copy only package manifests first
COPY server/package.json server/package-lock.json ./
# Install all dependencies (including dev) for building
RUN npm ci
# Copy the rest of the server source
COPY server/ ./
# Build TypeScript
RUN npm run build

# ---------- Production Stage ----------
FROM node:20-alpine
WORKDIR /app

# Copy compiled server and built client assets from builder stage
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./server/public

ENV NODE_ENV=production
EXPOSE 8080

# Install production dependencies only (omit dev) and tsx for migrations
WORKDIR /app/server
RUN npm ci --omit=dev && npm install -g tsx

# Build the server for production
# Build step not needed – already built in builder stage

# Start the compiled server
CMD ["node", "dist/index.js"]
