import { NextResponse } from "next/server";

export async function GET() {
  try {
    // We've disabled mock database mode entirely, so always return false
    console.log("API: checkMockDb returning false - mock database disabled");
    
    return NextResponse.json({
      useMockDb: false,
      environment: process.env.NODE_ENV || 'unknown'
    });
  } catch (error) {
    console.error("Error checking mock database status:", error);
    return NextResponse.json(
      { error: "Failed to check mock database status" },
      { status: 500 }
    );
  }
} 