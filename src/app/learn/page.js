"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Learn Page
 * 
 * A placeholder page for educational content about trading strategies.
 * Features:
 * - Redirects to home if user is not authenticated
 * - Displays educational content about breakout trading
 * - Shows video thumbnails and lesson cards
 */
export default function Learn() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Redirect to home if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])
  
  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-turquoise-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading learning resources...</p>
        </div>
      </div>
    )
  }
  
  // Course modules data
  const modules = [
    {
      title: "Breakout Basics",
      description: "Learn the fundamentals of breakout trading patterns",
      lessons: 5,
      duration: "45 min",
      image: "bg-turquoise-100"
    },
    {
      title: "Volume Analysis",
      description: "How to use volume to confirm breakout signals",
      lessons: 4,
      duration: "38 min",
      image: "bg-blue-100"
    },
    {
      title: "Entry & Exit Strategies",
      description: "Perfect your timing for maximum profit potential",
      lessons: 6,
      duration: "52 min",
      image: "bg-purple-100"
    },
    {
      title: "Risk Management",
      description: "Protect your capital with proper position sizing",
      lessons: 3,
      duration: "30 min",
      image: "bg-pink-100"
    }
  ]
  
  // If authenticated, show learn page
  if (session) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Center</h1>
        <p className="text-lg text-gray-600 mb-8">Master the art of breakout trading with our comprehensive lessons</p>
        
        {/* Featured Video */}
        <div className="bg-gray-900 rounded-xl overflow-hidden mb-12 shadow-xl">
          <div className="aspect-w-16 aspect-h-9 bg-gray-800 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-white text-lg">Featured: Mastering the Qullamaggie Breakout</p>
            </div>
          </div>
          <div className="bg-gray-800 text-white p-6">
            <h2 className="text-xl font-bold mb-2">Mastering the Qullamaggie Breakout</h2>
            <p className="text-gray-300 mb-4">Learn the exact strategy that has helped traders achieve consistent profits in bull markets.</p>
            <div className="flex items-center text-sm text-gray-400">
              <span className="flex items-center mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                32 minutes
              </span>
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                4.2K views
              </span>
            </div>
          </div>
        </div>
        
        {/* Course Modules */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {modules.map((module, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden transition transform hover:scale-105 hover:shadow-lg">
              <div className={`h-40 ${module.image} flex items-center justify-center`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-700 opacity-20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{module.title}</h3>
                <p className="text-gray-600 mb-4">{module.description}</p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{module.lessons} lessons</span>
                  <span>{module.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Quick Tips */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Tips</h2>
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              <div className="w-12 h-12 bg-turquoise-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-turquoise-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Pro Tip: Look for Tight Consolidation</h3>
              <p className="text-gray-600">
                The best breakouts often come after a period of tight consolidation. Look for stocks that have been trading in a narrow range for several weeks before breaking out on increased volume.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Fallback - should not reach here due to redirect
  return null
} 