// /src/utils/jwt.js
// Stub implementation - this file should no longer be used

export function signJwt(payload) {
  console.warn("signJwt is deprecated and should not be used");
  const data = JSON.stringify(payload);
  const encodedData = Buffer.from(data).toString('base64');
  return `mock-jwt.${encodedData}.signature`;
}

export function verifyJwt(token) {
  console.warn("verifyJwt is deprecated and should not be used");
  try {
    if (!token || !token.includes('.')) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const encodedPayload = parts[1];
    const decodedPayload = Buffer.from(encodedPayload, 'base64').toString();
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return null;
  }
}