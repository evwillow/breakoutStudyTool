"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

/**
 * Community Page
 * 
 * Professional community platform for trader interaction and engagement.
 * Features:
 * - Dark modern design with gold/green accents highlighting profit focus
 * - Well-structured community sections with clear visual hierarchy
 * - Premium trading community interface encouraging profit-focused discussion
 * - Performance-focused leaderboard that highlights top profitable traders
 * - Mobile-responsive components with perfect alignment
 */
export default function Community() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("leaderboard")
  
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
          <p className="mt-4 text-gray-300">Loading community...</p>
        </div>
      </div>
    )
  }
  
  // Mock data for community
  const leaderboardUsers = [
    { rank: 1, name: "TradingMaster", score: 9850, avatar: "bg-green-700", streak: 42, profit: "+$24,680" },
    { rank: 2, name: "ChartWizard", score: 9340, avatar: "bg-green-600", streak: 28, profit: "+$18,920" },
    { rank: 3, name: "PatternHunter", score: 8920, avatar: "bg-purple-700", streak: 35, profit: "+$15,340" },
    { rank: 4, name: "MarketGuru", score: 8750, avatar: "bg-amber-600", streak: 21, profit: "+$12,750" },
    { rank: 5, name: "BreakoutKing", score: 8430, avatar: "bg-amber-500", streak: 19, profit: "+$10,430" },
    { rank: 6, name: "TrendTrader", score: 8120, avatar: "bg-green-800", streak: 14, profit: "+$8,120" },
    { rank: 7, name: "ChartNinja", score: 7980, avatar: "bg-indigo-700", streak: 23, profit: "+$7,980" },
    { rank: 8, name: "SwingMaster", score: 7650, avatar: "bg-green-600", streak: 16, profit: "+$7,650" },
    { rank: 9, name: "CandleReader", score: 7340, avatar: "bg-amber-600", streak: 12, profit: "+$7,340" },
    { rank: 10, name: "VolumePro", score: 7120, avatar: "bg-blue-700", streak: 9, profit: "+$7,120" }
  ]
  
  const discussionTopics = [
    { 
      id: 1, 
      title: "Best indicators for profitable breakout confirmation?", 
      author: "TradingMaster", 
      replies: 24, 
      lastActivity: "2 hours ago",
      tags: ["Indicators", "Profit", "Breakouts"]
    },
    { 
      id: 2, 
      title: "How to spot false breakouts early and protect profits", 
      author: "PatternHunter", 
      replies: 18, 
      lastActivity: "5 hours ago",
      tags: ["False Signals", "Profit Protection"]
    },
    { 
      id: 3, 
      title: "Volume analysis for maximizing breakout profits", 
      author: "VolumePro", 
      replies: 32, 
      lastActivity: "1 day ago",
      tags: ["Volume", "Profit Maximization"]
    },
    { 
      id: 4, 
      title: "Psychological aspects of securing profits in breakouts", 
      author: "MindTrader", 
      replies: 41, 
      lastActivity: "2 days ago",
      tags: ["Psychology", "Profit Taking"]
    },
    { 
      id: 5, 
      title: "Share your most profitable breakout trade this week", 
      author: "ChartWizard", 
      replies: 27, 
      lastActivity: "3 days ago",
      tags: ["Trade Sharing", "Success Stories"]
    }
  ]
  
  const events = [
    {
      id: 1,
      title: "Live Profitable Breakout Trading Session",
      date: "June 25, 2023",
      time: "10:00 AM EST",
      host: "TradingMaster",
      participants: 156,
      description: "Join our top trader for a live session identifying and profiting from breakouts in real-time.",
      premium: true
    },
    {
      id: 2,
      title: "Webinar: Advanced Profit-Taking Strategies",
      date: "July 2, 2023",
      time: "2:00 PM EST",
      host: "MarketGuru",
      participants: 89,
      description: "Learn advanced techniques for maximizing profits on high-probability breakout setups.",
      premium: true
    },
    {
      id: 3,
      title: "Trading Challenge: Maximum Profit Edition",
      date: "July 10-14, 2023",
      time: "All Day",
      host: "BreakoutPro Team",
      participants: 243,
      description: "Compete with other traders in our weekly challenge focused on maximizing profit from breakout trading.",
      premium: false
    }
  ]
  
  // Tab content components
  const renderLeaderboard = () => (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
      <div className="border-b border-gray-700 px-6 py-4">
        <h3 className="text-lg font-medium text-gray-100">Top Profitable Traders This Month</h3>
      </div>
      <div className="divide-y divide-gray-700">
        {leaderboardUsers.map((user) => (
          <div key={user.rank} className="px-6 py-4 hover:bg-gray-750 transition duration-150">
            <div className="flex items-center">
              <div className="flex-shrink-0 mr-4">
                <div className={`w-10 h-10 ${user.avatar} rounded-lg flex items-center justify-center text-white font-bold shadow-md`}>
                  {user.name.charAt(0)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-100">
                    <span className="mr-2 text-gray-400">#{user.rank}</span>
                    {user.name}
                  </p>
                  <p className="text-green-400 font-bold">{user.score}</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    {user.streak} day streak
                  </span>
                  <span className="text-green-400 font-bold">{user.profit}</span>
                </div>
              </div>
              <div className="ml-4">
                <button className="text-sm text-amber-400 hover:text-amber-300 font-medium">View Profile</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 py-4 bg-gray-750 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Your Rank: <span className="font-medium">#42</span></p>
          <button className="text-sm text-amber-400 hover:text-amber-300 font-medium">View Full Leaderboard</button>
        </div>
      </div>
    </div>
  )
  
  const renderDiscussions = () => (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
      <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-100">Profit Strategy Forum</h3>
        <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors duration-150">
          New Topic
        </button>
      </div>
      <div className="divide-y divide-gray-700">
        {discussionTopics.map((topic) => (
          <div key={topic.id} className="px-6 py-4 hover:bg-gray-750 transition duration-150">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-medium text-gray-100 mb-1">{topic.title}</h4>
                <div className="flex items-center text-sm text-gray-400">
                  <span className="mr-4">By {topic.author}</span>
                  <span className="mr-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {topic.replies} replies
                  </span>
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {topic.lastActivity}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {topic.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ml-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 py-4 bg-gray-750 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Showing 5 of 124 topics</p>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-300 hover:bg-gray-600 transition-colors duration-150">Previous</button>
            <button className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-300 hover:bg-gray-600 transition-colors duration-150">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
  
  const renderEvents = () => (
    <div>
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden mb-8">
        <div className="border-b border-gray-700 px-6 py-4">
          <h3 className="text-lg font-medium text-gray-100">Upcoming Premium Events</h3>
        </div>
        <div className="divide-y divide-gray-700">
          {events.map((event) => (
            <div key={event.id} className="px-6 py-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-green-400 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center">
                    <h4 className="text-base font-medium text-gray-100 mb-1">{event.title}</h4>
                    {event.premium && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-900 text-amber-300">
                        PREMIUM
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center text-sm text-gray-400 mb-2">
                    <span className="mr-4 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      {event.date}
                    </span>
                    <span className="mr-4 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      {event.time}
                    </span>
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      Host: {event.host}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-3">{event.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                      {event.participants} participants
                    </span>
                    <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors duration-150">
                      Register
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 bg-gray-750 border-t border-gray-700">
          <button className="w-full text-center py-2 rounded-md border border-amber-500 text-amber-400 hover:bg-gray-700 transition-colors duration-150">
            View All Premium Events
          </button>
        </div>
      </div>
      
      {/* Featured Traders */}
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
        <div className="border-b border-gray-700 px-6 py-4">
          <h3 className="text-lg font-medium text-gray-100">Top Profitable Traders</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-750 rounded-lg p-4 text-center border border-gray-700">
              <div className="w-16 h-16 bg-green-700 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-xl font-bold">
                TM
              </div>
              <h4 className="text-lg font-medium text-gray-100 mb-1">TradingMaster</h4>
              <p className="text-sm text-gray-400 mb-2">Breakout Specialist</p>
              <div className="mb-2 text-sm inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-900 text-green-300">
                #1 Ranked
              </div>
              <div className="text-lg font-bold text-green-400 mb-2">+$24,680</div>
              <p className="mt-3 text-sm text-gray-300">
                "Focus on high volume breakouts for maximum profits."
              </p>
            </div>
            
            <div className="bg-gray-750 rounded-lg p-4 text-center border border-gray-700">
              <div className="w-16 h-16 bg-purple-700 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-xl font-bold">
                PH
              </div>
              <h4 className="text-lg font-medium text-gray-100 mb-1">PatternHunter</h4>
              <p className="text-sm text-gray-400 mb-2">Technical Analyst</p>
              <div className="mb-2 text-sm inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-900 text-green-300">
                #3 Ranked
              </div>
              <div className="text-lg font-bold text-green-400 mb-2">+$15,340</div>
              <p className="mt-3 text-sm text-gray-300">
                "Wait for confirmation before entering any trade."
              </p>
            </div>
            
            <div className="bg-gray-750 rounded-lg p-4 text-center border border-gray-700">
              <div className="w-16 h-16 bg-amber-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-xl font-bold">
                MG
              </div>
              <h4 className="text-lg font-medium text-gray-100 mb-1">MarketGuru</h4>
              <p className="text-sm text-gray-400 mb-2">Swing Trader</p>
              <div className="mb-2 text-sm inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-900 text-green-300">
                #4 Ranked
              </div>
              <div className="text-lg font-bold text-green-400 mb-2">+$12,750</div>
              <p className="mt-3 text-sm text-gray-300">
                "Risk management is the key to consistent profits."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
  
  // If authenticated, show community page
  if (session) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">Premium Trading Community</h1>
          <p className="text-lg text-gray-300 mb-8">Connect with profitable traders and learn strategies for maximum returns</p>
          
          {/* Tabs */}
          <div className="border-b border-gray-700 mb-8">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`${
                  activeTab === "leaderboard"
                    ? "border-green-500 text-green-400"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Profit Leaderboard
              </button>
              <button
                onClick={() => setActiveTab("discussions")}
                className={`${
                  activeTab === "discussions"
                    ? "border-green-500 text-green-400"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Strategy Discussions
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={`${
                  activeTab === "events"
                    ? "border-green-500 text-green-400"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Premium Events
              </button>
            </nav>
          </div>
          
          {/* Tab Content */}
          {activeTab === "leaderboard" && renderLeaderboard()}
          {activeTab === "discussions" && renderDiscussions()}
          {activeTab === "events" && renderEvents()}
        </div>
      </div>
    )
  }
  
  // Fallback - should not reach here due to redirect
  return null
} 