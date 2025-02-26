// /src/utils/jwt.js
// Simple utility functions for working with JWTs
// This implementation doesn't require jsonwebtoken library

/**
 * Creates a simple base64-encoded token
 */
export function signJwt(payload) {
  try {
    // Create a header
    const header = { alg: "none", typ: "JWT" };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Encode the payload
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Create a dummy signature
    const signature = Buffer.from("not-secure").toString('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Combine the parts
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  } catch (error) {
    console.error("Error creating token:", error);
    return null;
  }
}

/**
 * Extracts the payload from a JWT token
 */
export function verifyJwt(token) {
  try {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Get the payload part (second segment)
    const payloadBase64 = parts[1];
    
    // Add padding if needed
    let padding = '';
    if (payloadBase64.length % 4 === 2) padding = '==';
    else if (payloadBase64.length % 4 === 3) padding = '=';
    
    // Decode the payload
    const decodedPayload = Buffer.from(
      payloadBase64.replace(/-/g, '+').replace(/_/g, '/') + padding, 
      'base64'
    ).toString();
    
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}