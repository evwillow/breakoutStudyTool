"use client"

import { useState, useEffect, useRef } from "react"
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
 * - Enhanced mobile-friendly navigation with animated hamburger menu
 * - Sign out button for authenticated users
 * - Sign in button for non-authenticated users
 * - Links to dummy pages for future development
 */
const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: session } = useSession()
  const [scrolled, setScrolled] = useState(false)
  const mobileMenuRef = useRef(null)

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        if (window.scrollY > 10) {
          setScrolled(true)
        } else {
          setScrolled(false)
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileMenuOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (mobileMenuOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }
    
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
    }
  }, [mobileMenuOpen])

  // Navigation links
  const navLinks = [
    { name: "Study", href: "/" },
    { name: "Analytics", href: "/analytics" },
    { name: "Learn", href: "/learn" },
    { name: "Community", href: "/community" },
    { name: "Support", href: "/support" }
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
            {/* Sign Out Button - Only shown when user is authenticated and on desktop */}
            {session && (
              <button
                onClick={() => signOut({ redirect: false })}
                className="hidden md:flex px-4 py-2 bg-gray-800 text-white text-sm rounded-md shadow hover:bg-gray-700 transition items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zM2 4a2 2 0 012-2h5.586a1 1 0 01.707.293l6 6a1 1 0 01.293.707V16a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                Sign Out
              </button>
            )}
            
            {/* Sign In Button - Only shown when user is not authenticated */}
            {!session && <SignInButton className="hidden md:flex" />}
            
            {/* Mobile menu button - Enhanced with animation and vertically centered */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-turquoise-600 hover:bg-gray-100 focus:outline-none transition-colors my-auto"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              <div className="relative w-6 h-6 flex items-center justify-center">
                <span className={`absolute h-0.5 w-6 bg-current transform transition duration-300 ease-in-out ${mobileMenuOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'}`}></span>
                <span className={`absolute h-0.5 w-6 bg-current transform transition duration-300 ease-in-out ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                <span className={`absolute h-0.5 w-6 bg-current transform transition duration-300 ease-in-out ${mobileMenuOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'}`}></span>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* Enhanced Mobile Navigation with slide-in animation */}
      <div 
        ref={mobileMenuRef}
        className={`fixed inset-0 bg-gray-800 bg-opacity-50 z-40 md:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div 
          className={`fixed right-0 top-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b">
              <span className="font-bold text-gray-800">Menu</span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col space-y-3">
                {navLinks.map((link) => (
                  <Link 
                    key={link.name} 
                    href={link.href}
                    className="px-3 py-2 text-gray-600 hover:text-turquoise-600 hover:bg-gray-50 rounded-md font-medium transition-colors flex items-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                    {link.name}
                  </Link>
                ))}
              </div>
            </nav>
            
            <div className="p-4 border-t">
              {session ? (
                <button
                  onClick={() => {
                    signOut({ redirect: false })
                    setMobileMenuOpen(false)
                  }}
                  className="w-full px-4 py-2 bg-gray-800 text-white text-sm rounded-md shadow hover:bg-gray-700 transition flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zM2 4a2 2 0 012-2h5.586a1 1 0 01.707.293l6 6a1 1 0 01.293.707V16a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                  Sign Out
                </button>
              ) : (
                <div onClick={() => setMobileMenuOpen(false)}>
                  <SignInButton />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
