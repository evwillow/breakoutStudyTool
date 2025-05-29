/**
 * Database Test API Route
 * 
 * Tests database connectivity and optionally creates a test user
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '../../_shared/clients/supabase';
import { authService } from '@/lib/auth/services/authService';
import { logger } from '@/utils/logger';

export async function GET(req: NextRequest) {
  try {
    const supabase = getAdminSupabaseClient();
    
    // Test basic database connectivity
    const { data: testQuery, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: testError.message
      }, { status: 500 });
    }
    
    // Check if test user exists
    const testEmail = 'evan_maus@berkeley.edu';
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', testEmail)
      .single();
    
    if (userError && userError.code !== 'PGRST116') {
      return NextResponse.json({
        success: false,
        error: 'Error checking user',
        details: userError.message
      }, { status: 500 });
    }
    
    const userExists = !userError && existingUser;
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      userExists,
      testEmail,
      userId: userExists ? existingUser.id : null
    });
    
  } catch (error) {
    logger.error('Database test error', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { createTestUser } = body;
    
    if (!createTestUser) {
      return NextResponse.json({
        success: false,
        error: 'createTestUser flag required'
      }, { status: 400 });
    }
    
    const supabase = getAdminSupabaseClient();
    const testEmail = 'evan_maus@berkeley.edu';
    const testPassword = 'test123'; // Simple test password
    
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', testEmail)
      .single();
    
    if (!checkError && existingUser) {
      return NextResponse.json({
        success: true,
        message: 'Test user already exists',
        userId: existingUser.id,
        email: existingUser.email
      });
    }
    
    // Create test user
    const hashedPassword = await authService.hashPassword(testPassword);
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        email: testEmail,
        password: hashedPassword
      }])
      .select()
      .single();
    
    if (createError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create test user',
        details: createError.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test user created successfully',
      userId: newUser.id,
      email: newUser.email,
      testPassword
    });
    
  } catch (error) {
    logger.error('Test user creation error', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return NextResponse.json({
      success: false,
      error: 'Test user creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { resetPassword } = body;
    
    if (!resetPassword) {
      return NextResponse.json({
        success: false,
        error: 'resetPassword flag required'
      }, { status: 400 });
    }
    
    const supabase = getAdminSupabaseClient();
    const testEmail = 'evan_maus@berkeley.edu';
    const newPassword = 'test123'; // Reset to known password
    
    // Hash the new password
    const hashedPassword = await authService.hashPassword(newPassword);
    
    // Update the user's password
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', testEmail)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to reset password',
        details: updateError.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      userId: updatedUser.id,
      email: updatedUser.email,
      newPassword
    });
    
  } catch (error) {
    logger.error('Password reset error', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return NextResponse.json({
      success: false,
      error: 'Password reset failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 