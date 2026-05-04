# 📦 Install Missing Dependencies

## Required Dependencies

The following packages are needed:
- `next-auth` (for authentication)
- `next-auth` types (optional, for TypeScript)

## Installation Commands

Run these in PowerShell from `C:\Projects\shipcore`:

```powershell
# Install next-auth
npm install next-auth@latest

# Optional: Install TypeScript types (if using TypeScript)
npm install --save-dev @types/next-auth

# Restart dev server
npm run dev
```

## After Installation

The errors should be resolved:
- ✅ `Can't resolve '@/auth'` → Will resolve to next-auth
- ✅ `Can't resolve 'next-auth/react'` → Package now installed

## Verify Installation

After installing, check:
```powershell
npm list next-auth
```

Should show: `next-auth@latest` in dependencies.

## Alternative

If you prefer a different auth provider (Clerk, Auth0, etc.), let me know and I'll reconfigure the system accordingly.
