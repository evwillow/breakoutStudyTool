"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-white">
      <SwaggerUI url="/api-docs/openapi" docExpansion="list" defaultModelsExpandDepth={-1} />
    </main>
  );
}
