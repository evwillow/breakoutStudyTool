# Breakout Study Tool

[![Next.js](https://img.shields.io/badge/Next.js-15.1.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

> Interactive flashcard application for mastering stock chart pattern recognition and trading decision-making skills.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for authentication & data)
- Google Drive API access (for chart data)

### Installation

1. **Clone and install**
   ```bash
   git clone <your-repo-url>
   cd breakout-study-tool
   npm install
   ```

2. **Environment setup**
   ```bash
   cp env.template .env.local
   # Edit .env.local with your actual values
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open** [http://localhost:3000](http://localhost:3000)

## 🎯 Features

- **📊 Interactive Charts**: Daily, hourly, and minute timeframe analysis
- **⏱️ Timed Practice**: Realistic trading pressure simulation  
- **📈 Performance Tracking**: Monitor accuracy and improvement
- **🔐 Secure Authentication**: NextAuth.js with Supabase
- **📱 Responsive Design**: Works on desktop and mobile
- **📚 Historical Data**: Browse and analyze past setups

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── Auth/             # Authentication components
│   ├── Header/           # Navigation components
│   ├── FallbackUI/       # Error handling UI
│   ├── ChartSection.js   # Chart display
│   ├── StockChart.js     # Chart rendering
│   ├── DateFolderBrowser.js # Historical data browser
│   └── LandingPage.js    # Marketing landing page
├── lib/                  # Utility libraries
├── utils/                # Helper functions
└── Flashcards.js         # Main app component
```

## ⚙️ Configuration

### Environment Variables

Required variables (see `env.template`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Drive API
NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY=your_api_key
GOOGLE_SERVICE_ACCOUNT_PROJECT_ID=your_project_id
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=your_private_key
GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL=your_client_email
GOOGLE_DRIVE_PARENT_FOLDER_ID=your_folder_id

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret

# Optional: Analytics & Security
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_ga_id
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_hcaptcha_key
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### Available Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
```

## 🎮 Usage

### Practice Mode
1. **Sign in** to track progress
2. **Select stock folder** from dropdown
3. **Analyze charts** (Daily/Hourly/Minute views)
4. **Make prediction** (-5%, 0%, 20%, 50%)
5. **Get feedback** and continue practicing

### Historical Analysis
1. Navigate to **"Previous Setups"**
2. **Browse by date** to view historical data
3. **Click dates** to expand chart details
4. **Study patterns** to improve recognition

## 🔧 Development

### Key Dependencies
- **Next.js 15.1.6**: React framework with App Router
- **React 19**: UI library
- **Tailwind CSS**: Utility-first styling
- **Supabase**: Authentication and database
- **NextAuth.js**: Authentication framework
- **Recharts**: Chart visualization
- **Google APIs**: Drive integration for data

### Memory Configuration
The project uses increased memory allocation for large datasets:
```bash
NODE_OPTIONS=--max-old-space-size=8192
```

## 🐛 Troubleshooting

### Common Issues

**Build fails with memory errors:**
```bash
npm run build:light  # Uses memory optimization
```

**Authentication not working:**
- Verify Supabase credentials in `.env.local`
- Check NEXTAUTH_SECRET is set

**Charts not loading:**
- Confirm Google Drive API credentials
- Verify folder permissions and IDs

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details.

---

<div align="center">
  <p>Built with ❤️ using Next.js, React, and Tailwind CSS</p>
</div>