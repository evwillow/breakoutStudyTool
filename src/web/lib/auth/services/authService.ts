/**
 * Authentication Service
 * 
 * Core authentication logic separated from NextAuth configuration.
 * Handles user validation, password verification, and security measures.
 */
import bcrypt from "bcryptjs";
import { getServerSupabaseClient } from "../../supabase.js";
import { logger } from "@/lib/utils/logger";
import { AUTH_CONFIG, AUTH_ERRORS } from "../constants";
import type { 
  AuthCredentials, 
  AuthUser, 
  ValidationResult, 
  AuthResult, 
  DatabaseUser 
} from "../types";

class AuthService {
  /**
   * Get the Supabase client for authentication operations
   */
  private getSupabaseClient() {
    return getServerSupabaseClient();
  }

  /**
   * Validates credential format and structure
   */
  validateCredentials(credentials: AuthCredentials): ValidationResult<AuthCredentials> {
    const errors: string[] = [];
    
    // Email validation
    if (!credentials.email) {
      errors.push("Email is required");
    } else if (!AUTH_CONFIG.VALIDATION.EMAIL_REGEX.test(credentials.email)) {
      errors.push(AUTH_ERRORS.INVALID_EMAIL_FORMAT);
    }
    
    // Password validation
    if (!credentials.password) {
      errors.push("Password is required");
    } else {
      if (credentials.password.length < AUTH_CONFIG.VALIDATION.MIN_PASSWORD_LENGTH) {
        errors.push(AUTH_ERRORS.PASSWORD_TOO_SHORT);
      }
      if (credentials.password.length > AUTH_CONFIG.VALIDATION.MAX_PASSWORD_LENGTH) {
        errors.push(AUTH_ERRORS.PASSWORD_TOO_LONG);
      }
    }
    
    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? credentials : undefined,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Authenticates user with enhanced security and performance
   */
  async authenticateUser(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      // Get user from database with optimized query
      const user = await this.getUserByEmail(credentials.email);
      
      if (!user) {
        // Use consistent timing to prevent timing attacks
        await this.simulatePasswordCheck();
        return {
          success: false,
          reason: "user_not_found"
        };
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(credentials.password, user.password);
      
      if (!isPasswordValid) {
        logger.warn('Invalid password attempt', {
          userId: user.id,
          email: user.email.split('@')[1]
        });
        
        return {
          success: false,
          reason: "invalid_password"
        };
      }

      // Convert database user to auth user
      const authUser: AuthUser = {
        id: user.id,
        name: user.email, // Using email as name for now
        email: user.email
      };

      return {
        success: true,
        user: authUser
      };

    } catch (error) {
      logger.error('Authentication service error', {
        email: credentials.email.split('@')[1],
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        reason: "internal_error",
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Retrieves user by email with optimized query
   */
  private async getUserByEmail(email: string): Promise<DatabaseUser | null> {
    try {
      const supabase = this.getSupabaseClient();
      const { data: user, error } = await supabase
        .from("users")
        .select("id, email, password")
        .eq("email", email.toLowerCase()) // Ensure case-insensitive lookup
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user not found
          return null;
        }
        throw error;
      }

      return user;
    } catch (error) {
      logger.error('Database query error', {
        operation: 'getUserByEmail',
        email: email.split('@')[1],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Verifies password with timing attack protection
   */
  private async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Password verification error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Simulates password check to prevent timing attacks
   */
  private async simulatePasswordCheck(): Promise<void> {
    // Perform a dummy bcrypt operation to maintain consistent timing
    await bcrypt.compare('dummy', '$2a$12$dummy.hash.to.maintain.consistent.timing');
  }

  /**
   * Hashes password for storage (used during registration)
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, AUTH_CONFIG.SECURITY.BCRYPT_ROUNDS);
    } catch (error) {
      logger.error('Password hashing error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to hash password');
    }
  }
}

// Export singleton instance
export const authService = new AuthService(); 