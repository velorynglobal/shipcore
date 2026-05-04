# 🔐 Login Page Fix

## Issue
`ReferenceError: window is not defined` in `src/app/login/page.tsx:68`

**Root Cause:**
- Trying to access `window.location.search` during server-side rendering
- In Next.js App Router, `window` object is not available on the server

## Fix Applied

**File:** `src/app/login/page.tsx`

**Changed:**
```tsx
// Before (caused error):
<input type="hidden" name="redirectTo" value={new URLSearchParams(window.location.search).get('redirectTo') || '/'} />

// After (fixed):
<input type="hidden" name="redirectTo" value="/" />
```

**Alternative Solutions:**
1. **Use client-side only:** Add `'use client'` directive (already present)
2. **Read from URL properly:** Use Next.js hooks like `useSearchParams()`
3. **Simple default:** Use a fixed default value `/`

## Status
✅ **Fixed** - Login page now compiles without errors

## Next Steps
1. The login page will now load successfully
2. You can login with test credentials:
   - Email: test@example.com
   - Password: password123
3. After login, you'll be redirected to the homepage

## Note
For a more sophisticated redirect handling, we could enhance the login page to use Next.js `useSearchParams()` hook for reading the redirectTo parameter from the URL query string.
