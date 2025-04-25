"use client";

import { useState, useEffect } from 'react';

export default function StockDataDiagnostic() {
  const [driveStatus, setDriveStatus] = useState({ loading: true });
  const [foldersStatus, setFoldersStatus] = useState({ loading: true });
  const [filesStatus, setFilesStatus] = useState({ loading: true });
  const [selectedFolder, setSelectedFolder] = useState('');
  const [driveTestDetails, setDriveTestDetails] = useState(null);
  const [folders, setFolders] = useState([]);
  
  // Test Drive access on component mount
  useEffect(() => {
    const testDriveAccess = async () => {
      try {
        setDriveStatus({ loading: true });
        const response = await fetch('/api/test-drive-access');
        const data = await response.json();
        
        setDriveStatus({
          loading: false,
          success: data.status === 'success',
          message: data.message,
          error: data.error
        });
        
        if (data.status === 'success') {
          setDriveTestDetails(data.diagnostics);
          if (data.diagnostics.folders && data.diagnostics.folders.length > 0) {
            setFolders(data.diagnostics.folders);
          }
        }
      } catch (error) {
        setDriveStatus({
          loading: false,
          success: false,
          message: 'Failed to test Google Drive access',
          error: error.message
        });
      }
    };
    
    testDriveAccess();
  }, []);
  
  // Fetch folders
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setFoldersStatus({ loading: true });
        const response = await fetch('/api/getFolders');
        const data = await response.json();
        
        setFoldersStatus({
          loading: false,
          success: Array.isArray(data) && data.length > 0,
          message: Array.isArray(data) && data.length > 0 
            ? `Successfully loaded ${data.length} folders` 
            : 'No folders found'
        });
        
        if (Array.isArray(data) && data.length > 0) {
          // Shuffle the folders array to randomize the order
          const shuffleFolders = (array) => {
            // Fisher-Yates shuffle algorithm
            for (let i = array.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
          };
          
          // Apply the shuffle to randomize folder order
          const shuffledFolders = shuffleFolders([...data]);
          console.log('Folders have been randomly shuffled for display');
          
          setFolders(shuffledFolders);
          if (!selectedFolder) {
            setSelectedFolder(shuffledFolders[0].name);
          }
        }
      } catch (error) {
        setFoldersStatus({
          loading: false,
          success: false,
          message: 'Failed to fetch folders',
          error: error.message
        });
      }
    };
    
    fetchFolders();
  }, [selectedFolder]);
  
  // Test file access when a folder is selected
  useEffect(() => {
    if (!selectedFolder) return;
    
    const fetchFileData = async () => {
      try {
        setFilesStatus({ loading: true });
        const response = await fetch(`/api/getFileData?folder=${encodeURIComponent(selectedFolder)}`);
        const data = await response.json();
        
        setFilesStatus({
          loading: false,
          success: Array.isArray(data) && data.length > 0,
          message: Array.isArray(data) && data.length > 0 
            ? `Successfully loaded ${data.length} data sets` 
            : 'No data found in this folder',
          data: data
        });
      } catch (error) {
        setFilesStatus({
          loading: false,
          success: false,
          message: 'Failed to fetch file data',
          error: error.message
        });
      }
    };
    
    fetchFileData();
  }, [selectedFolder]);
  
  const handleFolderChange = (e) => {
    setSelectedFolder(e.target.value);
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Stock Data Diagnostic Tool</h1>
      
      {/* Google Drive Access Status */}
      <div className={`p-4 border rounded-md mb-6 ${
        driveStatus.loading 
          ? 'bg-gray-100 border-gray-300' 
          : driveStatus.success 
            ? 'bg-green-50 border-green-500' 
            : 'bg-red-50 border-red-500'
      }`}>
        <h2 className="text-lg font-semibold mb-2">Google Drive Access</h2>
        
        {driveStatus.loading ? (
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 mr-2 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Testing Google Drive access...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center">
              {driveStatus.success ? (
                <svg className="h-5 w-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              )}
              <span className={driveStatus.success ? 'text-green-700' : 'text-red-700'}>
                {driveStatus.message}
              </span>
            </div>
            
            {!driveStatus.success && driveStatus.error && (
              <div className="mt-2 p-3 bg-red-100 rounded-md text-sm text-red-800">
                <p><strong>Error:</strong> {driveStatus.error.message || driveStatus.error}</p>
                {driveStatus.error.solution && (
                  <p className="mt-1"><strong>Solution:</strong> {driveStatus.error.solution}</p>
                )}
              </div>
            )}
            
            {driveStatus.success && driveTestDetails && (
              <div className="mt-3">
                <p><strong>Parent Folder:</strong> {driveTestDetails.parentFolder.name}</p>
                <p><strong>Total Folders:</strong> {driveTestDetails.folderCount}</p>
                {driveTestDetails.folders.length > 0 && (
                  <div className="mt-2">
                    <p><strong>Available Folders:</strong></p>
                    <ul className="ml-5 list-disc">
                      {driveTestDetails.folders.map(folder => (
                        <li key={folder.id}>{folder.name}</li>
                      ))}
                      {driveTestDetails.folderCount > 5 && <li>...and {driveTestDetails.folderCount - 5} more</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Folder Access Status */}
      <div className={`p-4 border rounded-md mb-6 ${
        foldersStatus.loading 
          ? 'bg-gray-100 border-gray-300' 
          : foldersStatus.success 
            ? 'bg-green-50 border-green-500' 
            : 'bg-red-50 border-red-500'
      }`}>
        <h2 className="text-lg font-semibold mb-2">Stock Data Folders</h2>
        
        {foldersStatus.loading ? (
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 mr-2 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading folders...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center">
              {foldersStatus.success ? (
                <svg className="h-5 w-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              )}
              <span className={foldersStatus.success ? 'text-green-700' : 'text-red-700'}>
                {foldersStatus.message}
              </span>
            </div>
            
            {folders.length > 0 && (
              <div className="mt-4">
                <label htmlFor="folder-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select a folder to test:
                </label>
                <select
                  id="folder-select"
                  value={selectedFolder}
                  onChange={handleFolderChange}
                  className="block w-full p-2 border border-gray-300 rounded-md"
                >
                  {folders.map(folder => (
                    <option key={folder.id || folder.name} value={folder.name}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* File Data Status */}
      {selectedFolder && (
        <div className={`p-4 border rounded-md mb-6 ${
          filesStatus.loading 
            ? 'bg-gray-100 border-gray-300' 
            : filesStatus.success 
              ? 'bg-green-50 border-green-500' 
              : 'bg-yellow-50 border-yellow-500'
        }`}>
          <h2 className="text-lg font-semibold mb-2">Data Access for "{selectedFolder}"</h2>
          
          {filesStatus.loading ? (
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 mr-2 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading file data...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center">
                {filesStatus.success ? (
                  <svg className="h-5 w-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                )}
                <span className={filesStatus.success ? 'text-green-700' : 'text-yellow-700'}>
                  {filesStatus.message}
                </span>
              </div>
              
              {filesStatus.success && filesStatus.data && (
                <div className="mt-3">
                  <p className="font-medium">Data structure:</p>
                  <pre className="mt-2 p-3 bg-gray-100 rounded-md text-xs overflow-x-auto max-h-60 overflow-y-auto">
                    {JSON.stringify(filesStatus.data, null, 2)}
                  </pre>
                </div>
              )}
              
              {!filesStatus.success && (
                <div className="mt-3 p-3 bg-yellow-100 rounded-md text-sm">
                  <p className="font-medium">Why am I seeing "No Data Available"?</p>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>The folder might be empty or not contain the expected data format</li>
                    <li>The Google Drive service account might not have permission to access this specific folder</li>
                    <li>The data might be in a different format than expected</li>
                  </ul>
                  
                  <p className="font-medium mt-3">Recommended actions:</p>
                  <ol className="list-decimal ml-5 mt-2 space-y-1">
                    <li>Verify the folder contents in Google Drive directly</li>
                    <li>Try another folder from the dropdown above</li>
                    <li>Share the folder with the service account email: <code className="bg-gray-200 p-1 rounded">nextjs-drive-service@stocks-450303.iam.gserviceaccount.com</code></li>
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Summary/Instructions Section */}
      <div className="p-4 border border-blue-300 rounded-md bg-blue-50">
        <h2 className="text-lg font-semibold mb-2 text-blue-800">How to Fix "No Data Available"</h2>
        
        <ol className="list-decimal ml-5 space-y-2 text-blue-800">
          <li>Make sure the Google Drive service account has access to the folders</li>
          <li>Share the parent folder (and its content) with: <code className="bg-blue-100 p-1 rounded">nextjs-drive-service@stocks-450303.iam.gserviceaccount.com</code></li>
          <li>Verify that the folders contain the expected data structure (JSON files)</li>
          <li>Try selecting a different dataset from the dropdown in the main app</li>
          <li>Restart the application after making any changes to permissions</li>
        </ol>
      </div>
    </div>
  );
} 