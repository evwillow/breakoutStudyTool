"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

/**
 * Community Page
 * 
 * A placeholder page for community features and social interaction.
 * Features:
 * - Redirects to home if user is not authenticated
 * - Displays leaderboard, discussion forum, and community events
 * - Shows user profiles and achievements
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-turquoise-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading community...</p>
        </div>
      </div>
    )
  }
  
  // Mock data for community
  const leaderboardUsers = [
    { rank: 1, name: "TradingMaster", score: 9850, avatar: "bg-blue-500", streak: 42 },
    { rank: 2, name: "ChartWizard", score: 9340, avatar: "bg-green-500", streak: 28 },
    { rank: 3, name: "PatternHunter", score: 8920, avatar: "bg-purple-500", streak: 35 },
    { rank: 4, name: "MarketGuru", score: 8750, avatar: "bg-red-500", streak: 21 },
    { rank: 5, name: "BreakoutKing", score: 8430, avatar: "bg-yellow-500", streak: 19 },
    { rank: 6, name: "TrendTrader", score: 8120, avatar: "bg-pink-500", streak: 14 },
    { rank: 7, name: "ChartNinja", score: 7980, avatar: "bg-indigo-500", streak: 23 },
    { rank: 8, name: "SwingMaster", score: 7650, avatar: "bg-teal-500", streak: 16 },
    { rank: 9, name: "CandleReader", score: 7340, avatar: "bg-orange-500", streak: 12 },
    { rank: 10, name: "VolumePro", score: 7120, avatar: "bg-cyan-500", streak: 9 }
  ]
  
  const discussionTopics = [
    { 
      id: 1, 
      title: "Best indicators for breakout confirmation?", 
      author: "TradingMaster", 
      replies: 24, 
      lastActivity: "2 hours ago",
      tags: ["Indicators", "Breakouts"]
    },
    { 
      id: 2, 
      title: "How to spot false breakouts early", 
      author: "PatternHunter", 
      replies: 18, 
      lastActivity: "5 hours ago",
      tags: ["False Signals", "Risk Management"]
    },
    { 
      id: 3, 
      title: "Volume analysis for breakout trading", 
      author: "VolumePro", 
      replies: 32, 
      lastActivity: "1 day ago",
      tags: ["Volume", "Analysis"]
    },
    { 
      id: 4, 
      title: "Psychological aspects of trading breakouts", 
      author: "MindTrader", 
      replies: 41, 
      lastActivity: "2 days ago",
      tags: ["Psychology", "Discipline"]
    },
    { 
      id: 5, 
      title: "Share your best breakout trade of the week", 
      author: "ChartWizard", 
      replies: 27, 
      lastActivity: "3 days ago",
      tags: ["Trade Sharing", "Success Stories"]
    }
  ]
  
  const events = [
    {
      id: 1,
      title: "Live Breakout Trading Session",
      date: "June 25, 2023",
      time: "10:00 AM EST",
      host: "TradingMaster",
      participants: 156,
      description: "Join our top trader for a live session identifying and trading breakouts in real-time."
    },
    {
      id: 2,
      title: "Webinar: Advanced Breakout Strategies",
      date: "July 2, 2023",
      time: "2:00 PM EST",
      host: "MarketGuru",
      participants: 89,
      description: "Learn advanced techniques for identifying high-probability breakout setups."
    },
    {
      id: 3,
      title: "Trading Challenge: Breakout Edition",
      date: "July 10-14, 2023",
      time: "All Day",
      host: "BreakoutPro Team",
      participants: 243,
      description: "Compete with other traders in our weekly challenge focused on breakout trading."
    }
  ]
  
  // Tab content components
  const renderLeaderboard = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Top Traders This Month</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {leaderboardUsers.map((user) => (
          <div key={user.rank} className="px-6 py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 mr-4">
                <div className={`w-10 h-10 ${user.avatar} rounded-full flex items-center justify-center text-white font-bold`}>
                  {user.name.charAt(0)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">
                    <span className="mr-2 text-gray-500">#{user.rank}</span>
                    {user.name}
                  </p>
                  <p className="text-turquoise-600 font-bold">{user.score}</p>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    {user.streak} day streak
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <button className="text-sm text-turquoise-600 hover:text-turquoise-800">View Profile</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Your Rank: <span className="font-medium">#42</span></p>
          <button className="text-sm text-turquoise-600 hover:text-turquoise-800 font-medium">View Full Leaderboard</button>
        </div>
      </div>
    </div>
  )
  
  const renderDiscussions = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Discussion Forum</h3>
        <button className="px-4 py-2 bg-turquoise-600 text-white text-sm font-medium rounded-md hover:bg-turquoise-700">
          New Topic
        </button>
      </div>
      <div className="divide-y divide-gray-200">
        {discussionTopics.map((topic) => (
          <div key={topic.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-medium text-gray-900 mb-1">{topic.title}</h4>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-4">By {topic.author}</span>
                  <span className="mr-4">{topic.replies} replies</span>
                  <span>Last activity: {topic.lastActivity}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {topic.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ml-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Showing 5 of 124 topics</p>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-700">Previous</button>
            <button className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-700">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
  
  const renderEvents = () => (
    <div>
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Upcoming Events</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {events.map((event) => (
            <div key={event.id} className="px-6 py-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-4">
                  <div className="w-12 h-12 bg-turquoise-100 rounded-lg flex items-center justify-center text-turquoise-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-medium text-gray-900 mb-1">{event.title}</h4>
                  <div className="flex flex-wrap items-center text-sm text-gray-500 mb-2">
                    <span className="mr-4">{event.date}</span>
                    <span className="mr-4">{event.time}</span>
                    <span>Host: {event.host}</span>
                  </div>
                  <p className="text-gray-600 mb-3">{event.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{event.participants} participants</span>
                    <button className="px-4 py-2 bg-turquoise-600 text-white text-sm font-medium rounded-md hover:bg-turquoise-700">
                      Register
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-turquoise-50 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Host Your Own Event</h3>
        <p className="text-gray-600 mb-4">
          Share your knowledge with the community by hosting a webinar, live trading session, or Q&A.
        </p>
        <button className="px-4 py-2 bg-turquoise-600 text-white text-sm font-medium rounded-md hover:bg-turquoise-700">
          Submit Event Proposal
        </button>
      </div>
    </div>
  )
  
  // If authenticated, show community page
  if (session) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trader Community</h1>
        <p className="text-lg text-gray-600 mb-8">Connect with fellow traders, share insights, and learn together</p>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`${
                activeTab === "leaderboard"
                  ? "border-turquoise-500 text-turquoise-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Leaderboard
            </button>
            <button
              onClick={() => setActiveTab("discussions")}
              className={`${
                activeTab === "discussions"
                  ? "border-turquoise-500 text-turquoise-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Discussions
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`${
                activeTab === "events"
                  ? "border-turquoise-500 text-turquoise-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Events
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        {activeTab === "leaderboard" && renderLeaderboard()}
        {activeTab === "discussions" && renderDiscussions()}
        {activeTab === "events" && renderEvents()}
      </div>
    )
  }
  
  // Fallback - should not reach here due to redirect
  return null
} 