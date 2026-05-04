# 🚀 Quick Auth Test Setup

## Step 1: Configure Environment
Run this in PowerShell:
```powershell
# Create/update .env.local with test credentials
@"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=test-secret-key-change-in-production
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
"@ | Out-File -FilePath .env.local -Encoding utf8
```

## Step 2: Restart Dev Server
```powershell
npm run dev
```

## Step 3: Login and Test
1. Open browser: http://localhost:3000/login
2. Use test credentials:
   - Email: test@example.com
   - Password: password123
3. After login, test these pages:
   - http://localhost:3000/monitoring
   - http://localhost:3000/marketplace
   - http://localhost:3000/agent-dashboard

## Step 4: Test API Endpoints
After login, run:
```powershell
curl http://localhost:3000/api/marketplace
curl http://localhost:3000/api/agent-logs?limit=10
```

✅ **All features will now be accessible!**
