# Deployment Guide

This document outlines how to deploy Lingofy to a production Ubuntu server using Docker, Nginx, and Gunicorn/Uvicorn.

## 1. Server Requirements

- **OS:** Ubuntu 22.04 LTS
- **RAM:** Minimum 4GB (8GB recommended for Postgres, Redis, and AI overhead)
- **CPU:** 2-4 vCores
- **Network:** Port 80 (HTTP), 443 (HTTPS), 22 (SSH) open.
- **Databases:** PostgreSQL (Primary DB), Redis (Caching & Rate Limiting)

## 2. Environment Variables (`.env`)

Before deploying, ensure you have a production `.env` file containing:
```env
# SECURITY
JWT_SECRET=generate_a_secure_random_string_here
ALLOWED_ORIGINS=https://lingofy.app

# API KEYS
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...

# DATABASE & CACHE
DATABASE_URL=postgresql://user:password@localhost/lingofy
REDIS_URL=redis://localhost:6379/0

# SPOTIFY OAUTH
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=https://api.lingofy.app/spotify/callback
```

## 3. Backend Deployment (FastAPI)

For production, FastAPI should be run via **Gunicorn** with **Uvicorn** workers to handle concurrent connections efficiently.

### Systemd Service Setup
Create `/etc/systemd/system/lingofy-api.service`:
```ini
[Unit]
Description=Lingofy FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/var/www/lingofy/backend
ExecStart=/var/www/lingofy/.venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
```
Start the service:
```bash
sudo systemctl enable lingofy-api
sudo systemctl start lingofy-api
```

## 4. Frontend Deployment (Next.js)

Next.js requires building the production bundle before serving.

```bash
cd /var/www/lingofy/frontend
npm install
npm run build
npm run start -- -p 3000
```
*(Alternatively, use PM2 to keep the Node process alive)*:
```bash
npm install -g pm2
pm2 start npm --name "lingofy-web" -- run start
```

## 5. Nginx Reverse Proxy & SSL

Nginx is used to route traffic and provide SSL termination via Let's Encrypt.

```nginx
server {
    server_name lingofy.app;

    location / {
        proxy_pass http://127.0.0.1:3000; # Next.js Frontend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    server_name api.lingofy.app;

    location / {
        proxy_pass http://127.0.0.1:8000; # FastAPI Backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable HTTPS:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d lingofy.app -d api.lingofy.app
```

## 6. Docker & Docker Compose (Alternative)

For containerized deployments, use `docker-compose.yml`:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: .env
    command: gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.lingofy.app
```
Deploy with: `docker-compose up -d --build`

## 7. Monitoring & Logs

- View Backend Logs: `journalctl -u lingofy-api -f`
- View Frontend Logs: `pm2 logs lingofy-web`
- Database Backups: Schedule a daily cron job to copy `backend/data/lingofy.db` to an S3 bucket.
