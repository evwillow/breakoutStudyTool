/**
 * @fileoverview Declaration merges extending NextAuth session and token types.
 * @module src/web/lib/types/next-auth.d.ts
 * @dependencies next-auth
 */
/**
 * NextAuth Type Extensions
 * Extends default NextAuth types to include custom fields
 */
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    email: string;
  }
} 