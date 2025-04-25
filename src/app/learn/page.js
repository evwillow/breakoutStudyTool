"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Learn Page
 * 
 * Professional profit-maximizing educational platform for traders.
 * Features:
 * - High-contrast dark theme that signals professionalism
 * - Bold turquoise accents that highlight profit-generating concepts
 * - Dramatic visual elements that command attention
 * - Performance-focused UI that emphasizes results
 * - Premium visual design that reinforces trading expertise
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
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-turquoise-500 mx-auto"></div>
          <p className="mt-4 text-turquoise-500">Loading profit strategies...</p>
        </div>
      </div>
    )
  }
  
  // Course modules data
  const modules = [
    {
      title: "Breakout Basics",
      description: "Master fundamental patterns for consistent profits",
      lessons: 5,
      duration: "45 min",
      image: "bg-turquoise-900",
      progress: 100,
      roi: "+28%"
    },
    {
      title: "Volume Analysis",
      description: "Confirm signals with volume for higher win rates",
      lessons: 4,
      duration: "38 min",
      image: "bg-blue-900",
      progress: 75,
      roi: "+42%"
    },
    {
      title: "Entry & Exit Strategies",
      description: "Perfect timing for maximum profit potential",
      lessons: 6,
      duration: "52 min",
      image: "bg-purple-900",
      progress: 45,
      roi: "+65%"
    },
    {
      title: "Risk Management",
      description: "Protect capital while maximizing returns",
      lessons: 3,
      duration: "30 min",
      image: "bg-pink-900",
      progress: 20,
      roi: "+31%"
    }
  ]
  
  // If authenticated, show learn page
  if (session) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">PROFIT <span className="text-turquoise-500">MASTERY</span></h1>
              <p className="text-gray-400">Elite breakout trading strategies for maximum market returns</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center bg-gray-900 px-4 py-2 rounded-md">
              <div className="mr-6">
                <p className="text-xs text-gray-500">COMPLETION</p>
                <p className="text-lg font-bold text-white">60<span className="text-turquoise-500">%</span></p>
              </div>
              <div>
                <p className="text-xs text-gray-500">AVERAGE ROI</p>
                <p className="text-lg font-bold text-turquoise-500">+41.5%</p>
              </div>
            </div>
          </div>
          
          {/* Featured Strategy */}
          <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 to-black rounded-lg border border-gray-800 mb-12">
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
              <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,50 L20,30 L40,45 L60,35 L80,55 L100,40" stroke="currentColor" strokeWidth="2" fill="none" className="text-turquoise-500" />
                <path d="M0,70 L20,65 L40,85 L60,75 L80,90 L100,80" stroke="currentColor" strokeWidth="2" fill="none" className="text-turquoise-700" />
              </svg>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-8 md:p-12">
                <div className="inline-block px-3 py-1 bg-turquoise-500 bg-opacity-20 rounded-full text-turquoise-500 text-sm font-semibold mb-4">FEATURED STRATEGY</div>
                <h2 className="text-3xl font-bold mb-4">Qullamaggie Breakout <span className="text-turquoise-500">Mastery</span></h2>
                <p className="text-gray-400 mb-6">Learn the exact strategy that has generated over 400% returns for traders in bull market conditions. Perfect for volatile markets and high-growth sectors.</p>
                <div className="flex flex-wrap items-center mb-6">
                  <div className="flex items-center mr-6 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-turquoise-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">32 minutes</span>
                  </div>
                  <div className="flex items-center mr-6 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-turquoise-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">4.2K traders</span>
                  </div>
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-turquoise-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                    </svg>
                    <span className="text-turquoise-500 font-semibold">+412% ROI</span>
                  </div>
                </div>
                <button className="px-6 py-3 bg-turquoise-500 hover:bg-turquoise-600 text-black font-bold rounded-md transition duration-150 shadow-lg shadow-turquoise-900/20">
                  START MASTERING
                </button>
              </div>
              <div className="aspect-w-16 aspect-h-9 md:aspect-auto bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-turquoise-500 bg-opacity-30 rounded-full flex items-center justify-center mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Course Modules */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Profit <span className="text-turquoise-500">Modules</span></h2>
              <div className="hidden md:flex items-center text-gray-500 text-sm">
                <span className="w-2 h-2 bg-turquoise-500 rounded-full mr-2"></span>
                <span>Recommended order</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {modules.map((module, index) => (
                <div key={index} className="bg-gray-900 rounded-lg overflow-hidden transition transform hover:scale-[1.02] hover:shadow-xl hover:shadow-turquoise-900/10 border border-gray-800">
                  <div className={`h-2 ${module.image}`}></div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-white">{module.title}</h3>
                      <span className="px-2 py-1 bg-turquoise-500 bg-opacity-20 rounded text-turquoise-500 text-xs font-semibold">
                        {module.roi}
                      </span>
                    </div>
                    <p className="text-gray-400 mb-6">{module.description}</p>
                    <div className="flex justify-between text-sm text-gray-500 mb-4">
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {module.lessons} lessons
                      </span>
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {module.duration}
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1 mb-3">
                      <div className="bg-turquoise-500 h-1 rounded-full transition-all duration-1000" style={{ width: `${module.progress}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{module.progress}% complete</span>
                      <button className="text-turquoise-500 text-sm font-semibold hover:text-turquoise-400 transition-colors">
                        {module.progress === 100 ? 'Review' : 'Continue'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Trading Edge */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden mb-12">
            <div className="border-b border-gray-800 px-6 py-4 flex items-center">
              <div className="w-8 h-8 bg-turquoise-500 bg-opacity-20 rounded-md flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-turquoise-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Trading <span className="text-turquoise-500">Edge</span></h2>
            </div>
            <div className="p-6">
              <div className="bg-black bg-opacity-50 rounded-lg p-6 mb-6 border border-gray-800">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-12 h-12 bg-turquoise-500 bg-opacity-20 rounded-md flex items-center justify-center shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-turquoise-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Tight Consolidation: The Profit Catalyst</h3>
                    <p className="text-gray-400">
                      The most profitable breakouts follow tight consolidation periods. Target stocks trading in narrow ranges for 3+ weeks before breaking out on 2-3x average volume for maximum profit potential.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black bg-opacity-50 rounded-lg p-4 border border-gray-800">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-turquoise-500 bg-opacity-20 rounded-md flex items-center justify-center shadow-inner mr-3 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-turquoise-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                      </svg>
                    </div>
                    <p className="text-gray-300">
                      <span className="font-semibold text-white">Trade Market Direction:</span> Only take breakouts in alignment with the overall market trend.
                    </p>
                  </div>
                </div>
                
                <div className="bg-black bg-opacity-50 rounded-lg p-4 border border-gray-800">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-turquoise-500 bg-opacity-20 rounded-md flex items-center justify-center shadow-inner mr-3 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-turquoise-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-gray-300">
                      <span className="font-semibold text-white">Volume Confirmation:</span> Only enter when breakouts show 2-3x normal volume for highest win rate.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Resources */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <div className="border-b border-gray-800 px-6 py-4 flex items-center">
              <div className="w-8 h-8 bg-turquoise-500 bg-opacity-20 rounded-md flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-turquoise-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Pro <span className="text-turquoise-500">Resources</span></h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a href="#" className="block bg-black bg-opacity-50 hover:bg-opacity-70 rounded-lg p-4 transition duration-150 border border-gray-800">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-turquoise-500 bg-opacity-20 rounded-md flex items-center justify-center shadow-inner mr-3 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-turquoise-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">High-Profit Pattern Recognition</h3>
                      <p className="text-sm text-gray-400">Detailed guide to identifying the most profitable chart patterns</p>
                    </div>
                  </div>
                </a>
                
                <a href="#" className="block bg-black bg-opacity-50 hover:bg-opacity-70 rounded-lg p-4 transition duration-150 border border-gray-800">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-turquoise-500 bg-opacity-20 rounded-md flex items-center justify-center shadow-inner mr-3 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-turquoise-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Pro Trader Masterclass</h3>
                      <p className="text-sm text-gray-400">Advanced video series with professional traders</p>
                    </div>
                  </div>
                </a>
                
                <a href="#" className="block bg-black bg-opacity-50 hover:bg-opacity-70 rounded-lg p-4 transition duration-150 border border-gray-800">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-turquoise-500 bg-opacity-20 rounded-md flex items-center justify-center shadow-inner mr-3 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-turquoise-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Performance Analytics</h3>
                      <p className="text-sm text-gray-400">Historical data on top-performing breakout setups</p>
                    </div>
                  </div>
                </a>
                
                <a href="#" className="block bg-black bg-opacity-50 hover:bg-opacity-70 rounded-lg p-4 transition duration-150 border border-gray-800">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-turquoise-500 bg-opacity-20 rounded-md flex items-center justify-center shadow-inner mr-3 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-turquoise-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Elite Trader Community</h3>
                      <p className="text-sm text-gray-400">Connect with successful traders who use these strategies</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Fallback - should not reach here due to redirect
  return null
} 