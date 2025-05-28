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
import Script from "next/script"
import { Inter } from "next/font/google"
import "./globals.css"
import Providers from "./providers"
import { Header } from "@/components"

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
      <body className="font-sans antialiased">
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-6B1T4S90L0"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-6B1T4S90L0');
            `,
          }}
        />
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