# Breakout Study Tool

[![Next.js](https://img.shields.io/badge/Next.js-15.1.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Storage-3ECF8E?logo=supabase)](https://supabase.io/)

A full-stack web application for studying breakout patterns in stock charts.  
The tool enables traders and researchers to practice recognizing breakouts, analyze real setups, and track accuracy across timeframes.

---

## Overview

The Breakout Study Tool merges data engineering, visualization, and authentication into one cohesive learning platform.  
It uses Supabase for authentication and storage, and Google Drive APIs for scalable chart access.  
The app provides interactive flashcard-style learning for breakout pattern mastery.

**Live Demo:** [trade.evwillow.com](https://trade.evwillow.com) *(private instance)*

---

## Features

- Multi-timeframe chart visualization (minute to daily)
- Interactive flashcard practice with accuracy feedback
- Supabase authentication and user tracking
- Google Drive integration for large chart datasets
- Performance analytics and data diagnostics
- Responsive Tailwind CSS design
- Error boundaries, rate limiting, and safe fallbacks
- CI/CD via GitHub Actions and DigitalOcean

---

## Tech Stack

**Frontend:** Next.js, React, TypeScript, Tailwind CSS  
**Backend & Auth:** Supabase (PostgreSQL, Auth, Storage)  
**Data:** Google Drive API  
**Visualization:** Recharts, custom StockChart components  
**Deployment:** DigitalOcean with GitHub Actions  
**Analytics:** Google Analytics (gtag)  

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── _shared/
│   │   │   ├── clients/
│   │   │   ├── middleware/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── debug/
│   │   ├── files/
│   │   └── game/
│   ├── dashboard/
│   ├── analytics/
│   ├── community/
│   ├── database-status/
│   ├── stock-data-diagnostic/
│   ├── support/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── providers.tsx
│   ├── error.tsx
│   └── not-found.tsx
│
├── components/
│   ├── Auth/
│   │   ├── AuthButtons/
│   │   ├── AuthModal/
│   │   ├── hooks/
│   │   └── utils/
│   ├── ChartSection/
│   ├── DateFolderBrowser/
│   ├── Flashcards/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── Features/
│   ├── FolderSection/
│   ├── Header/
│   ├── LandingPage/
│   ├── StockChart/
│   ├── UI/
│   ├── ErrorBoundary/
│   ├── FallbackUI/
│   └── GoogleAnalytics.tsx
│
├── lib/
│   ├── auth/
│   │   ├── services/
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── auth.ts
│   ├── supabase.js
│   ├── github.js
│   ├── googleDrive.js
│   ├── rateLimit.ts
│   └── gtag.ts
│
├── utils/
│   ├── errorHandling.ts
│   ├── logger.ts
│   ├── fetcher.ts
│   ├── calculateSMA.js
│   ├── csvLoader.js
│   ├── jwt.js
│   ├── useAsync.ts
│   └── useFormValidation.ts
│
├── config/
│   ├── analytics.ts
│   ├── errorConfig.ts
│   ├── supabase.js
│   └── service-account.json
│
├── hooks/
│   └── useAuthRedirect.ts
│
├── types/
│   └── next-auth.d.ts
│
├── styles/
│   └── globals.css
│
├── pages/
│   └── test-hourly.js
│
└── Flashcards.js
```

---

## Installation

### Prerequisites
- Node.js 18 or higher  
- npm or yarn  
- Supabase project  
- Google Drive API credentials  

### Steps

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/evwillow/breakoutStudyTool.git
   cd breakoutStudyTool
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Fill in Supabase and Google Drive credentials
   ```

3. **Run development server**

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

**⚠️ SECURITY WARNING: Never commit sensitive credentials to version control!**

All sensitive configuration is handled through environment variables. Copy `.env.example` to `.env.local` and fill in your actual values.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Drive API
NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY=
GOOGLE_SERVICE_ACCOUNT_PROJECT_ID=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_CLIENT_ID=
GOOGLE_DRIVE_PARENT_FOLDER_ID=

# Authentication
NEXTAUTH_SECRET=

# Optional
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=
HCAPTCHA_SECRET_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Security

This application follows security best practices:

- **No hardcoded credentials**: All sensitive data is stored in environment variables
- **Environment-based configuration**: Use `.env.local` for development, server environment variables for production
- **Secure authentication**: Supabase handles user authentication with proper session management
- **Rate limiting**: Built-in protection against abuse
- **Input validation**: All user inputs are validated and sanitized

### For Production Deployment:

1. **Never commit `.env.local` or any files containing real credentials**
2. **Set environment variables on your server/hosting platform**
3. **Use different credentials for development and production**
4. **Regularly rotate API keys and secrets**

---

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build production bundle
npm run start     # Run production build
npm run lint      # Lint for code quality
```

---

## Usage

### Practice Mode

1. Log in via Supabase authentication
2. Select a dataset or ticker folder
3. View chart sequences and predict breakout direction
4. Submit predictions (up, down, or neutral)
5. Receive accuracy feedback and progression tracking

### Historical Analysis

1. Navigate to **Previous Setups**
2. Browse charts by date or ticker
3. Compare predictions with real outcomes

---

## Development Notes

* Built with **Next.js App Router** for routing and server components
* **Supabase** manages authentication, roles, and data sync
* **Google Drive API** powers scalable chart retrieval
* Includes **rate limiting**, **error handling**, and **fallback UI**
* Recommended Node memory config:

  ```bash
  NODE_OPTIONS=--max-old-space-size=8192
  ```

---

## Troubleshooting

**Charts not loading**

* Check Google Drive credentials and folder permissions
* Verify `GOOGLE_DRIVE_PARENT_FOLDER_ID`

**Authentication not working**

* Confirm Supabase URL and keys in `.env.local`
* Ensure database RLS allows authenticated reads/writes

**Memory errors during build**

```bash
npm run build:light
```

---

## Environment Template Example

```env
# Breakout Study Tool Environment Template
# Copy to .env.local and edit values

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key

# Google Drive API
NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY=your-api-key
GOOGLE_SERVICE_ACCOUNT_PROJECT_ID=your-project-id
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_DRIVE_PARENT_FOLDER_ID=your-folder-id

# Authentication
NEXTAUTH_SECRET=your-secret
```

---

## Recommended Workflow

1. Configure Supabase project with user auth and database tables
2. Create Google Cloud service account and enable Drive API
3. Add credentials to `.env.local`
4. Test locally with `npm run dev`
5. Deploy via DigitalOcean or Vercel with GitHub Actions

---

## Contributing

1. Fork this repository
2. Create a feature branch

   ```bash
   git checkout -b feature/new-feature
   ```
3. Commit and push changes

   ```bash
   git commit -m "Add new feature"
   git push origin feature/new-feature
   ```
4. Open a pull request

---

## License

MIT License — see `LICENSE` file for details.

---

## Goals

* Create a repeatable breakout study system for traders
* Improve pattern recognition and decision-making speed
* Provide scalable architecture for future ML-based labeling

---

## Roadmap

* Multi-user analytics leaderboard
* Live labeling and data upload pipeline
* Edge Function processing for faster chart delivery
* AI-assisted pattern classification

---

## Author

**Evan Maus**
University of California, Berkeley — Economics & Data Science
[evwillow.com](https://evwillow.com)
[LinkedIn](https://linkedin.com/in/evwillow)