# Data Flow Overview

This document outlines how data moves through the Breakout Study Tool—from ingestion to presentation.

## 1. Historical Market Data

1. **Source Acquisition**
   - Python scripts in `src/data-processing` download raw OHLC/volume data via `yfinance` or other feed APIs.
2. **Normalization**
   - Pipelines convert raw CSV/JSON into uniform structures (`D.json`, `after.json`, etc.) stored under `data/quality_breakouts/...`.
3. **Delivery**
   - Next.js API routes (e.g., `/api/files/local-data`, `/api/files/local-folders`) expose datasets to the client.
   - Flashcard components fetch these files, memoize, and pass to chart renderers.

## 2. Flashcard Gameplay

1. **Initialization**
   - `useFlashcardData` loads folder lists and flashcard metadata via API routes.
   - `FlashcardsContainer` seeds `useGameState` and `useTimer` with initial values.
2. **User Interaction**
   - Chart selections trigger client-side scoring (distance calculations) and POST requests to `/api/game/matches`.
   - Rounds are created/updated via `/api/game/rounds` endpoints.
3. **Persistence**
   - Match/round data stored in Supabase/PostgreSQL (Prisma schema under `lib/database`).
4. **Feedback Loop**
   - API responses inform UI overlays (accuracy tiers, point summaries).

## 3. Authentication & Session State

1. **Login/Signup**
   - Supabase Auth + NextAuth manage credentials and session cookies.
2. **Session Consumption**
   - Client hooks (`useSession`) guard folder browsing, round history, and data downloads.
3. **Secure APIs**
   - Protected routes verify sessions, enforce rate limits, and return sanitized payloads.

## 4. Analytics Pipeline

1. **Data Retrieval**
   - Server-side analytics module (`src/analytics/core.ts`) aggregates Supabase tables (users, rounds, matches).
   - Optional GA data merges via service account credentials.
2. **Transformation**
   - Metrics shaped into `DetailedUserAnalytics` object, converted from Maps to JSON-friendly structures.
3. **Exposure**
   - `/api/analytics` returns metrics; OpenAPI docs describe schema.
4. **Visualization**
   - Admin dashboard consumes API response and renders charts using `AnalyticsChart` primitives.

## 5. Telemetry

1. **Google Analytics**
   - `GoogleAnalytics` component injects scripts and records route changes.
2. **Logging**
   - `logger` utility captures client/server events (errors, warnings, debug info).
3. **Error Reporting**
   - `ErrorBoundary` writes processed `AppError` instances via logging pipeline.
