#!/usr/bin/env node

/**
 * NextAuth Configuration Fix
 * 
 * This script helps fix the 401 Unauthorized error by ensuring
 * NEXTAUTH_URL is properly configured.
 */

const fs = require('fs');
const path = require('path');

console.log('🔐 NextAuth Configuration Fix\n');

const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found. Run "node setup-env.js" first.');
  process.exit(1);
}

// Read current .env.local content
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if NEXTAUTH_URL is set
const hasNextAuthUrl = envContent.includes('NEXTAUTH_URL=') && 
                       !envContent.includes('NEXTAUTH_URL=http://localhost:3000') &&
                       !envContent.includes('NEXTAUTH_URL=your_');

if (!hasNextAuthUrl) {
  console.log('🔧 Fixing NEXTAUTH_URL configuration...');
  
  // Determine the correct URL based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultUrl = isProduction ? 'https://trade.evwillow.com' : 'http://localhost:3000';
  
  // Update or add NEXTAUTH_URL
  if (envContent.includes('NEXTAUTH_URL=')) {
    envContent = envContent.replace(/NEXTAUTH_URL=.*/, `NEXTAUTH_URL=${defaultUrl}`);
  } else {
    envContent += `\n# NextAuth URL (automatically detected)\nNEXTAUTH_URL=${defaultUrl}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Set NEXTAUTH_URL to: ${defaultUrl}`);
} else {
  console.log('✅ NEXTAUTH_URL is already configured');
}

// Check NEXTAUTH_SECRET
if (!envContent.includes('NEXTAUTH_SECRET=') || envContent.includes('NEXTAUTH_SECRET=your_')) {
  console.log('❌ NEXTAUTH_SECRET is not properly configured');
  console.log('💡 Run "node setup-env.js" to generate a secure secret');
} else {
  console.log('✅ NEXTAUTH_SECRET is configured');
}

console.log('\n🔍 Current NextAuth configuration:');
require('dotenv').config({ path: envPath });

const nextAuthUrl = process.env.NEXTAUTH_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

console.log(`• NEXTAUTH_URL: ${nextAuthUrl || '❌ Not set'}`);
console.log(`• NEXTAUTH_SECRET: ${nextAuthSecret ? '✅ Set' : '❌ Not set'}`);

if (nextAuthUrl && nextAuthSecret) {
  console.log('\n🎉 NextAuth should now work correctly!');
  console.log('🔄 Restart your development server to apply changes.');
} else {
  console.log('\n⚠️  NextAuth configuration is incomplete.');
  console.log('📖 Check the NextAuth documentation for more details.');
} 