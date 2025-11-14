import { NextResponse } from 'next/server';

export const success = (data: unknown, status = 200) =>
  NextResponse.json(
    { success: true, data },
    { status }
  );

export const error = (message: string, status = 400) =>
  NextResponse.json(
    { success: false, error: message },
    { status }
  );

