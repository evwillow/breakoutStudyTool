# Breakout Study Tool

A platform for learning breakout trading patterns with interactive flashcards and real-time analysis.

## Tech Stack

- Next.js 15 with App Router
- React 19
- TypeScript
- Supabase (Auth & Database)
- Python (Data Processing)

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
breakout-study-tool/
├── src/
│   ├── web/              # Next.js frontend
│   ├── analytics/        # Analytics service
│   └── data-processing/  # Python data processing
├── lib/
│   ├── shared/           # Shared types & utilities
│   ├── ui/               # UI components
│   └── database/         # Prisma schema
└── data/                 # Dataset files
```

## Environment Variables

Required environment variables are configured in `.env.local`. See `.env.example` for reference.

## License

MIT License
