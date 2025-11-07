"use client"

import { useState, useEffect, useRef } from "react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import Logo from "./Logo"
import { AuthModal } from "../Auth"

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
  const [authModalMode, setAuthModalMode] = useState('signin')
  const { data: session } = useSession()
  const [scrolled, setScrolled] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(56) // Default to 3.5rem (56px)
  const mobileMenuRef = useRef(null)
  const userMenuRef = useRef(null)
  const headerRef = useRef(null)
  const hamburgerButtonRef = useRef(null)

  // Measure header height and update on resize/menu toggle
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        // Since header is fixed at top: 0, use bottom position for exact placement
        // This accounts for borders, padding, and any height changes
        const rect = headerRef.current.getBoundingClientRect()
        // Use bottom edge position (since top is 0, bottom = height)
        // Round up to ensure no sub-pixel gaps
        const exactBottom = Math.ceil(rect.bottom)
        setHeaderHeight(exactBottom)
      }
    }
    
    // Initial measurement
    updateHeaderHeight()
    
    // Update on resize
    window.addEventListener('resize', updateHeaderHeight)
    
    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [])

  // Re-measure when menu opens/closes to catch border changes
  useEffect(() => {
    if (!headerRef.current) return

    const updateHeaderHeight = () => {
      const rect = headerRef.current.getBoundingClientRect()
      const exactBottom = Math.ceil(rect.bottom)
      setHeaderHeight(exactBottom)
    }

    // Measure immediately
    updateHeaderHeight()
    
    // Measure after DOM updates and border transition
    let raf2, t1, t2
    const raf1 = requestAnimationFrame(() => {
      updateHeaderHeight()
      raf2 = requestAnimationFrame(() => {
        updateHeaderHeight()
        // Measure after border transition completes (300ms + buffer)
        t1 = setTimeout(updateHeaderHeight, 350)
        t2 = setTimeout(updateHeaderHeight, 500)
      })
    })

    return () => {
      if (raf1) cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
      if (t1) clearTimeout(t1)
      if (t2) clearTimeout(t2)
    }
  }, [mobileMenuOpen])

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
      // Don't close if clicking on the hamburger button itself
      if (hamburgerButtonRef.current && hamburgerButtonRef.current.contains(event.target)) {
        return
      }
      // Don't close if clicking anywhere in the header
      if (headerRef.current && headerRef.current.contains(event.target)) {
        // Only close if clicking outside the menu AND outside the hamburger button
        if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && mobileMenuOpen) {
          // Allow the hamburger button click to handle it instead
          return
        }
        return
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target) && userMenuOpen) {
        setUserMenuOpen(false)
      }
    }

    // Use capture phase to ensure we check before other handlers
    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('touchstart', handleClickOutside, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('touchstart', handleClickOutside, true)
    }
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

  // Direct event listener on hamburger button as ultimate safeguard
  useEffect(() => {
    const button = hamburgerButtonRef.current
    if (!button) return

    const forceColor = () => {
      button.style.color = 'rgb(75, 85, 99)' // text-gray-600
      button.style.backgroundColor = 'transparent'
    }

    const handleButtonClick = (e) => {
      forceColor()
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      setMobileMenuOpen(prev => !prev)
    }

    const handleMouseDown = (e) => {
      forceColor()
      e.stopPropagation()
      e.stopImmediatePropagation()
    }

    const handleTouchStart = (e) => {
      forceColor()
      e.stopPropagation()
      e.stopImmediatePropagation()
    }

    const handleTouchEnd = (e) => {
      forceColor()
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      setMobileMenuOpen(prev => !prev)
    }

    // Use capture phase and direct DOM event for maximum priority
    button.addEventListener('click', handleButtonClick, { capture: true })
    button.addEventListener('mousedown', handleMouseDown, { capture: true })
    button.addEventListener('touchstart', handleTouchStart, { capture: true })
    button.addEventListener('touchend', handleTouchEnd, { capture: true })

    return () => {
      button.removeEventListener('click', handleButtonClick, { capture: true })
      button.removeEventListener('mousedown', handleMouseDown, { capture: true })
      button.removeEventListener('touchstart', handleTouchStart, { capture: true })
      button.removeEventListener('touchend', handleTouchEnd, { capture: true })
    }
  }, [])

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
      ref={headerRef}
      className={`fixed top-0 z-[100] w-full transition-all duration-300 ease-out ${
        scrolled ? "bg-white shadow-md backdrop-blur-sm" : "bg-transparent"
      }`}
      style={{
        borderBottom: mobileMenuOpen ? '1px solid rgba(255, 255, 255, 1)' : '1px solid rgba(255, 255, 255, 0)',
        transition: 'border-bottom-color 0.3s ease-out',
        pointerEvents: 'auto',
        isolation: 'isolate'
      }}
      onMouseDown={(e) => {
        // Prevent header clicks from bubbling to backdrop
        e.stopPropagation()
      }}
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
          <div className="justify-self-end flex items-center ml-1 sm:ml-2 relative pr-2 pt-1 max-[800px]:absolute max-[800px]:top-1 max-[800px]:right-2 max-[800px]:ml-0 max-[800px]:pr-0 z-[101]">
            {session ? (
              <div className="relative hidden min-[800px]:block" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm transition whitespace-nowrap ${
                    scrolled ? "text-gray-800 hover:bg-gray-100" : "text-white hover:bg-white/10"
                  }`}
                >
                  {(() => {
                    // Get username from name or email
                    let username = 'User';
                    if (session.user?.name) {
                      // Check if name contains @ (it's an email), if so extract username part
                      username = session.user.name.includes('@') 
                        ? session.user.name.split('@')[0] 
                        : session.user.name;
                    } else if (session.user?.email) {
                      username = session.user.email.split('@')[0];
                    }
                    return `Hi, ${username}`;
                  })()}
                  <svg className="h-4 w-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-lg overflow-hidden">
                    <div className="px-4 py-3">
                      <p className="text-sm text-gray-500">Signed in as</p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.user?.email ? session.user.email.split('@')[0] : 'user'}
                      </p>
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
              <div className="hidden min-[800px]:flex items-center gap-3">
                <button
                  onClick={() => {
                    setAuthModalMode('signin')
                    setShowAuthModal(true)
                  }}
                  className={`px-5 py-2.5 font-semibold rounded-lg transition-colors ${
                    scrolled
                      ? "bg-turquoise-600 text-white hover:bg-turquoise-500"
                      : "bg-turquoise-600 text-white hover:bg-turquoise-500"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthModalMode('signup')
                    setShowAuthModal(true)
                  }}
                  className={`px-5 py-2.5 font-semibold rounded-lg transition-colors ${
                    scrolled
                      ? "bg-white text-turquoise-600 border border-turquoise-100 hover:bg-gray-50"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}
            
            {/* Mobile menu button - Shown only when navigation is hidden */}
            <button
              ref={hamburgerButtonRef}
              type="button"
              className="min-[800px]:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-turquoise-600 hover:bg-gray-100 active:text-gray-600 active:bg-transparent focus:text-gray-600 focus:bg-transparent focus:outline-none transition-colors relative z-[102] pointer-events-auto"
              style={{ 
                pointerEvents: 'auto', 
                touchAction: 'manipulation', 
                WebkitTapHighlightColor: 'transparent',
                color: 'rgb(75, 85, 99)', // text-gray-600 - force color on all states
              }}
              onMouseDown={(e) => {
                // Force color to stay gray-600
                if (e.currentTarget) {
                  e.currentTarget.style.color = 'rgb(75, 85, 99)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                // Force color to stay gray-600
                if (e.currentTarget) {
                  e.currentTarget.style.color = 'rgb(75, 85, 99)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
                e.preventDefault()
                e.stopPropagation()
                setMobileMenuOpen(prev => !prev)
              }}
              onTouchStart={(e) => {
                // Force color to stay gray-600
                if (e.currentTarget) {
                  e.currentTarget.style.color = 'rgb(75, 85, 99)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
                e.stopPropagation()
              }}
              onTouchEnd={(e) => {
                // Force color to stay gray-600
                if (e.currentTarget) {
                  e.currentTarget.style.color = 'rgb(75, 85, 99)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
                e.preventDefault()
                e.stopPropagation()
                setMobileMenuOpen(prev => !prev)
              }}
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
      
      {/* Mobile Navigation Menu */}
      <>
        {/* Backdrop - positioned below header to not block it */}
        {mobileMenuOpen && (
          <div 
            ref={mobileMenuRef}
            className="fixed bg-black/60 backdrop-blur-sm min-[800px]:hidden transition-opacity duration-300 opacity-100 z-[99]"
            style={{ 
              top: `${headerHeight}px`,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => {
              // Prevent backdrop from interfering with header clicks
              if (headerRef.current && headerRef.current.contains(e.target)) {
                e.preventDefault()
                e.stopPropagation()
                return
              }
              // Only close if clicking on the backdrop itself
              if (e.target === e.currentTarget) {
                setMobileMenuOpen(false)
              }
            }}
            onClick={(e) => {
              // Prevent backdrop from interfering with header clicks
              if (headerRef.current && headerRef.current.contains(e.target)) {
                e.preventDefault()
                e.stopPropagation()
                return
              }
              // Only close if clicking on the backdrop itself, not if event bubbled from header
              if (e.target === e.currentTarget) {
                setMobileMenuOpen(false)
              }
            }}
            aria-hidden={false}
          />
        )}
        
        {/* Menu Panel */}
        <div 
          className={`fixed right-0 w-72 bg-black/80 backdrop-blur-sm shadow-2xl z-[99] min-[800px]:hidden flex flex-col transform transition-transform duration-300 ease-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ 
            top: `${headerHeight}px`,
            height: `calc(100vh - ${headerHeight}px)`,
            maxHeight: `calc(100vh - ${headerHeight}px)`,
            pointerEvents: mobileMenuOpen ? 'auto' : 'none'
          }}
          onClick={(e) => e.stopPropagation()}
        >
            <nav className="flex-1 overflow-y-auto p-4 min-h-0 pb-2">
              <div className="flex flex-col space-y-2">
                {displayedLinks.map((link) => (
                  link.isScroll ? (
                    <a 
                      key={link.name}
                      href={link.href}
                      className="px-5 py-4 text-white hover:text-turquoise-300 hover:bg-turquoise-500/10 rounded-lg font-semibold text-lg transition-all duration-200 active:scale-[0.98]"
                      onClick={(e) => {
                        handleScrollTo(e, link.href.split('#')[1])
                        setMobileMenuOpen(false)
                      }}
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link 
                      key={link.name} 
                      href={link.href}
                      className="px-5 py-4 text-white hover:text-turquoise-300 hover:bg-turquoise-500/10 rounded-lg font-semibold text-lg transition-all duration-200 active:scale-[0.98]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.name}
                    </Link>
                  )
                ))}
              </div>
            </nav>
            
            <div className="flex-shrink-0 px-4 pb-6 pt-4">
              {session ? (
                <button
                  onClick={() => {
                    signOut({ redirect: false })
                    setMobileMenuOpen(false)
                  }}
                  className="w-full px-5 py-4 bg-gradient-to-r from-turquoise-600 to-turquoise-500 text-white text-base font-semibold rounded-lg shadow-lg hover:from-turquoise-500 hover:to-turquoise-400 transition-all duration-200 active:scale-[0.98]"
                >
                  Sign Out
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setAuthModalMode('signin')
                      setShowAuthModal(true)
                      setMobileMenuOpen(false)
                    }}
                    className="w-full px-5 py-3 bg-turquoise-600 text-white font-semibold rounded-lg hover:bg-turquoise-500 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setAuthModalMode('signup')
                      setShowAuthModal(true)
                      setMobileMenuOpen(false)
                    }}
                    className="w-full px-5 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
      </>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          open={showAuthModal} 
          onClose={() => setShowAuthModal(false)}
          initialMode={authModalMode}
        />
      )}
    </header>
  )
}

export default Header
