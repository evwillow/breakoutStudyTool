"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

/**
 * Analytics Page
 * 
 * Professional analytics dashboard for tracking trading performance metrics.
 * Features:
 * - Dark modern design with green/gold accents highlighting profit focus
 * - Performance metrics displayed with clear visual hierarchy
 * - Data visualization that emphasizes profit-generating patterns
 * - Premium trading metrics UI encouraging profit-focused analysis
 * - Mobile-responsive layout with perfect alignment
 */
export default function Analytics() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  
  // Redirect to home if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])
  
  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading analytics...</p>
        </div>
      </div>
    )
  }
  
  // Mock data for analytics
  const performanceData = {
    totalRounds: 124,
    averageAccuracy: 68.5,
    bestStreak: 12,
    totalTime: "32h 45m",
    improvementRate: "+12.3%"
  }
  
  const recentTrades = [
    { date: "2023-06-15", symbol: "AAPL", result: "win", accuracy: 85, time: "1m 23s" },
    { date: "2023-06-14", symbol: "TSLA", result: "loss", accuracy: 42, time: "2m 05s" },
    { date: "2023-06-14", symbol: "MSFT", result: "win", accuracy: 91, time: "0m 58s" },
    { date: "2023-06-13", symbol: "AMZN", result: "win", accuracy: 76, time: "1m 47s" },
    { date: "2023-06-12", symbol: "NVDA", result: "loss", accuracy: 38, time: "2m 12s" }
  ]
  
  // Tab content components
  const renderOverview = () => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Performance Cards */}
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
          <div className="border-b border-gray-700 px-6 py-4">
            <h3 className="text-lg font-medium text-gray-100">Profit Accuracy Trend</h3>
          </div>
          <div className="p-6">
            <div className="h-48 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <p className="text-gray-400">Chart Placeholder</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <p className="text-sm text-gray-300">Your profit accuracy has improved by <span className="text-green-400 font-medium">{performanceData.improvementRate}</span> in the last 30 days.</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
          <div className="border-b border-gray-700 px-6 py-4">
            <h3 className="text-lg font-medium text-gray-100">Execution Speed</h3>
          </div>
          <div className="p-6">
            <div className="h-48 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-400">Chart Placeholder</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <p className="text-sm text-gray-300">Your average execution time is <span className="font-medium text-gray-100">1.8 seconds</span>, faster than 65% of profitable traders.</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
          <div className="border-b border-gray-700 px-6 py-4">
            <h3 className="text-lg font-medium text-gray-100">Profit Pattern Recognition</h3>
          </div>
          <div className="p-6">
            <div className="h-48 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-400">Chart Placeholder</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <p className="text-sm text-gray-300">You excel at identifying <span className="font-medium text-gray-100">Bull Flag</span> patterns with <span className="text-green-400 font-medium">92%</span> profit rate.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Summary */}
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden mb-8">
        <div className="border-b border-gray-700 px-6 py-4">
          <h3 className="text-lg font-medium text-gray-100">Profit Performance Summary</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">Total Trades</p>
              <p className="text-2xl font-bold text-gray-100">{performanceData.totalRounds}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">Win Rate</p>
              <p className="text-2xl font-bold text-green-400">{performanceData.averageAccuracy}%</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">Win Streak</p>
              <p className="text-2xl font-bold text-gray-100">{performanceData.bestStreak}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">Trading Time</p>
              <p className="text-2xl font-bold text-gray-100">{performanceData.totalTime}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">Profit Growth</p>
              <p className="text-2xl font-bold text-green-400">{performanceData.improvementRate}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
        <div className="border-b border-gray-700 px-6 py-4">
          <h3 className="text-lg font-medium text-gray-100">Recent Trade Activity</h3>
        </div>
        <div className="divide-y divide-gray-700">
          {recentTrades.map((trade, index) => (
            <div key={index} className="px-6 py-4 hover:bg-gray-750 transition duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-100">{trade.symbol}</p>
                  <p className="text-sm text-gray-400">{trade.date}</p>
                </div>
                <div className="flex items-center">
                  <div className="mr-6">
                    <p className="text-sm text-gray-400">Accuracy</p>
                    <p className="font-medium text-gray-100">{trade.accuracy}%</p>
                  </div>
                  <div className="mr-6">
                    <p className="text-sm text-gray-400">Time</p>
                    <p className="font-medium text-gray-100">{trade.time}</p>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trade.result === 'win' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                    }`}>
                      {trade.result === 'win' ? 'Win' : 'Loss'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 bg-gray-750 border-t border-gray-700">
          <button className="w-full text-center py-2 rounded-md border border-green-500 text-green-400 hover:bg-gray-700 transition-colors duration-150">
            View All Trading Activity
          </button>
        </div>
      </div>
    </div>
  )
  
  const renderPatterns = () => (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
      <div className="border-b border-gray-700 px-6 py-4">
        <h3 className="text-lg font-medium text-gray-100">Pattern Recognition Performance</h3>
      </div>
      <div className="p-6">
        <p className="text-gray-400 mb-6">This section would show detailed analytics about your performance with different chart patterns.</p>
        <div className="h-64 bg-gray-900 rounded-lg flex items-center justify-center mb-6">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-400">Pattern Performance Chart Placeholder</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-800 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center shadow-sm mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4,22 8,10" />
                  <polyline points="8,10 15,12" strokeLinecap="butt" />
                  <polyline points="6,16 15,12" strokeLinecap="butt" />
                  <polyline points="15,12 19,3" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-100">Bull Flag</h4>
                <p className="text-sm text-green-700">92% Accuracy</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center shadow-sm mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-100">Head & Shoulders</h4>
                <p className="text-sm text-gray-600">78% Accuracy</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center shadow-sm mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22,6 18,10 14,6 10,10 6,6 2,10"/>
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-100">Cup & Handle</h4>
                <p className="text-sm text-gray-600">64% Accuracy</p>
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-gray-400">Continue practicing to improve your pattern recognition skills.</p>
      </div>
    </div>
  )
  
  const renderProgress = () => (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
      <div className="border-b border-gray-700 px-6 py-4">
        <h3 className="text-lg font-medium text-gray-100">Learning Progress</h3>
      </div>
      <div className="p-6">
        <p className="text-gray-400 mb-6">This section would show your progress through the learning materials and practice sessions.</p>
        <div className="h-64 bg-gray-900 rounded-lg flex items-center justify-center mb-6">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-gray-400">Learning Progress Chart Placeholder</p>
          </div>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <div className="flex justify-between mb-1">
              <p className="text-sm font-medium text-gray-700">Breakout Basics</p>
              <p className="text-sm font-medium text-green-600">100%</p>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: "100%" }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <p className="text-sm font-medium text-gray-700">Volume Analysis</p>
              <p className="text-sm font-medium text-green-600">75%</p>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: "75%" }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <p className="text-sm font-medium text-gray-700">Entry & Exit Strategies</p>
              <p className="text-sm font-medium text-green-600">45%</p>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: "45%" }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <p className="text-sm font-medium text-gray-700">Risk Management</p>
              <p className="text-sm font-medium text-green-600">20%</p>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: "20%" }}></div>
            </div>
          </div>
        </div>
        
        <p className="text-gray-400">You've completed 60% of all available learning materials.</p>
      </div>
    </div>
  )
  
  // If authenticated, show analytics page
  if (session) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2">Profit <span className="text-green-500">Analytics</span></h1>
              <p className="text-gray-300">Track your trading performance and maximize your profit potential</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center">
              <div className="text-sm text-gray-400">
                Last updated: <span className="text-gray-300">Today, 2:45 PM</span>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-700 mb-8">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("overview")}
                className={`${
                  activeTab === "overview"
                    ? "border-green-500 text-green-400"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Profit Overview
              </button>
              <button
                onClick={() => setActiveTab("patterns")}
                className={`${
                  activeTab === "patterns"
                    ? "border-green-500 text-green-400"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Pattern Performance
              </button>
              <button
                onClick={() => setActiveTab("progress")}
                className={`${
                  activeTab === "progress"
                    ? "border-green-500 text-green-400"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Profit Progress
              </button>
            </nav>
          </div>
          
          {/* Tab Content */}
          {activeTab === "overview" && renderOverview()}
          {activeTab === "patterns" && renderPatterns()}
          {activeTab === "progress" && renderProgress()}
        </div>
      </div>
    )
  }
  
  // Fallback - should not reach here due to redirect
  return null
}