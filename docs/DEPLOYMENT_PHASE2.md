# Balloon'd Phase 2 - Deployment Guide

## 📋 Prerequisites

- Docker & Docker Compose
- AWS Account (S3, optional CloudFront)
- Firebase Project (Push Notifications)
- Stripe Account (Payments)
- Google Cloud Account (Vision API)
- Domain with SSL certificate
- PostgreSQL 14+ (if not using Docker)
- Redis 6+ (if not using Docker)

## 🚀 Quick Deploy with Docker

### 1. Environment Setup

Create `.env.production` file:

```bash
# Database
DB_PASSWORD=your_secure_password

# Security
JWT_SECRET=your_very_long_random_string

# AWS
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=balloond-production
AWS_REGION=us-east-1

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Stripe
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
STRIPE_PRICE_ID_GOLD=price_gold_id
STRIPE_PRICE_ID_GLOWING=price_glowing_id

# Google Vision
GOOGLE_VISION_API_KEY=your_api_key
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/google-service-account.json

# Monitoring
GRAFANA_PASSWORD=secure_password
```

### 2. Deploy with Docker Compose

```bash
# Production deployment
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f backend

# Scale workers
docker-compose -f docker-compose.production.yml up -d --scale worker=3
```

### 3. Database Migrations

```bash
# Run migrations
docker exec balloond_backend npx prisma migrate deploy

# Seed initial data (optional)
docker exec balloond_backend npx prisma db seed
```

## 🌐 Manual Deployment (AWS EC2/ECS)

### 1. Server Setup (Ubuntu 22.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Redis
sudo apt install redis-server -y

# Install Nginx
sudo apt install nginx -y

# Install PM2
sudo npm install -g pm2
```

### 2. Database Setup

```bash
# Create database
sudo -u postgres psql
CREATE DATABASE balloond;
CREATE USER balloond_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE balloond TO balloond_user;
\q

# Run migrations
cd /var/www/balloond/backend
npx prisma migrate deploy
```

### 3. Backend Deployment

```bash
# Clone repository
cd /var/www
git clone https://github.com/your-org/balloond.git
cd balloond/backend

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Setup PM2
pm2 start dist/main.js --name "balloond-api" -i max
pm2 start dist/worker.js --name "balloond-worker" -i 2
pm2 save
pm2 startup systemd
```

### 4. Nginx Configuration

Create `/etc/nginx/sites-available/balloond`:

```nginx
upstream backend {
    least_conn;
    server 127.0.0.1:3000;
}

upstream websocket {
    ip_hash;
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name api.balloond.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.balloond.com;

    ssl_certificate /etc/ssl/certs/balloond.crt;
    ssl_certificate_key /etc/ssl/private/balloond.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # API endpoints
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # WebSocket endpoint
    location /socket.io/ {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeout
        proxy_read_timeout 86400;
    }

    # Voice message uploads
    location /uploads/voice/ {
        proxy_pass https://balloond-production.s3.amazonaws.com/voice-messages/;
        proxy_set_header Host balloond-production.s3.amazonaws.com;
        proxy_cache voice_cache;
        proxy_cache_valid 200 7d;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://backend/health;
    }
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=upload:10m rate=1r/s;

# Cache zones
proxy_cache_path /var/cache/nginx/voice levels=1:2 keys_zone=voice_cache:10m max_size=1g inactive=7d;
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/balloond /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 📱 Mobile App Deployment

### iOS (App Store)

1. **Configure Push Notifications**
   ```bash
   # Upload APNs certificate to Firebase Console
   # Enable Push Notifications capability in Xcode
   ```

2. **Build for Production**
   ```bash
   cd frontend
   eas build --platform ios --profile production
   ```

3. **Submit to App Store**
   ```bash
   eas submit --platform ios
   ```

### Android (Google Play)

1. **Configure FCM**
   ```bash
   # Add google-services.json to android/app/
   # Verify SHA certificates in Firebase Console
   ```

2. **Build for Production**
   ```bash
   cd frontend
   eas build --platform android --profile production
   ```

3. **Submit to Google Play**
   ```bash
   eas submit --platform android
   ```

## 🔧 Environment-Specific Configurations

### Production

```javascript
// backend/src/config/production.ts
export const productionConfig = {
  cors: {
    origin: ['https://app.balloond.com', 'https://balloond.com'],
    credentials: true,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 6,
  },
  subscription: {
    gracePeriodDays: 3,
    retriesBeforeSuspension: 3,
  },
};
```

### Staging

```javascript
// backend/src/config/staging.ts
export const stagingConfig = {
  cors: {
    origin: ['https://staging.balloond.com'],
    credentials: true,
  },
  stripe: {
    testMode: true,
  },
  moderation: {
    autoApprove: false, // Manual review for all content
  },
};
```

## 📊 Monitoring & Logging

### Prometheus Metrics

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'balloond-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'
  
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Grafana Dashboard

Import dashboard from `monitoring/grafana/dashboards/balloond.json`

Key metrics:
- API response times
- Voice message uploads/hour
- Subscription conversions
- Active WebSocket connections
- Push notification delivery rate
- Moderation queue size

### Logging

```bash
# View logs
pm2 logs balloond-api

# Setup log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
```

## 🔐 Security Checklist

- [ ] SSL certificates installed and auto-renewing (Let's Encrypt)
- [ ] Database credentials secured in environment variables
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] File upload validation (type, size, content scanning)
- [ ] JWT secrets rotated regularly
- [ ] Database backups automated
- [ ] Security headers configured
- [ ] DDoS protection enabled (CloudFlare)
- [ ] Secrets management (AWS Secrets Manager / Vault)
- [ ] Audit logging enabled
- [ ] Vulnerability scanning (npm audit, Snyk)

## 🚨 Troubleshooting

### Voice Messages Not Uploading
```bash
# Check S3 permissions
aws s3 ls s3://balloond-production/voice-messages/

# Check upload directory permissions
ls -la /app/uploads/

# Check worker logs
pm2 logs balloond-worker
```

### Push Notifications Not Working
```bash
# Verify Firebase credentials
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"TEST_TOKEN","notification":{"title":"Test","body":"Test"}}'

# Check push token registration
docker exec balloond_backend npm run console
> await prisma.pushToken.count()
```

### Subscription Webhooks Failing
```bash
# Test Stripe webhook
stripe listen --forward-to localhost:3000/webhooks/stripe

# Verify webhook secret
stripe webhook_endpoints list
```

### High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart with memory limit
pm2 delete balloond-api
pm2 start dist/main.js --name "balloond-api" --max-memory-restart 1G
```

## 📈 Performance Optimization

### CDN Configuration (CloudFront)
```json
{
  "Origins": [{
    "DomainName": "balloond-production.s3.amazonaws.com",
    "S3OriginConfig": {
      "OriginAccessIdentity": "origin-access-identity/cloudfront/ABCDEFG"
    }
  }],
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-balloond-production",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89e-4fdb-8f00-afbe1e772bf5",
    "Compress": true
  }
}
```

### Database Optimization
```sql
-- Create indexes for common queries
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at DESC);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier) WHERE subscription_tier != 'FREE';
CREATE INDEX idx_reports_status ON reports(status) WHERE status = 'PENDING';

-- Vacuum and analyze
VACUUM ANALYZE;
```

### Redis Caching
```javascript
// Cache subscription status
await redis.setex(`subscription:${userId}`, 3600, JSON.stringify(subscription));

// Cache moderation results
await redis.setex(`moderation:${imageHash}`, 86400, JSON.stringify(result));
```

## 🔄 Zero-Downtime Deployment

```bash
#!/bin/bash
# deploy.sh

# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Migrate database
npx prisma migrate deploy

# Reload PM2 with zero-downtime
pm2 reload balloond-api
pm2 reload balloond-worker

# Clear CDN cache
aws cloudfront create-invalidation --distribution-id ABCD123 --paths "/*"

echo "Deployment complete!"
```

## 📝 Post-Deployment Checklist

- [ ] Health check passing (`curl https://api.balloond.com/health`)
- [ ] WebSocket connections working
- [ ] Voice message upload/playback tested
- [ ] Push notifications delivering
- [ ] Subscription checkout flow working
- [ ] Moderation pipeline active
- [ ] Monitoring dashboards updating
- [ ] Error rates normal
- [ ] Response times acceptable
- [ ] Database connections stable

## 🆘 Emergency Rollback

```bash
# Rollback to previous version
pm2 stop all
git checkout HEAD~1
npm ci --only=production
npm run build
npx prisma migrate deploy
pm2 start all

# Rollback database migration
npx prisma migrate resolve --rolled-back
```

## 📞 Support Contacts

- **DevOps**: devops@balloond.com
- **On-call**: +1-XXX-XXX-XXXX
- **Escalation**: CTO / VP Engineering

---

**Remember**: Always test in staging before production deployment! 🚀
