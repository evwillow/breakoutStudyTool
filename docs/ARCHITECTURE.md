# Breakout Study Tool Architecture

## Overview

Breakout Study Tool is a monorepo-driven learning platform that helps traders practice and evaluate breakout scenarios. It combines a Next.js 15 web application, shared TypeScript libraries, and supporting Node/Python utilities for analytics and data processing. The requirements emphasize immersive chart replays, instant feedback, and admin analytics.

The system is organized into three tiers:

1. **Presentation Layer (Next.js App Router)**
   - Client-side heavy components (e.g., `StockChart`, `ChartSection`, flashcard workflow) rendered in the `src/web` package.
   - Authenticated experiences managed by NextAuth and reusable UI primitives published from `lib/ui`.
   - Real-time feedback overlays pairing chart interactions with scoring.

2. **Application Services**
   - Serverless API routes in `src/web/app/api/**` handle flashcard data access, game logging, auth flows, analytics, and file browsing.
   - Shared business logic extracted into `lib/shared` (types, validation, helpers) and `lib/database` (Prisma models when persistence is used).
   - Rate limiting, logging, error handling, and analytics instrumentation provided through shared utilities.

3. **Data & Integrations**
   - Supabase/PostgreSQL hosts user, match, and round data (accessed via API routes and Prisma client).
   - FastAPI + Python instruments collect historical market data and compute analytics (see `src/data-processing` and `src/analytics`).
   - Google Analytics & Supabase Auth handle telemetry and authentication.

## Packages

```
monorepo/
├─ src/
│  ├─ web/                 # Next.js application
│  ├─ analytics/           # Python GA aggregation + reporting runner
│  └─ data-processing/     # Python pipelines for stock data downloads
├─ lib/
│  ├─ shared/              # Type-safe DTOs, utilities shared across layers
│  ├─ ui/                  # UI primitives (component library)
│  └─ database/            # Prisma schema + migrations
└─ docs/                   # Architecture, API, component guidelines
```

## Core Workflows

- **Flashcard Gameplay**: `FlashcardsContainer` orchestrates folder selection, timer management, chart rendering, and scoring. API routes supply local JSON datasets, record matches, and manage rounds.
- **Analytics Dashboards**: Admin experiences fetch aggregated metrics (`/api/analytics`) backed by Supabase queries and optional GA enrichment.
- **Data Processing**: Python scripts download, normalize, and archive stock data which is exposed as JSON files consumed in flashcards.

## Cross-Cutting Concerns

- **Authentication**: NextAuth with Supabase providers ensures secure session management.
- **Error Handling**: `ErrorBoundary` + fallback components provide consistent UX and integrate with central logging.
- **Instrumentation**: GA, custom logger, and OpenAPI-described API endpoints promote observability and maintainability.
