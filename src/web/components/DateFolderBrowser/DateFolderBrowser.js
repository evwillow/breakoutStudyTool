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
 * @param {FlashcardData[]} [props.flashcards]
 * @param {FlashcardData|null} [props.currentFlashcard]
 * @param {Function} [props.onChartExpanded] - Callback when a chart is expanded
 */
const DateFolderBrowser = ({ session, currentStock, flashcards = [], currentFlashcard = null, onChartExpanded = null }) => {
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
  const prevExpandedFilesRef = useRef([]);

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
    
    // Clear existing files immediately when stock changes
    setAllFiles([]);
    setFileData({});
    setExpandedFiles([]);
    setError(null);
    setDebugInfo('');
    setVisibleItems([]);
    setAutoExpandedItems([]);
    setManuallyControlledItems([]);
    
    // Don't fetch if no current stock
    if (!currentStock) {
      setDebugInfo('No stock selected');
      return;
    }
    
    const fetchAllStockFiles = async () => {
      try {
        // First, try to use files from flashcards that are already loaded
        // Extract date-formatted files from the current stock's directory only
        const preloadedFiles = [];
        if (flashcards && flashcards.length > 0 && currentStock) {
          const currentStockLower = currentStock.toLowerCase();
          flashcards.forEach(flashcard => {
            if (flashcard.jsonFiles && flashcard.jsonFiles.length > 0) {
              flashcard.jsonFiles.forEach(file => {
                if (file && file.fileName && file.data) {
                  const fileName = file.fileName.toLowerCase();
                  const fileNameParts = fileName.split(/[/\\]/);
                  const lastPart = fileNameParts[fileNameParts.length - 1];
                  
                  // Only include date-formatted files (e.g., "Dec_23_2020.json")
                  const isDateFile = /^[a-z]{3}_\d{1,2}_\d{4}\.json$/i.test(lastPart);
                  
                  if (isDateFile) {
                    // Only include if from the current stock's directory
                    const fileDir = file.fileName.split('/')[0]?.toLowerCase() || '';
                    if (fileDir === currentStockLower) {
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
        
        // Normal flow: Get all files from quality_breakouts folder
        // The API returns all files from all stock directories in quality_breakouts
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
        
        // Find the quality_breakouts folder which contains all stock data
        const qualityBreakoutsFolder = foldersData.folders.find(f => f.name === 'quality_breakouts');
        if (!qualityBreakoutsFolder || !qualityBreakoutsFolder.files) {
          console.log("No quality_breakouts folder found or no files");
          return;
        }
        
        const allFiles = qualityBreakoutsFolder.files;
        
        if (!currentStock) {
          setAllFiles([]);
          setDebugInfo('No stock selected');
          return;
        }
        
        // Extract stock symbol from current stock (e.g., "ADPT" from "ADPT_Dec_7_2020")
        const currentStockLower = currentStock.toLowerCase();
        
        // Simple filter: Get date-formatted files from the current stock's directory only
        const previousBreakoutFiles = allFiles.filter(file => {
          // File format: "STOCK_DIR/FILENAME.json" (e.g., "ADPT_Dec_7_2020/Dec_23_2020.json")
          const fileName = file.fileName || file.name || '';
          const fileNameParts = fileName.split(/[/\\]/);
          
          if (fileNameParts.length < 2) return false;
          
          const directoryName = fileNameParts[0].toLowerCase();
          const actualFileName = fileNameParts[fileNameParts.length - 1].toLowerCase();
          
          // Only include files from the current stock's directory
          if (directoryName !== currentStockLower) return false;
          
          // Only include date-formatted files (e.g., "Dec_23_2020.json")
          const dateFormatRegex = /^[a-z]{3}_\d{1,2}_\d{4}\.json$/i;
          return dateFormatRegex.test(actualFileName);
        });
        
        // Format files for display
        const dateFormattedFiles = previousBreakoutFiles.map(file => ({
          id: file.fileName || file.name,
          subfolder: (file.fileName || file.name).split('/')[0],
          fileName: file.fileName || file.name,
          data: file.data || null,
          path: file.fileName || file.name
        }));
        
        // Load date-formatted files in parallel
        const dateFileLoadPromises = dateFormattedFiles.map(async (file) => {
          // Skip if already has data
          if (file.data) {
            return { file, success: true };
          }
          
          // Check if we have a path to load from
          if (!file.path && !file.id && !file.fileName) {
            return { file, success: false };
          }
          
          try {
            // The file.id format is "folderName/fileName" (e.g., "AAL_Dec_11_2006/Feb_22_2016.json")
            // The API expects file as "folderName/fileName" and folder as "quality_breakouts"
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
            console.error(`Error loading date file ${file.id}:`, err);
            return { file, success: false };
          }
        });
        
        // Wait for all date-formatted files to load
        const dateFileResults = await Promise.allSettled(dateFileLoadPromises);
        
        // Only include files that successfully loaded (or already had data)
        const loadedDateFiles = dateFileResults
          .filter(result => result.status === 'fulfilled' && (result.value.success || result.value.file.data))
          .map(result => result.value.file);
        
        // Merge preloaded files with fetched files, avoiding duplicates
        // Prefer preloaded files (already have data) over fetched files (may not have data yet)
        const allFetchedFiles = loadedDateFiles;
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
        
        // Set fileData for files that have data loaded (for date-formatted files)
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
          setDebugInfo(`Found ${finalFiles.length} previous setups for ${currentStock || "all stocks"}`);
        } else if (currentStock) {
          // If we have a currentStock but found no files, still update to show empty state
          setAllFiles([]);
          setDebugInfo('');
          console.warn(`No previous setups found for current stock: ${currentStock}`);
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

  // Notify parent when files are expanded (for timer functionality)
  // This runs after state updates to avoid setState during render errors
  useEffect(() => {
    const prevExpanded = prevExpandedFilesRef.current;
    const newlyExpanded = expandedFiles.filter(id => !prevExpanded.includes(id));
    
    if (newlyExpanded.length > 0 && onChartExpanded && typeof onChartExpanded === 'function') {
      // Use setTimeout to ensure this runs after all state updates
      setTimeout(() => {
        onChartExpanded();
      }, 0);
    }
    
    // Update the ref for next comparison
    prevExpandedFilesRef.current = expandedFiles;
  }, [expandedFiles, onChartExpanded]);

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
      
      // Notify parent that a chart was expanded (for timer functionality)
      if (onChartExpanded && typeof onChartExpanded === 'function') {
        onChartExpanded();
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
    
    // Check if it's a date-formatted file (e.g., "Mar_21_1994.json")
    // Use case-insensitive matching for date files
    const isDateFile = /^[a-z]{3}_\d{1,2}_\d{4}\.json$/i.test(actualFileName);
    
    // For "Previous Setups", we want to show date-formatted files from the SAME STOCK SYMBOL
    // This includes files from the same directory if they're date-formatted (date filtering happens later)
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
    
    // For "Previous Setups", we ONLY want date-formatted files from the SAME DIRECTORY as the current stock
    // Exclude files from other directories (even if same stock symbol) and non-date files
    if (directoryName !== stockLower) {
      return false; // Only show files from the current stock's directory
    }
    
    // Only include date-formatted files
    return isDateFile;
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
      
      // Create a Date object for the file date (previous breakout date from filename)
      const monthMap = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      const monthLower = month.toLowerCase();
      const monthIndex = monthMap[monthLower];
      
      if (monthIndex === undefined || isNaN(day) || isNaN(year)) {
        return <span className="text-white">{nameWithoutExtension}</span>;
      }
      
      const previousBreakoutDate = new Date(year, monthIndex, day);
      
      // Extract date from the stock folder name (if available)
      // Format: STOCK_Month_Day_Year (e.g., "AAL_Dec_11_2006")
      if (currentStock) {
        const stockParts = currentStock.split('_');
        
        // The date is in parts [1], [2], [3] (Month, Day, Year)
        // Stock symbol is part [0]
        let breakoutDate = null;
        
        if (stockParts.length >= 4) {
          const currentMonthStr = stockParts[1];
          const currentDay = parseInt(stockParts[2], 10);
          const currentYear = parseInt(stockParts[3], 10);
          
          const currentMonthLower = currentMonthStr.toLowerCase();
          const currentMonthIndex = monthMap[currentMonthLower];
          
          if (currentMonthIndex !== undefined && !isNaN(currentDay) && !isNaN(currentYear) &&
              currentDay >= 1 && currentDay <= 31 &&
              currentYear >= 1900 && currentYear <= 2100) {
            breakoutDate = new Date(currentYear, currentMonthIndex, currentDay);
          }
        }
        
        // If we have a valid breakout date, calculate the difference
        if (breakoutDate) {
          // Calculate the difference: current breakout date - previous breakout date
          const timeDiff = breakoutDate.getTime() - previousBreakoutDate.getTime();
          const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));
          
          // Format the time difference in the most appropriate unit
          if (daysDiff > 0) {
            // Previous breakout is before current breakout
            const weeksDiff = Math.floor(daysDiff / 7);
            const monthsDiff = Math.floor(daysDiff / 30.44); // Average days per month
            const yearsDiff = Math.floor(daysDiff / 365.25); // Account for leap years
            
            if (yearsDiff >= 1) {
              return <span className="text-white">{yearsDiff === 1 ? '1 year before' : `${yearsDiff} years before`}</span>;
            } else if (monthsDiff >= 1) {
              return <span className="text-white">{monthsDiff === 1 ? '1 month before' : `${monthsDiff} months before`}</span>;
            } else if (weeksDiff >= 1) {
              return <span className="text-white">{weeksDiff === 1 ? '1 week before' : `${weeksDiff} weeks before`}</span>;
            } else {
              return <span className="text-white">{daysDiff === 1 ? '1 day before' : `${daysDiff} days before`}</span>;
            }
          } else if (daysDiff === 0) {
            return <span className="text-white">Same day</span>;
          } else {
            // Previous breakout is after current breakout (shouldn't happen, but handle it)
            const absDaysDiff = Math.abs(daysDiff);
            const weeksDiff = Math.floor(absDaysDiff / 7);
            const monthsDiff = Math.floor(absDaysDiff / 30.44);
            const yearsDiff = Math.floor(absDaysDiff / 365.25);
            
            if (yearsDiff >= 1) {
              return <span className="text-white">{yearsDiff === 1 ? '1 year after' : `${yearsDiff} years after`}</span>;
            } else if (monthsDiff >= 1) {
              return <span className="text-white">{monthsDiff === 1 ? '1 month after' : `${monthsDiff} months after`}</span>;
            } else if (weeksDiff >= 1) {
              return <span className="text-white">{weeksDiff === 1 ? '1 week after' : `${weeksDiff} weeks after`}</span>;
            } else {
              return <span className="text-white">{absDaysDiff === 1 ? '1 day after' : `${absDaysDiff} days after`}</span>;
            }
          }
        }
      }
      
      // If we couldn't calculate a time difference, format the date nicely
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[monthIndex];
      return <span className="text-white">{monthName} {day}, {year}</span>;
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
    <div className="w-full pt-0 px-1 sm:px-6 md:px-10 pb-2">
      <div className="w-full">
        <div className="inline-flex items-center gap-3 bg-black/95 backdrop-blur-sm px-4 py-2.5 rounded-md border border-white/50 mb-6 mt-2 sm:mt-4">
          <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span className="text-base font-semibold text-white/90">Previous Setups</span>
        </div>
      
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
        <div className="text-center py-6 sm:py-8 px-4 bg-black/95 backdrop-blur-sm rounded-md border border-white/30">
          <p className="text-white/80 text-sm sm:text-base">
            {currentStock ? 'No historical data files found' : 'Select a stock to view historical data.'}
          </p>
          {debugInfo && (
            <p className="text-xs mt-3 text-white/50">{debugInfo}</p>
          )}
        </div>
      )}
      
      {allFiles.length > 0 && (
        <div className="space-y-4">
          {allFiles
            .filter(file => shouldIncludeInDropdown(file.fileName))
            .sort((a, b) => {
              // Parse dates from filenames (e.g., "Feb_22_2016.json")
              const fileDateA = parseDateFromFileName(a.fileName);
              const fileDateB = parseDateFromFileName(b.fileName);
              
              // If both dates are valid, sort by most recent first (newest dates first)
              if (fileDateA && fileDateB) {
                return fileDateB.getTime() - fileDateA.getTime();
              }
              
              // If only one date is valid, prioritize the valid one
              if (fileDateA) return -1;
              if (fileDateB) return 1;
              
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
                className={`border border-white/30 rounded-md overflow-hidden shadow-sm hover:shadow-md transition-all duration-700 ease-out transform ${
                  visibleItems.includes(file.id) 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-16'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <button 
                  className={`w-full p-4 text-left text-white bg-black hover:bg-black flex justify-between items-center setup-item-interactive transition-all duration-700 ease-out border-0 ${manuallyControlledItems.includes(file.id) ? 'manually-controlled' : ''}`}
                  onClick={() => handleFileToggle(file.id)}
                  style={{ borderBottom: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
                >
                  <span className="text-white font-semibold bg-black/95 backdrop-blur-sm px-3 sm:px-2 py-1.5 sm:py-1 rounded-md text-lg sm:text-base border border-white/30 shadow-lg inline-block">
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
                    className="bg-transparent transition-all duration-700 ease-in-out origin-top border-0 overflow-hidden"
                    style={{
                      animation: `expandContent 700ms ease-out forwards`,
                      borderTop: 'none'
                    }}
                  >
                    {fileData[file.id] ? (
                      <div 
                        className="bg-black overflow-hidden w-full h-full shadow-inner chart-container border border-white/30"
                        style={{
                          animation: `fadeIn 500ms ease-out forwards 200ms`,
                          opacity: 0,
                          height: "500px",
                          minHeight: "500px",
                          maxHeight: "calc(100vw - 2rem)",
                          borderTop: 'none'
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
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        
        @keyframes collapseContent {
          from {
            max-height: calc(100vw + 3rem);
            opacity: 1;
          }
          to {
            max-height: 0;
            opacity: 0;
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
      `}</style>
      </div>
    </div>
  );
};

export default DateFolderBrowser;