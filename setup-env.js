#!/usr/bin/env node

/**
 * Environment Setup Script
 * 
 * This script helps you set up the required environment variables
 * for the Breakout Study Tool application.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔧 Breakout Study Tool - Environment Setup\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 Creating .env.local file...\n');
  
  // Generate a secure NextAuth secret
  const nextAuthSecret = crypto.randomBytes(32).toString('hex');
  
  const envTemplate = `# Breakout Study Tool Environment Variables
# Generated on ${new Date().toISOString()}

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-6B1T4S90L0

# Supabase Configuration
# Get these from: https://app.supabase.com/project/YOUR_PROJECT/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Google Drive API Configuration
# Get these from: https://console.cloud.google.com/apis/credentials
NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY=your_google_drive_api_key_here
GOOGLE_SERVICE_ACCOUNT_PROJECT_ID=your_google_project_id
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nyour_private_key_content_here\\n-----END PRIVATE KEY-----\\n"
GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_CLIENT_ID=your_client_id
GOOGLE_DRIVE_PARENT_FOLDER_ID=your_google_drive_folder_id

# NextAuth Configuration
NEXTAUTH_SECRET=${nextAuthSecret}
NEXTAUTH_URL=http://localhost:3000

# Optional: GitHub Access Token
GITHUB_ACCESS_TOKEN=your_github_token_here

# Optional: hCaptcha
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key

# Optional: Redis (Upstash)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
`;

  try {
    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ Created .env.local file with template values');
    console.log('🔑 Generated secure NEXTAUTH_SECRET');
    console.log('\n📋 Next steps:');
    console.log('1. Open .env.local in your editor');
    console.log('2. Replace placeholder values with your actual credentials');
    console.log('3. Run "npm run setup" again to validate your configuration\n');
  } catch (error) {
    console.error('❌ Failed to create .env.local file:', error.message);
    process.exit(1);
  }
} else {
  console.log('📁 Found existing .env.local file\n');
  
  // Load and check environment variables
  try {
    require('dotenv').config({ path: envPath });
  } catch (error) {
    console.error('❌ Failed to load .env.local file:', error.message);
    process.exit(1);
  }
  
  const requiredVars = {
    'Google Drive': [
      'GOOGLE_SERVICE_ACCOUNT_PROJECT_ID',
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
      'GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL',
      'GOOGLE_DRIVE_PARENT_FOLDER_ID'
    ],
    'NextAuth': [
      'NEXTAUTH_SECRET'
    ],
    'Supabase': [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]
  };
  
  let allConfigured = true;
  let configuredCount = 0;
  let totalCount = 0;
  
  Object.entries(requiredVars).forEach(([category, vars]) => {
    console.log(`🔍 Checking ${category} configuration:`);
    
    vars.forEach(varName => {
      totalCount++;
      const value = process.env[varName];
      const isConfigured = value && 
        value !== 'your_' + varName.toLowerCase() + '_here' && 
        !value.includes('your_') &&
        value.trim() !== '';
      
      if (isConfigured) {
        console.log(`  ✅ ${varName}`);
        configuredCount++;
      } else {
        console.log(`  ❌ ${varName} - Not configured`);
        allConfigured = false;
      }
    });
    console.log('');
  });
  
  // Show progress
  const progressPercentage = Math.round((configuredCount / totalCount) * 100);
  console.log(`📊 Configuration Progress: ${configuredCount}/${totalCount} (${progressPercentage}%)\n`);
  
  if (allConfigured) {
    console.log('🎉 All required environment variables are configured!');
    console.log('\n🚀 You can now run: npm run dev');
  } else {
    console.log('⚠️  Some environment variables need configuration.');
    console.log('\n📖 Setup guides:');
    console.log('• Google Drive API: https://developers.google.com/drive/api/quickstart/nodejs');
    console.log('• Supabase: https://supabase.com/docs/guides/getting-started');
    console.log('• NextAuth: https://next-auth.js.org/configuration/options');
  }
}

console.log('\n💡 Tips:');
console.log('• Keep your .env.local file secure and never commit it to version control');
console.log('• For production deployment, set these variables in your hosting platform');
console.log('• Run "npm run setup" anytime to check your configuration');
console.log('• Use "npm run fix-auth" if you encounter authentication issues'); 