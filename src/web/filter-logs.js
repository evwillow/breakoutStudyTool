/**
 * @fileoverview Log filter to suppress harmless CSS 404 errors in development
 * @module src/web/filter-logs.js
 */

// Only filter in development
const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
  const shouldSuppress = (message) => {
    if (typeof message !== 'string') return false;
    // Suppress 404 errors for CSS files
    return message.includes('404') && 
           (message.includes('layout.css') || 
            message.includes('/_next/static/css/') ||
            message.includes('GET /_next/static/css/'));
  };

  // Intercept console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.log = function(...args) {
    const message = args.join(' ');
    if (!shouldSuppress(message)) {
      originalConsoleLog.apply(console, args);
    }
  };

  console.error = function(...args) {
    const message = args.join(' ');
    if (!shouldSuppress(message)) {
      originalConsoleError.apply(console, args);
    }
  };

  console.warn = function(...args) {
    const message = args.join(' ');
    if (!shouldSuppress(message)) {
      originalConsoleWarn.apply(console, args);
    }
  };

  // Intercept stdout/stderr to catch Next.js direct logging
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = function(chunk, encoding, callback) {
    const message = chunk.toString();
    if (shouldSuppress(message)) {
      return true; // Suppress by returning true (indicates write was handled)
    }
    return originalStdoutWrite(chunk, encoding, callback);
  };

  process.stderr.write = function(chunk, encoding, callback) {
    const message = chunk.toString();
    if (shouldSuppress(message)) {
      return true; // Suppress by returning true (indicates write was handled)
    }
    return originalStderrWrite(chunk, encoding, callback);
  };
}

