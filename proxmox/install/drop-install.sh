#!/usr/bin/env bash
set -euo pipefail

# Copyright (c) 2021-2026 community-scripts ORG
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE
# Source: https://github.com/eigger/drop

export DEBIAN_FRONTEND=noninteractive
APT_QUIET_FLAGS=(-y -qq -o=Dpkg::Use-Pty=0)

echo "[drop-install] Updating apt indexes"
apt-get update "${APT_QUIET_FLAGS[@]}"

echo "[drop-install] Installing base dependencies"
apt-get install "${APT_QUIET_FLAGS[@]}" curl sudo mc jq git openssl ca-certificates gnupg lsb-release

echo "[drop-install] Installing Docker engine"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update "${APT_QUIET_FLAGS[@]}"
  apt-get install "${APT_QUIET_FLAGS[@]}" docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "[drop-install] Preparing /opt/drop"
mkdir -p /opt/drop
cd /opt/drop

echo "[drop-install] Writing deployment files"
cat <<'EOF' > /opt/drop/Caddyfile
:80 {
	handle /api/* {
		reverse_proxy api:8080
	}

	handle /health {
		reverse_proxy api:8080
	}

	handle {
		reverse_proxy web:3000
	}
}
EOF

cat <<'EOF' > /opt/drop/docker-compose.prod.yml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-drop}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-drop}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-drop}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: ghcr.io/${GH_REPOSITORY_OWNER:-eigger}/drop-api:latest
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    command: sh -lc "npx prisma migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/index.js"
    volumes:
      - uploads:/app/uploads
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-drop}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-drop}
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
      PORT: "8080"
      APP_PUBLIC_URL: ${APP_PUBLIC_URL:-http://localhost}
      UPLOAD_DIR: /app/uploads
      FILE_SIZE_LIMIT_MB: ${FILE_SIZE_LIMIT_MB:-10240}

  web:
    image: ghcr.io/${GH_REPOSITORY_OWNER:-eigger}/drop-web:latest
    restart: unless-stopped
    depends_on:
      - api
    environment:
      NODE_ENV: production

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
    depends_on:
      - api
      - web

volumes:
  pgdata:
  uploads:
EOF

echo "[drop-install] Generating .env secrets"
POSTGRES_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
IP_ADDR_EARLY="$(hostname -I | awk '{print $1}')"
cat <<EOF > /opt/drop/.env
GH_REPOSITORY_OWNER=eigger
POSTGRES_USER=drop
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=drop
JWT_SECRET=${JWT_SECRET}
APP_PUBLIC_URL=http://${IP_ADDR_EARLY}
FILE_SIZE_LIMIT_MB=10240
EOF

echo "[drop-install] Creating systemd service"
cat <<'EOF' >/etc/systemd/system/drop.service
[Unit]
Description=Drop Docker Compose Stack
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/drop
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl enable -q --now drop.service

echo "[drop-install] Setting up console auto-login for root"
mkdir -p /etc/systemd/system/container-getty@1.service.d/
cat <<'EOF' >/etc/systemd/system/container-getty@1.service.d/override.conf
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin root --noclear --keep-baud tty%I 115200,38400,9600 $TERM
EOF
systemctl daemon-reload
systemctl restart container-getty@1.service || true

# Keep update logic local so rate limits on remote helper scripts cannot break updates.
cat <<'EOF' >/usr/bin/update
#!/usr/bin/env bash
set -euo pipefail

set -a
[ -f /etc/profile.d/90-http-proxy.sh ] && . /etc/profile.d/90-http-proxy.sh
set +a

if [[ ! -d /opt/drop ]]; then
  echo "No Drop installation found at /opt/drop"
  exit 1
fi

cd /opt/drop
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker image prune -f
echo "Drop update completed."
EOF
chmod +x /usr/bin/update

IP_ADDR="$(hostname -I | awk '{print $1}')"
echo "[drop-install] Completed successfully"
echo "Access URL: http://${IP_ADDR}:80"
