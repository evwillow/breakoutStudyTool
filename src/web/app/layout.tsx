/**
 * Root Layout Component
 * 
 * Defines the base layout structure for the entire application.
 * Features:
 * - Sets up font configuration with optimized font loading
 * - Configures metadata for SEO
 * - Wraps the application in necessary providers
 * - Includes the global header component
 * - Conditionally loads analytics in production
 */
import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"
import Providers from "./providers"
import { Header } from "@/components"
import { getGoogleAnalyticsScript, getGoogleAnalyticsConfig } from "@/config/analytics"

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
  const analyticsScript = getGoogleAnalyticsScript()
  const analyticsConfig = getGoogleAnalyticsConfig()

  return (
    <html lang="en">
      <body className="font-sans antialiased overflow-x-hidden">
        {/* Global subtle wave background - fixed behind all content */}
        <div className="app-bg-waves" aria-hidden="true" />
        {/* Google Analytics - Only in production */}
        {analyticsScript && (
          <Script
            strategy={analyticsScript.strategy}
            src={analyticsScript.src}
          />
        )}
        {analyticsConfig && (
          <Script
            id={analyticsConfig.id}
            strategy={analyticsConfig.strategy}
            dangerouslySetInnerHTML={analyticsConfig.dangerouslySetInnerHTML}
          />
        )}
        <Providers>
          <Header />
          <div className="w-full flex justify-center">
            <div className="w-full sm:w-[95%] md:w-[92%] lg:w-[90%] transition-all duration-300 ease-in-out max-w-[1600px] pt-16 pb-0">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}