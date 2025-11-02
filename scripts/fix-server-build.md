# Server Build Fix Instructions

## Quick Fix Commands

Run these commands on your server to fix the build errors:

```bash
cd /var/www/html/breakoutStudyTool/src/web

# Pull latest changes from GitHub
git pull origin main

# Clear Next.js build cache
rm -rf .next
rm -rf node_modules/.cache

# Rebuild the application
npm run build
```

## Alternative: Use the Script

If you prefer to use the automated script:

```bash
chmod +x scripts/fix-server-build.sh
./scripts/fix-server-build.sh
```

## What This Fixes

The build errors were caused by:
1. Missing `"use client"` directive in `useAuthRedirect.ts` (now fixed)
2. Build cache containing old file references (cleared by removing `.next`)

After running these commands, the build should succeed.

## If Build Still Fails

If you still see errors, check:
1. All files are present: `ls -la src/web/lib/hooks/useAuthRedirect.ts`
2. Node modules are installed: `npm install`
3. No permission issues: Check file permissions if needed

