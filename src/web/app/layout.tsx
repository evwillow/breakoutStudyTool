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
import { getGoogleAnalyticsScript, getGoogleAnalyticsConfig } from "@/lib/config/analytics"

// Define metadata for SEO and browser tab
export const metadata: Metadata = {
  metadataBase: new URL("https://breakoutstudytool.com"),
  title: "Breakout Trading Practice | Breakout Study Tool",
  description: "Train breakout recognition with focused drills, instant after-chart feedback, and progress tracking designed for active traders.",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: "Breakout Trading Practice | Breakout Study Tool",
    description: "Sharpen your breakout execution with curated drills, instant feedback, and trader-built workflows.",
    url: "https://breakoutstudytool.com",
    siteName: "Breakout Study Tool",
    images: [
      {
        url: "/og-preview.svg",
        width: 1200,
        height: 630,
        alt: "Breakout Study Tool preview showing breakout drill interface",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Breakout Trading Practice | Breakout Study Tool",
    description: "Practice breakouts faster with trader-built drills and instant feedback.",
    images: ["/og-preview.svg"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Safely get analytics configuration (may be null in development)
  let analyticsScript = null;
  let analyticsConfig = null;
  
  try {
    analyticsScript = getGoogleAnalyticsScript();
    analyticsConfig = getGoogleAnalyticsConfig();
  } catch (error) {
    // Silently fail analytics setup if there's an error
    // This prevents analytics errors from breaking the app
    console.error('Analytics configuration error:', error);
  }

  return (
    <html lang="en">
      <body className="font-sans antialiased overflow-x-hidden">
        {/* ChunkLoadError handler - runs before React loads */}
        <Script
          id="chunk-error-handler"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Handle chunk loading errors early
                window.addEventListener('error', function(e) {
                  if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
                    var src = e.target.src || e.target.href || '';
                    if (src && (src.indexOf('/_next/static/') !== -1 || src.indexOf('chunk') !== -1)) {
                      if (!sessionStorage.getItem('chunk-reload-attempted')) {
                        sessionStorage.setItem('chunk-reload-attempted', 'true');
                        setTimeout(function() {
                          window.location.reload();
                        }, 1000);
                      }
                    }
                  }
                }, true);
                
                // Handle unhandled promise rejections for chunk errors
                window.addEventListener('unhandledrejection', function(e) {
                  var reason = e.reason;
                  if (reason && typeof reason === 'object') {
                    var errorName = reason.name || (reason.constructor && reason.constructor.name) || '';
                    var errorMessage = reason.message || String(reason) || '';
                    if (errorName === 'ChunkLoadError' || 
                        errorMessage.indexOf('Loading chunk') !== -1 ||
                        errorMessage.indexOf('Failed to load resource') !== -1) {
                      if (!sessionStorage.getItem('chunk-reload-attempted')) {
                        sessionStorage.setItem('chunk-reload-attempted', 'true');
                        setTimeout(function() {
                          window.location.reload();
                        }, 1000);
                      }
                    }
                  }
                });
              })();
            `,
          }}
        />
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
          <div className="min-h-screen flex flex-col">
            <Header />
            <div className="w-full flex justify-center">
              <div className="w-full sm:w-[95%] md:w-[92%] lg:w-[90%] transition-all duration-300 ease-in-out max-w-[1600px] pt-16 pb-0">
                {children}
              </div>
            </div>
            {/* Global Footer */}
            <footer className="bg-transparent py-8 mt-auto relative z-50">
              <div className="w-full flex justify-center">
                <div className="w-full sm:w-[90%] md:w-[85%] lg:w-[75%] max-w-[1400px] px-4">
                  <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="text-gray-400 text-sm mb-4 md:mb-0">
                      © 2025 Breakout Study Tool. All rights reserved.
                    </div>
                    <div className="flex space-x-6">
                      <a href="/terms" className="text-gray-400 hover:text-white text-sm transition">Terms of Service</a>
                      <a href="/support" className="text-gray-400 hover:text-white text-sm transition">Support</a>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}