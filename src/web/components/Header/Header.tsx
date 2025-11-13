"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Logo from "./Logo"
import { AuthModal } from "../Auth"
import { useAuth } from "../Auth/hooks/useAuth"
import { NavLink, TouchPosition } from './Header.types'

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
const Header: React.FC = () => {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false)
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false)
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin')
  const { session, signOut: signOutUser } = useAuth() as { session: { user?: { name?: string; email?: string } } | null; signOut: (options?: { callbackUrl?: string }) => Promise<void> }
  const [scrolled, setScrolled] = useState<boolean>(false)
  const [headerHeight, setHeaderHeight] = useState<number>(56) // Default to 3.5rem (56px)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const headerRef = useRef<HTMLElement | null>(null)
  const hamburgerButtonRef = useRef<HTMLButtonElement | null>(null)
  const mobileMenuPanelRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuButtonsRef = useRef<HTMLDivElement | null>(null)
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false)
  const [pendingSignOut, setPendingSignOut] = useState<boolean>(false)

  const handleSignOutRequest = useCallback(async (): Promise<void> => {
    if (isSigningOut) {
      return
    }

    setPendingSignOut(true)
    setIsSigningOut(true)

    try {
      await signOutUser({ callbackUrl: '/' })
    } catch (error) {
      console.error("Sign out failed:", error)
      setPendingSignOut(false)
      setIsSigningOut(false)
    }
  }, [isSigningOut, signOutUser])

  useEffect(() => {
    if (!session) {
      setPendingSignOut(false)
      setIsSigningOut(false)
    }
  }, [session])

  // Measure header height and update on resize/menu toggle
  useEffect(() => {
    const updateHeaderHeight = (): void => {
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

    const updateHeaderHeight = (): void => {
      if (!headerRef.current) return
      const rect = headerRef.current.getBoundingClientRect()
      const exactBottom = Math.ceil(rect.bottom)
      setHeaderHeight(exactBottom)
    }

    // Measure immediately
    updateHeaderHeight()
    
    // Measure after DOM updates and border transition
    let raf2: number | null = null
    let t1: NodeJS.Timeout | null = null
    let t2: NodeJS.Timeout | null = null
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
      if (raf2 !== null) cancelAnimationFrame(raf2)
      if (t1) clearTimeout(t1)
      if (t2) clearTimeout(t2)
    }
  }, [mobileMenuOpen])

  // Ensure buttons are always visible in mobile menu - bulletproof safeguard
  useEffect(() => {
    if (!mobileMenuOpen || !mobileMenuPanelRef.current || !mobileMenuButtonsRef.current) return

    const ensureButtonsVisible = (): void => {
      const panel = mobileMenuPanelRef.current
      const buttons = mobileMenuButtonsRef.current
      if (!panel || !buttons) return

      const panelRect = panel.getBoundingClientRect()
      const buttonsRect = buttons.getBoundingClientRect()
      // Use actual viewport height (accounts for mobile browser UI)
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight
      const availableHeight = viewportHeight - panelRect.top

      // Always ensure buttons fit within viewport
      const buttonsHeight = buttonsRect.height
      const padding = 16 // Total padding (top + bottom)
      const navMaxHeight = Math.max(0, availableHeight - buttonsHeight - padding)
      
      // Constrain nav section to prevent buttons from being pushed off screen
      const nav = panel.querySelector('nav')
      if (nav) {
        nav.style.maxHeight = `${navMaxHeight}px`
        nav.style.overflowY = 'auto'
        nav.style.overflowX = 'hidden'
      }

      // Also ensure panel itself doesn't exceed viewport
      const currentPanelHeight = panelRect.height
      const maxPanelHeight = availableHeight
      if (currentPanelHeight > maxPanelHeight) {
        panel.style.height = `${maxPanelHeight}px`
        panel.style.maxHeight = `${maxPanelHeight}px`
      }

      // Double-check buttons are visible
      const buttonsBottom = buttonsRect.bottom
      if (buttonsBottom > viewportHeight) {
        // Emergency fallback: adjust panel position
        const adjustment = buttonsBottom - viewportHeight + 8 // 8px safety margin
        const newHeight = Math.max(buttonsHeight + padding, maxPanelHeight - adjustment)
        panel.style.height = `${newHeight}px`
        panel.style.maxHeight = `${newHeight}px`
        if (nav) {
          nav.style.maxHeight = `${Math.max(0, newHeight - buttonsHeight - padding)}px`
        }
      }
    }

    // Check immediately and after delays to catch all render phases
    ensureButtonsVisible()
    const timeout1 = setTimeout(ensureButtonsVisible, 0)
    const timeout2 = setTimeout(ensureButtonsVisible, 50)
    const timeout3 = setTimeout(ensureButtonsVisible, 100)
    const timeout4 = setTimeout(ensureButtonsVisible, 300)
    const timeout5 = setTimeout(ensureButtonsVisible, 500)

    // Also check on resize, orientation change, and visual viewport changes (mobile browsers)
    window.addEventListener('resize', ensureButtonsVisible)
    window.addEventListener('orientationchange', ensureButtonsVisible)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', ensureButtonsVisible)
      window.visualViewport.addEventListener('scroll', ensureButtonsVisible)
    }

    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
      clearTimeout(timeout4)
      clearTimeout(timeout5)
      window.removeEventListener('resize', ensureButtonsVisible)
      window.removeEventListener('orientationchange', ensureButtonsVisible)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', ensureButtonsVisible)
        window.visualViewport.removeEventListener('scroll', ensureButtonsVisible)
      }
    }
  }, [mobileMenuOpen, headerHeight])

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = (): void => {
      if (typeof window === 'undefined') return
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menus when clicking outside - bulletproof for mobile
  useEffect(() => {
    if (!mobileMenuOpen && !userMenuOpen) return // No menus open, no need to listen
    
    const handleClickOutside = (event: MouseEvent | TouchEvent | Event): void => {
      const target = event.target as Node | null
      
      // Don't close if clicking on the hamburger button itself
      if (hamburgerButtonRef.current && (
        hamburgerButtonRef.current === target || 
        hamburgerButtonRef.current.contains(target)
      )) {
        return
      }
      
      // Don't close if clicking anywhere in the header (except backdrop)
      if (headerRef.current && (
        headerRef.current === target || 
        headerRef.current.contains(target)
      )) {
        // Only close if clicking outside the menu AND outside the hamburger button
        if (mobileMenuRef.current && !mobileMenuRef.current.contains(target) && mobileMenuOpen) {
          // Allow the hamburger button click to handle it instead
          return
        }
        return
      }
      
      // Close mobile menu if clicking outside
      if (mobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        // Double-check we're not clicking on the backdrop (which should close it)
        const backdrop = document.querySelector('.mobile-menu-backdrop')
        if (backdrop && (backdrop === target || backdrop.contains(target))) {
          setMobileMenuOpen(false)
          return
        }
        // If clicking outside both menu and backdrop, close menu
        setMobileMenuOpen(false)
      }
      
      // Close user menu if clicking outside
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false)
      }
    }

    // Use capture phase to ensure we check before other handlers
    // Add both mouse and touch events for maximum compatibility
    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('touchstart', handleClickOutside, true)
    document.addEventListener('click', handleClickOutside, true)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('touchstart', handleClickOutside, true)
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [mobileMenuOpen, userMenuOpen])

  // Prevent body scroll when mobile menu is open - bulletproof for mobile
  useEffect(() => {
    if (typeof document === 'undefined') return
    
    let scrollY = 0
    
    if (mobileMenuOpen) {
      // Store scroll position before locking
      scrollY = window.scrollY
      
      // Prevent scrolling using fixed positioning
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.left = '0'
      document.body.style.right = '0'
      
      return () => {
        // Restore scroll position and styles
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.left = ''
        document.body.style.right = ''
        // Restore scroll position
        window.scrollTo(0, scrollY)
      }
    }
    
    // Cleanup when menu closes
    return () => {
      if (!mobileMenuOpen) {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.left = ''
        document.body.style.right = ''
      }
    }
  }, [mobileMenuOpen])

  // Direct event listener on hamburger button as ultimate safeguard - bulletproof for mobile
  useEffect(() => {
    const button = hamburgerButtonRef.current
    if (!button) return

    let touchStartTime = 0
    let touchStartPos: TouchPosition = { x: 0, y: 0 }
    const TOUCH_MOVEMENT_THRESHOLD = 10 // pixels
    const MAX_TAP_DURATION = 300 // ms

    const forceColor = (): void => {
      if (button) {
        button.style.color = 'rgb(75, 85, 99)' // text-gray-600
        button.style.backgroundColor = 'transparent'
      }
    }

    const toggleMenu = (): void => {
      setMobileMenuOpen(prev => {
        const newState = !prev
        // Force a re-render to ensure state is updated
        setTimeout(() => {
          if (headerRef.current) {
            const rect = headerRef.current.getBoundingClientRect()
            setHeaderHeight(Math.ceil(rect.bottom))
          }
        }, 0)
        return newState
      })
    }

    const handleButtonClick = (e: Event): void => {
      forceColor()
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      toggleMenu()
    }

    const handleMouseDown = (e: MouseEvent): void => {
      forceColor()
      e.stopPropagation()
      e.stopImmediatePropagation()
    }

    const handleTouchStart = (e: TouchEvent): void => {
      forceColor()
      e.stopPropagation()
      e.stopImmediatePropagation()
      
      // Track touch start for tap detection
      if (e.touches && e.touches.length > 0) {
        touchStartTime = Date.now()
        touchStartPos = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        }
      }
    }

    const handleTouchMove = (e: TouchEvent): void => {
      // If user moves finger too much, cancel the tap
      if (e.touches && e.touches.length > 0) {
        const dx = Math.abs(e.touches[0].clientX - touchStartPos.x)
        const dy = Math.abs(e.touches[0].clientY - touchStartPos.y)
        if (dx > TOUCH_MOVEMENT_THRESHOLD || dy > TOUCH_MOVEMENT_THRESHOLD) {
          touchStartTime = 0 // Cancel tap
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent): void => {
      forceColor()
      e.stopPropagation()
      e.stopImmediatePropagation()
      
      // Only toggle if it was a quick tap (not a drag)
      const touchDuration = Date.now() - touchStartTime
      if (touchStartTime > 0 && touchDuration < MAX_TAP_DURATION) {
        e.preventDefault()
        toggleMenu()
      }
      
      // Reset touch tracking
      touchStartTime = 0
      touchStartPos = { x: 0, y: 0 }
    }

    const handleTouchCancel = (): void => {
      forceColor()
      touchStartTime = 0
      touchStartPos = { x: 0, y: 0 }
    }

    // Use capture phase and direct DOM event for maximum priority
    button.addEventListener('click', handleButtonClick, { capture: true, passive: false })
    button.addEventListener('mousedown', handleMouseDown, { capture: true, passive: false })
    button.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false })
    button.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false })
    button.addEventListener('touchend', handleTouchEnd, { capture: true, passive: false })
    button.addEventListener('touchcancel', handleTouchCancel, { capture: true, passive: false })

    return () => {
      button.removeEventListener('click', handleButtonClick, { capture: true })
      button.removeEventListener('mousedown', handleMouseDown, { capture: true })
      button.removeEventListener('touchstart', handleTouchStart, { capture: true })
      button.removeEventListener('touchmove', handleTouchMove, { capture: true })
      button.removeEventListener('touchend', handleTouchEnd, { capture: true })
      button.removeEventListener('touchcancel', handleTouchCancel, { capture: true })
    }
  }, [])

  // Navigation links for authenticated users
  const navLinks: NavLink[] = [
    { name: "Study", href: "/" },
    { name: "Analytics", href: "/analytics" },
    { name: "Learn", href: "/learn" },
    { name: "Community", href: "/community" },
    { name: "Support", href: "/support" }
  ]

  // Navigation links for non-authenticated users
  const publicNavLinks: NavLink[] = [
    { name: "Support", href: "/support" }
  ]

  // Only show the appropriate links based on authentication status
  const displayedLinks = session ? navLinks : publicNavLinks

  // Function to handle scrolling to sections
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string): void => {
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
        isolation: 'isolate',
        WebkitTapHighlightColor: 'transparent'
      }}
      onMouseDown={(e) => {
        // Prevent header clicks from bubbling to backdrop
        e.stopPropagation()
      }}
      onTouchStart={(e) => {
        // Prevent touch events from bubbling
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
            {session && !pendingSignOut ? (
              <div className="relative hidden min-[800px]:block" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  data-tutorial-profile
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
                  <div className="absolute right-0 mt-2 w-56 rounded-md border bg-white shadow-lg overflow-hidden">
                    <div className="px-4 py-3">
                      <p className="text-sm text-gray-500">Signed in as</p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.user?.email ? session.user.email.split('@')[0] : 'user'}
                      </p>
                    </div>
                    <div className="border-t" />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setUserMenuOpen(false)
                        // Check if we're already on study page
                        const isOnStudyPage = typeof window !== 'undefined' && window.location.pathname === '/study';
                        if (isOnStudyPage) {
                          // Already on study page - just dispatch event, no navigation
                          window.dispatchEvent(new CustomEvent('replay-tutorial'));
                        } else {
                          // Not on study page - navigate there with tutorial param
                          router.push('/study?tutorial=true');
                        }
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Replay Tutorial
                    </button>
                    <div className="border-t" />
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        handleSignOutRequest()
                      }}
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
                  className={`px-5 py-2.5 font-semibold rounded-md transition-colors ${
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
                  className={`px-5 py-2.5 font-semibold rounded-md transition-colors ${
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
                // Only toggle if it's a quick tap (handled by direct event listener)
                // This is a backup in case direct listener doesn't fire
                e.stopPropagation()
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
        {/* Backdrop - positioned below header to not block it - bulletproof for mobile */}
        {mobileMenuOpen && (
          <div 
            ref={mobileMenuRef}
            className="mobile-menu-backdrop fixed bg-black/60 backdrop-blur-sm min-[800px]:hidden transition-opacity duration-300 opacity-100 z-[99]"
            style={{ 
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'auto',
              touchAction: 'none', // Prevent scrolling when menu is open
              WebkitTapHighlightColor: 'transparent'
            }}
            onMouseDown={(e) => {
              // Prevent backdrop from interfering with header clicks
              const target = e.target as Node | null
              if (headerRef.current && target && (
                headerRef.current === target || 
                headerRef.current.contains(target)
              )) {
                e.preventDefault()
                e.stopPropagation()
                return
              }
              // Only close if clicking on the backdrop itself
              if (e.target === e.currentTarget) {
                setMobileMenuOpen(false)
              }
            }}
            onTouchStart={(e) => {
              // Prevent backdrop from interfering with header clicks
              const target = e.target as Node | null
              if (headerRef.current && target && (
                headerRef.current === target || 
                headerRef.current.contains(target)
              )) {
                e.preventDefault()
                e.stopPropagation()
                return
              }
              // Only close if touching the backdrop itself
              if (e.target === e.currentTarget) {
                e.preventDefault()
                setMobileMenuOpen(false)
              }
            }}
            onClick={(e) => {
              // Prevent backdrop from interfering with header clicks
              const target = e.target as Node | null
              if (headerRef.current && target && (
                headerRef.current === target || 
                headerRef.current.contains(target)
              )) {
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
        
        {/* Menu Panel - bulletproof for mobile */}
        <div 
          ref={mobileMenuPanelRef}
          className={`fixed right-0 w-56 bg-black/95 backdrop-blur-sm border-l border-white/30 shadow-2xl z-[99] min-[800px]:hidden flex flex-col transform transition-transform duration-300 ease-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ 
            top: 0,
            height: `100vh`,
            maxHeight: `100vh`,
            minHeight: '100vh',
            overflow: 'hidden',
            pointerEvents: mobileMenuOpen ? 'auto' : 'none',
            touchAction: 'pan-y', // Allow vertical scrolling in menu
            WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
            overscrollBehavior: 'contain', // Prevent scroll chaining
            paddingTop: `${headerHeight}px`
          }}
          onClick={(e) => {
            e.stopPropagation()
            // Prevent clicks from closing menu when clicking inside
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            // Prevent touch events from bubbling to backdrop
          }}
        >
            <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0 pb-2" style={{ minHeight: 0 }}>
              <div className="flex flex-col space-y-2">
                {displayedLinks.map((link) => (
                  link.isScroll ? (
                    <a 
                      key={link.name}
                      href={link.href}
                      className="px-5 py-4 text-white hover:text-turquoise-300 hover:bg-turquoise-500/10 rounded-md font-semibold text-lg transition-all duration-200 active:scale-[0.98]"
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
                      className="px-5 py-4 text-white hover:text-turquoise-300 hover:bg-turquoise-500/10 rounded-md font-semibold text-lg transition-all duration-200 active:scale-[0.98]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.name}
                    </Link>
                  )
                ))}
              </div>
            </nav>
            
            <div 
              ref={mobileMenuButtonsRef}
              className="flex-shrink-0 px-4 pb-4 pt-4 border-t border-white/10"
              style={{ 
                flexShrink: 0,
                minHeight: 'fit-content',
                position: 'relative',
                zIndex: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.8)' // Ensure buttons have background
              }}
            >
              {session && !pendingSignOut ? (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMobileMenuOpen(false)
                      // Check if we're already on study page
                      const isOnStudyPage = typeof window !== 'undefined' && window.location.pathname === '/study';
                      if (isOnStudyPage) {
                        // Already on study page - just dispatch event, no navigation
                        window.dispatchEvent(new CustomEvent('replay-tutorial'));
                      } else {
                        // Not on study page - navigate there with tutorial param
                        router.push('/study?tutorial=true');
                      }
                    }}
                    className="w-full px-5 py-3 bg-white/10 text-white font-semibold rounded-md hover:bg-white/20 transition-colors"
                  >
                    Replay Tutorial
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleSignOutRequest()
                    }}
                    className="w-full px-5 py-4 bg-gradient-to-r from-turquoise-600 to-turquoise-500 text-white text-base font-semibold rounded-md shadow-lg hover:from-turquoise-500 hover:to-turquoise-400 transition-all duration-200 active:scale-[0.98]"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setAuthModalMode('signin')
                      setShowAuthModal(true)
                      setMobileMenuOpen(false)
                    }}
                    className="w-full px-5 py-3 bg-turquoise-600 text-white font-semibold rounded-md hover:bg-turquoise-500 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setAuthModalMode('signup')
                      setShowAuthModal(true)
                      setMobileMenuOpen(false)
                    }}
                    className="w-full px-5 py-3 bg-white/10 text-white font-semibold rounded-md hover:bg-white/20 transition-colors"
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
          {...(authModalMode ? { initialMode: authModalMode } : {})}
        />
      )}
    </header>
  )
}

export default Header
