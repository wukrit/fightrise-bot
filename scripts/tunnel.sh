#!/bin/bash
# Start Cloudflare Tunnel for local development
# This exposes localhost:3000 at https://fightrise-dev.sukritwalia.com

set -e

echo "Starting Cloudflare Tunnel..."
echo "Your app will be accessible at: https://fightrise-dev.sukritwalia.com"
echo ""
echo "Press Ctrl+C to stop the tunnel"
echo ""

cloudflared tunnel run fightrise-dev
