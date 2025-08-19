# =======================
# Stage 1: Build Frontend
# =======================
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend source
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./

# Build with placeholder env (runtime env will override)
ARG VITE_API_BASE="/api"
ARG VITE_ADOBE_EMBED_API_KEY="placeholder"
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_ADOBE_EMBED_API_KEY=$VITE_ADOBE_EMBED_API_KEY
RUN npm run build

# =======================
# Stage 2: Backend + Nginx
# =======================
FROM python:3.11-slim

WORKDIR /app

# Install backend deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install nginx
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Copy backend code
COPY backend/ ./backend/

# Copy frontend build into nginx html
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Install dos2unix for line ending conversion
RUN apt-get update && apt-get install -y dos2unix && rm -rf /var/lib/apt/lists/*

# Copy entrypoint
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN dos2unix /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

EXPOSE 8080
CMD ["/app/docker-entrypoint.sh"]
