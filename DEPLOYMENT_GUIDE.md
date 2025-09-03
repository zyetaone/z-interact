# Z-Interact Deployment Guide

## Overview

This guide covers deploying Z-Interact to production environments with proper configuration, security, and performance optimizations.

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- SSL certificate (for HTTPS)
- Domain name
- Database storage (SQLite for simple deployments, PostgreSQL for scale)

## Quick Deployment Options

### Option 1: Vercel (Recommended for Simple Deployments)

#### 1. Connect Repository
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### 2. Environment Variables
Set these in Vercel dashboard or via CLI:
```bash
vercel env add OPENAI_API_KEY
vercel env add DATABASE_URL
vercel env add SESSION_SECRET
```

#### 3. Database Configuration
For Vercel, use a persistent database:
```bash
# Use Vercel Postgres or external PostgreSQL
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### Option 2: Docker Deployment

#### 1. Build Docker Image
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### 2. Build and Run
```bash
# Build image
docker build -t z-interact .

# Run container
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=your-key \
  -e DATABASE_URL=file:/app/data/db.sqlite \
  -e SESSION_SECRET=your-secret \
  z-interact
```

#### 3. Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  z-interact:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=file:/app/data/db.sqlite
      - SESSION_SECRET=${SESSION_SECRET}
    volumes:
      - ./data:/app/data
```

### Option 3: Traditional Server

#### 1. Production Build
```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Start production server
npm start
```

#### 2. Process Manager (PM2)
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'z-interact',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      SESSION_SECRET: process.env.SESSION_SECRET
    }
  }]
};

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Environment Configuration

### Required Environment Variables

```bash
# Production environment
NODE_ENV=production

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-actual-key-here

# Database Configuration
DATABASE_URL=file:./data/production.db
# Or for PostgreSQL:
# DATABASE_URL=postgresql://user:password@host:5432/database

# Session Security
SESSION_SECRET=your-256-bit-secret-here

# Optional: Analytics and Monitoring
SENTRY_DSN=your-sentry-dsn
ANALYTICS_ID=your-analytics-id
```

### Environment-Specific Configurations

#### Development
```bash
NODE_ENV=development
DATABASE_URL=file:./local.db
VITE_DEBUG=true
```

#### Staging
```bash
NODE_ENV=staging
DATABASE_URL=postgresql://user:pass@staging-db:5432/z_interact
SENTRY_ENVIRONMENT=staging
```

#### Production
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/z_interact
SENTRY_ENVIRONMENT=production
REDIS_URL=redis://prod-redis:6379
```

## Database Setup

### SQLite (Simple Deployment)
```bash
# Create data directory
mkdir -p data

# Initialize database
npm run db:generate
npm run db:push

# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp data/production.db "backups/db_$DATE.sqlite"
```

### PostgreSQL (Scalable Deployment)
```sql
-- Create database
CREATE DATABASE z_interact;

-- Create user
CREATE USER z_interact_user WITH PASSWORD 'secure-password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE z_interact TO z_interact_user;

-- Connection string
DATABASE_URL=postgresql://z_interact_user:secure-password@localhost:5432/z_interact
```

### Database Migration
```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:push

# Check migration status
npm run db:studio
```

## SSL/TLS Configuration

### Let's Encrypt (Free SSL)
```bash
# Install certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Configure Nginx to use SSL
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### CloudFlare (Managed SSL)
```bash
# Set SSL mode to Full (Strict)
# Configure DNS records
# Enable Always Use HTTPS
```

## Performance Optimization

### Build Optimizations
```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['svelte', 'svelte-kit'],
          ui: ['bits-ui', 'tailwindcss']
        }
      }
    }
  }
});
```

### Caching Strategy
```javascript
// Service Worker for caching
// Cache API responses and static assets
// Implement Redis for session storage
```

### CDN Configuration
```javascript
// Upload static assets to CDN
// Configure proper cache headers
// Use image optimization services
```

## Monitoring and Logging

### Application Monitoring
```typescript
// Sentry integration
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Performance Monitoring
```typescript
// Custom metrics
const metrics = {
  responseTime: measureResponseTime(),
  errorRate: calculateErrorRate(),
  activeUsers: getActiveUserCount(),
  imageGenerationTime: measureImageGenTime()
};
```

### Log Aggregation
```bash
# PM2 logging
pm2 logs z-interact

# Structured logging
import pino from 'pino';
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  }
});
```

## Security Hardening

### HTTPS Enforcement
```javascript
// svelte.config.js
export default {
  kit: {
    adapter: adapter(),
    csp: {
      directives: {
        'default-src': ['self'],
        'script-src': ['self', 'unsafe-inline'],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'data:', 'https:'],
      }
    }
  }
};
```

### Rate Limiting
```typescript
// API rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
```

### Security Headers
```javascript
// Additional security headers
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
```

## Backup and Recovery

### Automated Backups
```bash
#!/bin/bash
# Daily backup script
DATE=$(date +%Y%m%d)
BACKUP_DIR="/var/backups/z-interact"

# Database backup
sqlite3 /app/data/production.db ".backup '$BACKUP_DIR/db_$DATE.sqlite'"

# File backup
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" /app/uploads/

# Retention policy (keep last 30 days)
find $BACKUP_DIR -name "*.sqlite" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### Disaster Recovery
```bash
# Recovery procedure
1. Stop application
2. Restore database from backup
3. Restore uploaded files
4. Verify data integrity
5. Restart application
6. Test functionality
```

## Scaling Considerations

### Horizontal Scaling
```yaml
# Load balancer configuration
upstream z_interact {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://z_interact;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Database Scaling
```sql
-- Read replicas for better performance
-- Connection pooling
-- Query optimization
-- Indexing strategy
```

### CDN Integration
```javascript
// Image CDN configuration
// Static asset delivery
// Global distribution
// Cache invalidation
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database file permissions
ls -la data/production.db

# Verify database integrity
sqlite3 data/production.db "PRAGMA integrity_check;"

# Check database size
du -h data/production.db
```

#### Memory Issues
```bash
# Monitor memory usage
pm2 monit

# Check for memory leaks
pm2 logs z-interact --lines 100

# Restart if necessary
pm2 restart z-interact
```

#### Performance Issues
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000

# Monitor system resources
htop
df -h
free -h
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=z-interact:* npm start

# Verbose database logging
DATABASE_DEBUG=true npm start

# Performance profiling
NODE_ENV=production npm start -- --prof
```

## Maintenance Tasks

### Regular Maintenance
```bash
# Weekly tasks
- Check disk space
- Review error logs
- Update dependencies
- Backup verification

# Monthly tasks
- Security updates
- Performance optimization
- Database maintenance
- Log rotation
```

### Health Checks
```bash
# Application health
curl http://localhost:3000/api/health

# Database connectivity
curl http://localhost:3000/api/debug

# External service status
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

## Support and Monitoring

### Alert Configuration
```yaml
# Monitoring alerts
- High error rate (>5%)
- Slow response time (>2s)
- Database connection issues
- OpenAI API failures
- High memory usage (>80%)
```

### Support Contacts
- **Technical Issues**: DevOps team
- **API Issues**: Development team
- **Security Issues**: Security team
- **Performance Issues**: SRE team

---

## Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database initialized and migrated
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Backup strategy implemented

### Deployment
- [ ] Code deployed to production
- [ ] Database migrations applied
- [ ] Services restarted
- [ ] Health checks passing
- [ ] Monitoring enabled

### Post-Deployment
- [ ] Functional testing completed
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Documentation updated
- [ ] Team notified

---

*Deployment Guide Version: 1.0.0*
*Last Updated: September 2024*