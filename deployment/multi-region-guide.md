# Multi-Region Deployment Guide

## Overview
ShipCore Pro is currently deployed on Vercel (frontend) and Supabase (backend). This guide outlines the steps to expand to multiple regions for reduced latency and improved reliability.

## Step 1: Supabase Multi-Region

### Option A: Supabase Enterprise (Recommended)
- Contact Supabase Sales: https://supabase.com/contact
- Request multi-region setup (e.g., US + EU + Asia)
- Data replication between regions
- Automatic failover

### Option B: Manual Multi-Project Setup (Current)
1. **Create additional Supabase projects**:
   - US: `shipcore-us`
   - EU: `shipcore-eu`
   - Asia: `shipcore-asia`

2. **Run schema in each project**:
   ```bash
   # For each project
   supabase link --project-ref <PROJECT_ID>
   supabase db push
   ```

3. **Update environment variables** in Vercel:
   ```bash
   # US Region
   SUPABASE_URL_US=https://xyz.supabase.co
   
   # EU Region  
   SUPABASE_URL_EU=https://abc.supabase.co
   
   # Asia Region
   SUPABASE_URL_ASIA=https://def.supabase.co
   ```

4. **Update `src/lib/supabase-server.ts`** to route by region:
   ```typescript
   const region = process.env.VERCEL_REGION || 'us';
   
   const supabaseUrls = {
     us: process.env.SUPABASE_URL_US!,
     eu: process.env.SUPABASE_URL_EU!,
     asia: process.env.SUPABASE_URL_ASIA!,
   };
   
   export function createServerSupabaseClient() {
     const url = supabaseUrls[region] || supabaseUrls.us;
     // ... rest of the function
   }
   ```

## Step 2: Vercel Multi-Region

### Enable Multi-Region in Vercel
1. **Go to Vercel Dashboard** → Settings → Deployment
2. **Enable "Edge Functions"** for global distribution
3. **Configure regions** in `vercel.json`:
   ```json
   {
     "regions": ["iad1", "sfo1", "cdg1"],
     "env": {
       "NEXT_PUBLIC_APP_URL": "https://shipcore.vercel.app",
       "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url"
     }
   }
   ```

### Deploy to multiple regions
```bash
# Deploy to US
vercel --prod --regions iad1

# Deploy to EU
vercel --prod --regions cdg1

# Deploy to Asia
vercel --prod --regions nrt1
```

## Step 3: Update CORS for Multi-Region

Update `next.config.js` to allow all region URLs:
```javascript
const allowedOrigins = [
  'https://shipcore.vercel.app',
  'https://shipcore-us.vercel.app',
  'https://shipcore-eu.vercel.app',
  'https://shipcore-asia.vercel.app',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean);

module.exports = {
  // ... other config
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowedOrigins.join(',') },
          // ... other headers
        ],
      },
    ];
  },
};
```

## Step 4: DNS & Load Balancing

1. **Use Vercel's automatic edge network** (recommended)
2. **Or set up Cloudflare Load Balancing**:
   - Create a Load Balancer
   - Add Vercel deployments as origins
   - Route traffic by geo-location

## Step 5: Database Replication

For Supabase multi-region (Enterprise):
- Automatic read replicas
- Cross-region replication
- Point `SUPABASE_URL` to the nearest region

For manual setup:
- Use Supabase read replicas
- Update connection strings in Vercel env vars

## Verification Checklist
- [ ] Multiple Supabase projects created
- [ ] Schema applied to all projects
- [ ] Vercel multi-region enabled
- [ ] CORS updated for all regions
- [ ] DNS/Load balancer configured
- [ ] Test from different geo-locations

## Estimated Time
- **Enterprise**: 1-2 weeks (with Supabase support)
- **Manual Setup**: 4-6 weeks (multiple projects, manual replication)

## Next Steps
After multi-region is live:
1. Monitor latency per region
2. Set up regional failover
3. Optimize database queries for read replicas
4. Consider edge caching (Redis/Vercel KV)
