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
// NextAuth handles both GET and POST internally
const handler = NextAuth(authConfig);

export { handler as GET, handler as POST }; 