"use client";

import { useState, useEffect } from 'react';

export default function DatabaseStatus() {
  const [status, setStatus] = useState({ loading: true });
  const [showDetails, setShowDetails] = useState(false);
  const [fixingIssue, setFixingIssue] = useState(false);
  const [fixResult, setFixResult] = useState(null);

  useEffect(() => {
    const checkDatabase = async () => {
      try {
        setStatus({ loading: true });
        const response = await fetch('/api/check-supabase');
        const data = await response.json();
        
        setStatus({
          loading: false,
          ...data
        });
      } catch (error) {
        setStatus({
          loading: false,
          status: 'error',
          message: 'Failed to check database status',
          error: error.message
        });
      }
    };

    checkDatabase();
  }, []);

  const handleFixIssue = async () => {
    try {
      setFixingIssue(true);
      setFixResult(null);
      
      const response = await fetch('/api/fix-rls');
      const data = await response.json();
      
      setFixResult(data);
      
      // If the fix was successful, refresh the database status
      if (data.status === 'success') {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      setFixResult({
        status: 'error',
        message: 'Failed to fix issue',
        error: error.message
      });
    } finally {
      setFixingIssue(false);
    }
  };

  const getStatusColor = () => {
    if (status.loading) return 'bg-gray-200';
    if (status.status === 'success') return 'bg-green-100 border-green-500 text-green-800';
    return 'bg-red-100 border-red-500 text-red-800';
  }

  const getStatusIcon = () => {
    if (status.loading) {
      return (
        <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    
    if (status.status === 'success') {
      return (
        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      );
    }
    
    return (
      <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    );
  }

  const renderPausedProjectHelp = () => {
    const isPaused = status.error?.details?.includes('paused') || 
                     status.error?.message?.includes('paused') ||
                     status.message?.includes('paused');
    
    if (!isPaused) return null;
    
    return (
      <div className="mt-4 p-4 bg-yellow-100 border border-yellow-500 rounded-md text-yellow-800">
        <h3 className="font-bold mb-2">Your Supabase Project is Paused</h3>
        <p className="mb-2">Your database is currently paused and unavailable. This happens with free Supabase projects that haven't been used for a while.</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Go to <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase Dashboard</a></li>
          <li>Log in to your account</li>
          <li>Find your project in the list</li>
          <li>Click "Restore Project"</li>
          <li>Refresh this page after restoration (may take a minute)</li>
        </ol>
      </div>
    );
  }

  const renderTableSetupHelp = () => {
    const needsTable = status.error?.message?.includes('does not exist') || 
                       status.error?.details?.includes('does not exist') ||
                       status.tableIssue;
    
    if (!needsTable) return null;
    
    return (
      <div className="mt-4 p-4 bg-blue-100 border border-blue-500 rounded-md text-blue-800">
        <h3 className="font-bold mb-2">Database Table Setup Required</h3>
        <p className="mb-2">Your database is connected, but the required tables don't exist yet.</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Go to <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase Dashboard</a></li>
          <li>Open your project</li>
          <li>Go to the SQL Editor</li>
          <li>Run this SQL code:</li>
        </ol>
        <pre className="mt-2 p-3 bg-gray-800 text-white rounded text-sm overflow-x-auto">
{`CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`}
        </pre>
        <p className="mt-2">After creating the table, refresh this page.</p>
      </div>
    );
  }

  const renderQuickFix = () => {
    // Show quick fix if it's a permission issue or RLS issue
    const permissionIssue = status.error?.message?.includes('permission denied') || 
                           status.error?.details?.includes('permission denied') ||
                           status.error?.message?.includes('RLS') ||
                           status.error?.details?.includes('RLS');
    
    if (status.status === 'success' || !permissionIssue) return null;
    
    return (
      <div className="mt-4">
        <button
          onClick={handleFixIssue}
          disabled={fixingIssue}
          className={`w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            fixingIssue ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {fixingIssue ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Fixing database issue...
            </div>
          ) : (
            'Configure Secure Database Policies'
          )}
        </button>
        
        <p className="text-xs mt-1 text-gray-500">
          This will configure Row Level Security with appropriate policies for the users table
        </p>
        
        {fixResult && (
          <div className={`mt-2 p-3 rounded text-sm ${
            fixResult.status === 'success' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <p className="font-medium">{fixResult.message}</p>
            {fixResult.details && <p className="mt-1">{fixResult.details}</p>}
            {fixResult.solution && (
              <div className="mt-2">
                <p className="font-medium">Solution:</p>
                <p>{fixResult.solution}</p>
              </div>
            )}
            {fixResult.status === 'success' && (
              <p className="mt-2 animate-pulse">Refreshing page...</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <div className={`p-4 border rounded-md ${getStatusColor()}`}>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <h2 className="text-lg font-semibold">Database Status</h2>
        </div>
        
        <div className="mt-2">
          {status.loading ? (
            <p>Checking database connection...</p>
          ) : (
            <>
              <p><strong>Status:</strong> {status.message || 'Unknown'}</p>
              
              {status.status !== 'success' && (
                <button 
                  className="mt-2 text-sm underline"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? 'Hide' : 'Show'} technical details
                </button>
              )}
              
              {showDetails && status.error && (
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(status.error, null, 2)}
                </pre>
              )}
              
              {renderPausedProjectHelp()}
              {renderTableSetupHelp()}
              {renderQuickFix()}
              
              {status.status === 'success' && (
                <p className="mt-2 text-green-700">Your database is properly configured and ready to use.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 