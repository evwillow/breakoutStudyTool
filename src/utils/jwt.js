// /src/utils/jwt.js
// Simple utility functions for working with JWTs
// This implementation doesn't require jsonwebtoken library

/**
 * JWT Utility Functions
 * 
 * Simple implementation of JWT token creation and verification.
 * Note: This is a simplified implementation for development purposes only.
 * It does not use cryptographic signatures and should not be used in production.
 * 
 * Features:
 * - Base64 encoding and decoding of JWT tokens
 * - Token creation with custom payloads
 * - Token verification and payload extraction
 */

/**
 * Creates a simple base64-encoded JWT token
 * 
 * @param {Object} payload - The data to encode in the token
 * @returns {string|null} - The encoded JWT token or null if creation fails
 */
export function signJwt(payload) {
  try {
    // Create the header section (algorithm and token type)
    const header = { alg: "none", typ: "JWT" };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Encode the payload section (actual data)
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Create a dummy signature (not cryptographically secure)
    const signature = Buffer.from("not-secure").toString('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Combine all parts with period separators
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