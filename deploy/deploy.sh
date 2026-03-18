#!/bin/bash
# Medox — Deploy / redeploy script
# Usage: ./deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.prod"
COMPOSE_FILE="docker-compose.prod.yml"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found. Copy deploy/.env.prod.example to .env.prod and fill it in."
    exit 1
fi

echo "=== Pulling latest code ==="
git pull origin main

echo "=== Building containers ==="
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo "=== Starting services ==="
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "=== Waiting for health checks ==="
sleep 10
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "=== Deployed! ==="
echo "Site: https://${DOMAIN:-medoxai.com}"
