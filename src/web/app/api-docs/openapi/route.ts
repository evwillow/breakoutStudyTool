/**
 * @fileoverview Serves the OpenAPI document JSON for Swagger UI.
 * @module src/web/app/api-docs/openapi/route.ts
 * @dependencies next/server, @/openapi/createDocument, @/openapi/routes/analytics
 */
import { NextResponse } from "next/server";

import { createOpenApiDocument } from "@/openapi/createDocument";
import { getAnalyticsDocumentation } from "@/openapi/routes/analytics";

export const dynamic = "force-static";

export async function GET() {
  const document = createOpenApiDocument(getAnalyticsDocumentation());
  return NextResponse.json(document);
}
