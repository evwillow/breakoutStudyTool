# Component Patterns

Guidelines for authoring React components in the Breakout Study Tool codebase (`src/web/components/**`).

## 1. Structure & Organization

- Components live in domain-focused directories (e.g., `Flashcards`, `ChartSection`, `UI`).
- Each component now includes:
  - JSDoc header describing purpose, usage, and when to apply it.
  - Prop documentation with types and defaults.
  - Comments on complex state/reducer logic where needed.
- Hooks are co-located in `hooks/` subdirectories with dedicated documentation.

## 2. Client vs Server Components

- Explicit `'use client'` directive for components using hooks, state, or browser APIs.
- Server components reserved for layout or data-fetching wrappers (most study UI is client-side due to interactivity).

## 3. State Management

- Prefer specialized hooks (`useFlashcardData`, `useGameState`, `useTimer`) to encapsulate logic.
- Refs track imperative behaviors (animation frames, timers, DOM measurements).
- Side effects carefully cleaned up in `useEffect` to avoid leaks (abort controllers, timeouts, event listeners).

## 4. Styling & Layout

- Tailwind CSS utilities provide layout and design fidelity.
- Gradients, overlays, and transitions emphasize immersive chart experiences.
- Components share UI primitives from `lib/ui` where possible (buttons, layouts).

## 5. Error & Loading UI

- Fallback components (`FallbackUI`) supply consistent states for network, loading, and empty data scenarios.
- Error boundaries wrap feature surfaces; fallback props allow overrides.

## 6. Charts & Visualization

- `StockChart` handles all chart rendering internally with D3 and SVG.
- `ChartSection` composes StockChart with timers, overlays, and tutorial interactions.
- Analytics charts rely on Recharts wrappers for consistent theming.

## 7. Documentation & Testing

- Every component's props and key state documented via JSDoc (high-signal for LLMs and review).
- Testing relies on Playwright/Jest (where implemented) and consistent naming for data attributes (`data-tutorial-*`).
