/**
 * @fileoverview Marks a user's tutorial completion status in Supabase via authenticated POST.
 * @module src/web/app/api/user/tutorial-complete/route.ts
 * @dependencies next/server, next-auth, @/lib/auth, @/lib/supabase
 */
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { success, error } from '@/lib/api/responseHelpers';
import { updateTutorialCompletion } from '@/services/auth/authService';

/**
 * API endpoint to mark tutorial as completed
 * POST /api/user/tutorial-complete
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return error('Unauthorized', 401);
    }

    // Parse request body
    const body = await req.json();
    const { completed } = body;

    if (typeof completed !== 'boolean') {
      return error('Invalid request body. Expected { completed: boolean }', 400);
    }

    await updateTutorialCompletion(session.user.id, completed);

    return success({ success: true });
  } catch (error: any) {
    console.error('Error updating tutorial completion:', error);
    return error('Internal server error', 500);
  }
}

