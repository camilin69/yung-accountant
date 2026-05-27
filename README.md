# yung-accountant
Arquitectura de Software (Electiva II), proyecto para la gestión financiera personal.


## Backendcpp
Create shared network in docker:
`docker network create shared-network`
## Acceso a la máquina Oracle cloud 
```bash 
ssh -i ssh-key-2026-05-26.key ubuntu@ip 
```
## Domain API creation
### Keycloak
* En Virtual Cloud Networks, security list,s ecurity rules, crear las reglas para puerto 8080 (KEYCLOAK), 80 (HTTP), 443 (HTTPS).
* Crear un dominio en www.duckdns.org (yung-accountant-keycloak), verificar que se propagó.
`nslookup yung-accountant-keycloak.duckdns.org`
* Obtener certificado ssl
```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d yung-accountant-keycloak.duckdns.org --non-interactive --agree-tos --email camilomerchan107@gmail.com
sudo systemctl start nginx
```
* Actualizar Nginx
`sudo nano /etc/nginx/sites-available/keycloak`

```nginx
server {
    listen 443 ssl http2;
    server_name yung-accountant-keycloak.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/yung-accountant-keycloak.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yung-accountant-keycloak.duckdns.org/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Port 443;
    }
}
```

* Actualizar la variable de entorno en servicio de keycloak.
```yaml
KC_HOSTNAME: yung-accountant-keycloak.duckdns.org
```

* Reiniciar todo:
```bash
sudo systemctl reload nginx
cd ~/yung-accountant/keycloak
docker compose down
docker compose up -d
```

### Backend
* Crear un dominio en www.duckdns.org (yung-accountant-back), verificar que se propagó.
`nslookup yung-accountant-back.duckdns.org`
* Obtener certificado
```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d yung-accountant-back.duckdns.org --non-interactive --agree-tos --email camilomerchan107@gmail.com
sudo systemctl start nginx
```

* Configuración de la api gateway
```bash
sudo nano /etc/nginx/sites-available/api
```
```nginx
server {
    listen 443 ssl http2;
    server_name yung-accountant-back.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/yung-accountant-back.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yung-accountant-back.duckdns.org/privkey.pem;

    # Auth Service
    location /auth/ {
        proxy_pass http://localhost:8081/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Users endpoints
    location /users/ {
        proxy_pass http://localhost:8081/users/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Community Service
    location /community/ {
        proxy_pass http://localhost:8089/community/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Categories
    location /categories/ {
        proxy_pass http://localhost:8082/categories/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Debts
    location /debts/ {
        proxy_pass http://localhost:8083/debts/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Goals
    location /goals/ {
        proxy_pass http://localhost:8084/goals/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Habits
    location /habits/ {
        proxy_pass http://localhost:8085/habits/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Wallets
    location /wallets/ {
        proxy_pass http://localhost:8086/wallets/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Transactions
    location /transactions/ {
        proxy_pass http://localhost:8087/transactions/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Simulations
    location /simulations/ {
        proxy_pass http://localhost:8088/simulations/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Health
    location /health {
        proxy_pass http://localhost:8081/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```
* Activar el nginx
```bash
sudo ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

* Subir build al servidor
`scp -i ssh-key-2026-05-26.key -r dist/* ubuntu@ip:~/frontend/`

* Ceritificado 
```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d yung-accountant.duckdns.org --non-interactive --agree-tos --email camilomerchan107@gmail.com
sudo systemctl start nginx
```
* Configurar nginx
```bash
sudo tee /etc/nginx/sites-available/frontend > /dev/null << 'EOF'
server {
    listen 443 ssl http2;
    server_name yung-accountant.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/yung-accountant.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yung-accountant.duckdns.org/privkey.pem;

    root /home/ubuntu/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/frontend /etc/nginx/sites-enabled/frontend
sudo nginx -t
sudo systemctl reload nginx
```

* Dar permisos
```bash
chmod 755 /home/ubuntu
chmod -R 755 /home/ubuntu/frontend
sudo systemctl reload nginx
```

### Volver a subir a producción
1. Reconstruir el frontend
npm run build

2. Subir al servidor
scp -i ssh-key-2026-05-26.key -r dist/* ubuntu@ip:~/frontend/

3. Conectarse al servidor
ssh -i ssh-key-2026-05-26.key ubuntu@ip

4. Asegurar permisos
chmod -R 755 /home/ubuntu/frontend

5. Recargar Nginx
sudo systemctl reload nginx