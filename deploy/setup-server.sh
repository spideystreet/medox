#!/bin/bash
# Medox — Hetzner VPS setup script
# Run on a fresh Ubuntu 22.04+ VPS as root
set -euo pipefail

echo "=== Medox Server Setup ==="

# Install Docker
if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose plugin
if ! docker compose version &>/dev/null; then
    echo "Installing Docker Compose..."
    apt-get update && apt-get install -y docker-compose-plugin
fi

# Create app directory
APP_DIR=/opt/medox
mkdir -p "$APP_DIR"

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Clone the repo:    git clone https://github.com/spideystreet/medox.git $APP_DIR"
echo "  2. Configure:         cp $APP_DIR/deploy/.env.prod.example $APP_DIR/.env.prod"
echo "  3. Edit .env.prod:    nano $APP_DIR/.env.prod"
echo "  4. Deploy:            cd $APP_DIR && ./deploy/deploy.sh"
echo ""
echo "Make sure your DNS A record for medoxai.com points to this server's IP."
