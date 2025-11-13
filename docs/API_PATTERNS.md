# API Patterns

This guide describes the conventions used by API routes in the Breakout Study Tool (`src/web/app/api/**`).

## 1. Routing Conventions

- Routes follow REST-style resource naming: `/api/game/matches`, `/api/game/rounds/[roundId]`, `/api/files/local-data`.
- Nested directories group shared logic (`_shared`) for clients, middleware, types, and utilities.
- GET endpoints serve read-only JSON. Mutations use POST/PUT/DELETE with JSON bodies.

## 2. Request Handling

- **Validation**: Zod schemas or shared validators ensure payload correctness before executing logic.
- **Authentication**: Protected routes read Supabase/NextAuth sessions; unauthenticated requests return 401/403.
- **Error Responses**: All errors follow `{ success: false, error: { code, message, details? } }` envelope using `AppError` codes.

## 3. Response Shape

- Successful responses use `{ success: true, data: ... }` or plain JSON objects when simpler (e.g., `/api/analytics`).
- Arrays returned when listing resources (folders, matches). Maps are converted to records for JSON serialization.
- Numeric metrics formatted as numbers (not strings). Dates returned in ISO 8601 when available.

## 4. Logging & Telemetry

- Errors log via `logger.error` with route context; warnings are surfaced for recoverable conditions.
- Rate limiting applied in middleware/utilities for sensitive routes (e.g., auth).

## 5. OpenAPI & Documentation

- `src/web/openapi/createDocument.ts` provides a base OpenAPI document.
- Route-specific definitions live under `src/web/openapi/routes/**`.
- `/api-docs/openapi` serves JSON spec; `/api-docs` renders Swagger UI.
- Each documented route includes summary, request/response schemas, auth requirements, and example payloads.

## 6. Testing & Utilities

- Routes rely on shared clients (Supabase, storage) located in `_shared/clients/`.
- Error middleware standardizes JSON output.
- Reusable helpers (response builders, validation) prevent duplication across endpoints.
