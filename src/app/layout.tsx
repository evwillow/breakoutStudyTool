/**
 * Root Layout Component
 * 
 * Defines the base layout structure for the entire application.
 * Features:
 * - Sets up font configuration with multiple modern fonts
 * - Configures metadata for SEO
 * - Wraps the application in necessary providers
 * - Includes the global header component
 */
import type { Metadata } from "next"
import { Geist, Geist_Mono, Inter, Space_Grotesk, DM_Sans, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import Header from "@/components/Header"
import Providers from "./providers";

// Configure Geist Sans as the primary font
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

// Configure Geist Mono for code and monospaced text
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// Configure Inter as an alternative UI font
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

// Configure Space Grotesk for financial data visualization
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
})

// Configure DM Sans for clean, minimal text
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
})

// Configure Plus Jakarta Sans for professional financial data
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${spaceGrotesk.variable} ${dmSans.variable} ${plusJakartaSans.variable} antialiased`}
      >
        <Providers>
          <Header />
          <div className="w-full flex justify-center">
            <div className="w-full sm:w-[90%] md:w-[85%] lg:w-[75%] transition-all duration-300 ease-in-out max-w-[1400px]">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
