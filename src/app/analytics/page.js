"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

/**
 * Analytics Page
 * 
 * A placeholder page for displaying trading performance analytics.
 * Features:
 * - Redirects to home if user is not authenticated
 * - Displays performance metrics and charts
 * - Shows trading history and statistics
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-turquoise-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
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
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Accuracy Trend</h3>
          <div className="h-48 bg-gray-100 rounded flex items-center justify-center">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <p className="text-gray-500">Chart Placeholder</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">Your accuracy has improved by <span className="text-green-600 font-medium">{performanceData.improvementRate}</span> in the last 30 days.</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Response Time</h3>
          <div className="h-48 bg-gray-100 rounded flex items-center justify-center">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500">Chart Placeholder</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">Your average response time is <span className="font-medium">1.8 seconds</span>, faster than 65% of users.</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Pattern Recognition</h3>
          <div className="h-48 bg-gray-100 rounded flex items-center justify-center">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-500">Chart Placeholder</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">You excel at identifying <span className="font-medium">Bull Flag</span> patterns with 92% accuracy.</p>
          </div>
        </div>
      </div>
      
      {/* Stats Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Total Rounds</p>
            <p className="text-2xl font-bold text-gray-900">{performanceData.totalRounds}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Avg. Accuracy</p>
            <p className="text-2xl font-bold text-turquoise-600">{performanceData.averageAccuracy}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Best Streak</p>
            <p className="text-2xl font-bold text-gray-900">{performanceData.bestStreak}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Total Time</p>
            <p className="text-2xl font-bold text-gray-900">{performanceData.totalTime}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Improvement</p>
            <p className="text-2xl font-bold text-green-600">{performanceData.improvementRate}</p>
          </div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentTrades.map((trade, index) => (
            <div key={index} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{trade.symbol}</p>
                  <p className="text-sm text-gray-500">{trade.date}</p>
                </div>
                <div className="flex items-center">
                  <div className="mr-6">
                    <p className="text-sm text-gray-500">Accuracy</p>
                    <p className="font-medium text-gray-900">{trade.accuracy}%</p>
                  </div>
                  <div className="mr-6">
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium text-gray-900">{trade.time}</p>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trade.result === 'win' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {trade.result === 'win' ? 'Win' : 'Loss'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
  
  const renderPatterns = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Pattern Recognition Performance</h3>
      <p className="text-gray-600 mb-6">This section would show detailed analytics about your performance with different chart patterns.</p>
      <div className="h-64 bg-gray-100 rounded flex items-center justify-center mb-6">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500">Pattern Performance Chart Placeholder</p>
        </div>
      </div>
      <p className="text-gray-600">This is a placeholder for the pattern recognition analytics section.</p>
    </div>
  )
  
  const renderProgress = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Learning Progress</h3>
      <p className="text-gray-600 mb-6">This section would show your progress through the learning materials and practice sessions.</p>
      <div className="h-64 bg-gray-100 rounded flex items-center justify-center mb-6">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-gray-500">Learning Progress Chart Placeholder</p>
        </div>
      </div>
      <p className="text-gray-600">This is a placeholder for the learning progress analytics section.</p>
    </div>
  )
  
  // If authenticated, show analytics page
  if (session) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Analytics</h1>
        <p className="text-lg text-gray-600 mb-8">Track your trading performance and identify areas for improvement</p>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`${
                activeTab === "overview"
                  ? "border-turquoise-500 text-turquoise-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("patterns")}
              className={`${
                activeTab === "patterns"
                  ? "border-turquoise-500 text-turquoise-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Pattern Recognition
            </button>
            <button
              onClick={() => setActiveTab("progress")}
              className={`${
                activeTab === "progress"
                  ? "border-turquoise-500 text-turquoise-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Learning Progress
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        {activeTab === "overview" && renderOverview()}
        {activeTab === "patterns" && renderPatterns()}
        {activeTab === "progress" && renderProgress()}
      </div>
    )
  }
  
  // Fallback - should not reach here due to redirect
  return null
}