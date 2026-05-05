# Security hardening runbook

Two phases of changes to apply on the production VPS. Run on the SSH session as `duarte` (each phase prompts for sudo password once).

Each phase is a single copy-paste block. The blocks use heredocs that write the new config to `/tmp/` first, then `sudo install` it into place — this avoids paste mangling that breaks inline-heredoc-to-sudo-tee approaches.

---

## Phase 1 — Bind Next.js to localhost + systemd sandboxing

Currently the Next.js process binds to `*:3000` (all interfaces). ufw blocks port 3000 from outside, but if ufw ever fails or gets misconfigured, the port is exposed. This makes it bind to `127.0.0.1:3000` so only Caddy on the same host can reach it.

Also adds systemd sandboxing flags so a compromise of the Node process can't easily pivot to the rest of the system.

Copy-paste this whole block into the SSH session:

```bash
cat > /tmp/animelegacy.service.new << 'UNIT'
[Unit]
Description=AnimeLegacy Next.js
After=network.target

[Service]
Type=simple
User=duarte
WorkingDirectory=/home/duarte/apps/animelegacy
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/home/duarte/apps/animelegacy/node_modules/.bin/next start -p 3000 -H 127.0.0.1
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/duarte/apps/animelegacy
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
RestrictRealtime=true
LockPersonality=true

[Install]
WantedBy=multi-user.target
UNIT

sudo install -m 644 /tmp/animelegacy.service.new /etc/systemd/system/animelegacy.service
sudo systemctl daemon-reload
sudo systemctl restart animelegacy
sleep 3
echo ""
echo "===== VERIFICATION ====="
echo -n "service active: "
systemctl is-active animelegacy
echo -n "listening on: "
sudo ss -tlnp | grep ':3000' || echo "NOT LISTENING"
echo "--- curl localhost ---"
curl -sI http://localhost:3000 | head -3
echo "--- curl https://animelegacy.org (external) ---"
curl -sI https://animelegacy.org 2>/dev/null | head -3
```

### Expected output

```
service active: active
listening on: LISTEN 0  511 127.0.0.1:3000  ...   <-- key change (was *:3000)
--- curl localhost ---
HTTP/1.1 200 OK
...
--- curl https://animelegacy.org (external) ---
HTTP/2 200
...
```


If `service active` shows anything other than `active`, run `journalctl -u animelegacy -n 30` to see why.

---

## Phase 2 — Caddy: CSP + Permissions-Policy + remove Server header

Adds:
- **Content-Security-Policy** — whitelists the exact domains the site loads from (Firebase, Jikan, AniList, Google Fonts, MAL CDN, etc). Blocks XSS exfiltration to attacker-controlled domains.
- **Permissions-Policy** — denies camera, microphone, geolocation, and the Google FLoC tracking cohort.
- **`-Server` directive** — strips the `Server: Caddy` response header (less software fingerprinting).

The CSP is permissive on `script-src` (`'unsafe-inline' 'unsafe-eval'`) because Next.js needs both for its runtime. Tightening that requires a nonce-based setup that's a bigger refactor.

Copy-paste:

```bash
cat > /tmp/Caddyfile.new << 'CADDY'
animelegacy.org, www.animelegacy.org {
    reverse_proxy localhost:3000
    encode gzip zstd

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://cdn.myanimelist.net https://*.myanimelist.net https://s1.anilist.co https://s2.anilist.co https://s3.anilist.co https://s4.anilist.co https://flagcdn.com https://lh3.googleusercontent.com https://*.googleusercontent.com; connect-src 'self' https://api.jikan.moe https://graphql.anilist.co https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com wss://*.firebaseio.com; frame-src https://accounts.google.com https://*.firebaseapp.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
        Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        -Server
    }
}
CADDY

sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak
sudo install -m 644 /tmp/Caddyfile.new /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sleep 2
echo ""
echo "===== VERIFICATION ====="
curl -sI https://animelegacy.org | grep -iE "strict-transport|content-security|permissions-policy|x-content-type|referrer-policy|^server"
echo ""
systemctl is-active caddy
```

### Expected output

```
strict-transport-security: max-age=31536000; includeSubDomains
content-security-policy: default-src 'self'; script-src 'self' ...
permissions-policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
active
```

There should be **no** `server:` line — that's the point of `-Server`.

### If something breaks

The previous Caddyfile was backed up before the install. Restore it with:

```bash
sudo install -m 644 /etc/caddy/Caddyfile.bak /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## Phase 3 — Browser-only steps

These can't be scripted from SSH, do in browser:

### Hetzner Cloud Firewall

1. [console.hetzner.cloud](https://console.hetzner.cloud) → AnimeLegacy project → **Firewalls** → **Create Firewall**
2. Name: `animelegacy-prod-fw`
3. Inbound rules:

   | Source | Port | Protocol |
   |--------|------|----------|
   | Any IPv4, Any IPv6 | 22 | TCP |
   | Any IPv4, Any IPv6 | 80 | TCP |
   | Any IPv4, Any IPv6 | 443 | TCP |

4. Outbound: leave default (all allowed)
5. **Apply to Resources** → tick `animelegacy-prod` → save

This is a redundant layer at Hetzner's network edge, independent of `ufw` inside the OS.

### Firestore rules deploy

The repo has already-tightened rules (`firestore.rules`) that whitelist exactly the fields each collection should accept. To deploy them:

1. [console.firebase.google.com](https://console.firebase.google.com) → AnimeLegacy
2. Build → **Firestore Database** → **Rules** tab
3. Open `firestore.rules` from the local repo, copy the whole file
4. Paste into the Firebase Console editor (replacing what's there)
5. **Publish**

Alternatively, install firebase-tools and run `firebase deploy --only firestore:rules`.

---

## After all 3 phases

Test in a private browser window at `https://animelegacy.org`:

- Home loads, images render
- `/search`, `/studios`, `/voices/[id]` load
- Login with Google works
- DevTools → Console: any CSP violations should mention specific blocked URLs. If they're for legitimate resources, the CSP needs that domain added to the matching `*-src` directive.

Re-running the security audit afterwards should show:
- `ss -tlnp | grep 3000` → `127.0.0.1:3000` only
- `curl -sI https://animelegacy.org` → has CSP, Permissions-Policy, no Server header
- Hetzner Console → Firewalls → `animelegacy-prod-fw` applied to the server

---

## Status of items not covered here

| Issue | Status | Where to address |
|---|---|---|
| Rate-limit on `/api/*` | not done | App-side Express-style middleware in Next.js (separate session) |
| Sentry error tracking | not done | Item #5 in `improvements.md` |
| Uptime monitor | not done | Item #16 in `improvements.md` |
| Offsite backups | not done | Item #20 in `improvements.md` |
