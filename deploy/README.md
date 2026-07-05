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

### Recommended: GitHub Actions (build off-droplet)

Pushes to `main` run [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml), which builds on GitHub’s runners and rsyncs the standalone bundle to the droplet. **The droplet never runs `npm run build`**, which avoids OOM on 1 GB RAM.

#### One-time setup

1. **GitHub repository secrets** (Settings → Secrets and variables → Actions):

   | Secret | Value |
   |--------|-------|
   | `DROPLET_HOST` | Droplet public IP or hostname |
   | `DROPLET_USER` | SSH user (`root`, or a deploy user with write access to `/opt/bglib`) |
   | `DROPLET_SSH_KEY` | Private SSH key (full PEM, including `-----BEGIN…`) |
   | `DROPLET_SSH_HOST_KEY` | Pinned SSH host public key as a `known_hosts` line (see below) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Same as production `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as production `.env.local` |
   | `NEXT_PUBLIC_APP_URL` | e.g. `https://bglib.csst.rocks` |

   **Pin the droplet SSH host key** (do this once from a trusted network, not in CI):

   ```bash
   # From your laptop after you have logged into the droplet at least once via SSH:
   ssh-keyscan -H YOUR_DROPLET_HOST 2>/dev/null
   ```

   Copy the full line (starts with `|1|` for hashed hostnames, or with the hostname/IP) into the `DROPLET_SSH_HOST_KEY` secret. If the droplet exposes multiple host key types, paste one line per type. Verify the fingerprint out-of-band before saving:

   ```bash
   ssh-keygen -lf <(ssh-keyscan -H YOUR_DROPLET_HOST 2>/dev/null)
   # Compare with the server's /etc/ssh/ssh_host_*_key.pub fingerprints when SSH'd in:
   ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
   ```

   Re-run `ssh-keyscan` and update the secret if you rebuild the droplet or rotate SSH host keys.

2. **Droplet directories** (first deploy only — CI recreates `.next/standalone` each run):

   ```bash
   sudo mkdir -p /opt/bglib/.next/standalone /opt/bglib/scripts
   sudo chown -R bglib:bglib /opt/bglib
   ```

3. **Deploy user and sudo** — recommended: `DROPLET_USER=root` (simplest). If you use a non-root deploy user, allow passwordless deploy commands:

   ```bash
   # /etc/sudoers.d/bglib-deploy  (replace deployuser)
   deployuser ALL=(ALL) NOPASSWD: /bin/rm, /bin/mkdir, /bin/chown, /bin/chmod, /bin/systemctl restart bglib
   ```

   CI wipes `/opt/bglib/.next/standalone` before each rsync (files were owned by `bglib` from the running app — without this, rsync gets *Permission denied*).

4. **Runtime secrets stay on the droplet** in `/opt/bglib/.env.local` (`SUPABASE_SERVICE_ROLE_KEY`, `BGG_API_TOKEN`, `CRON_SECRET`, VAPID, etc.). CI only bakes in `NEXT_PUBLIC_*` vars at build time.

5. **Update systemd** after pulling this change (uses `start-production.sh` directly, no `npm` needed at runtime):

   ```bash
   sudo cp /opt/bglib/deploy/bglib.service /etc/systemd/system/bglib.service
   sudo systemctl daemon-reload
   sudo systemctl restart bglib
   ```

#### How it works

1. `npm ci` + `npm run build` on GitHub Actions
2. `scripts/prepare-standalone.sh` copies `public/` and `.next/static/` into the standalone output
3. SSH clears `/opt/bglib/.next/standalone`, rsyncs the new bundle, `chown`s back to `bglib`
4. `systemctl restart bglib`

Trigger a manual deploy: **Actions → Build and deploy → Run workflow**.

### Manual deploy (fallback)

If CI is not set up yet, build on the droplet (use 2 GB RAM or add swap if builds OOM):

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
| `curl` returns **000** | Nothing listening on port 3000 — see below |
| 502 Bad Gateway | `systemctl status bglib`, `journalctl -u bglib -n 50` |
| Auth loops / cookies fail | `NEXT_PUBLIC_APP_URL` must be `https://bglib.csst.rocks` (no trailing slash) |
| Push not working | VAPID keys set, `SUPABASE_SERVICE_ROLE_KEY` set, HTTPS works |
| Cron 401 | `CRON_SECRET` in env file matches the `Authorization` header |
| SSL error in browser | Origin cert installed, Cloudflare mode is Full (strict) |
| BGG search fails / HTML JSON error | Set `BGG_API_TOKEN` in `.env.local` ([register app](https://boardgamegeek.com/applications)), rebuild, restart |
| Barcode scan can't find game | Ensure `BGG_API_TOKEN` is set; search BGG manually after scan — the barcode is saved for next time. Optional: `GAMEUPC_API_TOKEN` for better auto-match |

### curl returns 000

`000` means **connection refused** — the app is not running on that port (not an HTTP error).

Run these **on the droplet** (SSH in first):

```bash
# 1. Are you in the app directory with a build?
cd /opt/bglib
ls -la .next/standalone/server.js   # must exist

# 2. Is anything on port 3000?
curl -v http://127.0.0.1:3000/    # use -v to see "Connection refused" vs HTTP response

# 3. Start manually in the foreground (watch for errors)
npm run start:prod
```

Leave that running in one SSH session. In a **second** SSH session:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
# Expect 200 (or 500 if Supabase keys are missing/wrong)
```

**Common causes of 000:**

| Cause | Fix |
|-------|-----|
| `npm run build` not run | `npm ci && npm run build` |
| `.env.local` missing Supabase keys | Copy `deploy/env.production.example` → `.env.local` and fill in URL + anon key |
| Server exited immediately | Run `npm run start:prod` in foreground — read the error |
| systemd service dead | `sudo systemctl status bglib` and `journalctl -u bglib -n 50` |
| curl from your laptop to droplet IP:3000 | Port 3000 is not public — test `127.0.0.1` **on the droplet**, or use `https://bglib.csst.rocks` after nginx is set up |

**systemd env file tip:** Values with spaces must be quoted, e.g. `EMAIL_FROM="BgLib <notifications@csst.rocks>"`. Unquoted angle brackets break `EnvironmentFile` parsing and the service won't start.

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

CI deploy workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
