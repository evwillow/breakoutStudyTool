"use client"

import { useState, useEffect } from "react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import Logo from "./Logo"
import SignInButton from "../SignInButton"

/**
 * Header Component
 * 
 * Main application header that appears on all pages including the welcome page.
 * Features:
 * - Responsive design with logo and navigation links
 * - Mobile-friendly navigation with hamburger menu
 * - Sign out button for authenticated users
 * - Sign in button for non-authenticated users
 * - Links to dummy pages for future development
 */
const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: session } = useSession()
  const [scrolled, setScrolled] = useState(false)

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Navigation links
  const navLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Learn", href: "/learn" },
    { name: "Analytics", href: "/analytics" },
    { name: "Community", href: "/community" },
  ]

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      scrolled ? "bg-white shadow-md" : "bg-white/95"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Logo />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href}
                className="text-gray-600 hover:text-turquoise-600 font-medium transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Authentication Buttons */}
          <div className="flex items-center space-x-4">
            {/* Sign Out Button - Only shown when user is authenticated */}
            {session && (
              <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-gray-800 text-white text-sm rounded-md shadow hover:bg-gray-700 transition flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zM2 4a2 2 0 012-2h5.586a1 1 0 01.707.293l6 6a1 1 0 01.293.707V16a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                Sign Out
              </button>
            )}
            
            {/* Sign In Button - Only shown when user is not authenticated */}
            <SignInButton />
            
            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-turquoise-600 hover:bg-gray-100 focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-gray-200">
            <div className="flex flex-col space-y-2 pb-3">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.href}
                  className="px-3 py-2 text-gray-600 hover:text-turquoise-600 hover:bg-gray-50 rounded-md font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
