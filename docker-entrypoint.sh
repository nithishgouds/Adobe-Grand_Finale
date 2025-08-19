#!/bin/sh
set -e

# Inject runtime env into frontend (used by your app if needed)
echo "window._env_ = {
  VITE_ADOBE_EMBED_API_KEY: \"$ADOBE_EMBED_API_KEY\",
  VITE_API_BASE: \"/api\"
}" > /usr/share/nginx/html/env-config.js

# Start backend in background
echo "Starting backend..."
uvicorn backend.backend:app --host 0.0.0.0 --port 8000 &
sleep 25
echo "Backend started on port 8080"

# Start nginx (serves frontend + proxies API)
echo "Starting nginx on port 8080..."
exec nginx -g "daemon off;"
