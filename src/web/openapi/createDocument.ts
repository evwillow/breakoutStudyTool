import { OpenAPIObject } from "openapi3-ts";

export type DocumentOptions = {
  paths?: OpenAPIObject["paths"];
  components?: OpenAPIObject["components"];
  tags?: OpenAPIObject["tags"];
};

/**
 * Creates the base OpenAPI document for the Breakout Study Tool API.
 * Route-specific generators can merge additional paths, components, and tags.
 */
export function createOpenApiDocument(options: DocumentOptions = {}): OpenAPIObject {
  const baseComponents: OpenAPIObject["components"] = {
    securitySchemes: {
      sessionToken: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "Issued by NextAuth.js upon successful authentication.",
      },
      bearerToken: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT tokens for service-to-service communication.",
      },
    },
  };

  const mergedComponents: OpenAPIObject["components"] = {
    ...baseComponents,
    ...options.components,
    securitySchemes: {
      ...baseComponents.securitySchemes,
      ...(options.components?.securitySchemes ?? {}),
    },
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "Breakout Study Tool API",
      description:
        "REST endpoints for authentication, flashcards, analytics, and supporting services used across the Breakout Study Tool platform.",
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
      contact: {
        name: "Breakout Study Tool",
        url: "https://breakouts.trade",
        email: "support@breakouts.trade",
      },
    },
    servers: [
      {
        url: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
        description: "Primary server",
      },
    ],
    tags: options.tags ?? [],
    paths: options.paths ?? {},
    components: mergedComponents,
  };
}
