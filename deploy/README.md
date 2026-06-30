# Deploy BgLib on DigitalOcean + Cloudflare

This guide walks through hosting BgLib on an Ubuntu droplet at **`https://bglib.csst.rocks`** (or any subdomain of `csst.rocks`) with Cloudflare in front for DNS, HTTPS, and caching.

Supabase still hosts your database and auth — the droplet only runs the Next.js app.

## Overview

```
Users → Cloudflare (DNS + HTTPS) → DigitalOcean droplet (nginx) → Next.js :3000 → Supabase
```

| Piece | Where |
|-------|-------|
| App (Next.js) | DigitalOcean droplet |
| Database + auth | Supabase (cloud) |
| Domain DNS + edge HTTPS | Cloudflare |
| Origin HTTPS | Cloudflare Origin Certificate on nginx |

---

## 1. Supabase (if not done yet)

1. Create a project at [supabase.com](https://supabase.com)
2. Run [`supabase/install.sql`](../supabase/install.sql) in the SQL Editor
3. Enable **Realtime** for: `games`, `loans`, `game_night_rsvps`, `plays`, `want_to_play`
4. Copy **Project URL**, **anon key**, and **service role key**

---

## 2. Create a DigitalOcean droplet

1. [Create a droplet](https://cloud.digitalocean.com/droplets/new)
   - **Image:** Ubuntu 24.04 LTS
   - **Size:** Basic $6/mo (1 GB RAM) is enough to start; use 2 GB if you expect heavy traffic
   - **Authentication:** SSH key (recommended)
2. Note the droplet **public IPv4 address**
3. Optional: add a firewall allowing **22** (SSH), **80**, and **443** from anywhere

---

## 3. Cloudflare DNS

In the [Cloudflare dashboard](https://dash.cloudflare.com) for **csst.rocks**:

1. **DNS → Records → Add record**
   - **Type:** `A`
   - **Name:** `bglib` (full hostname: `bglib.csst.rocks`)
   - **IPv4:** your droplet IP
   - **Proxy status:** Proxied (orange cloud) — required for free edge HTTPS and DDoS protection

2. **SSL/TLS → Overview**
   - Set encryption mode to **Full (strict)** (after origin cert is installed in step 6)

3. **SSL/TLS → Origin Server → Create Certificate**
   - Hostnames: `bglib.csst.rocks` (add `*.csst.rocks` if you want wildcard)
   - Validity: 15 years
   - Save the **Origin Certificate** and **Private Key** — you will copy these to the droplet

> **Why Origin Certificate?** With Cloudflare proxying traffic, Let's Encrypt HTTP validation can be awkward. A Cloudflare Origin Certificate is the simplest path: browsers see Cloudflare's cert; nginx uses the origin cert between Cloudflare and your server.

---

## 4. Prepare the droplet

SSH in as root (replace with your IP):

```bash
ssh root@YOUR_DROPLET_IP
```

### Install Node.js 20, nginx, git

```bash
apt update && apt upgrade -y
apt install -y curl git nginx ufw

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

node -v   # v20.x
npm -v
```

### Create app user and directory

```bash
useradd --system --create-home --home-dir /opt/bglib --shell /bin/bash bglib
mkdir -p /opt/bglib
chown bglib:bglib /opt/bglib
```

### Firewall (optional but recommended)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## 5. Deploy the app

As the `bglib` user:

```bash
sudo -u bglib -i
cd /opt/bglib

# Clone (or pull updates later)
git clone https://github.com/Csstform/BgLib.git .
git checkout cursor/board-game-library-0e2a   # or main after merge

npm ci
```

### Environment file

```bash
cp deploy/env.production.example .env.local
nano .env.local
```

Set at minimum:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `NEXT_PUBLIC_APP_URL` | `https://bglib.csst.rocks` |
| `CRON_SECRET` | Long random string (`openssl rand -hex 32`) |

Add VAPID keys for push (`npx web-push generate-vapid-keys` run locally) and Resend keys if you want email.

```bash
chmod 600 .env.local
```

### Build and smoke-test

```bash
npm run build
npm run start:prod
```

In another SSH session, verify the app responds:

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/
# Expect 200
```

Stop the test server (`Ctrl+C`), then install systemd.

---

## 6. systemd service

As root:

```bash
cp /opt/bglib/deploy/bglib.service /etc/systemd/system/bglib.service
systemctl daemon-reload
systemctl enable --now bglib
systemctl status bglib
```

Logs: `journalctl -u bglib -f`

---

## 7. nginx + Cloudflare Origin Certificate

As root:

```bash
mkdir -p /etc/ssl/cloudflare
nano /etc/ssl/cloudflare/bglib.csst.rocks.pem    # paste Origin Certificate
nano /etc/ssl/cloudflare/bglib.csst.rocks.key    # paste Private Key
chmod 600 /etc/ssl/cloudflare/bglib.csst.rocks.key
```

Install site config (edit `server_name` and cert paths if you used a different subdomain):

```bash
cp /opt/bglib/deploy/nginx-bglib.conf /etc/nginx/sites-available/bglib
ln -sf /etc/nginx/sites-available/bglib /etc/nginx/sites-enabled/bglib
rm -f /etc/nginx/sites-enabled/default   # optional: remove default site
nginx -t
systemctl reload nginx
```

In Cloudflare, confirm **SSL/TLS → Full (strict)**.

Open **https://bglib.csst.rocks** in a browser — you should see BgLib.

---

## 8. Loan reminder cron

On Vercel, `vercel.json` runs the cron. On a droplet, use systemd timers:

```bash
cp /opt/bglib/deploy/bglib-cron.service /etc/systemd/system/
cp /opt/bglib/deploy/bglib-cron.timer /etc/systemd/system/

# Edit the URL in bglib-cron.service if your subdomain differs
nano /etc/systemd/system/bglib-cron.service

systemctl daemon-reload
systemctl enable --now bglib-cron.timer
systemctl list-timers | grep bglib
```

Test manually:

```bash
source /opt/bglib/.env.local
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://bglib.csst.rocks/api/cron/loan-reminders"
```

---

## 9. PWA and push on mobile

1. Visit `https://bglib.csst.rocks` on your phone
2. **iOS (Safari):** Share → Add to Home Screen
3. **Android (Chrome):** Install app / Add to Home Screen
4. In the app: **More → Profile & Settings → Game night notifications → On**

Push requires HTTPS (Cloudflare provides this) and VAPID keys in `.env.local`.

---

## 10. Deploying updates

```bash
sudo -u bglib -i
cd /opt/bglib
git pull
npm ci
npm run build
exit

sudo systemctl restart bglib
```

---

## Cloudflare tips

| Setting | Recommendation |
|---------|----------------|
| SSL/TLS mode | **Full (strict)** |
| Always Use HTTPS | On |
| Automatic HTTPS Rewrites | On |
| Brotli | On |
| Caching | Default is fine; Next.js pages are dynamic (`ƒ` routes) |

If you see redirect loops, check that nginx listens on 443 with a valid origin cert and Cloudflare SSL mode is not "Flexible".

### Optional: restrict origin to Cloudflare only

To block direct access to the droplet IP (bypassing Cloudflare), allow nginx only from [Cloudflare IP ranges](https://www.cloudflare.com/ips/). This is advanced — skip until the basic setup works.

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| 502 Bad Gateway | `systemctl status bglib`, `journalctl -u bglib -n 50` |
| Auth loops / cookies fail | `NEXT_PUBLIC_APP_URL` must be `https://bglib.csst.rocks` (no trailing slash) |
| Push not working | VAPID keys set, `SUPABASE_SERVICE_ROLE_KEY` set, HTTPS works |
| Cron 401 | `CRON_SECRET` in `.env.local` matches the `Authorization` header |
| SSL error in browser | Origin cert installed, Cloudflare mode is Full (strict) |

---

## Alternative subdomain names

Any subdomain works — e.g. `games.csst.rocks`, `boardgames.csst.rocks`. Update:

- Cloudflare DNS A record
- Origin certificate hostnames
- `deploy/nginx-bglib.conf` → `server_name`
- `NEXT_PUBLIC_APP_URL` in `.env.local`
- `deploy/bglib-cron.service` URL

---

## Files in this folder

| File | Purpose |
|------|---------|
| `env.production.example` | Production env template |
| `nginx-bglib.conf` | nginx reverse proxy |
| `bglib.service` | systemd app service |
| `bglib-cron.service` / `.timer` | Daily loan reminders |
| `README.md` | This guide |
