"use client";

import { useAuthRedirect } from "@/hooks/useAuthRedirect";

/**
 * Dashboard Page
 * 
 * Displays user statistics and recent trading practice activity.
 * Features:
 * - Performance metrics overview
 * - Recent activity timeline
 * - Progress tracking
 */
export default function Dashboard() {
  const { session, isLoading } = useAuthRedirect();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-turquoise-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!session) return null;

  // Mock data - in a real app this would come from an API
  const stats = {
    totalSessions: 24,
    accuracy: 68.5,
    streak: 3
  };

  const recentActivity = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    daysAgo: i + 1,
    accuracy: 70 + i
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <a 
          href="/study"
          className="px-6 py-3 bg-turquoise-500 text-white rounded-lg font-semibold hover:bg-turquoise-600 transition-colors"
        >
          Start Studying →
        </a>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Total Practice Sessions</h3>
          <p className="text-3xl font-bold text-turquoise-600">{stats.totalSessions}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Average Accuracy</h3>
          <p className="text-3xl font-bold text-turquoise-600">{stats.accuracy}%</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Streak</h3>
          <p className="text-3xl font-bold text-turquoise-600">{stats.streak} days</p>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-medium text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.map((item) => (
            <div key={item.id} className="px-6 py-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-turquoise-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-turquoise-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Completed practice session</p>
                  <p className="text-sm text-gray-500">{item.daysAgo} day{item.daysAgo !== 1 ? 's' : ''} ago</p>
                </div>
                <div className="ml-auto">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {item.accuracy}% accuracy
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 