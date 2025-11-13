import { NextResponse } from "next/server";

import { createOpenApiDocument } from "@/openapi/createDocument";
import { getAnalyticsDocumentation } from "@/openapi/routes/analytics";

export const dynamic = "force-static";

export async function GET() {
  const document = createOpenApiDocument(getAnalyticsDocumentation());
  return NextResponse.json(document);
}
