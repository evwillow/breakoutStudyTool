/**
 * This script tests the reCAPTCHA configuration by checking:
 * 1. If the required environment variables are set
 * 2. If the secret key can communicate with Google's reCAPTCHA API
 * 
 * Run with: node scripts/test-recaptcha.js
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function testRecaptchaConfig() {
  console.log('🔍 Testing reCAPTCHA Configuration\n');

  // Check if keys exist in environment
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  console.log('Checking environment variables:');
  if (!siteKey) {
    console.error('❌ NEXT_PUBLIC_RECAPTCHA_SITE_KEY is missing from .env.local');
  } else {
    console.log(`✅ NEXT_PUBLIC_RECAPTCHA_SITE_KEY exists (${maskKey(siteKey)})`);
  }

  if (!secretKey) {
    console.error('❌ RECAPTCHA_SECRET_KEY is missing from .env.local');
  } else {
    console.log(`✅ RECAPTCHA_SECRET_KEY exists (${maskKey(secretKey)})`);
  }

  if (!siteKey || !secretKey) {
    console.error('\n❌ Missing required environment variables. Please add them to .env.local');
    return;
  }

  // Validate key formats
  console.log('\nValidating key formats:');
  const siteKeyValid = /^[a-zA-Z0-9_-]+$/.test(siteKey);
  const secretKeyValid = /^[a-zA-Z0-9_-]+$/.test(secretKey);

  if (!siteKeyValid) {
    console.error(`❌ NEXT_PUBLIC_RECAPTCHA_SITE_KEY format is invalid`);
  } else {
    console.log(`✅ NEXT_PUBLIC_RECAPTCHA_SITE_KEY format is valid`);
  }

  if (!secretKeyValid) {
    console.error(`❌ RECAPTCHA_SECRET_KEY format is invalid`);
  } else {
    console.log(`✅ RECAPTCHA_SECRET_KEY format is valid`);
  }

  if (!siteKeyValid || !secretKeyValid) {
    console.error('\n❌ Invalid key formats. Please check your reCAPTCHA keys.');
    return;
  }

  // Test the secret key with a dummy token
  console.log('\nTesting communication with Google reCAPTCHA API:');
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=dummy_token`,
    });

    if (!response.ok) {
      console.error(`❌ HTTP error when contacting Google reCAPTCHA API: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log(`✅ Received response from Google reCAPTCHA API`);
    
    if (data['error-codes'] && data['error-codes'].includes('invalid-input-secret')) {
      console.error('❌ Invalid secret key - Google does not recognize this key');
      console.error('   Please check your reCAPTCHA keys at https://www.google.com/recaptcha/admin');
    } else if (data['error-codes'] && data['error-codes'].includes('missing-input-response')) {
      // This is expected for a dummy token test
      console.log('✅ Secret key appears valid (expected error for dummy token)');
    }

    console.log('\nAPI Response:');
    console.log(JSON.stringify(data, null, 2));

    // Check for domain configuration
    if (siteKey) {
      console.log('\nDomain configuration check:');
      console.log('ℹ️  Ensure your domain is authorized in the reCAPTCHA admin console:');
      console.log('   https://www.google.com/recaptcha/admin');
      console.log('   Your current domain should be localhost or your production domain');
    }

    console.log('\nTest completed. If you see issues, please check the documentation:');
    console.log('https://developers.google.com/recaptcha/docs/verify');
  } catch (error) {
    console.error(`❌ Error testing reCAPTCHA API: ${error.message}`);
    console.error('   This may indicate network issues or service downtime');
  }
}

function maskKey(key) {
  if (key.length < 8) return '********';
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}

testRecaptchaConfig(); 