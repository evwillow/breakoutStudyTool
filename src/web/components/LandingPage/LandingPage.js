"use client";

/**
 * LandingPage Component
 * 
 * Premium marketing landing page designed to convert visitors into users.
 * Features:
 * - Hero section with clear value proposition and call-to-action
 * - Feature highlights with professional icons
 * - Social proof from successful traders
 * - Premium design elements and visual hierarchy
 * - Conversion-optimized copy and color scheme
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import AuthModal from "../Auth/AuthModal";
const FEATURE_NAMES = [
  "Interactive Breakout Practice",
  "Instant After Chart Reveal",
  "Performance and Accuracy Analytics",
  "Personal Progress Dashboard",
]

const LandingPage = ({ onSignIn }) => {
  const [showAuth, setShowAuth] = useState(false)
  return (
    <div className="font-sans overflow-visible min-h-screen flex flex-col">
      {/* Hero Section with premium design and stronger value proposition */}
      <section className="relative overflow-visible bg-transparent pt-14 sm:pt-20 lg:pt-24 pb-8 sm:pb-12 lg:pb-16 min-h-[70vh] lg:min-h-[80vh]">
        
        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center">
          <div className="lg:w-7/12 lg:pr-12 mb-10 lg:mb-0">
            <div className="mb-8">
              <span className="inline-block px-3 py-1 bg-turquoise-500 bg-opacity-20 text-turquoise-400 rounded-md text-sm font-semibold tracking-wide uppercase mb-2">In Development</span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight bg-gradient-to-r from-turquoise-200 via-white to-turquoise-200 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(56,178,172,0.25)]">
                <span className="text-white/0">Breakout</span> Study Tool
              </h1>
              <p className="mt-3 text-xl sm:text-2xl text-turquoise-200/90 font-semibold max-w-2xl">Coming soon. A focused way to train breakout pattern recognition</p>
              {/* Feature-by-feature typing that wraps on mobile */}
              <TypedFeatures />
            </div>
            <p className="text-lg sm:text-xl text-gray-200/90 mb-10 leading-relaxed max-w-3xl">
              Practice on historical market data, get instant feedback, and build repeatable decision making. Designed to be minimal and fast.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button 
                onClick={() => setShowAuth(true)}
                className="px-10 py-4 bg-turquoise-500 text-white rounded-md font-bold text-lg shadow-[0_10px_30px_rgba(56,178,172,0.35)] hover:shadow-[0_14px_40px_rgba(56,178,172,0.45)] ring-1 ring-turquoise-300/50 hover:bg-turquoise-600 transition transform hover:-translate-y-0.5"
              >
                Sign Up
              </button>
            </div>
            {/* Benefits moved into feature blocks */}
          </div>
          
          <div className="lg:w-5/12 lg:pl-6">
            <div className="relative">
              {/* Chart visualization */}
              <div className="bg-transparent rounded-md p-4 transform -rotate-1 z-10 relative">
                <div className="rounded-lg overflow-hidden bg-transparent">
                  <div className="aspect-w-16 aspect-h-9 w-full relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      {/* SVG Chart Pattern */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full p-4" viewBox="0 0 400 225" fill="none">
                        {/* Grid lines */}
                        <g stroke="#2D3748" strokeWidth="0.5" strokeDasharray="2 2">
                          {[0, 1, 2, 3, 4].map(i => (
                            <line key={`h-${i}`} x1="0" y1={45 * i} x2="400" y2={45 * i} />
                          ))}
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <line key={`v-${i}`} x1={50 * i} y1="0" x2={50 * i} y2="225" />
                          ))}
                        </g>
                        
                        {/* Initial uptrend */}
                        <path d="M10,210 L60,160 L110,130" stroke="#38B2AC" strokeWidth="3" />
                        
                        {/* Consolidation/wedge */}
                        <path d="M110,130 L180,150 L250,140" stroke="#38B2AC" strokeWidth="3" />
                        <path d="M110,170 L180,150 L250,140" stroke="#38B2AC" strokeWidth="3" />
                        
                        {/* Breakout */}
                        <path d="M250,140 L310,80 L370,20" stroke="#38B2AC" strokeWidth="3" />
                        
                        {/* Volume bars */}
                        <g fill="#38B2AC" fillOpacity="0.3">
                          <rect x="10" y="190" width="10" height="20" />
                          <rect x="60" y="180" width="10" height="30" />
                          <rect x="110" y="170" width="10" height="40" />
                          <rect x="180" y="195" width="10" height="15" />
                          <rect x="250" y="160" width="10" height="50" />
                          <rect x="310" y="170" width="10" height="40" />
                          <rect x="370" y="180" width="10" height="30" />
                        </g>
                      </svg>
                    </div>
                  </div>
                  {/* Removed label under chart */}
                </div>
              </div>

            </div>
          </div>
          {/* Features overlay removed */}
        </div>
      </section>

      {/* Features section in normal flow to avoid overlap */}
      <section className="bg-transparent pt-0 pb-12 sm:pb-16">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 xl:space-y-12">
            <div className="flex justify-end">
              <div className="inline-block bg-white/10 text-white px-10 py-8 rounded-md backdrop-blur-md border border-white/15 shadow-[0_18px_56px_rgba(56,178,172,0.30)] ring-1 ring-turquoise-300/30 mr-8 xl:mr-16">
                <div className="text-3xl font-semibold tracking-wide">Performance and Accuracy Analytics</div>
                <div className="text-lg text-white/90 mt-3">Track accuracy and improvement</div>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="inline-block bg-white/10 text-white px-10 py-8 rounded-md backdrop-blur-md border border-white/15 shadow-[0_18px_56px_rgba(56,178,172,0.30)] ring-1 ring-turquoise-300/30">
                <div className="text-3xl font-semibold tracking-wide">Personal Progress Dashboard</div>
                <div className="text-lg text-white/90 mt-3">Sessions, streaks, milestones</div>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="inline-block bg-white/10 text-white px-10 py-8 rounded-md backdrop-blur-md border border-white/15 shadow-[0_18px_56px_rgba(56,178,172,0.30)] ring-1 ring-turquoise-300/30 mr-20 xl:mr-40">
                <div className="text-3xl font-semibold tracking-wide">Interactive Breakout Practice</div>
                <div className="text-lg text-white/90 mt-3">Rapid drills on real historical charts</div>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="inline-block bg-white/10 text-white px-10 py-8 rounded-md backdrop-blur-md border border-white/15 shadow-[0_18px_56px_rgba(56,178,172,0.30)] ring-1 ring-turquoise-300/30">
                <div className="text-3xl font-semibold tracking-wide">Instant After Chart Reveal</div>
                <div className="text-lg text-white/90 mt-3">See the outcome and ideal entry</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials and stats removed per request */}
      
      {/* CTA Section with stronger visual impact and clearer value */}
      {/* CTA section removed per request */}
      
      {/* Footer removed - global footer is rendered in layout */}
      {showAuth && (
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} initialMode={"SIGNUP"} />
      )}
    </div>
  );
};

export default LandingPage; 

// Typing effect for feature names in the hero (mobile-friendly)
const TypedFeatures = () => {
  const [text, setText] = useState("")
  const [featureIndex, setFeatureIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [charIndex, setCharIndex] = useState(0)

  useEffect(() => {
    const current = FEATURE_NAMES[featureIndex % FEATURE_NAMES.length]
    const typeDelay = 32
    const deleteDelay = 22
    const endPause = 900
    const startPause = 220

    let timeoutId

    if (!isDeleting && charIndex === 0) {
      timeoutId = setTimeout(() => setCharIndex(1), startPause)
    } else if (!isDeleting && charIndex <= current.length) {
      timeoutId = setTimeout(() => {
        setText(current.slice(0, charIndex))
        setCharIndex(charIndex + 1)
      }, typeDelay)
    } else if (!isDeleting && charIndex > current.length) {
      timeoutId = setTimeout(() => {
        setIsDeleting(true)
        setCharIndex(current.length - 1)
      }, endPause)
    } else if (isDeleting && charIndex >= 0) {
      timeoutId = setTimeout(() => {
        setText(current.slice(0, charIndex))
        setCharIndex(charIndex - 1)
      }, deleteDelay)
    } else if (isDeleting && charIndex < 0) {
      setIsDeleting(false)
      setFeatureIndex((i) => (i + 1) % FEATURE_NAMES.length)
      setCharIndex(0)
    }

    return () => timeoutId && clearTimeout(timeoutId)
  }, [featureIndex, isDeleting, charIndex])

  return (
    <div className="mt-5 w-full text-xl sm:text-2xl lg:text-3xl text-turquoise-300 font-mono tracking-wide font-semibold whitespace-normal md:whitespace-nowrap break-words max-w-full leading-snug min-h-[3.5rem] sm:min-h-[2.6rem] mb-3 sm:mb-4">
      <span className="text-turquoise-400">Featuring</span>
      <span className="mx-2 text-turquoise-500">//</span>
      <span className="text-white">{text}</span>
      <span className="ml-1 border-r-2 border-turquoise-400 align-middle inline-block" style={{ animation: 'caretBlink 1s steps(1) infinite' }} />
      <style jsx>{`
        @keyframes caretBlink { 50% { border-color: transparent; } }
      `}</style>
    </div>
  )
}