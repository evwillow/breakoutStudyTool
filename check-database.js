#!/usr/bin/env node

/**
 * Check Database Structure and Data
 * 
 * This script checks if the database tables exist and have the correct structure
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

console.log('🔧 Checking Database Structure\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkDatabase() {
  try {
    console.log('1. Checking if tables exist...\n');
    
    // Check rounds table
    console.log('Checking rounds table...');
    const { data: rounds, error: roundsError } = await supabase
      .from('rounds')
      .select('*')
      .limit(5);
    
    if (roundsError) {
      console.log('❌ Rounds table error:', roundsError.message);
    } else {
      console.log('✅ Rounds table exists');
      console.log('Number of rounds:', rounds?.length || 0);
      if (rounds && rounds.length > 0) {
        console.log('Sample round:', {
          id: rounds[0].id,
          dataset_name: rounds[0].dataset_name,
          user_id: rounds[0].user_id,
          created_at: rounds[0].created_at,
          completed: rounds[0].completed
        });
      }
    }
    
    // Check matches table
    console.log('\nChecking matches table...');
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .limit(5);
    
    if (matchesError) {
      console.log('❌ Matches table error:', matchesError.message);
    } else {
      console.log('✅ Matches table exists');
      console.log('Number of matches:', matches?.length || 0);
      if (matches && matches.length > 0) {
        console.log('Sample match:', {
          id: matches[0].id,
          round_id: matches[0].round_id,
          stock_symbol: matches[0].stock_symbol,
          user_selection: matches[0].user_selection,
          correct: matches[0].correct,
          created_at: matches[0].created_at
        });
      }
    }
    
    // Check users table
    console.log('\nChecking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table exists');
      console.log('Number of users:', users?.length || 0);
    }
    
    // Test the API logic manually
    console.log('\n2. Testing API logic manually...\n');
    
    if (rounds && rounds.length > 0) {
      const testRound = rounds[0];
      console.log('Testing with round:', testRound.id);
      
      // Get matches for this round
      const { data: roundMatches, error: roundMatchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('round_id', testRound.id);
      
      if (roundMatchesError) {
        console.log('❌ Error fetching matches for round:', roundMatchesError.message);
      } else {
        console.log('✅ Matches for round:', roundMatches?.length || 0);
        
        const totalMatches = roundMatches ? roundMatches.length : 0;
        const correctMatches = roundMatches
          ? roundMatches.filter((match) => match.correct).length
          : 0;
        const accuracy = totalMatches > 0
          ? ((correctMatches / totalMatches) * 100).toFixed(2)
          : '0.00';
        
        console.log('Calculated stats:');
        console.log('- Total matches:', totalMatches);
        console.log('- Correct matches:', correctMatches);
        console.log('- Accuracy:', accuracy + '%');
        
        // Compare with what the API should return
        console.log('\n3. Testing API endpoint...\n');
        
        const response = await fetch(`http://localhost:3000/api/game/rounds?userId=${testRound.user_id}&limit=5`);
        const apiResult = await response.text();
        
        if (response.ok) {
          const apiData = JSON.parse(apiResult);
          const apiRound = apiData.data?.find(r => r.id === testRound.id);
          
          if (apiRound) {
            console.log('API returned for this round:');
            console.log('- Accuracy:', apiRound.accuracy);
            console.log('- Correct matches:', apiRound.correctMatches);
            console.log('- Total matches:', apiRound.totalMatches);
            
            console.log('\nComparison:');
            console.log('- Accuracy match:', accuracy === apiRound.accuracy);
            console.log('- Correct matches match:', correctMatches === apiRound.correctMatches);
            console.log('- Total matches match:', totalMatches === apiRound.totalMatches);
          } else {
            console.log('❌ Round not found in API response');
          }
        } else {
          console.log('❌ API request failed:', response.status);
          console.log('Response:', apiResult);
        }
      }
    } else {
      console.log('No rounds found to test with');
    }
    
  } catch (error) {
    console.error('❌ Database check error:', error.message);
  }
}

checkDatabase().catch(console.error); 