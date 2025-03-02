# Next.js Authentication System

## Overview

This project implements a Next.js application with authentication using NextAuth.js and Supabase for user data storage.

## Project Structure

- `/src/lib/auth.js`: Contains the NextAuth.js configuration options
- `/src/lib/supabase.js`: Provides a centralized Supabase client
- `/src/app/api/auth/[...nextauth]/route.js`: NextAuth.js API route handler
- `/src/app/api/auth/signup/route.js`: User registration API endpoint

## Authentication Flow

1. Users can sign up via the `/api/auth/signup` endpoint
2. Authentication is handled by NextAuth.js using the Credentials provider
3. User credentials are verified against the Supabase database
4. Upon successful authentication, a JWT token is issued and stored in cookies

## Error Resolution: "TypeError: c is not a function"

### Issue

The build process was failing with the error message:
```
TypeError: c is not a function
```

This error occurred in the generated file `.next/server/app/api/auth/[...nextauth]/route.js` during page data collection.

### Root Cause

The error was caused by a conflict between:

1. The project's module system configuration (`"type": "module"` in package.json)
2. NextAuth.js's handling of exports in the API route

### Solution

The issue was resolved by:

1. Removing `"type": "module"` from package.json
2. Properly structuring the NextAuth.js API route handler
3. Using the recommended export pattern: `export { handler as GET, handler as POST }`

### Best Practices

- Keep authentication configuration separate from route handlers
- Use a centralized database client to avoid duplication
- Properly export handler functions from API routes
- Check for required environment variables early in initialization
- Be cautious with module system configurations that might conflict with libraries

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables in `.env.local`:
   ```
   NEXTAUTH_SECRET=your_secret_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the development server:
   ```
   npm run dev
   ```

4. Build for production:
   ```
   npm run build
   ```

## Testing Authentication

1. Register a new user at `/api/auth/signup`
2. Log in using the registered credentials
3. Access protected routes that require authentication

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
