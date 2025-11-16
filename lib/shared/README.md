# Shared Library (`lib/shared`)

This package provides cross-cutting TypeScript utilities shared by the web app, API routes, and node services.

## Contents

- **`src/types/`** – Shared type definitions (analytics, API payloads, auth, charts, flashcards, game, etc.).
- **`src/index.ts`** – Barrel export aggregating shared types/utilities.
- **`src/utils/`** – Common helpers (date formatting, validation, formatting).

## Usage

Import from the package alias:

```ts
import type { DetailedUserAnalytics } from '@breakout-study-tool/shared';
import { formatDate } from '@breakout-study-tool/shared/utils/date';
```

## Conventions

- All exports must be platform-agnostic (no browser-only APIs).
- Types should represent API contracts or domain objects used across layers.
- Utilities should be pure functions or minimal wrappers around standard libraries.
