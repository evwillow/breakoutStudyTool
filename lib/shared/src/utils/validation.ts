/**
 * @fileoverview Shared Zod validation schemas for reusable domain primitives.
 * @module lib/shared/src/utils/validation.ts
 * @dependencies zod
 */
import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const stockSymbolSchema = z
  .string()
  .min(1, 'Stock symbol is required')
  .max(10, 'Stock symbol must be 10 characters or less')
  .regex(/^[A-Z]+$/, 'Stock symbol must contain only uppercase letters');

export const predictionSchema = z.enum(['up', 'down', 'neutral']);

export const confidenceSchema = z
  .number()
  .min(0, 'Confidence must be at least 0')
  .max(1, 'Confidence must be at most 1');
