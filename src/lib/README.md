# Authentication System Documentation

## Overview

This directory contains the core authentication logic for the application. The authentication system is built using NextAuth.js and integrates with Supabase for user data storage.

## Files

- `auth.js`: Contains the NextAuth.js configuration options, including providers, callbacks, and session settings.
- `supabase.js`: Provides a centralized Supabase client for database operations.

## Authentication Flow

1. Users can sign up via the `/api/auth/signup` endpoint, which creates a new user in Supabase.
2. Authentication is handled by NextAuth.js using the Credentials provider.
3. When a user logs in, their credentials are verified against the Supabase database.
4. Upon successful authentication, a JWT token is issued and stored in cookies.
5. The session contains the user's ID, which can be used to fetch additional user data as needed.

## Error Resolution

The project structure was refactored to resolve a "TypeError: c is not a function" error that occurred during the build process. This error was caused by:

1. Improper export of the NextAuth handler in the API route file.
2. Lack of separation between configuration and route handling.

The solution involved:

1. Moving the NextAuth configuration to a separate file (`auth.js`).
2. Centralizing the Supabase client in a dedicated utility file (`supabase.js`).
3. Properly exporting the handler functions in the API route file.

## Best Practices

- Keep authentication configuration separate from route handlers.
- Use a centralized database client to avoid duplication.
- Properly export handler functions from API routes.
- Check for required environment variables early in the initialization process. 