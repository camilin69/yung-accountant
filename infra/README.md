# Infrastructure

Production deployment on Oracle Cloud free-tier Ubuntu VM.

## Server Access

- **Host**: Oracle Cloud VM (Ubuntu)
- **SSH Key**: `ssh-key-2026-05-26.key`
- **Nginx configs**: `/etc/nginx/sites-available/` → symlinked to `/etc/nginx/sites-enabled/`

## Architecture

```
Cloudflare (DDoS + WAF + Turnstile)
  └── Nginx (reverse proxy + SSL + security headers)
        ├── Frontend SPA (static files from /home/ubuntu/frontend/)
        ├── API Gateway (path-based routing to Docker containers :8081-:8089)
        └── Keycloak proxy → localhost:8080
```

## Domains

| Domain | Purpose | Proxied? |
|--------|---------|----------|
| `yung-accountant.com` | Frontend SPA + API Gateway | Yes (Cloudflare) |
| `keycloak.yung-accountant.com` | Keycloak admin/login | Yes (Cloudflare) |

## Docker Compose Stacks (start order)

```bash
# 1. Database
cd ~/database && docker compose up -d

# 2. Kafka
cd ~/kafka && docker compose up -d

# 3. Keycloak
cd ~/keycloak && docker compose up -d

# 4. Embedding service
cd ~/embedding-onnx && docker compose up -d

# 5. Backend microservices (9 services)
cd ~/backendcpp && docker compose up -d
```

## SSL Certificates

Let's Encrypt via certbot with Cloudflare DNS plugin:
```bash
sudo certbot --nginx -d yung-accountant.com -d keycloak.yung-accountant.com
sudo certbot renew --dry-run  # Test auto-renewal
```

## Cloudflare Setup Checklist

See `infra/nginx/` for version-controlled Nginx configuration files.

### Dashboard Configuration

1. [ ] DNS: Point nameservers to Cloudflare
2. [ ] DNS Records: A record → VM IP (orange-clouded / proxied)
3. [ ] SSL/TLS: Full (strict)
4. [ ] Turnstile: Create site, get Site Key + Secret Key
5. [ ] Bot Fight Mode: Enabled
6. [ ] WAF Rate Limiting Rules:
   - `/auth/login`: 10 req/min per IP
   - `/users/register`: 5 req/min per IP
   - `/auth/forgot-password`: 3 req/min per IP
7. [ ] Firewall Rule: Block non-Cloudflare traffic to origin
