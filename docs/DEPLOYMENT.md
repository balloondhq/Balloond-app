# Deployment Guide - Balloon'd

## Prerequisites
- Node.js 20+
- PostgreSQL 16+ with PostGIS
- Redis (optional, for caching)
- AWS S3 account (for media storage)
- Render account (for backend hosting)
- Expo account (for mobile app deployment)

## Backend Deployment (Render)

### 1. Database Setup (Render PostgreSQL)

1. Create a new PostgreSQL database on Render
2. Enable PostGIS extension:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

3. Run migrations:
```bash
psql -h <host> -U <user> -d <database> -f database/001_initial_migration.sql
```

### 2. Backend Service Setup

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure build settings:
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm run start:prod`

4. Set environment variables:
```
DATABASE_URL=postgresql://user:password@host:5432/balloond
JWT_SECRET=your-secure-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=balloond-media
CORS_ORIGIN=https://your-frontend-url.com
NODE_ENV=production
PORT=3000
```

5. Deploy the service

### 3. Configure Custom Domain (Optional)
1. Add custom domain in Render settings
2. Update DNS records with your domain provider
3. Enable SSL certificate

## Frontend Deployment (Expo/EAS)

### 1. Configure Expo Account

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure project
cd frontend
eas build:configure
```

### 2. Update Configuration

Edit `frontend/eas.json`:
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "ios": {
        "buildNumber": "1.0.0"
      },
      "android": {
        "versionCode": 1
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 3. Update API URLs

In `frontend/src/config/api.ts`, update production URLs:
```typescript
production: {
  API_URL: 'https://api.balloond.com/api',
  WS_URL: 'wss://api.balloond.com',
}
```

### 4. Build for iOS

```bash
# Development build
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production
```

### 5. Build for Android

```bash
# Development build
eas build --platform android --profile development

# Production build
eas build --platform android --profile production
```

### 6. Submit to App Stores

For iOS App Store:
```bash
eas submit --platform ios
```

For Google Play Store:
```bash
eas submit --platform android
```

## AWS S3 Setup (Media Storage)

### 1. Create S3 Bucket

1. Go to AWS S3 Console
2. Create bucket named `balloond-media`
3. Configure bucket settings:
   - Block all public access: OFF (for public media)
   - Enable versioning: Optional
   - Enable encryption: Recommended

### 2. Configure CORS

Add CORS configuration to bucket:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 3. Create IAM User

1. Create new IAM user for app access
2. Attach policy with S3 permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::balloond-media/*"
    }
  ]
}
```

## Monitoring & Maintenance

### 1. Setup Monitoring

- Use Render's built-in metrics
- Configure Sentry for error tracking:
```bash
npm install @sentry/node @sentry/react-native
```

### 2. Database Backups

- Enable automatic backups in Render PostgreSQL
- Schedule manual backups:
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### 3. Log Management

- Use Render's log streams
- Consider integrating with LogDNA or DataDog

## SSL/TLS Configuration

1. Render provides automatic SSL certificates
2. Ensure all API calls use HTTPS
3. Configure SSL for PostgreSQL connections

## Performance Optimization

### 1. Database Indexes
Ensure these indexes are created:
- Location queries: `idx_users_location`
- User lookups: `idx_users_email`
- Match queries: `idx_matches_user_id`

### 2. Caching Strategy
- Implement Redis for session management
- Cache frequently accessed data
- Use CDN for static assets

### 3. Image Optimization
- Compress images before S3 upload
- Generate thumbnails for list views
- Use WebP format when possible

## Security Checklist

- [ ] Strong JWT secrets
- [ ] HTTPS everywhere
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using Prisma)
- [ ] XSS protection headers
- [ ] CORS properly configured
- [ ] Secrets not in code repository
- [ ] Regular security updates

## Rollback Procedure

1. Keep previous build artifacts
2. Database migration rollback scripts
3. Quick revert process:
```bash
# Revert to previous version on Render
render deploy --service balloond-api --image previous-version

# Rollback database if needed
psql $DATABASE_URL -f rollback_script.sql
```

## Support & Troubleshooting

Common issues and solutions:

### PostGIS not working
```sql
-- Check if PostGIS is installed
SELECT PostGIS_Version();

-- Re-enable if needed
CREATE EXTENSION IF NOT EXISTS postgis;
```

### High memory usage
- Check for memory leaks
- Increase Render instance size
- Implement connection pooling

### Slow location queries
- Ensure spatial indexes exist
- Optimize query radius
- Consider geohashing for better performance
