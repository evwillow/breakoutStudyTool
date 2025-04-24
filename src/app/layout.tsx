/**
 * Root Layout Component
 * 
 * Defines the base layout structure for the entire application.
 * Features:
 * - Sets up font configuration with optimized font loading
 * - Configures metadata for SEO
 * - Wraps the application in necessary providers
 * - Includes the global header component
 */
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Header from "@/components/Header"
import Providers from "./providers";

// Configure Geist Sans as the primary font with optimized loading
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  adjustFontFallback: false,
})

// Configure Geist Mono for code and monospaced text with optimized loading
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
})

// Define metadata for SEO and browser tab
export const metadata: Metadata = {
  title: "Breakout Study Tool",
  description: "Tool for studying the classic Qullamaggie breakout!",
  icons: {
    icon: '/favicon.svg',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>
          <Header />
          <div className="w-full flex justify-center">
            <div className="w-full sm:w-[90%] md:w-[85%] lg:w-[75%] transition-all duration-300 ease-in-out max-w-[1400px] pt-2 pb-0">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
