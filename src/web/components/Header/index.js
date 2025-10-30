"use client"

import { useState, useEffect, useRef } from "react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import Logo from "./Logo"
import { SignInButton, AuthModal } from "../Auth"

/**
 * Header Component
 * 
 * Main application header that appears on all pages including the welcome page.
 * Features:
 * - Responsive design with logo and navigation links
 * - Enhanced mobile-friendly navigation with animated hamburger menu
 * - Sign out button for authenticated users
 * - Sign in button for non-authenticated users with auth modal
 * - Links to dummy pages for future development
 */
const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { data: session } = useSession()
  const [scrolled, setScrolled] = useState(false)
  const mobileMenuRef = useRef(null)
  const userMenuRef = useRef(null)

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === 'undefined') return
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target) && userMenuOpen) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileMenuOpen, userMenuOpen])

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

  // Navigation links for authenticated users
  const navLinks = [
    { name: "Study", href: "/" },
    { name: "Analytics", href: "/analytics" },
    { name: "Learn", href: "/learn" },
    { name: "Community", href: "/community" },
    { name: "Support", href: "/support" }
  ]

  // Navigation links for non-authenticated users
  const publicNavLinks = [
    { name: "Support", href: "/support" }
  ]

  // Only show the appropriate links based on authentication status
  const displayedLinks = session ? navLinks : publicNavLinks

  // Function to handle scrolling to sections
  const handleScrollTo = (e, id) => {
    e.preventDefault()
    // Close mobile menu if open
    if (mobileMenuOpen) {
      setMobileMenuOpen(false)
    }
    
    // Get the target element and scroll to it
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    } else {
      // If element not found, go to the homepage with the hash
      window.location.href = `/#${id}`
    }
  }

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-colors duration-300 ease-out ${
        scrolled ? "bg-white shadow-md backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <div className="w-full px-2 sm:px-4 lg:px-8">
        <div className="relative grid grid-cols-3 h-14 items-center max-[800px]:items-start">
          {/* Logo - left aligned */}
          <div className="justify-self-start flex-shrink-0 mr-1 sm:mr-2 z-20 max-[800px]:pl-2 max-[800px]:pt-1">
            <Logo scrolled={scrolled} />
          </div>

          {/* Centered navigation at >=800px */}
          <nav className="hidden max-[800px]:hidden min-[800px]:flex justify-center space-x-4 z-10">
            {displayedLinks.map((link) => (
              link.isScroll ? (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href.split('#')[1])}
                  className={`${scrolled ? "text-gray-800 hover:text-turquoise-600" : "text-white hover:text-turquoise-300"} font-medium transition-colors whitespace-nowrap px-1`}
                >
                  {link.name}
                </a>
              ) : (
                <Link 
                  key={link.name} 
                  href={link.href}
                  className={`${scrolled ? "text-gray-800 hover:text-turquoise-600" : "text-white hover:text-turquoise-300"} font-medium transition-colors whitespace-nowrap px-1`}
                >
                  {link.name}
                </Link>
              )
            ))}
          </nav>

          {/* Authentication / User menu - right aligned */}
          <div className="justify-self-end flex items-center ml-1 sm:ml-2 z-20 relative pr-2 pt-1 max-[800px]:absolute max-[800px]:top-1 max-[800px]:right-2 max-[800px]:ml-0 max-[800px]:pr-0">
            {session ? (
              <div className="relative hidden min-[800px]:block" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm transition whitespace-nowrap ${
                    scrolled ? "text-gray-800 hover:bg-gray-100" : "text-white hover:bg-white/10"
                  }`}
                >
                  {`Hi, ${session.user?.name || 'User'}`}
                  <svg className="h-4 w-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-lg overflow-hidden">
                    <div className="px-4 py-3">
                      <p className="text-sm text-gray-500">Signed in as</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{session.user?.email || 'user@example.com'}</p>
                    </div>
                    <div className="border-t" />
                    <button
                      onClick={() => { setUserMenuOpen(false); signOut({ redirect: false }) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <SignInButton 
                className="hidden min-[800px]:inline-flex items-center" 
                onClick={() => setShowAuthModal(true)}
              />
            )}
            
            {/* Mobile menu button - Shown only when navigation is hidden */}
            <button
              type="button"
              className="min-[800px]:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-turquoise-600 hover:bg-gray-100 focus:outline-none transition-colors"
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
        className={`fixed inset-0 bg-gray-800 bg-opacity-50 z-40 min-[800px]:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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
                <Link 
                  href="/"
                  className="px-3 py-2 text-gray-600 hover:text-turquoise-600 hover:bg-gray-50 rounded-md font-medium transition-colors flex items-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                  Home
                </Link>
                {displayedLinks.map((link) => (
                  link.isScroll ? (
                    <a 
                      key={link.name}
                      href={link.href}
                      className="px-3 py-2 text-gray-600 hover:text-turquoise-600 hover:bg-gray-50 rounded-md font-medium transition-colors flex items-center"
                      onClick={(e) => handleScrollTo(e, link.href.split('#')[1])}
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                      {link.name}
                    </a>
                  ) : (
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
                  )
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
                <div className="flex items-center justify-center" onClick={() => setMobileMenuOpen(false)}>
                  <SignInButton 
                    className="w-full" 
                    onClick={() => {
                      setShowAuthModal(true)
                      setMobileMenuOpen(false)
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          open={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}
    </header>
  )
}

export default Header
