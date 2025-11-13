# API Routes

Serverless API endpoints powering Breakout Study Tool live under `src/web/app/api`. Each route follows the conventions described in `docs/API_PATTERNS.md` and is documented via OpenAPI.

## Directory Structure

```
api/
├─ _shared/          # Clients, middleware, types, utilities
├─ analytics/        # Admin analytics endpoint
├─ auth/             # Authentication flows (NextAuth adapters, signup, etc.)
├─ files/            # Local dataset browsing (folders, JSON data)
├─ game/             # Match, round, and drill logging
└─ user/             # Profile and tutorial completion endpoints
```

## Key Endpoints

- `analytics/route.ts` – Returns aggregated metrics for admin dashboards.
- `files/local-folders` – Lists available flashcard datasets.
- `files/local-data` – Returns specific JSON files for flashcards.
- `game/matches` – Records user selections and scoring metadata.
- `game/rounds/[id]` – Updates round completion status.
- `user/tutorial-complete` – Marks tutorial progress.

## Shared Utilities

Reusable helpers live in `_shared/`:

- **clients/** – Supabase, external services.
- **middleware/** – Error handling/regulation wrappers.
- **types/** – Request/response types.
- **utils/** – Response builders, validation helpers.

## Documentation

- Swagger UI: `/api-docs`
- OpenAPI JSON: `/api-docs/openapi`
- Route documentation definitions at `src/web/openapi/routes/**`.
