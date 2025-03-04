/**
 * LandingPage Component
 * 
 * Displays a marketing landing page for unauthenticated users.
 * Features:
 * - Hero section with call-to-action
 * - Feature highlights with icons
 * - Testimonials from fictional users
 * - Pricing information
 * - FAQ section
 */
import React from "react";
import Image from "next/image";

const LandingPage = ({ onSignIn }) => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-turquoise-600 to-turquoise-400 py-16 sm:py-24">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 800 800">
            <path d="M0,0 L800,0 L800,800 L0,800 Z" fill="none" stroke="white" strokeWidth="2"></path>
            <path d="M0,0 L800,800" stroke="white" strokeWidth="2"></path>
            <path d="M800,0 L0,800" stroke="white" strokeWidth="2"></path>
            <circle cx="400" cy="400" r="200" fill="none" stroke="white" strokeWidth="2"></circle>
          </svg>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 lg:pr-12 mb-10 lg:mb-0">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Master the Breakout Strategy
            </h1>
            <p className="text-xl text-white opacity-90 mb-8">
              Practice identifying breakout patterns with real market data. Improve your trading skills and boost your success rate with our interactive study tool.
            </p>
            <button 
              onClick={onSignIn}
              className="px-8 py-4 bg-white text-turquoise-600 rounded-lg shadow-lg font-bold text-lg hover:bg-gray-100 transition transform hover:scale-105"
            >
              Start Trading Now
            </button>
          </div>
          
          <div className="lg:w-1/2">
            <div className="bg-white rounded-lg shadow-2xl p-2 transform rotate-1">
              <div className="aspect-w-16 aspect-h-9 rounded overflow-hidden">
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose BreakoutPro?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform offers everything you need to master the breakout trading strategy
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg shadow-md p-8 transition transform hover:scale-105">
              <div className="w-12 h-12 bg-turquoise-100 rounded-lg flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-turquoise-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real Market Data</h3>
              <p className="text-gray-600">
                Practice with actual historical stock data to develop real-world pattern recognition skills.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white rounded-lg shadow-md p-8 transition transform hover:scale-105">
              <div className="w-12 h-12 bg-turquoise-100 rounded-lg flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-turquoise-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Performance Tracking</h3>
              <p className="text-gray-600">
                Monitor your progress with detailed analytics and see how your skills improve over time.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white rounded-lg shadow-md p-8 transition transform hover:scale-105">
              <div className="w-12 h-12 bg-turquoise-100 rounded-lg flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-turquoise-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Timed Exercises</h3>
              <p className="text-gray-600">
                Develop quick decision-making skills with timed trading scenarios that simulate real market conditions.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of traders who have improved their skills with BreakoutPro
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-gray-50 rounded-lg p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full mr-4"></div>
                <div>
                  <h4 className="font-bold text-gray-900">Sarah Johnson</h4>
                  <p className="text-gray-600 text-sm">Day Trader</p>
                </div>
              </div>
              <p className="text-gray-700">
                "BreakoutPro has completely transformed my trading. I've increased my success rate by 27% in just two months!"
              </p>
            </div>
            
            {/* Testimonial 2 */}
            <div className="bg-gray-50 rounded-lg p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full mr-4"></div>
                <div>
                  <h4 className="font-bold text-gray-900">Michael Chen</h4>
                  <p className="text-gray-600 text-sm">Swing Trader</p>
                </div>
              </div>
              <p className="text-gray-700">
                "The real-time feedback and performance tracking have helped me identify my weaknesses and turn them into strengths."
              </p>
            </div>
            
            {/* Testimonial 3 */}
            <div className="bg-gray-50 rounded-lg p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full mr-4"></div>
                <div>
                  <h4 className="font-bold text-gray-900">Alex Rodriguez</h4>
                  <p className="text-gray-600 text-sm">Retail Investor</p>
                </div>
              </div>
              <p className="text-gray-700">
                "As a beginner, I was intimidated by trading. BreakoutPro made learning fun and accessible. Now I trade with confidence!"
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-turquoise-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Become a Better Trader?</h2>
          <p className="text-xl text-white opacity-90 mb-8 max-w-3xl mx-auto">
            Join BreakoutPro today and start your journey to trading mastery. It only takes a minute to sign up!
          </p>
          <button 
            onClick={onSignIn}
            className="px-8 py-4 bg-white text-turquoise-600 rounded-lg shadow-lg font-bold text-lg hover:bg-gray-100 transition transform hover:scale-105"
          >
            Get Started Now
          </button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage; 