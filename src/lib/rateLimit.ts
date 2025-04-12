import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Create different rate limiters for different types of requests
export const signupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 attempts per hour
  analytics: true,
  prefix: 'ratelimit:signup',
});

export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
  analytics: true,
  prefix: 'ratelimit:login',
});

export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
  prefix: 'ratelimit:api',
});

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
  limiter: Ratelimit,
  identifier?: string
) {
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
} 