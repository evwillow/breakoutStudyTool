/**
 * @fileoverview Marks a user's tutorial completion status in Supabase via authenticated POST.
 * @module src/web/app/api/user/tutorial-complete/route.ts
 * @dependencies next/server, next-auth, @/lib/auth, @/lib/supabase
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { getServerSupabaseClient } from '@/lib/supabase';

/**
 * API endpoint to mark tutorial as completed
 * POST /api/user/tutorial-complete
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { completed } = body;

    if (typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { completed: boolean }' },
        { status: 400 }
      );
    }

    // Update user's tutorial completion status using Supabase
    const supabase = getServerSupabaseClient();
    const { error } = await supabase
      .from('users')
      .update({ tutorial_completed: completed })
      .eq('id', session.user.id);

    if (error) {
      console.error('Error updating tutorial completion:', error);
      return NextResponse.json(
        { error: 'Failed to update tutorial completion status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating tutorial completion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

