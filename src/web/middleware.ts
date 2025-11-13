/**
 * Next.js Middleware
 * 
 * Provides security headers, CORS, and request validation
 * Runs on every request before it reaches the route handlers
 * 
 * NOTE: Middleware runs in Edge Runtime - rate limiting is handled in API routes
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allowed origins for CORS (restrict to your domain)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://breakouts.trade',
  'https://breakoutstudytool.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

// Maximum request body size (1MB)
const MAX_BODY_SIZE = 1024 * 1024; // 1MB

/**
 * Get the origin from request headers
 * Returns null for same-origin requests (which don't need CORS)
 */
function getOrigin(request: NextRequest): string | null {
  // Same-origin requests don't include the origin header
  // Only return origin for cross-origin requests
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    return originHeader;
  }
  
  // For same-origin requests without origin header, return null
  // This allows same-origin requests to pass through CORS checks
  return null;
}

/**
 * Check if origin is allowed
 * SECURITY: Use exact string matching only to prevent regex injection
 * In development, allow all localhost origins
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // In development, allow all localhost origins
  if (process.env.NODE_ENV === 'development') {
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return true;
    }
  }

  // SECURITY: Use exact string matching only - no wildcards or regex patterns
  // This prevents regex injection vulnerabilities
  return ALLOWED_ORIGINS.some(allowed => origin === allowed);
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = getOrigin(request);
  const isAllowed = isOriginAllowed(origin);
  
  // CORS headers - only for allowed origins
  if (isAllowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy
  // SECURITY: Allow 'unsafe-eval' only in development (required for Next.js React Refresh/HMR)
  // In production, 'unsafe-eval' is disabled to prevent XSS attacks via eval()
  const isDevelopment = process.env.NODE_ENV === 'development';
  const scriptSrc = isDevelopment
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://js.hcaptcha.com"
    : "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://js.hcaptcha.com";
  
  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://hcaptcha.com https://www.google-analytics.com https://*.googleapis.com",
    "frame-src 'self' https://js.hcaptcha.com https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]), // Only enforce HTTPS upgrade in production
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);
  
  // Strict Transport Security (HSTS) - only in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  return response;
}

/**
 * Validate request size
 */
async function validateRequestSize(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
  const contentLength = request.headers.get('content-length');
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > MAX_BODY_SIZE) {
      return {
        valid: false,
        error: `Request body too large. Maximum size is ${MAX_BODY_SIZE / 1024}KB`
      };
    }
  }
  
  return { valid: true };
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') === false && 
    (pathname.includes('.') && !pathname.endsWith('.html'))
  ) {
    return NextResponse.next();
  }
  
  // Handle OPTIONS requests for CORS preflight
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return addSecurityHeaders(response, request);
  }
  
  // Validate request size
  const sizeValidation = await validateRequestSize(request);
  if (!sizeValidation.valid) {
    const response = NextResponse.json(
      { success: false, error: { message: sizeValidation.error } },
      { status: 413 }
    );
    return addSecurityHeaders(response, request);
  }
  
  // Check CORS for API routes
  // NOTE: Rate limiting is handled in individual API routes (Node.js runtime)
  if (pathname.startsWith('/api/')) {
    const origin = getOrigin(request);
    // Same-origin requests don't have an origin header - allow them
    // Only check CORS for cross-origin requests (when origin is present)
    if (origin && !isOriginAllowed(origin)) {
      const response = NextResponse.json(
        { success: false, error: { message: 'CORS policy violation' } },
        { status: 403 }
      );
      return addSecurityHeaders(response, request);
    }
    
    // SECURITY: Enforce HTTPS in production for API routes
    if (process.env.NODE_ENV === 'production') {
      const protocol = request.headers.get('x-forwarded-proto') || 
                      (request.url.startsWith('https://') ? 'https' : 'http');
      
      if (protocol !== 'https') {
        const response = NextResponse.json(
          { success: false, error: { message: 'HTTPS required' } },
          { status: 403 }
        );
        return addSecurityHeaders(response, request);
      }
    }
  }
  
  // Continue with the request
  const response = NextResponse.next();
  return addSecurityHeaders(response, request);
}

/**
 * Configure which routes the middleware runs on
 * NOTE: Middleware always runs in Edge Runtime in Next.js
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, JSON, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)).*)',
  ],
};

