# AI Getting Started Guide

_Last reviewed:_ 2025-11-13

This guide provides the high-signal context an AI assistant (or new engineer) needs to work productively in the Breakout Study Tool codebase.

## 1. Project Overview

- **Purpose:** Interactive training platform for breakout trading drills. Users practice on historical data, receive instant feedback, and track progress.
- **Tech Stack:** Next.js (App Router, TypeScript), React client components, Supabase for auth/data, Recharts/D3 for visualization, Node-based API routes.
- **Data Sources:** Local `data/quality_breakouts` directory (JSON folders per ticker/date) plus Supabase tables for user rounds/matches.

## 2. Repository Structure (Key Areas)

| Path | Description |
|------|-------------|
| `src/web/app/` | Next.js App Router pages, API routes, middleware, providers.
| `src/web/components/` | React components (grouped by feature). Includes barrels (`index.ts`) for imports.
| `src/web/lib/` | Web-specific utilities (auth config, fetchers, caching, hooks).
| `src/web/openapi/` | OpenAPI document generator and per-route specs.
| `src/analytics/` | Python + TypeScript scripts for analytics dashboards and data prep.
| `lib/shared/` | Reusable TypeScript types and utilities shared across packages.
| `docs/` | Architectural, API, component, and code-metric documentation.
| `data/quality_breakouts/` | Historical chart data used by drills (large dataset, excluded from version control but expected locally).

## 3. Common Patterns & Conventions

- **Barrel Exports:** Many folders expose an `index.ts` or `index.js` to simplify imports. When adding a component/hook, update the relevant barrel.
- **File Headers:** Every source file starts with a JSDoc-style header (`@fileoverview`, `@module`, `@dependencies`). Maintain this format for consistency.
- **Client Components:** Files using React hooks must include the "use client" directive at the top (e.g., `ChartMagnifier`, `TimerDurationSelector`).
- **Modular Charts:** `components/StockChart/` now splits logic into `index.tsx`, `config.ts`, dedicated hooks (`useChartData`, `useChartScale`, `useChartInteraction`), render subcomponents, and utilities. Prefer extending these modules over embedding large helpers in-line.
- **API Routes:** Live under `src/web/app/api/**`. Each route typically exports HTTP verb handlers (e.g., `GET`, `POST`) and relies on shared helpers under `src/web/app/api/_shared/` and `src/web/lib/`.
- **Caching:** Local dataset APIs use `src/web/lib/cache/localDataCache.ts` for memoized directory/file reads.
- **Documentation:** Keep docs in `docs/`, `src/web/components/README.md`, `src/web/app/api/README.md`, `lib/shared/README.md` aligned with code changes.

## 4. Functionality Map

| Area | Key Files | Notes |
|------|-----------|-------|
| Landing / Marketing | `src/web/app/page.tsx`, `components/LandingPage/**` | Public marketing pages with CTA + demonstration preview. |
| Study Experience | `src/web/app/study/page.tsx`, `components/Flashcards/FlashcardsContainer.tsx`, `components/ChartSection/**`, `components/StockChart/**` | Core drill workflow: load charts, handle timers, score user selections. |
| Authentication | `src/web/app/api/auth/**`, `src/web/lib/auth.ts`, `components/Auth/**` | Built on NextAuth; includes signup, credential flows, Google provider support. |
| Analytics | `src/web/app/analytics/page.tsx`, `components/Analytics/AnalyticsChart.tsx`, `src/analytics/**` | Admin-only dashboards aggregating drill performance. |
| Data APIs | `src/web/app/api/files/**`, `src/web/lib/cache/localDataCache.ts` | Serve local JSON datasets to the client; caching avoids repeated disk reads. |
| Game APIs | `src/web/app/api/game/**`, `lib/shared/src/types/game.ts` | Create rounds/matches, store drill results in Supabase. |
| Error Handling | `src/web/app/error.tsx`, `components/ErrorBoundary/**`, `lib/config/errorConfig.ts` | Centralized error boundaries and configuration. |
| Documentation | `docs/**` | Architectural overviews (ARCHITECTURE, DATA_FLOW, API_PATTERNS, COMPONENT_PATTERNS, CODE_METRICS). |

## 5. Typical Workflows

1. **Adding a Component**
   - Create component under `src/web/components/<Feature>/`.
   - Add JSDoc header + prop docs.
   - Update relevant barrel (`index.ts`) for re-export.
   - Update documentation (component README or docs/Component Patterns) if necessary.

2. **Updating an API Route**
   - Modify handler in `src/web/app/api/<path>/route.ts`.
   - Ensure shared logic lives under `_shared` utilities where possible.
   - Update OpenAPI generator (e.g., `src/web/openapi/routes/analytics.ts`) so docs remain accurate.
   - Consider updating tests or mock data if present.

3. **Working with Local Data**
   - Data sits under `data/quality_breakouts`. Use `localDataCache` helpers rather than reading files directly.
   - For new datasets, update `localDataCache` path resolution constants if required.

4. **Regenerating docs / metrics**
   - See `docs/CODE_METRICS.md` for LOC scripts.
   - Use dependency-cruiser commands (documented previously) to rebuild dependency graphs as needed.

## 6. Tips for AI Agents

- **Navigate via CLI + targeted `read_file`:** Avoid scanning the entire repo; request specific files or directories based on the structure above.
- **Preserve headers & exports:** When editing, keep `"use client"` directives, file headers, and barrel exports intact.
- **Mind dataset size:** The `data/` folder is large—don’t attempt to enumerate all files. Use caching utilities or request samples.
- **Check for acceptance:** Some files are filtered by `.cursorignore`; a warning may mean the file is large or deliberately excluded.
- **Use documentation:** The `docs/` folder and in-file comments explain architecture, patterns, and constraints—consult before refactoring.
- **Testing:** Functional tests are sparse; rely on manual validation and ensure API routes return JSON with `success` flags as expected.

---

_Update cadence:_ Review this guide alongside quarterly metrics to ensure references to file locations and patterns stay current.
