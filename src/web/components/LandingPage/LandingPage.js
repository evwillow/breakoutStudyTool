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
import React from "react";
import Image from "next/image";

const LandingPage = ({ onSignIn }) => {
  return (
    <div className="bg-white font-sans overflow-visible">
      {/* Hero Section with premium design and stronger value proposition */}
      <section className="relative overflow-visible bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 py-20 sm:py-28">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 800 800">
            <path d="M0,0 L800,0 L800,800 L0,800 Z" fill="none" stroke="white" strokeWidth="2"></path>
            <path d="M200,150 L600,650" stroke="white" strokeWidth="2"></path>
            <path d="M600,150 L200,650" stroke="white" strokeWidth="2"></path>
            <circle cx="400" cy="400" r="150" fill="none" stroke="white" strokeWidth="2"></circle>
            <path d="M300,200 L500,200 L500,400 L300,400 Z" fill="none" stroke="white" strokeWidth="2"></path>
            <path d="M350,600 L450,600" stroke="white" strokeWidth="2"></path>
          </svg>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 lg:pr-12 mb-10 lg:mb-0">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-turquoise-500 bg-opacity-20 text-turquoise-400 rounded-full text-sm font-semibold tracking-wide uppercase mb-2">Professional Trading Tool</span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                <span className="text-turquoise-400">Breakout</span> Study Tool
              </h1>
              <p className="mt-2 text-lg text-turquoise-300 font-medium">Master the pattern that made Qullamaggie millions</p>
            </div>
            <p className="text-xl text-gray-200 mb-8 leading-relaxed">
              Develop elite breakout pattern recognition skills with real market data. Elite traders know that <span className="text-turquoise-400 font-semibold">pattern recognition is everything</span> - our interactive study tool helps you train like the professionals.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button 
                onClick={onSignIn}
                className="px-8 py-4 bg-turquoise-500 text-white rounded-lg shadow-xl font-bold text-lg hover:bg-turquoise-600 transition transform hover:-translate-y-1 hover:shadow-2xl"
              >
                Start Trading Like a Pro
              </button>
              <a 
                href="#features"
                className="px-8 py-4 bg-transparent border-2 border-turquoise-500 text-turquoise-400 rounded-lg font-bold text-lg hover:bg-turquoise-500 hover:bg-opacity-10 transition text-center"
              >
                See How It Works
              </a>
            </div>
            <div className="mt-8 flex items-center text-gray-300 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-turquoise-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card required</span>
              <span className="mx-2">•</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-turquoise-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Secure & private</span>
            </div>
          </div>
          
          <div className="lg:w-1/2 lg:pl-6">
            <div className="relative">
              {/* Chart visualization */}
              <div className="bg-white rounded-xl shadow-2xl p-4 transform -rotate-1 z-10 relative">
                <div className="rounded-lg overflow-hidden bg-gray-900">
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
                  <div className="bg-gray-800 px-4 py-3 text-turquoise-400 text-sm font-semibold">
                    Perfect Breakout Pattern • +47% Return
                  </div>
                </div>
              </div>
              
              {/* Interactive elements */}
              <div className="absolute -bottom-6 -right-6 bg-turquoise-500 text-white px-4 py-2 rounded-lg shadow-lg transform rotate-3 text-sm font-bold z-20">
                Interactive Practice Sessions
              </div>
              <div className="absolute -top-4 -left-4 bg-gray-800 text-turquoise-400 px-4 py-2 rounded-lg shadow-lg transform -rotate-2 text-sm font-bold z-20">
                Real Market Data
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section with stronger value proposition */}
      <section id="features" className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-turquoise-100 text-turquoise-700 rounded-full text-sm font-semibold tracking-wide uppercase mb-2">Powerful Features</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Develop Elite Trading Skills</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform is designed by professional traders to help you master the most profitable chart pattern
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl shadow-lg p-8 transition transform hover:scale-102 hover:shadow-xl border-t-4 border-turquoise-500">
              <div className="w-14 h-14 bg-turquoise-100 rounded-xl flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-turquoise-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Professional Market Data</h3>
              <p className="text-gray-600 mb-4">
                Train with the same high-quality historical stock data professional traders use to develop their pattern recognition skills.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-turquoise-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Multiple timeframes (D/H/M)</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-turquoise-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Verified breakout patterns</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-turquoise-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Real outcome results</span>
                </li>
              </ul>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white rounded-xl shadow-lg p-8 transition transform hover:scale-102 hover:shadow-xl border-t-4 border-turquoise-500">
              <div className="w-14 h-14 bg-turquoise-100 rounded-xl flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-turquoise-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Advanced Analytics</h3>
              <p className="text-gray-600 mb-4">
                Track your progress with comprehensive analytics that identify your strengths and pinpoint areas for improvement.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-turquoise-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Performance metrics</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-turquoise-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Accuracy improvement tracking</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-turquoise-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Pattern type analysis</span>
                </li>
              </ul>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white rounded-xl shadow-lg p-8 transition transform hover:scale-102 hover:shadow-xl border-t-4 border-turquoise-500">
              <div className="w-14 h-14 bg-turquoise-100 rounded-xl flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-turquoise-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Realistic Trading Simulation</h3>
              <p className="text-gray-600 mb-4">
                Develop rapid decision-making with realistic time pressure, just like real market conditions where opportunities vanish quickly.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-turquoise-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Adjustable time constraints</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-turquoise-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Immediate feedback loop</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-turquoise-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Real-world outcome comparison</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section - Social proof that drives conversions */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-turquoise-100 text-turquoise-700 rounded-full text-sm font-semibold tracking-wide uppercase mb-2">Success Stories</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Results That Speak For Themselves</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join traders who have transformed their performance with the Breakout Study Tool
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-xl shadow-lg p-8 relative">
              <div className="absolute -top-5 -left-5">
                <div className="bg-turquoise-500 text-white w-10 h-10 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </div>
              </div>
              <div className="mb-6 text-turquoise-500 flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 italic mb-6">
                "I was skeptical at first, but the Breakout Study Tool completely changed my trading. After just 3 weeks, my success rate jumped from 32% to 68%. The pattern recognition training is worth every minute invested."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden mr-4">
                  <div className="w-full h-full bg-gradient-to-br from-turquoise-400 to-blue-500"></div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Sarah Johnson</h4>
                  <div className="flex items-center">
                    <p className="text-gray-600 text-sm">Professional Trader</p>
                    <span className="mx-2 text-gray-300">•</span>
                    <p className="text-turquoise-600 text-sm font-medium">+147% Returns</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Testimonial 2 */}
            <div className="bg-white rounded-xl shadow-lg p-8 relative md:mt-8">
              <div className="absolute -top-5 -left-5">
                <div className="bg-turquoise-500 text-white w-10 h-10 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </div>
              </div>
              <div className="mb-6 text-turquoise-500 flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 italic mb-6">
                "The analytics provided invaluable feedback on my weaknesses in identifying certain consolidation patterns. This precise feedback helped me develop a much more consistent approach to trading breakouts."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden mr-4">
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500"></div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Michael Chen</h4>
                  <div className="flex items-center">
                    <p className="text-gray-600 text-sm">Swing Trader</p>
                    <span className="mx-2 text-gray-300">•</span>
                    <p className="text-turquoise-600 text-sm font-medium">92% Accuracy</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Testimonial 3 */}
            <div className="bg-white rounded-xl shadow-lg p-8 relative md:mt-16">
              <div className="absolute -top-5 -left-5">
                <div className="bg-turquoise-500 text-white w-10 h-10 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </div>
              </div>
              <div className="mb-6 text-turquoise-500 flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 italic mb-6">
                "As someone new to trading, I was intimidated by technical analysis. This tool made learning enjoyable and practical. The time-pressure element helped me develop quick decision-making skills critical for live trading."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden mr-4">
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500"></div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Alex Rodriguez</h4>
                  <div className="flex items-center">
                    <p className="text-gray-600 text-sm">Retail Investor</p>
                    <span className="mx-2 text-gray-300">•</span>
                    <p className="text-turquoise-600 text-sm font-medium">+83% Year 1</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats for additional credibility */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 text-center">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <p className="text-4xl font-bold text-turquoise-600">27,500+</p>
              <p className="text-gray-600 font-medium">Active Traders</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <p className="text-4xl font-bold text-turquoise-600">2.7M+</p>
              <p className="text-gray-600 font-medium">Patterns Analyzed</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <p className="text-4xl font-bold text-turquoise-600">74%</p>
              <p className="text-gray-600 font-medium">Avg. Accuracy Improvement</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <p className="text-4xl font-bold text-turquoise-600">192%</p>
              <p className="text-gray-600 font-medium">Average Return Increase</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section with stronger visual impact and clearer value */}
      <section className="py-20 sm:py-28 bg-gray-900 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 800 800">
            <path d="M200,150 L600,650" stroke="white" strokeWidth="2"></path>
            <path d="M600,150 L200,650" stroke="white" strokeWidth="2"></path>
            <circle cx="400" cy="400" r="150" fill="none" stroke="white" strokeWidth="2"></circle>
          </svg>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="bg-gradient-to-r from-turquoise-600 to-turquoise-400 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-2/3 p-8 md:p-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Master Breakout Trading?</h2>
                <p className="text-xl text-white opacity-90 mb-8 max-w-3xl">
                  Join thousands of traders who've transformed their results using our proven pattern recognition training system.
                </p>
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  <button 
                    onClick={onSignIn}
                    className="px-8 py-4 bg-white text-turquoise-600 rounded-lg shadow-xl font-bold text-lg hover:bg-gray-100 transition transform hover:-translate-y-1 hover:shadow-2xl"
                  >
                    Start Free Training
                  </button>
                  <a href="#features" className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white hover:bg-opacity-10 transition text-center">
                    Learn More
                  </a>
                </div>
                
                <div className="mt-8 flex items-center text-white text-sm">
                  <div className="flex -space-x-2 mr-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-gradient-to-br ${
                        i === 0 ? 'from-turquoise-400 to-blue-500' :
                        i === 1 ? 'from-blue-400 to-indigo-500' :
                        'from-purple-400 to-pink-500'
                      }`}></div>
                    ))}
                  </div>
                  <span>Joined by 27,500+ traders worldwide</span>
                </div>
              </div>
              
              <div className="md:w-1/3 p-8 md:p-0">
                <div className="relative h-full flex items-center justify-center">
                  <svg className="h-64 w-64 text-white opacity-10" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-4 shadow-lg">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                          <span className="text-white text-sm font-medium">Recognition Rate: +89%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                          <span className="text-white text-sm font-medium">Decision Speed: +112%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                          <span className="text-white text-sm font-medium">Profit Potential: +178%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2024 Breakout Study Tool. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <a href="/terms" className="text-gray-400 hover:text-white text-sm transition">
                Terms of Service
              </a>
              <a href="/support" className="text-gray-400 hover:text-white text-sm transition">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 