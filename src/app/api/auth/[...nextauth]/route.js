// Force Node.js runtime
export const runtime = "nodejs";

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth";

// Export the handler directly
const handler = NextAuth(authConfig);
export { handler as GET, handler as POST }; 