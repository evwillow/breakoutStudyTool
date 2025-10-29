# Development Guide

This guide covers how to set up and develop the Breakout Study Tool locally.

## Prerequisites

- Node.js 18 or higher
- Python 3.8 or higher
- PostgreSQL (via Supabase)
- Redis (Upstash or local)

## Quick Start

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/evwillow/breakoutStudyTool.git
   cd breakoutStudyTool
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

## Project Structure

```
breakout-study-tool/
├── src/
│   ├── web/                    # Next.js frontend
│   ├── api/                    # Express backend
│   └── data-processing/        # Python data system
├── lib/
│   ├── shared/                 # Shared types & utilities
│   ├── ui/                     # Design system
│   └── database/               # Prisma schema
├── scripts/                    # Utility scripts
└── docs/                       # Documentation
```

## Available Scripts

### Root Level
- `npm run dev` - Start all development servers
- `npm run build` - Build all applications
- `npm run lint` - Lint all code
- `npm run test` - Run all tests
- `npm run setup` - Automated setup

### Individual Services
- `npm run web:dev` - Start frontend only
- `npm run api:dev` - Start backend only
- `npm run data:dev` - Start data processing only

## Development Workflow

1. **Make changes** to the appropriate service
2. **Test locally** using the development servers
3. **Run tests** to ensure nothing is broken
4. **Commit changes** with descriptive messages
5. **Push to feature branch** and create PR

## Environment Setup

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/breakout_study_tool"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### Optional Environment Variables

```env
# Google Drive (for chart data)
GOOGLE_DRIVE_API_KEY="your-api-key"
GOOGLE_SERVICE_ACCOUNT_EMAIL="service@project.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

## Database Setup

1. **Create Supabase project** at https://supabase.com
2. **Get connection string** from project settings
3. **Update DATABASE_URL** in .env.local
4. **Generate Prisma client**:
   ```bash
   cd lib/database
   npm run db:generate
   npm run db:push
   ```

## Troubleshooting

### Common Issues

1. **Module not found errors**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Database connection issues**
   - Check DATABASE_URL in .env.local
   - Ensure Supabase project is active
   - Run database setup commands

3. **Memory issues during build**
   ```bash
   NODE_OPTIONS=--max-old-space-size=8192 npm run build
   ```

### Getting Help

- Check the [API Documentation](api/README.md)
- Review the [Deployment Guide](deployment/README.md)
- Open an issue on GitHub
