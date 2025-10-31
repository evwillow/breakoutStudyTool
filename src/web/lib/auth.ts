/**
 * Authentication Configuration
 * 
 * Optimized NextAuth.js configuration with improved security, performance, and maintainability.
 * Features:
 * - Enhanced type safety with proper interfaces
 * - Secure error handling without information leakage
 * - Separated concerns for better maintainability
 * - Performance optimizations for user lookups
 * - Comprehensive logging and monitoring
 */
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { logger } from "@/lib/utils/logger";
import { AuthenticationError, ErrorCodes } from "@/lib/utils/errorHandling";
import { authService } from "./auth/services/authService";
import { AUTH_CONFIG } from "./auth/constants";
import type { AuthUser, AuthCredentials, AuthSession, AuthToken } from "./auth/types";

// Environment validation with graceful fallbacks in development
const ensureAuthEnv = (): void => {
  // Provide a deterministic but safe dev fallback to avoid hard crashes during local dev
  if (!process.env.NEXTAUTH_SECRET) {
    if (process.env.NODE_ENV !== 'production') {
      process.env.NEXTAUTH_SECRET = 'dev-only-secret-change-me';
    } else {
      throw new Error('Missing NEXTAUTH_SECRET environment variable');
    }
  }
};

// Ensure minimal auth env on module load without forcing unrelated services
ensureAuthEnv();

/**
 * NextAuth.js configuration with enhanced security and performance
 */
export const authConfig: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { 
          label: "Email", 
          type: "email",
          placeholder: "Enter your email address"
        },
        password: { 
          label: "Password", 
          type: "password",
          placeholder: "Enter your password"
        }
      },
      /**
       * Enhanced authorize function with improved security and error handling
       */
      async authorize(credentials): Promise<AuthUser | null> {
        const startTime = Date.now();
        
        try {
          // Input validation
          if (!credentials?.email || !credentials?.password) {
            logger.warn('Auth attempt with missing credentials', {
              hasEmail: !!credentials?.email,
              hasPassword: !!credentials?.password,
              ip: 'redacted' // IP would be logged separately for security
            });
            return null;
          }

          // Validate credential format
          const validatedCredentials = authService.validateCredentials({
            email: credentials.email,
            password: credentials.password
          });

          if (!validatedCredentials.isValid || !validatedCredentials.data) {
            logger.warn('Auth attempt with invalid credential format', {
              email: credentials.email.split('@')[1], // Log domain only
              errors: validatedCredentials.errors
            });
            return null;
          }

          // Authenticate user with enhanced security
          const authResult = await authService.authenticateUser(validatedCredentials.data);
          
          if (!authResult.success || !authResult.user) {
            logger.warn('Authentication failed', {
              email: credentials.email.split('@')[1],
              reason: authResult.reason,
              duration: Date.now() - startTime
            });
            return null;
          }

          // Log successful authentication
          logger.info('User authenticated successfully', {
            userId: authResult.user.id,
            email: credentials.email.split('@')[1],
            duration: Date.now() - startTime
          });

          return authResult.user;

        } catch (error) {
          // Enhanced error handling with security considerations
          const errorId = Math.random().toString(36).substring(7);
          
          logger.error('Authentication error', {
            errorId,
            email: credentials?.email?.split('@')[1] || 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime
          });

          // Don't expose internal errors to prevent information leakage
          return null;
        }
      }
    })
  ],

  callbacks: {
    /**
     * Enhanced JWT callback with better type safety
     */
    async jwt({ token, user }) {
      if (user) {
        // Ensure type safety when adding user data to token
        const authUser = user as AuthUser;
        token.id = authUser.id;
        token.name = authUser.name;
        token.email = authUser.email;
        
        logger.debug('JWT token created', { 
          userId: authUser.id,
          email: authUser.email.split('@')[1]
        });
      }
      return token;
    },

    /**
     * Enhanced session callback with improved type safety
     */
    async session({ session, token }): Promise<AuthSession> {
      if (token && session.user) {
        const authToken = token as AuthToken;
        session.user = {
          id: authToken.id,
          name: authToken.name,
          email: authToken.email
        };
        
        logger.debug('Session created', { 
          userId: authToken.id,
          email: authToken.email.split('@')[1]
        });
      }
      return session as AuthSession;
    }
  },

  pages: {
    signIn: AUTH_CONFIG.PAGES.SIGN_IN,
    error: AUTH_CONFIG.PAGES.ERROR,
    signOut: AUTH_CONFIG.PAGES.SIGN_OUT
  },

  session: {
    strategy: "jwt",
    maxAge: AUTH_CONFIG.SESSION.MAX_AGE,
    updateAge: AUTH_CONFIG.SESSION.UPDATE_AGE
  },

  jwt: {
    maxAge: AUTH_CONFIG.JWT.MAX_AGE
  },

  secret: process.env.NEXTAUTH_SECRET,
  
  // Enhanced debug configuration
  debug: process.env.NODE_ENV === "development",
  
  // Security enhancements
  useSecureCookies: process.env.NODE_ENV === "production",
  
  events: {
    async signIn({ user, account, profile }) {
      logger.info('User signed in', {
        userId: user.id,
        provider: account?.provider,
        email: user.email?.split('@')[1]
      });
    },
    async signOut({ token }) {
      logger.info('User signed out', {
        userId: (token as AuthToken)?.id
      });
    }
  }
}; 