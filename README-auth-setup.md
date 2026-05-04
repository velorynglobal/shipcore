# Authentication Setup Guide

## Quick Start for Testing

### 1. Configure Environment
Create/update `.env.local`:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=test-secret-key-change-in-production

# Test credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Login to Access Features
- Visit: http://localhost:3000/login
- Use credentials:
  - Email: test@example.com
  - Password: password123

### 4. Access Protected Pages
After login, you can access:
- http://localhost:3000/monitoring
- http://localhost:3000/marketplace
- http://localhost:3000/agent-dashboard
- http://localhost:3000/settings/invite

### 5. Test API Endpoints
After login, API endpoints will work:
```bash
curl http://localhost:3000/api/marketplace
curl http://localhost:3000/api/agent-logs?limit=10
```

## Production Setup

For production, configure your actual auth provider:
- NextAuth.js with database
- Clerk
- Auth0
- Or your preferred provider

See `src/app/api/auth/[...nextauth]/route.ts` for configuration template.
