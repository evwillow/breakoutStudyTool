"use client";

/**
 * DateFolderBrowser.js
 * 
 * Component for browsing and displaying historical stock data files.
 * Features:
 * - Fetches and displays historical stock data files for the current stock
 * - Auto-expands items as user scrolls down over them
 * - Auto-closes items as user scrolls up past them (only auto-expanded items)
 * - Allows users to manually open and close dropdowns with their choices respected
 * - Supports multiple open dropdowns simultaneously
 * - Implements multiple fallback strategies to find relevant files
 * - Allows users to expand/collapse individual file charts
 * - Filters files to show only those with proper date formatting
 * - Parses and displays CSV data as interactive charts
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import StockChart from "../StockChart";

/**
 * DateFolderBrowser component displays historical stock data files
 * and allows viewing them as charts
 * @typedef {import('../Flashcards/utils/dataProcessors').FlashcardData} FlashcardData
 * @param {Object} props
 * @param {any} props.session
 * @param {string|null} props.currentStock
 * @param {boolean} props.isTimeUp
 * @param {FlashcardData[]} [props.flashcards]
 * @param {FlashcardData|null} [props.currentFlashcard]
 */
const DateFolderBrowser = ({ session, currentStock, isTimeUp, flashcards = [], currentFlashcard = null }) => {
  const [allFiles, setAllFiles] = useState([]);
  const [expandedFiles, setExpandedFiles] = useState([]);
  const [fileData, setFileData] = useState({});
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [visibleItems, setVisibleItems] = useState([]);
  const [autoExpandedItems, setAutoExpandedItems] = useState([]);
  const [manuallyControlledItems, setManuallyControlledItems] = useState([]);
  const fileRefs = useRef({});
  const lastScrollY = useRef(0);
  const scrollingDirection = useRef('down');

  // Function to expand visible items that aren't manually controlled
  const expandVisibleItems = useCallback(() => {
    visibleItems.forEach(fileId => {
      if (!manuallyControlledItems.includes(fileId) && !expandedFiles.includes(fileId)) {
        setExpandedFiles(prev => [...prev, fileId]);
        setAutoExpandedItems(prev => [...prev, fileId]);
      }
    });
  }, [visibleItems, manuallyControlledItems, expandedFiles]);

  // Main effect for fetching stock files when the current stock changes
  useEffect(() => {
    if (!session) return;
    
    const fetchAllStockFiles = async () => {
      try {
        // First, try to use files from flashcards that are already loaded
        // Extract date-formatted files and after.json files from all flashcards
        const preloadedFiles = [];
        if (flashcards && flashcards.length > 0 && currentStock) {
          flashcards.forEach(flashcard => {
            if (flashcard.jsonFiles && flashcard.jsonFiles.length > 0) {
              flashcard.jsonFiles.forEach(file => {
                if (file && file.fileName && file.data) {
                  const fileName = file.fileName.toLowerCase();
                  const fileNameParts = fileName.split(/[/\\]/);
                  const lastPart = fileNameParts[fileNameParts.length - 1];
                  
                  // Only include date-formatted files (e.g., "Sep_7_2021.json")
                  const isDateFile = /^[a-z]{3}_\d{1,2}_\d{4}\.json$/.test(lastPart);
                  
                  if (isDateFile) {
                    // Check if this file is relevant to current stock
                    const stockSymbol = currentStock.toLowerCase().split('_')[0] || '';
                    const fileDir = file.fileName.split('/')[0]?.toLowerCase() || '';
                    const fileStockSymbol = fileDir.split('_')[0] || '';
                    
                    // Only include if same stock symbol and different directory (not the current breakout)
                    if (stockSymbol && fileStockSymbol === stockSymbol && fileDir !== currentStock.toLowerCase()) {
                      preloadedFiles.push({
                        id: file.fileName,
                        subfolder: file.fileName.split('/')[0],
                        fileName: file.fileName,
                        data: file.data, // Already loaded!
                        path: file.fileName
                      });
                    }
                  }
                }
              });
            }
          });
        }
        
        if (preloadedFiles.length > 0) {
          // If we have preloaded files, set them immediately so they display right away
          // Set fileData for preloaded files immediately
          const preloadedFileData = {};
          preloadedFiles.forEach(file => {
            if (file.data) {
              preloadedFileData[file.id] = file.data;
            }
          });
          if (Object.keys(preloadedFileData).length > 0) {
            setFileData(prev => ({ ...prev, ...preloadedFileData }));
          }
          
          // Set files immediately if we have preloaded ones
          setAllFiles(preloadedFiles);
        }
        
        // Don't clear files immediately - wait until we have new data to avoid flicker
        // setAllFiles([]); // Commented out to prevent clearing before new data is ready
        
        // Note: getStockFiles API not available in local setup
        // Special handling disabled for local data loading
        
        // Note: searchFiles API not available in local setup
        // This fallback is disabled for local data loading
        
        // Normal flow for non-special stocks or if special handling failed
        // Fetch all folders
        const foldersRes = await fetch("/api/files/local-folders");
        if (!foldersRes.ok) {
          console.error(`Error fetching folders: ${foldersRes.status}`);
          return;
        }
        
        const foldersData = await foldersRes.json();
        if (!foldersData.success || !Array.isArray(foldersData.folders)) {
          console.error("Invalid folders data format");
          return;
        }
        
        const folders = foldersData.folders;
        
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
        const shuffledFolders = shuffleFolders([...folders]);
        
        // Filter to include folders with underscores (date-like folders) OR quality_breakouts folder
        // The quality_breakouts folder contains all stock breakout data
        const dateFolders = shuffledFolders.filter(folder => 
          folder.name && (folder.name.includes('_') || folder.name === 'quality_breakouts')
        );
        
        // Process each folder to find relevant files
        let relevantFiles = [];
        let processedFolders = 0;
        let totalFilesFound = 0;
        
        for (const folder of dateFolders) {
          try {
            // Use local-folders endpoint to get files for this folder
            const filesRes = await fetch(`/api/files/local-folders`);
            if (!filesRes.ok) {
              console.error(`Error fetching files for folder ${folder.name}: ${filesRes.status}`);
              continue;
            }
            
            const filesData = await filesRes.json();
            if (!filesData.success || !Array.isArray(filesData.folders)) {
              console.error(`Invalid file data format for folder ${folder.name}`);
              continue;
            }
            
            // Find the specific folder and get its files
            const folderData = filesData.folders.find(f => f.name === folder.name);
            if (!folderData || !folderData.files) {
              console.log(`No files found for folder ${folder.name}`);
              continue;
            }
            
            const files = folderData.files;
            processedFolders++;
            
            // Handle case where API returns an empty array
            if (!files || files.length === 0) {
              console.log(`No files found in folder ${folder.name}`);
              continue;
            }
            
            // Handle case where API returns an error object
            if (filesData.error) {
              console.error(`API error for folder ${folder.name}: ${filesData.error}`);
              continue;
            }
            
            const { relevantFiles: filteredFiles, totalFilesBeforeFiltering } = processAndFilterFiles(files, folder.name, currentStock);
            totalFilesFound += totalFilesBeforeFiltering;
            relevantFiles = [...relevantFiles, ...filteredFiles];
          } catch (error) {
            // Continue with other folders if one fails
            console.error(`Error processing folder ${folder.name}:`, error);
          }
        }
        
        // If we're looking for a specific stock and found no files, try a fallback approach
        if (relevantFiles.length === 0 && currentStock) {
          console.log(`No files found for ${currentStock}, trying fallback approaches...`);
          
          // First fallback: Try to fetch files directly from a folder with the same name as the stock
          try {
            const stockFolderRes = await fetch(`/api/files/local-folders`);
            if (stockFolderRes.ok) {
              const stockFolderData = await stockFolderRes.json();
              
              if (stockFolderData.success && stockFolderData.folders) {
                // Find the folder with the stock name
                const stockFolder = stockFolderData.folders.find(f => f.name === currentStock);
                if (stockFolder && stockFolder.files && stockFolder.files.length > 0) {
                  console.log(`Found files in folder ${currentStock}:`, stockFolder.files);
                  
                  const { relevantFiles: stockFiles, totalFilesBeforeFiltering: stockTotalFiles } = processAndFilterFiles(stockFolder.files, currentStock, null); // Pass null to include all files
                  totalFilesFound += stockTotalFiles;
                  relevantFiles = [...relevantFiles, ...stockFiles];
                }
              }
            }
          } catch (error) {
            console.error(`Error in first fallback approach:`, error);
          }
          
          // Note: searchFiles API not available in local setup
          // This fallback is disabled for local data loading
          
          // Note: getStockFiles API not available in local setup
          // This fallback is disabled for local data loading
          
          // Special case for specific stock symbols
          if (relevantFiles.length === 0) {
            const lowerStock = currentStock.toLowerCase();
            
            if (lowerStock === "poo_jan_4_2019") {
              console.log("Special case for POO_Jan_4_2019: Creating a sample file");
              
              // Create a sample file for demonstration purposes
              const sampleData = [
                { Date: "2019-01-04", Open: 100, High: 105, Low: 98, Close: 103, Volume: 1000 },
                { Date: "2019-01-03", Open: 98, High: 102, Low: 97, Close: 100, Volume: 950 },
                { Date: "2019-01-02", Open: 95, High: 99, Low: 94, Close: 98, Volume: 900 }
              ];
              
              relevantFiles.push({
                id: "POO_Jan_4_2019/sample.json",
                subfolder: "POO_Jan_4_2019",
                fileName: "sample.json",
                data: sampleData
              });
              
              totalFilesFound += 1;
            } 
            else if (lowerStock === "ski_mar_9_2011") {
              console.log("Special case for SKI_Mar_9_2011: Creating a sample file");
              
              // Create a sample file for demonstration purposes
              const sampleData = [
                { Date: "2011-03-09", Open: 45.20, High: 46.75, Low: 44.80, Close: 46.25, Volume: 2500 },
                { Date: "2011-03-08", Open: 44.90, High: 45.50, Low: 44.25, Close: 45.10, Volume: 2200 },
                { Date: "2011-03-07", Open: 45.30, High: 45.80, Low: 44.50, Close: 44.85, Volume: 2100 }
              ];
              
              relevantFiles.push({
                id: "SKI_Mar_9_2011/sample.json",
                subfolder: "SKI_Mar_9_2011",
                fileName: "sample.json",
                data: sampleData
              });
              
              totalFilesFound += 1;
            }
            // Add more special cases as needed
          }
        }
        
        // Load after.json files immediately along with other files (before setting allFiles)
        // Filter out after.json files that fail to load - they just won't appear
        const afterFiles = relevantFiles.filter(file => {
          const fileNameLower = file.fileName.toLowerCase();
          const fileNameParts = fileNameLower.split(/[/\\]/);
          const lastPart = fileNameParts[fileNameParts.length - 1];
          return lastPart === 'after.json';
        });
        
        // Load all after.json files in parallel
        const afterFileLoadPromises = afterFiles.map(async (file) => {
          // Skip if already has data
          if (file.data) {
            return { file, success: true };
          }
          
          // Check if we have a path to load from
          if (!file.path && !file.id) {
            return { file, success: false };
          }
          
          try {
            // The file.id format is "folderName/fileName" (e.g., "AAL_Dec_11_2006/after.json")
            // The API expects file as "folderName/fileName" and folder as "quality_breakouts"
            // Use fileName from API (full path like "STOCK_DIR/JSON_FILE") or fall back to path/id
            const filePath = file.fileName || file.path || file.id;
            // All files are in the quality_breakouts folder, regardless of stock directory
            const folderName = 'quality_breakouts';
            
            const response = await fetch(`/api/files/local-data?file=${encodeURIComponent(filePath)}&folder=${encodeURIComponent(folderName)}`);
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data) {
                file.data = result.data;
                return { file, success: true };
              } else if (result.data) {
                file.data = result.data;
                return { file, success: true };
              }
            }
            return { file, success: false };
          } catch (err) {
            console.error(`Error loading after.json file ${file.id}:`, err);
            return { file, success: false };
          }
        });
        
        // Wait for all after.json files to load
        const afterFileResults = await Promise.all(afterFileLoadPromises);
        
        // Only include after.json files that successfully loaded (or already had data)
        const loadedAfterFiles = afterFileResults
          .filter(result => result.success || result.file.data)
          .map(result => result.file);
        
        // Replace after.json files in relevantFiles with only the successfully loaded ones
        const nonAfterFiles = relevantFiles.filter(file => {
          const fileNameLower = file.fileName.toLowerCase();
          const fileNameParts = fileNameLower.split(/[/\\]/);
          const lastPart = fileNameParts[fileNameParts.length - 1];
          return lastPart !== 'after.json';
        });
        
        // Merge preloaded files with fetched files, avoiding duplicates
        // Prefer preloaded files (already have data) over fetched files (may not have data yet)
        const allFetchedFiles = [...nonAfterFiles, ...loadedAfterFiles];
        const mergedFilesMap = new Map();
        
        // First, add all preloaded files (they already have data loaded)
        preloadedFiles.forEach(file => {
          mergedFilesMap.set(file.id, file);
        });
        
        // Then, add fetched files that aren't already in preloaded files
        // or if they don't have data yet, replace with fetched version that might have data
        allFetchedFiles.forEach(file => {
          const existing = mergedFilesMap.get(file.id);
          // Add if not exists, or replace if existing doesn't have data but new one does
          if (!existing || (!existing.data && file.data)) {
            mergedFilesMap.set(file.id, file);
          }
        });
        
        const finalFiles = Array.from(mergedFilesMap.values());
        
        // Set fileData for files that have data loaded (for after.json and other files with data)
        const fileDataToSet = {};
        finalFiles.forEach(file => {
          if (file.data) {
            fileDataToSet[file.id] = file.data;
          }
        });
        if (Object.keys(fileDataToSet).length > 0) {
          setFileData(prev => ({ ...prev, ...fileDataToSet }));
        }
        
        // Only update files if we found some, otherwise keep existing files to prevent flicker
        if (finalFiles.length > 0) {
          setAllFiles(finalFiles);
          setDebugInfo(`Processed ${processedFolders} folders, found ${finalFiles.length} files for ${currentStock || "all stocks"} (total files before filtering: ${totalFilesFound})`);
        } else if (currentStock) {
          // If we have a currentStock but found no files, still update to show empty state
          setAllFiles([]);
          setDebugInfo(`No files found for ${currentStock}. Check console for filtering details.`);
          console.warn(`No files found for current stock: ${currentStock}`);
        } else {
          // If no currentStock, clear files
          setAllFiles([]);
          setDebugInfo(`No stock selected`);
        }
      } catch (error) {
        setError(`Failed to load files: ${error.message}`);
      }
    };
    
    fetchAllStockFiles();
  }, [session, currentStock, flashcards, currentFlashcard]);


  // Initialize refs for each file
  useEffect(() => {
    allFiles.forEach(file => {
      if (!fileRefs.current[file.id]) {
        fileRefs.current[file.id] = React.createRef();
      }
    });
  }, [allFiles]);

  // Track scroll direction
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY;
        if (currentScrollY > lastScrollY.current) {
          scrollingDirection.current = 'down';
        } else {
          scrollingDirection.current = 'up';
        }
        lastScrollY.current = currentScrollY;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Load file data for a specific file
  const loadFileData = useCallback(async (fileId) => {
    const file = allFiles.find(f => f.id === fileId);
    if (!file || fileData[fileId]) return;
    
    try {
      // If file already has data property, use it
      if (file.data) {
        setFileData(prev => ({ ...prev, [fileId]: file.data }));
        return;
      }
      
      // Otherwise fetch the data using the local-data API
      // The file.fileName format from API is "STOCK_DIR/JSON_FILE" (e.g., "AAL_Dec_11_2006/Sep_7_2021.json")
      // The API expects file as "STOCK_DIR/JSON_FILE" and folder as "quality_breakouts"
      // Prefer fileName (from API) over path or id
      const filePath = file.fileName || file.path || file.id;
      // All files are in the quality_breakouts folder, regardless of stock directory
      const folderName = 'quality_breakouts';
      
      if (!filePath) {
        console.error(`Invalid file path for ${fileId}:`, file);
        throw new Error(`Invalid file path: file.fileName=${file.fileName}, file.path=${file.path}, file.id=${file.id}`);
      }
      
      const response = await fetch(`/api/files/local-data?file=${encodeURIComponent(filePath)}&folder=${encodeURIComponent(folderName)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        setFileData(prev => ({ ...prev, [fileId]: result.data }));
      } else if (result.data) {
        // Handle case where data is returned but success flag is missing
        setFileData(prev => ({ ...prev, [fileId]: result.data }));
      } else {
        console.error(`❌ No data returned for ${fileId}:`, result);
        throw new Error(result.message || 'No data returned from API');
      }
    } catch (err) {
      console.error(`Error loading file data for ${fileId}:`, err);
      setError(`Failed to load chart data: ${err.message}`);
    }
  }, [allFiles, fileData]);

  // Set up intersection observer for scroll reveal and progressive auto-expand effect
  useEffect(() => {
    if (!allFiles.length) return; // Don't set up observer if there are no files
    
    const observerOptions = {
      root: null, // use viewport
      rootMargin: '0px',
      threshold: 0.2 // Lower threshold to trigger earlier (20% visibility)
    };

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (!entry.target || !entry.target.dataset) return; // Skip if target is invalid
        
        const id = entry.target.dataset.fileId;
        if (!id) return; // Skip if no file ID
        
        if (entry.isIntersecting) {
          // Always make the item visible when it enters the viewport
          setVisibleItems(prev => {
            if (!prev.includes(id)) {
              return [...prev, id];
            }
            return prev;
          });
          
          // Only auto-expand if:
          // 1. The item is not manually controlled (user hasn't interacted with it)
          // 2. We're scrolling down (progressive expansion)
          if (!manuallyControlledItems.includes(id) && scrollingDirection.current === 'down') {
            setAutoExpandedItems(prev => {
              if (!prev.includes(id)) {
                // Load file data if not already loaded
                if (!fileData[id]) {
                  loadFileData(id);
                }
                return [...prev, id];
              }
              return prev;
            });
            
            // Add to expanded files array instead of setting a single expanded file
            setExpandedFiles(prev => {
              if (!prev.includes(id)) {
                return [...prev, id];
              }
              return prev;
            });
          }
        } else {
          // Item has left the viewport
          // Auto-close if:
          // 1. The item is not manually controlled
          // 2. It was auto-expanded (is in autoExpandedItems)
          // 3. We're scrolling up
          if (!manuallyControlledItems.includes(id) && scrollingDirection.current === 'up') {
            setAutoExpandedItems(prev => {
              if (prev.includes(id)) {
                // Remove from expanded files
                setExpandedFiles(current => current.filter(fileId => fileId !== id));
                return prev.filter(item => item !== id);
              }
              return prev;
            });
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    
    // Observe all file elements
    Object.entries(fileRefs.current).forEach(([id, ref]) => {
      if (ref && ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [allFiles, expandedFiles, fileData, manuallyControlledItems, loadFileData]);

  // Handle manual file expansion toggle
  const handleFileToggle = async (fileId) => {
    // Mark this item as manually controlled
    if (!manuallyControlledItems.includes(fileId)) {
      setManuallyControlledItems(prev => [...prev, fileId]);
    }
    
    // Handle manual toggle - users can open or close as they choose
    if (expandedFiles.includes(fileId)) {
      // User is closing the dropdown
      setTimeout(() => {
        setExpandedFiles(prev => prev.filter(id => id !== fileId));
        setAutoExpandedItems(prev => prev.filter(item => item !== fileId));
      }, 50);
    } else {
      // User is opening the dropdown
      setExpandedFiles(prev => [...prev, fileId]);
      setAutoExpandedItems(prev => [...prev, fileId]);
      
      // Load file data if not already loaded
      if (!fileData[fileId]) {
        await loadFileData(fileId);
      }
    }
  };

  /**
   * Process and filter files from API response
   */
  const processAndFilterFiles = (data, folderName, stockSymbol) => {
    const relevantFiles = [];
    const processedFiles = new Set(); // To avoid duplicates
    let totalFilesBeforeFiltering = 0;
    
    // If data is not an array, try to extract files from object structure
    if (!Array.isArray(data)) {
      const extractedFiles = extractFiles(data);
      
      // Count total files before filtering
      totalFilesBeforeFiltering = extractedFiles.filter(file => 
        file.name && file.name.toLowerCase().endsWith('.json')
      ).length;
      
      // Process each extracted file
      extractedFiles.forEach(file => {
        if (file.name && file.name.toLowerCase().endsWith('.json')) {
          // Check if the file is relevant to the current stock
          if (isRelevantToCurrentStock(file.name, stockSymbol)) {
            const fileKey = `${folderName}/${file.name}`;
            if (!processedFiles.has(fileKey)) {
              processedFiles.add(fileKey);
              relevantFiles.push({
                id: fileKey,
                subfolder: folderName,
                fileName: file.name,
                data: file.data || null,
                path: file.path || null
              });
            }
          }
        }
      });
      
      return { relevantFiles, totalFilesBeforeFiltering };
    }
    
    // Count total JSON files before filtering
    totalFilesBeforeFiltering = data.filter(item => {
      if (typeof item === 'string') {
        return item.toLowerCase().endsWith('.json');
      } else if (item && typeof item === 'object' && item.name) {
        return item.name.toLowerCase().endsWith('.json');
      }
      return false;
    }).length;
    
    /**
     * Add a file if it's relevant to the current stock
     */
    const addFileIfRelevant = (fileName, subfolder, fileData, filePath = null) => {
      // Skip files that don't match our criteria
      if (!fileName || !fileName.toLowerCase().endsWith('.json')) {
        return;
      }
      
      // Only add files relevant to the current stock
      const isRelevant = isRelevantToCurrentStock(fileName, stockSymbol);
      
      if (isRelevant) {
        // fileName already includes the full path (e.g., "AAL_Dec_11_2006/after.json")
        // Use it as the key, but if it doesn't have a path, prepend the folder name
        const fileKey = fileName.includes('/') ? fileName : `${subfolder}/${fileName}`;
        if (!processedFiles.has(fileKey)) {
          processedFiles.add(fileKey);
          relevantFiles.push({
            id: fileKey,
            subfolder: fileName.includes('/') ? fileName.split('/')[0] : subfolder,
            fileName,
            data: fileData,
            path: filePath || fileName
          });
        }
      }
    };
    
    // Process array data
    data.forEach(item => {
      if (typeof item === 'string' && item.toLowerCase().endsWith('.json')) {
        // Simple string array of filenames
        addFileIfRelevant(item, folderName, null);
      } else if (item && typeof item === 'object') {
        // Object with fileName property (API returns fileName as full path)
        // Prefer fileName over name since fileName has the full path
        const filePathToUse = item.fileName || item.name;
        if (filePathToUse && typeof filePathToUse === 'string') {
          addFileIfRelevant(filePathToUse, folderName, item.data || null, item.path || null);
        }
        
        // Check for nested files property
        if (item.files && Array.isArray(item.files)) {
          item.files.forEach(file => {
            if (typeof file === 'string') {
              addFileIfRelevant(file, folderName, null);
            } else if (file && typeof file === 'object') {
              // Prefer fileName over name
              const nestedFilePath = file.fileName || file.name;
              if (nestedFilePath) {
                addFileIfRelevant(nestedFilePath, folderName, file.data || null, file.path || null);
              }
            }
          });
        }
      }
    });
    
    return { relevantFiles, totalFilesBeforeFiltering };
  };

  /**
   * Extract files from complex object structures
   */
  const extractFiles = (obj, path = '') => {
    const files = [];
    
    if (typeof obj === 'object') {
      if (obj.name && obj.data && typeof obj.name === 'string' && 
          obj.name.toLowerCase().endsWith('.json')) {
        files.push({
          name: obj.name,
          data: obj.data,
          path: path || ''
        });
      }
      
      Object.keys(obj).forEach(key => {
        const newPath = path ? `${path}/${key}` : key;
        files.push(...extractFiles(obj[key], newPath));
      });
    }
    
    return files;
  };
  
  /**
   * Parse date from directory name (e.g., "AAL_Dec_19_2006" -> Date for Dec 19, 2006)
   */
  const parseDateFromDirectory = (directoryName) => {
    if (!directoryName) return null;
    
    const dirParts = directoryName.split('_');
    if (dirParts.length >= 4) {
      const monthStr = dirParts[1];
      const day = parseInt(dirParts[2], 10);
      const year = parseInt(dirParts[3], 10);
      const monthMap = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      const month = monthMap[monthStr.toLowerCase()];
      if (month !== undefined && !isNaN(day) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return null;
  };

  /**
   * Check if a file is relevant to the current stock
   * For "Previous Setups", we want to show date-formatted files from previous breakouts of the same stock
   */
  const isRelevantToCurrentStock = (fileName, stockSymbol) => {
    if (!stockSymbol) {
      return false; // If no stock symbol, don't show any files (need current stock to filter)
    }
    
    // Clean up the stock name and filename for comparison
    const fileNameLower = fileName.toLowerCase();
    const stockLower = stockSymbol.toLowerCase();
    
    // Extract stock symbol from current stock (e.g., "AAL" from "AAL_Dec_19_2006")
    const stockParts = stockLower.split('_');
    const currentStockSymbol = stockParts[0]; // e.g., "aal"
    
    // Extract directory from fileName if it contains a path (e.g., "AAL_Dec_11_2006/after.json")
    const fileNameParts = fileNameLower.split(/[/\\]/);
    const directoryName = fileNameParts.length > 1 ? fileNameParts[0] : null;
    const actualFileName = fileNameParts.length > 1 ? fileNameParts[fileNameParts.length - 1] : fileNameLower;
    
    // Exclude files from the current stock's directory to avoid showing the same breakout
    // If the directory matches the current stock exactly, exclude it
    if (directoryName && directoryName === stockLower) {
      return false;
    }
    
    // For "Previous Setups", we ONLY want to show files from the SAME STOCK SYMBOL
    // Check if the directory name starts with the current stock symbol
    if (!directoryName) {
      // If no directory path, can't determine stock - exclude it
      return false;
    }
    
    // Extract stock symbol from directory name (e.g., "aal" from "aal_dec_19_2006")
    const directoryParts = directoryName.split('_');
    const fileStockSymbol = directoryParts[0].toLowerCase(); // Ensure lowercase comparison
    
    // Only include files from directories that match the current stock symbol (case-insensitive)
    if (fileStockSymbol !== currentStockSymbol) {
      return false;
    }
    
    // Now check if it's a date-formatted file (e.g., "Sep_7_2021.json")
    // Use case-insensitive matching for date files
    const isDateFile = /^[a-z]{3}_\d{1,2}_\d{4}\.json$/i.test(actualFileName);
    
    // If it's a date-formatted file from the same stock (different directory), include it
    // Note: All files are previous breakouts (none occur after the current one)
    if (isDateFile) {
      return true;
    }
    
    // Default: exclude files that don't match our criteria
    // We only show date-formatted files from the same stock symbol
    return false;
  };

  /**
   * Format folder name for display
   */
  const formatFolderName = (folderName) => {
    if (!folderName) return '';
    
    // Replace underscores with spaces for better readability
    return folderName.replace(/_/g, ' ');
  };
  
  /**
   * Formats a filename for display in the UI
   * 
   * This function:
   * 1. Extracts the date from the filename
   * 2. Calculates the difference in days between the file date and the breakout date
   * 3. Returns a string showing "X days before breakout"
   * 
   * @param {string} fileName - The raw filename to format
   * @returns {string|React.ReactNode} The formatted filename for display
   */
  const displayFileName = (fileName) => {
    // Check if it's after.json (case-insensitive)
    // Handle both "after.json" and "folder/after.json" formats
    const fileNameLower = fileName.toLowerCase();
    const fileNameParts = fileNameLower.split(/[/\\]/);
    const lastPart = fileNameParts[fileNameParts.length - 1];
    
    if (lastPart === 'after.json') {
      return <span className="text-turquoise-600">After Breakout</span>;
    }
    
    // Remove .json extension and get just the filename part
    const nameWithoutExtension = fileName.replace('.json', '').split(/[/\\]/).pop();
    
    // Check if the filename is a date format like "Feb_22_2016"
    const dateFormatRegex = /^[A-Za-z]{3}_\d{1,2}_\d{4}$/;
    if (dateFormatRegex.test(nameWithoutExtension)) {
      // Extract date from the filename
      const parts = nameWithoutExtension.split('_');
      const month = parts[0];
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      // Create a Date object for the file date
      const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const fileDate = new Date(year, monthMap[month], day);
      
      // Extract date from the stock folder name (if available)
      if (currentStock) {
        // Parse the stock folder name to extract the date
        const stockParts = currentStock.split('_');
        
        // Try different methods to extract the date
        let breakoutDate = null;
        
        // Method 1: Look for a date in format MMM_DD_YYYY (e.g., Feb_22_2016)
        for (let i = 0; i < stockParts.length - 2; i++) {
          const potentialMonth = stockParts[i];
          const potentialDay = parseInt(stockParts[i + 1], 10);
          const potentialYear = parseInt(stockParts[i + 2], 10);
          
          if (monthMap.hasOwnProperty(potentialMonth) && 
              !isNaN(potentialDay) && potentialDay >= 1 && potentialDay <= 31 &&
              !isNaN(potentialYear) && potentialYear >= 1900 && potentialYear <= 2100) {
            
            breakoutDate = new Date(potentialYear, monthMap[potentialMonth], potentialDay);
            break;
          }
        }
        
        // Method 2: Look for a date in format MM_DD_YYYY (e.g., 2_22_2016)
        if (!breakoutDate) {
          for (let i = 0; i < stockParts.length - 2; i++) {
            const potentialMonth = parseInt(stockParts[i], 10);
            const potentialDay = parseInt(stockParts[i + 1], 10);
            const potentialYear = parseInt(stockParts[i + 2], 10);
            
            if (!isNaN(potentialMonth) && potentialMonth >= 1 && potentialMonth <= 12 &&
                !isNaN(potentialDay) && potentialDay >= 1 && potentialDay <= 31 &&
                !isNaN(potentialYear) && potentialYear >= 1900 && potentialYear <= 2100) {
              
              breakoutDate = new Date(potentialYear, potentialMonth - 1, potentialDay);
            }
          }
        }
        
        // If we have a valid breakout date, calculate the difference
        if (breakoutDate) {
          // Calculate the difference in days
          const timeDiff = breakoutDate.getTime() - fileDate.getTime();
          const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));
          
          // Format the time difference in the most appropriate unit
          if (daysDiff > 0) {
            // Calculate weeks, months, and years
            const weeksDiff = Math.floor(daysDiff / 7);
            const monthsDiff = Math.floor(daysDiff / 30); // Approximate
            const yearsDiff = Math.floor(daysDiff / 365); // Approximate
            
            if (yearsDiff >= 1) {
              // Use years if at least 1 year
              return <span className="text-turquoise-600">{yearsDiff === 1 ? '1 year before' : `${yearsDiff} years before`}</span>;
            } else if (monthsDiff >= 1) {
              // Use months if at least 1 month
              return <span className="text-turquoise-600">{monthsDiff === 1 ? '1 month before' : `${monthsDiff} months before`}</span>;
            } else if (weeksDiff >= 1) {
              // Use weeks if at least 1 week
              return <span className="text-turquoise-600">{weeksDiff === 1 ? '1 week before' : `${weeksDiff} weeks before`}</span>;
            } else {
              // Use days for less than a week
              return <span className="text-turquoise-600">{daysDiff === 1 ? '1 day before' : `${daysDiff} days before`}</span>;
            }
          } else if (daysDiff === 0) {
            return <span className="text-turquoise-600">Day of</span>;
          } else {
            // For dates after the breakout
            const absDaysDiff = Math.abs(daysDiff);
            const weeksAfter = Math.floor(absDaysDiff / 7);
            const monthsAfter = Math.floor(absDaysDiff / 30); // Approximate
            const yearsAfter = Math.floor(absDaysDiff / 365); // Approximate
            
            if (yearsAfter >= 1) {
              return <span className="text-turquoise-600">{yearsAfter === 1 ? '1 year after' : `${yearsAfter} years after`}</span>;
            } else if (monthsAfter >= 1) {
              return <span className="text-turquoise-600">{monthsAfter === 1 ? '1 month after' : `${monthsAfter} months after`}</span>;
            } else if (weeksAfter >= 1) {
              return <span className="text-turquoise-600">{weeksAfter === 1 ? '1 week after' : `${weeksAfter} weeks after`}</span>;
            } else {
              return <span className="text-turquoise-600">{absDaysDiff === 1 ? '1 day after' : `${absDaysDiff} days after`}</span>;
            }
          }
        }
      }
      
      // If we couldn't calculate a time difference, just return the formatted date
      return `${month} ${day}, ${year}`;
    }
    
    // For non-date filenames, just return the name without extension
    return nameWithoutExtension;
  };
  
  /**
   * Determines if a file should be included in the dropdown based on its name format
   * 
   * This function filters files to:
   * 1. Include files with date-formatted names (e.g., "Feb_22_2016")
   * 2. Include after.json files
   * 3. Exclude single-letter files (D.json, H.json, M.json)
   * 4. Exclude any other files that don't match the date format pattern
   * 
   * The date format pattern is: three-letter month, underscore, one or two-digit day,
   * underscore, four-digit year (e.g., "Feb_22_2016")
   * 
   * @param {string} fileName - The filename to check
   * @returns {boolean} True if the file should be included, false otherwise
   */
  const shouldIncludeInDropdown = (fileName) => {
    // Only include date-formatted files (e.g., "Sep_7_2021.json")
    const fileNameLower = fileName.toLowerCase();
    const fileNameParts = fileNameLower.split(/[/\\]/);
    const lastPart = fileNameParts[fileNameParts.length - 1];
    
    // Check if it's a date-formatted file (e.g., "Sep_7_2021.json")
    const dateFormatRegex = /^[a-z]{3}_\d{1,2}_\d{4}\.json$/;
    if (dateFormatRegex.test(lastPart)) {
      return true;
    }
    
    // Exclude all other files (after.json, D.json, H.json, M.json, etc.)
    return false;
  };

  /**
   * Parses a date from a filename in the format "Month_Day_Year"
   * 
   * @param {string} fileName - The filename to parse
   * @returns {Date|null} A Date object if parsing was successful, null otherwise
   */
  const parseDateFromFileName = (fileName) => {
    // Get just the filename part (handle paths like "folder/file.json")
    const nameWithoutExtension = fileName.replace('.json', '').split(/[/\\]/).pop();
    
    // Check if the filename is a date format like "Feb_22_2016"
    const dateFormatRegex = /^[A-Za-z]{3}_\d{1,2}_\d{4}$/;
    if (dateFormatRegex.test(nameWithoutExtension)) {
      const parts = nameWithoutExtension.split('_');
      const month = parts[0];
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      // Create a Date object (case-insensitive month matching)
      const monthMap = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      const monthLower = month.toLowerCase();
      
      if (monthLower in monthMap && !isNaN(day) && !isNaN(year)) {
        return new Date(year, monthMap[monthLower], day);
      }
    }
    
    return null;
  };

  // Handle scroll events to auto-expand items
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY;
        // Only process if we have items to expand
        if (visibleItems.length > 0) {
          // Auto-expand visible items as user scrolls down
          expandVisibleItems();
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [visibleItems, expandVisibleItems]);

  return (
    <div className="w-full pt-0 px-2 sm:px-6 md:px-10 pb-2">
      <div className="w-full">
        <h3 className="text-xl font-bold mb-4 text-white bg-turquoise-600 px-4 py-2 rounded-lg shadow-md flex items-center">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Previous Setups
      </h3>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-white p-4 rounded-md mb-4 shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-2 text-xs text-red-700 hover:text-red-900 font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      
      {allFiles.length === 0 && (
        <div className="bg-transparent border border-gray-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p className="mt-2 text-white font-medium">No historical data files found.</p>
          <p className="text-xs mt-1 text-gray-500">{debugInfo}</p>
        </div>
      )}
      
      {allFiles.length > 0 && (
        <div className="space-y-4">
          {allFiles
            .filter(file => shouldIncludeInDropdown(file.fileName))
            .sort((a, b) => {
              // Check if files are after.json (check last part of path)
              const getLastPart = (fileName) => fileName.toLowerCase().split(/[/\\]/).pop();
              const isAfterA = getLastPart(a.fileName) === 'after.json';
              const isAfterB = getLastPart(b.fileName) === 'after.json';
              
              // Parse dates from directory names (the actual breakout date, e.g., "AAL_Dec_19_2006")
              const parseDirectoryDate = (fileName) => {
                const parts = fileName.split(/[/\\]/);
                const dirName = parts[0]; // Get directory name (e.g., "AAL_Dec_19_2006")
                const dirParts = dirName.split('_');
                if (dirParts.length >= 4) {
                  const monthStr = dirParts[1];
                  const day = parseInt(dirParts[2], 10);
                  const year = parseInt(dirParts[3], 10);
                  const monthMap = {
                    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
                  };
                  const month = monthMap[monthStr.toLowerCase()];
                  if (month !== undefined && !isNaN(day) && !isNaN(year)) {
                    return new Date(year, month, day);
                  }
                }
                return null;
              };
              
              // Parse directory date (breakout date) - this is the primary sort key
              const dirDateA = parseDirectoryDate(a.fileName);
              const dirDateB = parseDirectoryDate(b.fileName);
              
              // Also try parsing from filename for date-formatted files
              const fileDateA = parseDateFromFileName(a.fileName);
              const fileDateB = parseDateFromFileName(b.fileName);
              
              // Use directory date if available, otherwise fall back to filename date
              const dateA = dirDateA || fileDateA;
              const dateB = dirDateB || fileDateB;
              
              // If both are after.json files, sort by directory date (most recent first)
              if (isAfterA && isAfterB) {
                if (dirDateA && dirDateB) {
                  return dirDateB.getTime() - dirDateA.getTime(); // Most recent first
                }
                return a.fileName.localeCompare(b.fileName);
              }
              
              // If one is after.json and the other is not, after.json comes after date files
              if (isAfterA && !isAfterB) return 1;
              if (!isAfterA && isAfterB) return -1;
              
              // If both dates are valid, sort by most recent first
              if (dateA && dateB) {
                return dateB.getTime() - dateA.getTime();
              }
              
              // If only one date is valid, prioritize the valid one
              if (dateA) return -1;
              if (dateB) return 1;
              
              // If neither has a valid date, sort alphabetically
              return a.fileName.localeCompare(b.fileName);
            })
            .map((file, index) => (
              <div 
                key={file.id} 
                ref={el => {
                  if (el) fileRefs.current[file.id] = { current: el };
                }}
                data-file-id={file.id}
                className={`border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-700 ease-out transform ${
                  visibleItems.includes(file.id) 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-16'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <button 
                  className={`w-full p-4 text-left text-white bg-transparent hover:bg-transparent flex justify-between items-center setup-item-interactive transition-transform duration-150 ${expandedFiles.includes(file.id) ? 'border-b border-gray-200' : ''} ${manuallyControlledItems.includes(file.id) ? 'manually-controlled' : ''}`}
                  onClick={() => handleFileToggle(file.id)}
                >
                  <span className="font-medium flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    {displayFileName(file.fileName)}
                  </span>
                  <svg 
                    className={`w-5 h-5 transform transition-transform duration-500 ease-in-out text-gray-500 ${expandedFiles.includes(file.id) ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                
                {expandedFiles.includes(file.id) && (
                  <div 
                    className="bg-transparent transition-all duration-700 ease-in-out origin-top"
                    style={{
                      animation: `expandContent 700ms ease-out forwards`
                    }}
                  >
                    {fileData[file.id] ? (
                      <div 
                        className={`bg-black overflow-hidden w-full h-full shadow-inner chart-container ${isTimeUp ? 'filter blur-xl' : ''}`}
                        style={{
                          animation: `fadeIn 500ms ease-out forwards 200ms`,
                          opacity: 0,
                          height: "500px",
                          minHeight: "500px",
                          maxHeight: "calc(100vw - 2rem)"
                        }}
                      >
                        <StockChart 
                          data={fileData[file.id]} 
                          showSMA={true}
                          chartType="previous"
                        />
                      </div>
                    ) : (
                      <div 
                        className="flex items-center justify-center w-full h-full min-h-[500px] bg-black"
                        style={{
                          animation: `fadeIn 300ms ease-out forwards`
                        }}
                      >
                        {/* Empty state - loading handled by parent */}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
      
      {/* Add CSS animations */}
      <style jsx global>{`
        @keyframes expandContent {
          from {
            max-height: 0;
            opacity: 0;
          }
          to {
            max-height: calc(100vw + 3rem);
            opacity: 1;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(10px);
          }
        }
        
        /* Ensure chart containers fill their available space */
        .chart-container {
          display: flex;
          flex-direction: column;
          position: relative;
          margin: 0;
          padding: 0;
        }
        
        .chart-container > * {
          flex: 1;
          width: 100%;
          height: 100%;
          min-height: 0;
          margin: 0;
          padding: 0;
        }
        
        /* Charts become square only on smaller screens where height might exceed width */
        @media (max-width: 768px) {
          .chart-container {
            aspect-ratio: 1 / 1 !important;
            height: auto !important;
          }
          
          .chart-container > * {
            height: 100% !important;
          }
        }
        
        /* Add a class for manual interaction feedback */
        .setup-item-interactive:active {
          transform: scale(0.99);
        }
        
        /* Style for manually controlled items */
        .manually-controlled {
          position: relative;
        }
        
        .manually-controlled::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, rgba(56,178,172,0.7) 0%, rgba(129,230,217,0.7) 100%);
        }
      `}</style>
      </div>
    </div>
  );
};

export default DateFolderBrowser;