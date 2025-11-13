#!/usr/bin/env node
/**
 * @fileoverview CLI utility to bootstrap local development environment dependencies.
 * @module setup-dev.js
 * @dependencies fs, path, child_process
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Setting up Breakout Study Tool Development Environment...\n');

// Check if .env.local exists
const envPath = '.env.local';
if (!fs.existsSync(envPath)) {
  console.log('Creating .env.local from template...');
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', envPath);
    console.log('Created .env.local - Please update with your actual credentials');
  } else {
    console.log('.env.example not found. Please create .env.local manually.');
  }
} else {
  console.log('.env.local already exists');
}

// Install dependencies
console.log('\nInstalling dependencies...');
try {
  // Install root dependencies first
  execSync('npm install', { stdio: 'inherit' });
  
  // Install web app dependencies
  console.log('Installing web app dependencies...');
  execSync('cd src/web && npm install --legacy-peer-deps', { stdio: 'inherit' });
  
  // Install shared library dependencies
  console.log('Installing shared library dependencies...');
  execSync('cd lib/shared && npm install --legacy-peer-deps', { stdio: 'inherit' });
  execSync('cd lib/ui && npm install --legacy-peer-deps', { stdio: 'inherit' });
  execSync('cd lib/database && npm install --legacy-peer-deps', { stdio: 'inherit' });
  
  console.log('All dependencies installed successfully');
} catch (error) {
  console.error('Failed to install dependencies:', error.message);
  process.exit(1);
}

// Set up database (if DATABASE_URL is configured)
console.log('\nSetting up database...');
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('DATABASE_URL=') && !envContent.includes('your-project')) {
    execSync('cd lib/database && npm run db:generate', { stdio: 'inherit' });
    console.log('Database client generated');
  } else {
    console.log('DATABASE_URL not configured. Skipping database setup.');
    console.log('Please update .env.local with your database credentials.');
  }
} catch (error) {
  console.log('Database setup skipped:', error.message);
}

console.log('\nSetup complete!');
console.log('\nNext steps:');
console.log('1. Update .env.local with your actual credentials');
console.log('2. Run: npm run dev');
console.log('3. Open: http://localhost:3000');
console.log('\nFor more information, see README.md');