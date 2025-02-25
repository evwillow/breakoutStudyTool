// /src/utils/jwt.js
// Simplified mock JWT functions that don't require the actual library

export function signJwt(payload) {
  // Simple mock implementation that creates a base64 encoded string
  const data = JSON.stringify(payload);
  const encodedData = Buffer.from(data).toString('base64');
  return `mock-jwt.${encodedData}.signature`;
}

export function verifyJwt(token) {
  try {
    // Simple mock implementation that extracts the payload
    if (!token || !token.includes('.')) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const encodedPayload = parts[1];
    const decodedPayload = Buffer.from(encodedPayload, 'base64').toString();
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.warn("JWT verification failed:", error.message);
    return null;
  }
}