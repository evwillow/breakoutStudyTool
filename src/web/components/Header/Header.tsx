/**
 * @fileoverview Responsive application header providing navigation, auth controls, and mobile menus.
 * @module src/web/components/Header/Header.tsx
 * @dependencies React, ./Logo, ../Auth, ../Auth/hooks/useAuth, ./components
 */
"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import Logo from "./Logo"
import { AuthModal, useAuth } from "../Auth"
import Navigation from "./components/Navigation"
import UserMenu from "./components/UserMenu"
import MobileMenu from "./components/MobileMenu"
import AuthButtons from "./components/AuthButtons"
import { NavLink, TouchPosition } from './Header.types'

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false)
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false)
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin')
  const { session, signOut: signOutUser } = useAuth() as { session: { user?: { name?: string; email?: string } } | null; signOut: (options?: { callbackUrl?: string }) => Promise<void> }
  const [scrolled, setScrolled] = useState<boolean>(false)
  const [headerHeight, setHeaderHeight] = useState<number>(56)
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
        const rect = headerRef.current.getBoundingClientRect()
        const exactBottom = Math.ceil(rect.bottom)
        setHeaderHeight(exactBottom)
      }
    }
    
    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)
    
    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [])

  // Re-measure when menu opens/closes
  useEffect(() => {
    if (!headerRef.current) return

    const updateHeaderHeight = (): void => {
      if (!headerRef.current) return
      const rect = headerRef.current.getBoundingClientRect()
      const exactBottom = Math.ceil(rect.bottom)
      setHeaderHeight(exactBottom)
    }

    updateHeaderHeight()
    
    let raf2: number | null = null
    let t1: NodeJS.Timeout | null = null
    let t2: NodeJS.Timeout | null = null
    const raf1 = requestAnimationFrame(() => {
      updateHeaderHeight()
      raf2 = requestAnimationFrame(() => {
        updateHeaderHeight()
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

  // Ensure buttons are always visible in mobile menu
  useEffect(() => {
    if (!mobileMenuOpen || !mobileMenuPanelRef.current || !mobileMenuButtonsRef.current) return

    const ensureButtonsVisible = (): void => {
      const panel = mobileMenuPanelRef.current
      const buttons = mobileMenuButtonsRef.current
      if (!panel || !buttons) return

      const panelRect = panel.getBoundingClientRect()
      const buttonsRect = buttons.getBoundingClientRect()
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight
      const availableHeight = viewportHeight - panelRect.top

      const buttonsHeight = buttonsRect.height
      const padding = 16
      const navMaxHeight = Math.max(0, availableHeight - buttonsHeight - padding)
      
      const nav = panel.querySelector('nav')
      if (nav) {
        nav.style.maxHeight = `${navMaxHeight}px`
        nav.style.overflowY = 'auto'
        nav.style.overflowX = 'hidden'
      }

      const currentPanelHeight = panelRect.height
      const maxPanelHeight = availableHeight
      if (currentPanelHeight > maxPanelHeight) {
        panel.style.height = `${maxPanelHeight}px`
        panel.style.maxHeight = `${maxPanelHeight}px`
      }

      const buttonsBottom = buttonsRect.bottom
      if (buttonsBottom > viewportHeight) {
        const adjustment = buttonsBottom - viewportHeight + 8
        const newHeight = Math.max(buttonsHeight + padding, maxPanelHeight - adjustment)
        panel.style.height = `${newHeight}px`
        panel.style.maxHeight = `${newHeight}px`
        if (nav) {
          nav.style.maxHeight = `${Math.max(0, newHeight - buttonsHeight - padding)}px`
        }
      }
    }

    ensureButtonsVisible()
    const timeout1 = setTimeout(ensureButtonsVisible, 0)
    const timeout2 = setTimeout(ensureButtonsVisible, 50)
    const timeout3 = setTimeout(ensureButtonsVisible, 100)
    const timeout4 = setTimeout(ensureButtonsVisible, 300)
    const timeout5 = setTimeout(ensureButtonsVisible, 500)

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

  // Close menus when clicking outside
  useEffect(() => {
    if (!mobileMenuOpen && !userMenuOpen) return
    
    const handleClickOutside = (event: MouseEvent | TouchEvent | Event): void => {
      const target = event.target as Node | null
      
      if (hamburgerButtonRef.current && (
        hamburgerButtonRef.current === target || 
        hamburgerButtonRef.current.contains(target)
      )) {
        return
      }
      
      if (headerRef.current && (
        headerRef.current === target || 
        headerRef.current.contains(target)
      )) {
        if (mobileMenuRef.current && !mobileMenuRef.current.contains(target) && mobileMenuOpen) {
          return
        }
        return
      }
      
      if (mobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        const backdrop = document.querySelector('.mobile-menu-backdrop')
        if (backdrop && (backdrop === target || backdrop.contains(target))) {
          setMobileMenuOpen(false)
          return
        }
        setMobileMenuOpen(false)
      }
      
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('touchstart', handleClickOutside, true)
    document.addEventListener('click', handleClickOutside, true)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('touchstart', handleClickOutside, true)
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [mobileMenuOpen, userMenuOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (typeof document === 'undefined') return
    
    let scrollY = 0
    
    if (mobileMenuOpen) {
      scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.left = '0'
      document.body.style.right = '0'
      
      return () => {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.left = ''
        document.body.style.right = ''
        window.scrollTo(0, scrollY)
      }
    }
    
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

  // Direct event listener on hamburger button
  useEffect(() => {
    const button = hamburgerButtonRef.current
    if (!button) return

    let touchStartTime = 0
    let touchStartPos: TouchPosition = { x: 0, y: 0 }
    const TOUCH_MOVEMENT_THRESHOLD = 10
    const MAX_TAP_DURATION = 300

    const forceColor = (): void => {
      if (button) {
        button.style.color = 'rgb(75, 85, 99)'
        button.style.backgroundColor = 'transparent'
      }
    }

    const toggleMenu = (): void => {
      setMobileMenuOpen(prev => {
        const newState = !prev
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
      
      if (e.touches && e.touches.length > 0) {
        touchStartTime = Date.now()
        touchStartPos = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        }
      }
    }

    const handleTouchMove = (e: TouchEvent): void => {
      if (e.touches && e.touches.length > 0) {
        const dx = Math.abs(e.touches[0].clientX - touchStartPos.x)
        const dy = Math.abs(e.touches[0].clientY - touchStartPos.y)
        if (dx > TOUCH_MOVEMENT_THRESHOLD || dy > TOUCH_MOVEMENT_THRESHOLD) {
          touchStartTime = 0
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent): void => {
      forceColor()
      e.stopPropagation()
      e.stopImmediatePropagation()
      
      const touchDuration = Date.now() - touchStartTime
      if (touchStartTime > 0 && touchDuration < MAX_TAP_DURATION) {
        e.preventDefault()
        toggleMenu()
      }
      
      touchStartTime = 0
      touchStartPos = { x: 0, y: 0 }
    }

    const handleTouchCancel = (): void => {
      forceColor()
      touchStartTime = 0
      touchStartPos = { x: 0, y: 0 }
    }

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

  // Navigation links
  const navLinks: NavLink[] = [
    { name: "Study", href: "/" },
    { name: "Analytics", href: "/analytics" },
    { name: "Learn", href: "/learn" },
    { name: "Community", href: "/community" },
    { name: "Support", href: "/support" }
  ]

  const publicNavLinks: NavLink[] = [
    { name: "Support", href: "/support" }
  ]

  const displayedLinks = session ? navLinks : publicNavLinks

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string): void => {
    e.preventDefault()
    if (mobileMenuOpen) {
      setMobileMenuOpen(false)
    }
    
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    } else {
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
        e.stopPropagation()
      }}
      onTouchStart={(e) => {
        e.stopPropagation()
      }}
    >
      <div className="w-full px-2 sm:px-4 lg:px-8">
        <div className="relative grid grid-cols-3 h-14 items-center max-[800px]:items-start">
          {/* Logo */}
          <div className="justify-self-start flex-shrink-0 mr-1 sm:mr-2 z-20 max-[800px]:pl-2 max-[800px]:pt-1">
            <Logo scrolled={scrolled} />
          </div>

          {/* Navigation */}
          <Navigation
            links={displayedLinks}
            scrolled={scrolled}
            onScrollTo={handleScrollTo}
          />

          {/* Authentication / User menu */}
          <div className="justify-self-end flex items-center ml-1 sm:ml-2 relative pr-2 pt-1 max-[800px]:absolute max-[800px]:top-1 max-[800px]:right-2 max-[800px]:ml-0 max-[800px]:pr-0 z-[101]">
            {session && !pendingSignOut ? (
              <UserMenu
                session={session}
                scrolled={scrolled}
                isOpen={userMenuOpen}
                onToggle={() => setUserMenuOpen(v => !v)}
                onSignOut={handleSignOutRequest}
                menuRef={userMenuRef}
              />
            ) : (
              <AuthButtons
                scrolled={scrolled}
                onSignIn={() => {
                  setAuthModalMode('signin')
                  setShowAuthModal(true)
                }}
                onSignUp={() => {
                  setAuthModalMode('signup')
                  setShowAuthModal(true)
                }}
              />
            )}
            
            {/* Mobile menu button */}
            <button
              ref={hamburgerButtonRef}
              type="button"
              className="min-[800px]:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-turquoise-600 hover:bg-gray-100 active:text-gray-600 active:bg-transparent focus:text-gray-600 focus:bg-transparent focus:outline-none transition-colors relative z-[102] pointer-events-auto"
              style={{ 
                pointerEvents: 'auto', 
                touchAction: 'manipulation', 
                WebkitTapHighlightColor: 'transparent',
                color: 'rgb(75, 85, 99)',
              }}
              onMouseDown={(e) => {
                if (e.currentTarget) {
                  e.currentTarget.style.color = 'rgb(75, 85, 99)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                if (e.currentTarget) {
                  e.currentTarget.style.color = 'rgb(75, 85, 99)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
                e.preventDefault()
                e.stopPropagation()
                setMobileMenuOpen(prev => !prev)
              }}
              onTouchStart={(e) => {
                if (e.currentTarget) {
                  e.currentTarget.style.color = 'rgb(75, 85, 99)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
                e.stopPropagation()
              }}
              onTouchEnd={(e) => {
                if (e.currentTarget) {
                  e.currentTarget.style.color = 'rgb(75, 85, 99)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
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
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        links={displayedLinks}
        session={session}
        pendingSignOut={pendingSignOut}
        headerHeight={headerHeight}
        headerRef={headerRef}
        onScrollTo={handleScrollTo}
        onSignOut={handleSignOutRequest}
        onSignIn={() => {
          setAuthModalMode('signin')
          setShowAuthModal(true)
        }}
        onSignUp={() => {
          setAuthModalMode('signup')
          setShowAuthModal(true)
        }}
        mobileMenuRef={mobileMenuRef}
        mobileMenuPanelRef={mobileMenuPanelRef}
        mobileMenuButtonsRef={mobileMenuButtonsRef}
      />

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
