#!/usr/bin/env bash
# Provision a fresh Ubuntu VPS for AnimeLegacy (Caddy + systemd + Node 20).
#
# Run once as root on a new server, after the admin SSH key is installed
# for the default user (e.g. `ubuntu` on OVH):
#
#   scp scripts/vps-setup.sh ubuntu@IP:/tmp/
#   ssh ubuntu@IP 'sudo bash /tmp/vps-setup.sh'
#
# Then copy .env.local to /home/duarte/apps/animelegacy/.env.local and run
# `sudo -u duarte bash -lc "cd ~/apps/animelegacy && pnpm build"` followed
# by `sudo systemctl restart animelegacy`.
#
# Idempotent: safe to re-run.
set -euo pipefail

APP_USER=duarte
APP_DIR=/home/$APP_USER/apps/animelegacy
REPO=https://github.com/dsoeir0/AnimeLegacy.git
DOMAINS="animelegacy.org, www.animelegacy.org"
SRC_USER=${SUDO_USER:-ubuntu}

export DEBIAN_FRONTEND=noninteractive

echo "==> Packages"
apt-get update -y
apt-get upgrade -y
apt-get install -y git curl ca-certificates gnupg ufw \
  debian-keyring debian-archive-keyring apt-transport-https \
  unattended-upgrades

echo "==> Swap (2G) so next build never OOMs on a 4 GB box"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> User $APP_USER"
if ! id "$APP_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$APP_USER"
fi
usermod -aG sudo "$APP_USER"
echo "$APP_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-$APP_USER
chmod 440 /etc/sudoers.d/90-$APP_USER
install -d -m 700 -o "$APP_USER" -g "$APP_USER" /home/$APP_USER/.ssh
if [ -f "/home/$SRC_USER/.ssh/authorized_keys" ] && [ "$SRC_USER" != "$APP_USER" ]; then
  cat "/home/$SRC_USER/.ssh/authorized_keys" >> /home/$APP_USER/.ssh/authorized_keys
  sort -u -o /home/$APP_USER/.ssh/authorized_keys /home/$APP_USER/.ssh/authorized_keys
fi
chown "$APP_USER:$APP_USER" /home/$APP_USER/.ssh/authorized_keys
chmod 600 /home/$APP_USER/.ssh/authorized_keys

echo "==> SSH hardening (keys only, no root login)"
cat > /etc/ssh/sshd_config.d/90-animelegacy.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
# Ubuntu 24.04+ uses socket activation: ssh.service may be inactive and
# each new connection reads the config fresh, so a failed reload is fine.
systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true

echo "==> Firewall"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Node 20 + pnpm"
if ! command -v node >/dev/null || ! node --version | grep -q '^v20'; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
corepack enable
sudo -u "$APP_USER" -H bash -lc 'corepack prepare pnpm@9 --activate'

echo "==> Caddy"
# Ubuntu's own package (the Cloudsmith repo started answering 402).
command -v caddy >/dev/null || apt-get install -y caddy
mkdir -p /var/log/caddy
chown caddy:caddy /var/log/caddy
cat > /etc/caddy/Caddyfile <<EOF
$DOMAINS {
	encode zstd gzip
	reverse_proxy localhost:3000
	log {
		output file /var/log/caddy/access.log
	}
}
EOF
systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

echo "==> App checkout"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" -H mkdir -p "$(dirname "$APP_DIR")"
  sudo -u "$APP_USER" -H git clone "$REPO" "$APP_DIR"
fi
sudo -u "$APP_USER" -H bash -lc "cd $APP_DIR && pnpm install --frozen-lockfile"

echo "==> systemd unit"
cat > /etc/systemd/system/animelegacy.service <<EOF
[Unit]
Description=AnimeLegacy (Next.js)
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/env pnpm start -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "==> Weekly image-cache prune (see docs/disk-and-image-cache.md)"
cat > /usr/local/bin/imgclean <<EOF
#!/bin/sh
cd $APP_DIR/.next/cache/images || exit 0
find . -type f -mtime +14 -delete
EOF
chmod 755 /usr/local/bin/imgclean
cat > /etc/systemd/system/al-imgcache-clean.service <<'EOF'
[Unit]
Description=Prune AnimeLegacy Next.js image cache

[Service]
Type=oneshot
ExecStart=/usr/local/bin/imgclean
EOF
cat > /etc/systemd/system/al-imgcache-clean.timer <<'EOF'
[Unit]
Description=Weekly AnimeLegacy image cache prune

[Timer]
OnCalendar=Sun *-*-* 04:00:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable animelegacy
systemctl enable --now al-imgcache-clean.timer

echo
echo "Done. Next: copy .env.local to $APP_DIR, run pnpm build as $APP_USER,"
echo "then: sudo systemctl restart animelegacy"
