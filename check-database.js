#!/usr/bin/env node

/**
 * Database Schema Checker
 * 
 * This script checks if all required database tables exist
 * and provides guidance on setting them up.
 */

require('dotenv').config({ path: '.env.local' });

async function checkDatabase() {
  console.log('🔍 Checking database schema...\n');

  // Check if required environment variables exist
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    console.log('❌ Missing environment variables:');
    missingEnvVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n💡 Run "node setup-env.js" to configure your environment variables.\n');
    return;
  }

  try {
    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('✅ Supabase connection configured\n');

    // Check each required table
    const requiredTables = ['users', 'rounds', 'matches'];
    const tableStatus = {};

    for (const tableName of requiredTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          if (error.message.includes('does not exist')) {
            tableStatus[tableName] = 'missing';
            console.log(`❌ Table "${tableName}" does not exist`);
          } else if (error.message.includes('permission denied')) {
            tableStatus[tableName] = 'permission_error';
            console.log(`⚠️  Table "${tableName}" exists but has permission issues`);
          } else {
            tableStatus[tableName] = 'error';
            console.log(`❌ Table "${tableName}" error: ${error.message}`);
          }
        } else {
          tableStatus[tableName] = 'ok';
          console.log(`✅ Table "${tableName}" exists and accessible`);
        }
      } catch (err) {
        tableStatus[tableName] = 'error';
        console.log(`❌ Table "${tableName}" error: ${err.message}`);
      }
    }

    console.log('\n📊 Database Status Summary:');
    const okTables = Object.values(tableStatus).filter(status => status === 'ok').length;
    const totalTables = requiredTables.length;
    console.log(`   ${okTables}/${totalTables} tables are properly configured\n`);

    // Provide guidance based on results
    const missingTables = Object.entries(tableStatus)
      .filter(([_, status]) => status === 'missing')
      .map(([table, _]) => table);

    const permissionTables = Object.entries(tableStatus)
      .filter(([_, status]) => status === 'permission_error')
      .map(([table, _]) => table);

    if (missingTables.length > 0) {
      console.log('🔧 Setup Required:');
      console.log('   Missing tables need to be created in your Supabase database.\n');
      console.log('📋 Next Steps:');
      console.log('   1. Go to https://app.supabase.com');
      console.log('   2. Open your project');
      console.log('   3. Go to SQL Editor');
      console.log('   4. Run the SQL from database-schema.sql file');
      console.log('   5. Run this script again to verify\n');
    }

    if (permissionTables.length > 0) {
      console.log('🔐 Permission Issues:');
      console.log('   Some tables exist but have Row Level Security (RLS) issues.');
      console.log('   This is normal and will be resolved when you set up authentication.\n');
    }

    if (okTables === totalTables) {
      console.log('🎉 All database tables are properly configured!');
      console.log('   Your application should work correctly now.\n');
    }

  } catch (error) {
    console.log('❌ Database connection failed:');
    console.log(`   ${error.message}\n`);
    
    if (error.message.includes('Invalid API key')) {
      console.log('💡 This looks like an API key issue.');
      console.log('   Check your SUPABASE_SERVICE_ROLE_KEY in .env.local\n');
    } else if (error.message.includes('fetch')) {
      console.log('💡 This looks like a network or URL issue.');
      console.log('   Check your NEXT_PUBLIC_SUPABASE_URL in .env.local\n');
    }
  }
}

// Run the check
checkDatabase().catch(console.error); 