# TradeMaster - Stock Trading Flashcard Application

<div align="center">
  <img src="public/tradeMaster-logo.png" alt="TradeMaster Logo" width="200"/>
  <p><em>Enhance your stock trading skills through interactive practice</em></p>
</div>

## 🚀 Overview

TradeMaster is an interactive web application designed to help traders improve their chart reading and decision-making skills. The application presents users with historical stock charts and challenges them to predict price movements within a timed environment, simulating real-world trading scenarios.

![TradeMaster Demo](https://github.com/evwillow/trade/raw/main/public/demo.gif)

## ✨ Features

- **Interactive Stock Charts**: View daily, hourly, and minute-based stock charts with price and volume data
- **Timed Practice Sessions**: Simulate real-world trading pressure with configurable timers
- **Historical Data Analysis**: Browse and analyze previous stock setups from various time periods
- **Performance Tracking**: Monitor your prediction accuracy and improvement over time
- **User Authentication**: Secure login system to save your progress and statistics
- **Responsive Design**: Optimized for both desktop and mobile devices

## 📋 Table of Contents

- [Installation](#-installation)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Authentication](#-authentication)
- [API Endpoints](#-api-endpoints)
- [Contributing](#-contributing)
- [License](#-license)

## 🔧 Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase account for authentication and data storage

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/trade.git
   cd trade
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env.local`:
   ```
   NEXTAUTH_SECRET=your_secret_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎮 Usage

### Practice Mode

1. **Sign in** to your account to track your progress
2. Select a **stock folder** from the dropdown menu
3. View the displayed charts (Daily, Hourly, Minute)
4. Make your prediction by clicking one of the action buttons (-5%, 0%, 20%, 50%)
5. Receive immediate feedback on your prediction
6. Continue practicing until the timer expires
7. Review your session statistics

### Historical Data Browser

1. Navigate to the "Previous Setups" section
2. Browse through historical stock data organized by date
3. Click on any date to expand and view the corresponding chart
4. Analyze past setups to improve your pattern recognition skills

## 🏗️ Project Structure

```
trade/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── api/             # API endpoints
│   │   ├── page.tsx         # Main application page
│   │   └── layout.tsx       # Root layout component
│   ├── components/          # Reusable UI components
│   │   ├── ChartSection.js  # Chart display component
│   │   ├── StockChart.js    # Stock chart rendering
│   │   ├── DateFolderBrowser.js # Historical data browser
│   │   └── ...              # Other components
│   ├── config/              # Configuration files
│   ├── lib/                 # Utility libraries
│   └── Flashcards.js        # Main application component
├── public/                  # Static assets
├── data/                    # Stock data files
└── package.json             # Project dependencies
```

## 🔐 Authentication

TradeMaster uses NextAuth.js with Supabase for authentication:

- **Sign Up**: Create a new account with email and password
- **Sign In**: Log in with existing credentials
- **Session Management**: Secure session handling with JWT tokens
- **Protected Routes**: Access control for authenticated users

## 🌐 API Endpoints

- `/api/auth/*`: Authentication endpoints
- `/api/getFolders`: Retrieve available stock folders
- `/api/getFileData`: Get chart data for a specific stock
- `/api/getStockFiles`: Retrieve stock files from Google Drive or local storage
- `/api/createRound`: Create a new practice session
- `/api/updateStats`: Update user statistics
- `/api/getUserRounds`: Retrieve user's practice history

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<div align="center">
  <p>Built with ❤️ using Next.js, React, and Tailwind CSS</p>