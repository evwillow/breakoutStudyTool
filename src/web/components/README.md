# Components Directory

This folder hosts the core UI building blocks used across Breakout Study Tool. Each component includes JSDoc headers with usage guidance.

## Component Index

- **Analytics/**
  - `AnalyticsChart.tsx` – Recharts wrappers for admin dashboards.
- **Auth/** – Authentication modals, buttons, and hooks.
- **ChartSection/**
  - `ChartSection.tsx` – Orchestrates StockChart with timers, overlays, tutorials.
- **DateFolderBrowser/**
  - `DateFolderBrowser.tsx` – Displays historical setups for the current stock.
- **ErrorBoundary/**
  - `ErrorBoundary.tsx` – React error boundary with branded fallback.
- **FallbackUI/**
  - `index.tsx` – Reusable error/loading/empty state components.
- **Flashcards/**
  - `FlashcardsContainer.tsx` – Main flashcard workflow container.
  - `components/LoadingStates.tsx` – Loading and error fallbacks.
  - `hooks/` – `useFlashcardData`, `useGameState`, `useTimer` logic.
  - `utils/` – Data processing helpers.
- **Header/**
  - `Header.tsx` – Site navigation, auth controls, mobile menu.
- **LandingPage/**
  - `LandingDrillPreview.tsx` – Marketing preview of the study drill.
- **StockChart/**
  - `StockChart.tsx` – High-performance chart rendering with OHLC data.
- **Tutorial/**
  - `Tutorial.tsx` – Interactive onboarding flow.
- **UI/**
  - `BackButton.tsx` and supporting UI primitives.
- **GoogleAnalytics.tsx** – GA script injection & pageview tracking.

## Conventions

- Client components include `'use client'` directive.
- All public components export default unless indicated.
- Hooks co-located in `hooks/` folders with matching documentation.
