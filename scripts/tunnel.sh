#!/bin/bash
# Start Cloudflare Tunnel for local development
# This exposes localhost:3000 at your configured tunnel hostname
# See ~/.cloudflared/config.yml for your tunnel configuration

set -e

echo "Starting Cloudflare Tunnel..."
echo "Your app will be accessible at your configured tunnel hostname"
echo "(Check ~/.cloudflared/config.yml for the hostname)"
echo ""
echo "Press Ctrl+C to stop the tunnel"
echo ""

cloudflared tunnel run fightrise-dev
