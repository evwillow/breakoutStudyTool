import { NextResponse } from "next/server";

export async function GET() {
  const envChecks = {
    // Google Drive variables
    googleDrive: {
      GOOGLE_SERVICE_ACCOUNT_PROJECT_ID: !!process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
      GOOGLE_DRIVE_PARENT_FOLDER_ID: !!process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
    },
    // NextAuth variables
    nextAuth: {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    },
    // Supabase variables
    supabase: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  };

  const missingVars = [];
  
  Object.entries(envChecks).forEach(([category, vars]) => {
    Object.entries(vars).forEach(([varName, exists]) => {
      if (!exists) {
        missingVars.push(`${category}.${varName}`);
      }
    });
  });

  return NextResponse.json({
    status: missingVars.length === 0 ? "OK" : "MISSING_VARS",
    checks: envChecks,
    missingVariables: missingVars,
    message: missingVars.length === 0 
      ? "All required environment variables are present" 
      : `Missing ${missingVars.length} environment variables`
  });
} 