# Breakout Study Tool

[![Next.js](https://img.shields.io/badge/Next.js-15.1.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Storage-3ECF8E?logo=supabase)](https://supabase.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-1.10.12-EF4444?logo=turborepo)](https://turbo.build/)

A comprehensive, SEO-optimized platform for learning breakout trading patterns with real-time AI insights and educational content. Built as a scalable monorepo with modern technologies.

**Live Demo:** [trade.evwillow.com](https://trade.evwillow.com) *(private instance)*

---

## Architecture Overview

This project is structured as a consolidated monorepo, designed for scalability and maintainability:

```
breakout-study-tool/
├── src/
│   ├── web/                    # Next.js 15 + App Router (Frontend)
│   ├── api/                    # Express + tRPC (Backend API)
│   └── data-processing/        # Python + yfinance data system
├── lib/
│   ├── shared/                 # Shared types & utilities
│   ├── ui/                     # Design system (Radix UI)
│   └── database/               # Prisma schema & client
├── config/                     # Configuration files
├── scripts/                    # Utility scripts
└── docs/                       # Documentation
```

---

## Features

### Core Learning Platform
- **Interactive Flashcards**: Practice breakout pattern recognition
- **Multi-timeframe Analysis**: Minute to daily chart visualization
- **Performance Tracking**: Accuracy analytics and progress monitoring
- **Real-time Feedback**: Instant validation of predictions

### Educational Content (SEO-Optimized)
- **Blog System**: Educational articles on trading patterns
- **Tutorial Guides**: Step-by-step trading education
- **Market Analysis**: Daily/weekly market insights
- **Pattern Library**: Comprehensive breakout pattern database

### AI-Powered Insights (Future)
- **Real-time Alerts**: Live breakout notifications
- **Pattern Recognition**: AI-assisted pattern detection
- **Market Sentiment**: Automated market analysis
- **Predictive Analytics**: ML-powered predictions

### Monetization
- **Free Trial**: 7-day trial with limited features
- **Premium Subscription**: Unlimited access and advanced features
- **Educational Content**: Free and premium content tiers

---

## Tech Stack

### Frontend
- **Next.js 15** - App Router with Server Components
- **React 19** - Latest with concurrent features
- **TypeScript** - End-to-end type safety
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Smooth animations
- **React Query** - Data fetching & caching
- **Zustand** - State management

### Backend
- **Express** - Web framework
- **tRPC** - Type-safe API layer
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database (via Supabase)
- **Redis** - Caching & sessions
- **NextAuth.js** - Authentication

### Data Processing
- **Python FastAPI** - Data processing service
- **yfinance** - Stock data source
- **Celery** - Background task processing
- **Pandas/NumPy** - Data manipulation

### SEO & Performance
- **next-seo** - SEO optimization
- **next-sitemap** - Sitemap generation
- **MDX** - Content management
- **Vercel Edge** - Global CDN

---

## Project Structure

### Source Code

#### `src/web` - Frontend Application
```
src/web/
├── app/                       # Next.js App Router
│   ├── (marketing)/          # Public pages (SEO-optimized)
│   │   ├── page.tsx          # Landing page
│   │   ├── pricing/          # Pricing page
│   │   └── about/            # About page
│   ├── (dashboard)/          # Protected app pages
│   │   ├── dashboard/        # Main dashboard
│   │   ├── practice/         # Flashcard system
│   │   ├── analytics/        # User analytics
│   │   └── settings/         # User settings
│   ├── blog/                 # Educational content
│   │   ├── page.tsx          # Blog index
│   │   ├── [slug]/           # Individual posts
│   │   └── category/         # Category pages
│   └── api/                  # API routes
├── components/               # Reusable components
│   ├── ui/                   # Radix UI components
│   ├── forms/                # Form components
│   ├── charts/               # Chart components
│   ├── flashcards/           # Flashcard system
│   └── layout/               # Layout components
├── lib/                      # Utilities & config
├── stores/                   # Zustand stores
└── hooks/                    # Custom hooks
```

#### `src/api` - Backend API
```
src/api/
├── routers/                  # tRPC routers
│   ├── auth.ts              # Authentication
│   ├── subscription.ts      # Subscription management
│   ├── game.ts              # Game logic
│   └── stock.ts             # Stock data
├── services/                # Business logic
├── db/                      # Database layer
└── middleware/              # Auth, rate limiting
```

#### `src/data-processing` - Python Data System
```
src/data-processing/
├── api/                     # FastAPI endpoints
├── services/                # Data processing
├── models/                  # Data models
└── utils/                   # Utilities
```

### Libraries

#### `lib/shared` - Shared Types & Utilities
- TypeScript types for all entities
- Common utility functions
- Validation schemas (Zod)
- Date/time formatting

#### `lib/ui` - Design System
- Radix UI component library
- Consistent styling with Tailwind
- Accessible components
- Theme system

#### `lib/database` - Database Layer
- Prisma schema
- Database client
- Migrations
- Seed data

---

## Development Setup

### Prerequisites
- Node.js 18+
- Python 3.8+
- PostgreSQL (via Supabase)
- Redis (Upstash)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/evwillow/breakoutStudyTool.git
   cd breakoutStudyTool
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual credentials
   ```

3. **Set up database**
   ```bash
   cd lib/database
   npm run db:generate
   npm run db:push
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Authentication
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Google Drive (for chart data)
GOOGLE_DRIVE_API_KEY="your-api-key"
GOOGLE_SERVICE_ACCOUNT_EMAIL="service@project.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```

---

## SEO Strategy

### Content Structure
- **Landing Page**: Optimized for "breakout trading patterns"
- **Blog**: Educational content for "trading education"
- **Pattern Library**: "stock chart analysis" keywords
- **Tutorials**: Long-tail keywords for specific patterns

### Technical SEO
- **App Router**: Optimal performance and SEO
- **Static Generation**: Blog content pre-rendered
- **Dynamic Meta Tags**: User-specific content
- **Structured Data**: Financial content markup
- **Core Web Vitals**: Performance optimization

### Content Calendar
- **Weekly**: 2-3 educational articles
- **Daily**: Market analysis posts (automated)
- **On-demand**: Tool updates and features

---

## Deployment

### Frontend (Vercel)
```bash
npm run build
# Deploy to Vercel
```

### Backend (Railway/Render)
```bash
cd src/api
npm run build
# Deploy with Docker
```

### Data Processing (Python)
```bash
cd src/data-processing
pip install -r requirements.txt
# Deploy with Docker
```

---

## Performance & Scalability

### Frontend Optimization
- **Code Splitting**: Dynamic imports for heavy components
- **Image Optimization**: Next.js Image + Cloudinary
- **Caching**: Multi-layer caching strategy
- **CDN**: Vercel Edge Network

### Backend Scaling
- **Database Indexing**: Optimized queries
- **Redis Caching**: Session and data caching
- **Rate Limiting**: Per-user and per-endpoint
- **Microservices**: Independent scaling

### Monitoring
- **Sentry**: Error tracking
- **Vercel Analytics**: Performance monitoring
- **PostHog**: Product analytics
- **Uptime Monitoring**: Health checks

---

## Security

- **Authentication**: Supabase Auth with MFA
- **Authorization**: Role-based access control
- **Input Validation**: Zod schemas throughout
- **Rate Limiting**: Protection against abuse
- **CORS**: Properly configured
- **Environment Variables**: No hardcoded secrets

---

## Development Workflow

### Code Quality
- **ESLint**: Strict TypeScript rules
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Jest**: Unit testing
- **Playwright**: E2E testing

### CI/CD
- **GitHub Actions**: Automated testing
- **Turborepo**: Build orchestration
- **Vercel**: Frontend deployment
- **Railway**: Backend deployment

---

## Roadmap

### Phase 1: Foundation (4-6 weeks)
- [x] Monorepo setup with Turborepo
- [x] Next.js 15 with App Router
- [x] TypeScript configuration
- [x] Database schema with Prisma
- [ ] Authentication system
- [ ] Basic flashcard system

### Phase 2: Content & SEO (3-4 weeks)
- [ ] Blog system with MDX
- [ ] SEO optimization
- [ ] Content management
- [ ] User analytics dashboard

### Phase 3: AI Integration (4-6 weeks)
- [ ] Python data processing service
- [ ] Real-time WebSocket connections
- [ ] AI insights dashboard
- [ ] Pattern recognition system

### Phase 4: Production (2-3 weeks)
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Monitoring setup
- [ ] Production deployment

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Author

**Evan Maus**
- University of California, Berkeley — Economics & Data Science
- [evwillow.com](https://evwillow.com)
- [LinkedIn](https://linkedin.com/in/evwillow)

---

## Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing framework
- [Supabase](https://supabase.io/) for backend services
- [Radix UI](https://radix-ui.com/) for accessible components
- [Turborepo](https://turbo.build/) for monorepo management