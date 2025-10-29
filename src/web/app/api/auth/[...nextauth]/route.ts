/**
 * NextAuth API Route Handler
 * 
 * Handles authentication requests using NextAuth.js
 * Configured for Node.js runtime for optimal performance
 */

// Force Node.js runtime for better performance with auth operations
export const runtime = "nodejs";

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth";

// Create and export the NextAuth handler
const handler = NextAuth(authConfig);

// Export for both GET and POST methods
export { handler as GET, handler as POST }; 