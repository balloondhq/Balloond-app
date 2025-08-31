# Production-Ready Serverless Architecture for Balloon'd

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│   Next.js   │────▶│  Vercel Edge │────▶│ Supabase  │
│   Frontend  │     │   Functions  │     │ PostgreSQL│
└─────────────┘     └──────────────┘     └───────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│ Cloudflare  │     │   Upstash    │     │Cloudflare │
│     CDN     │     │    Redis     │     │    R2     │
└─────────────┘     └──────────────┘     └───────────┘
```

## Cost Breakdown

### Starting Costs (0-10K users/month)
- **Vercel**: Free (100GB bandwidth)
- **Supabase**: Free (500MB database, 1GB storage)
- **Cloudflare**: Free (unlimited bandwidth)
- **Upstash Redis**: Free (10K commands/day)
- **Total**: $0/month

### Growth Costs (10K-100K users/month)
- **Vercel Pro**: $20/month
- **Supabase Pro**: $25/month
- **Cloudflare R2**: ~$5/month
- **Upstash Redis**: ~$10/month
- **Total**: ~$60/month

### Scale Costs (100K-1M users/month)
- **Vercel Enterprise**: $150/month
- **Supabase Scale**: $200/month
- **Infrastructure**: ~$300/month
- **Total**: ~$650/month

## Implementation Guide

### Step 1: Setup Project Structure

```
balloond/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # API routes
├── packages/
│   ├── database/     # Prisma + Supabase
│   ├── shared/       # Shared types
│   └── utils/        # Shared utilities
└── infrastructure/
    └── scripts/      # Deployment scripts
```

### Step 2: Install Dependencies

```bash
# Create monorepo
npx create-turbo@latest balloond

# Add core dependencies
npm install @supabase/supabase-js @upstash/redis @vercel/edge
npm install -D @types/node prisma typescript
```

### Step 3: Database Setup (Supabase)

```typescript
// packages/database/client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Step 4: Serverless API Routes

```typescript
// apps/api/auth/register.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/packages/database'
import bcrypt from 'bcryptjs'

export const runtime = 'edge' // Use Edge Runtime for better performance

export async function POST(request: NextRequest) {
  const { email, password, name, age } = await request.json()
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)
  
  // Create user
  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      password: hashedPassword,
      name,
      age,
    })
    .select()
    .single()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  
  // Generate JWT
  const token = await generateJWT(data.id)
  
  return NextResponse.json({ token, user: data })
}
```

### Step 5: Caching Layer (Upstash Redis)

```typescript
// packages/cache/redis.ts
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Usage
export async function getCachedUser(userId: string) {
  const cached = await redis.get(`user:${userId}`)
  if (cached) return cached
  
  const user = await supabase
    .from('users')
    .select()
    .eq('id', userId)
    .single()
  
  await redis.set(`user:${userId}`, user.data, { ex: 3600 })
  return user.data
}
```

### Step 6: File Storage (Cloudflare R2)

```typescript
// packages/storage/r2.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function uploadImage(file: File, userId: string) {
  const buffer = await file.arrayBuffer()
  const key = `users/${userId}/${Date.now()}-${file.name}`
  
  await R2.send(new PutObjectCommand({
    Bucket: 'balloond-images',
    Key: key,
    Body: Buffer.from(buffer),
    ContentType: file.type,
  }))
  
  return `https://cdn.balloond.app/${key}`
}
```

### Step 7: Real-time Chat (Supabase Realtime)

```typescript
// apps/web/hooks/useChat.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/packages/database'

export function useChat(chatId: string) {
  const [messages, setMessages] = useState([])
  
  useEffect(() => {
    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId])
  
  return messages
}
```

### Step 8: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add UPSTASH_REDIS_REST_URL
vercel env add R2_ENDPOINT
```

## Scaling Strategy

### Month 1-3: Launch
- Use free tiers exclusively
- Monitor usage patterns
- Gather user feedback

### Month 4-6: Optimize
- Upgrade to paid tiers as needed
- Add caching strategically
- Optimize database queries

### Month 7-12: Scale
- Move heavy workloads to background jobs
- Implement horizontal scaling
- Add read replicas if needed

### Year 2: Enterprise
- Migrate to AWS/GCP for full control
- Implement microservices
- Global distribution

## Migration Path

When ready to scale beyond serverless:

```bash
# Export from Supabase
pg_dump $SUPABASE_URL > backup.sql

# Import to AWS RDS
psql $RDS_URL < backup.sql

# Update connection strings
vercel env rm SUPABASE_URL
vercel env add DATABASE_URL $RDS_URL
```

## Monitoring & Analytics

```typescript
// Free tier monitoring setup
import * as Sentry from "@sentry/nextjs"
import { Analytics } from '@vercel/analytics/react'

// Error tracking
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})

// Performance monitoring
export function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
```

## Why This Architecture Wins

1. **Zero to Hero**: Start free, scale infinitely
2. **No DevOps**: Everything is managed
3. **Global Performance**: Edge functions + CDN
4. **Developer Experience**: Modern stack, easy debugging
5. **Cost Efficient**: Only pay for actual usage

## Get Started Now

```bash
# Clone the template
git clone https://github.com/vercel/next.js-subscription-starter

# Install dependencies
npm install

# Setup Supabase
npx supabase init
npx supabase start

# Deploy
vercel
```

Your app will be live in 10 minutes, cost $0 to start, and scale to millions of users.
