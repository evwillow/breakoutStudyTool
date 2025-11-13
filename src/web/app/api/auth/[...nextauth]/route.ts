/**
 * @fileoverview NextAuth configuration route handling authentication providers and callbacks.
 * @module src/web/app/api/auth/[...nextauth]/route.ts
 * @dependencies next-auth, next-auth/providers/google, @/lib/auth
 */
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth";

// Create and export the NextAuth handler
// NextAuth handles both GET and POST internally
const handler = NextAuth(authConfig);

export { handler as GET, handler as POST }; 