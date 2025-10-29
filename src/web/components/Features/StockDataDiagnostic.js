"use client";

import React from 'react';
import { useState, useEffect } from 'react';

export default function StockDataDiagnostic() {
  const [dataStatus, setDataStatus] = useState({ loading: true });
  const [foldersStatus, setFoldersStatus] = useState({ loading: true });
  const [filesStatus, setFilesStatus] = useState({ loading: true });
  const [selectedFolder, setSelectedFolder] = useState('');
  const [dataTestDetails, setDataTestDetails] = useState(null);
  const [folders, setFolders] = useState([]);
  
  // Test local data access on component mount
  useEffect(() => {
    const testDataAccess = async () => {
      try {
        setDataStatus({ loading: true });
        const response = await fetch('/api/files/local-folders');
        const data = await response.json();
        
        setDataStatus({
          loading: false,
          success: data.success,
          message: data.message || 'Local data access test',
          error: data.error
        });
        
        if (data.success) {
          setDataTestDetails({
            totalFolders: data.folders?.length || 0,
            totalFiles: data.totalFiles || 0
          });
          if (data.folders && data.folders.length > 0) {
            setFolders(data.folders);
          }
        }
      } catch (error) {
        setDataStatus({
          loading: false,
          success: false,
          message: 'Failed to test local data access',
          error: error.message
        });
      }
    };
    
    testDataAccess();
  }, []);
  
  // Fetch folders
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setFoldersStatus({ loading: true });
        const response = await fetch('/api/files/local-folders');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data.success || !Array.isArray(data.folders)) {
          throw new Error('Invalid response format');
        }
        
        setFoldersStatus({
          loading: false,
          success: true,
          message: `Successfully loaded ${data.folders.length} folders`
        });
        
        setFolders(data.folders);
        if (!selectedFolder && data.folders.length > 0) {
          setSelectedFolder(data.folders[0].name);
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
        // Find the selected folder and get its files
        const selectedFolderData = folders.find(f => f.name === selectedFolder);
        if (selectedFolderData && selectedFolderData.files) {
          setFilesStatus({
            loading: false,
            success: selectedFolderData.files.length > 0,
            message: selectedFolderData.files.length > 0
              ? `Found ${selectedFolderData.files.length} files in this folder` 
              : 'No files found in this folder',
            data: selectedFolderData.files
          });
        } else {
          setFilesStatus({
            loading: false,
            success: false,
            message: 'No data found for this folder',
            data: []
          });
        }
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
  }, [selectedFolder, folders]);
  
  const handleFolderChange = (e) => {
    setSelectedFolder(e.target.value);
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Stock Data Diagnostic Tool</h1>
      
      {/* Local Data Access Status */}
      <div className={`p-4 border rounded-md mb-6 ${
        dataStatus.loading 
          ? 'bg-gray-100 border-gray-300' 
          : dataStatus.success 
            ? 'bg-green-50 border-green-500' 
            : 'bg-red-50 border-red-500'
      }`}>
        <h2 className="text-lg font-semibold mb-2">Local Data Access</h2>
        
        {dataStatus.loading ? (
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 mr-2 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Testing local data access...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center">
              {dataStatus.success ? (
                <svg className="h-5 w-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              )}
              <span className={dataStatus.success ? 'text-green-700' : 'text-red-700'}>
                {dataStatus.message}
              </span>
            </div>
            
            {!dataStatus.success && dataStatus.error && (
              <div className="mt-2 p-3 bg-red-100 rounded-md text-sm text-red-800">
                <p><strong>Error:</strong> {dataStatus.error.message || dataStatus.error}</p>
              </div>
            )}
            
            {dataStatus.success && dataTestDetails && (
              <div className="mt-3">
                <p><strong>Data Directory:</strong> src/data-processing/ds/quality_breakouts</p>
                <p><strong>Total Folders:</strong> {dataTestDetails.totalFolders}</p>
                <p><strong>Total Files:</strong> {dataTestDetails.totalFiles}</p>
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
                    <li>The data directory might not exist or be accessible</li>
                    <li>The data might be in a different format than expected</li>
                  </ul>
                  
                  <p className="font-medium mt-3">Recommended actions:</p>
                  <ol className="list-decimal ml-5 mt-2 space-y-1">
                    <li>Verify the folder contents in the data directory: <code className="bg-gray-200 p-1 rounded">src/data-processing/ds/quality_breakouts</code></li>
                    <li>Try another folder from the dropdown above</li>
                    <li>Check that the directory structure follows the expected pattern</li>
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
          <li>Make sure the data directory exists at: <code className="bg-blue-100 p-1 rounded">src/data-processing/ds/quality_breakouts</code></li>
          <li>Verify that the folders contain the expected data structure (JSON files)</li>
          <li>Check that the directory structure follows the pattern: <code className="bg-blue-100 p-1 rounded">SYMBOL_Month_Day_Year/breakout_data.json</code></li>
          <li>Try selecting a different dataset from the dropdown in the main app</li>
          <li>Restart the application after making any changes to the data directory</li>
        </ol>
      </div>
    </div>
  );
} 