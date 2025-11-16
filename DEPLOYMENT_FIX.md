# Production Data Loading Fix

## Problem
The production server returns 500 errors when loading data files because it cannot find the `data/quality_breakouts` directory.

## Root Cause
The `localDataCache.ts` tries to find the data directory in multiple locations, but none exist on the production server.

## Solutions

### Solution 1: Set DATA_DIRECTORY Environment Variable (Recommended)

Add this environment variable to your production server:

```bash
DATA_DIRECTORY=/path/to/your/data
```

For example, if you deploy to `/var/www/html/breakoutStudyTool`:
```bash
DATA_DIRECTORY=/var/www/html/breakoutStudyTool/data
```

**Steps:**
1. SSH into your production server
2. Find where your app is deployed (run `pwd` in your app directory)
3. Check if the `data` directory exists: `ls -la /your/deploy/path/data/quality_breakouts`
4. If it exists, set the environment variable in your deployment config
5. Restart your Next.js server

### Solution 2: Symlink Data Directory

If your app runs from `src/web` but data is at the root:

```bash
cd /var/www/html/breakoutStudyTool/src/web
ln -s ../../data ./data
```

### Solution 3: Copy Data to Build Output (For Vercel/Netlify)

If deploying to a platform like Vercel or Netlify, you need to ensure data is copied during build.

Add to `src/web/package.json`:

```json
{
  "scripts": {
    "prebuild": "node -e \"require('fs-extra').copySync('../../data', './public/data')\"",
    "build": "node -r ./load-env.js node_modules/next/dist/bin/next build"
  }
}
```

Then update `POSSIBLE_BASE_PATHS` in `localDataCache.ts` to include:
```javascript
path.join(process.cwd(), "public", "data", "quality_breakouts"),
```

## Debugging

After deploying the fix with improved logging, check your server logs to see:
- What paths were attempted
- What the current working directory is
- What error code each path returned (ENOENT = doesn't exist)

The logs will look like:
```
[localDataCache] Data directory not found. Attempted paths:
  - /path1: ENOENT
  - /path2: ENOENT
  ...
Current working directory: /actual/cwd
DIRNAME: /actual/dirname
DATA_DIRECTORY env: not set
```

## Verification

After applying the fix, test with:
```bash
curl https://breakouts.trade/api/files/local-data?file=AIRG_Sep_13_2018/D.json&folder=quality_breakouts
```

Should return:
```json
{
  "success": true,
  "data": {
    "data": [...],
    "fileName": "AIRG_Sep_13_2018/D.json",
    "folder": "quality_breakouts"
  }
}
```

## Quick Fix for Testing

To quickly test, SSH into your server and check:

```bash
# Find where Next.js is running from
ps aux | grep next

# Check if data exists
ls -la /var/www/html/breakoutStudyTool/data/quality_breakouts | head -20

# Set env var and restart (example for PM2)
pm2 set DATA_DIRECTORY /var/www/html/breakoutStudyTool/data
pm2 restart your-app
```
