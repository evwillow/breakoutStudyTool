import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Check if Redis is configured
const isRedisConfigured = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis client only if configured
let redis: Redis | null = null;
if (isRedisConfigured) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  } catch (error) {
    console.warn('Failed to initialize Redis client:', error);
    redis = null;
  }
}

// Create rate limiters only if Redis is available
export const signupLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '1 h'), // 50 attempts per hour
  analytics: true,
  prefix: 'ratelimit:signup',
}) : null;

export const loginLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
  analytics: true,
  prefix: 'ratelimit:login',
}) : null;

export const apiLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
  prefix: 'ratelimit:api',
}) : null;

// Helper function to get client IP
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

// Rate limit middleware
export async function rateLimit(
  request: Request,
  limiter: Ratelimit | null,
  identifier?: string
) {
  // If no limiter is configured, skip rate limiting
  if (!limiter) {
    console.log('Rate limiting disabled - Redis not configured');
    return null;
  }

  try {
    const ip = getClientIp(request);
    const id = identifier || ip;
    
    const { success, limit, reset, remaining } = await limiter.limit(id);
    
    if (!success) {
      return new Response('Too Many Requests', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      });
    }
    
    return null;
  } catch (error) {
    console.error('Rate limiting error:', error);
    // If rate limiting fails, allow the request to proceed
    return null;
  }
} 