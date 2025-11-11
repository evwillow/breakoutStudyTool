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
  const [isLoading, setIsLoading] = useState(false);
  const fileRefs = useRef({});
  const lastScrollY = useRef(0);
  const scrollingDirection = useRef('down');
  const prevExpandedFilesRef = useRef([]);
  const prevFetchKeyRef = useRef(null);

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
    if (!session) {
      prevFetchKeyRef.current = null;
      return;
    }
    
    // Don't fetch if no current stock
    if (!currentStock) {
      // Smoothly clear when no stock selected
      setTimeout(() => {
        setAllFiles([]);
        setFileData({});
        setExpandedFiles([]);
        setError(null);
        setDebugInfo('No stock selected');
        setVisibleItems([]);
        setAutoExpandedItems([]);
        setManuallyControlledItems([]);
      }, 100);
      return;
    }
    
    const flashcardsKey = Array.isArray(flashcards)
      ? flashcards
          .map((card, index) => {
            if (!card || typeof card !== 'object') return `card-${index}`;
            return card.id || card.fileName || card.slug || `card-${index}`;
          })
          .join('|')
      : 'none';
    const currentFlashcardKey = currentFlashcard
      ? currentFlashcard.id || currentFlashcard.fileName || currentFlashcard.slug || 'selected'
      : 'none';
    const fetchKey = `${session?.user?.id || 'anon'}|${currentStock}|${flashcardsKey}|${currentFlashcardKey}`;

    if (prevFetchKeyRef.current === fetchKey) {
      return;
    }
    prevFetchKeyRef.current = fetchKey;

    // Clear error and debug info immediately, but keep files visible during transition
    setError(null);
    setDebugInfo('');
    setIsLoading(true);
    
    const abortController = new AbortController();
    let isActive = true;

    const fetchAllStockFiles = async () => {
      try {
        // Parse current stock to get ticker and breakout date
        if (!currentStock) {
          setAllFiles([]);
          setDebugInfo('No stock selected');
          return;
        }
        
          const currentStockLower = currentStock.toLowerCase();
          const currentStockParts = currentStockLower.split('_');
        if (currentStockParts.length < 4) {
          console.error(`Invalid stock format: ${currentStock}`);
          return;
        }
        
        const currentTicker = currentStockParts[0]; // e.g., "aa"
        const currentMonthStr = currentStockParts[1]; // e.g., "jul"
        const currentDay = parseInt(currentStockParts[2], 10);
        const currentYear = parseInt(currentStockParts[3], 10);
        
        const monthMap = {
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        const currentMonthIndex = monthMap[currentMonthStr.toLowerCase()];
        if (currentMonthIndex === undefined || isNaN(currentDay) || isNaN(currentYear)) {
          console.error(`Invalid date in stock format: ${currentStock}`);
          return;
        }
        
        const currentBreakoutDate = new Date(currentYear, currentMonthIndex, currentDay);
        
        // Get all files from quality_breakouts folder
        const foldersRes = await fetch("/api/files/local-folders", {
          signal: abortController.signal,
        });
        if (!foldersRes.ok) {
          console.error(`Error fetching folders: ${foldersRes.status}`);
          throw new Error(`Failed to load folders (status ${foldersRes.status})`);
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
        
        // Group files by directory (stock folder)
        const filesByDirectory = new Map();
        
        // First, check flashcards for preloaded data
        if (flashcards && flashcards.length > 0) {
          flashcards.forEach(flashcard => {
            if (flashcard.jsonFiles && flashcard.jsonFiles.length > 0) {
              flashcard.jsonFiles.forEach(file => {
                if (file && file.fileName) {
                  const fileName = file.fileName;
                  const fileNameParts = fileName.split(/[/\\]/);
                  if (fileNameParts.length < 2) return;
                  
                  const directoryName = fileNameParts[0];
                  const actualFileName = fileNameParts[fileNameParts.length - 1].toLowerCase();
                  
                  // Only process directories that match the current ticker
                  const dirParts = directoryName.toLowerCase().split('_');
                  if (dirParts.length < 4 || dirParts[0] !== currentTicker) return;
                  
                  if (!filesByDirectory.has(directoryName)) {
                    filesByDirectory.set(directoryName, { dJson: null, afterJson: null });
                  }
                  
                  const dirData = filesByDirectory.get(directoryName);
                  if (actualFileName === 'd.json' || actualFileName === 'D.json') {
                    dirData.dJson = { ...file, data: file.data }; // Preserve data if already loaded
                  } else if (actualFileName === 'after.json') {
                    dirData.afterJson = { ...file, data: file.data }; // Preserve data if already loaded
                  }
                }
              });
            }
          });
        }
        
        // Then, add files from API response
        allFiles.forEach(file => {
          const fileName = file.fileName || file.name || '';
          const fileNameParts = fileName.split(/[/\\]/);
          if (fileNameParts.length < 2) return;
          
          const directoryName = fileNameParts[0];
          const actualFileName = fileNameParts[fileNameParts.length - 1].toLowerCase();
          
          // Only process directories that match the current ticker
          const dirParts = directoryName.toLowerCase().split('_');
          if (dirParts.length < 4 || dirParts[0] !== currentTicker) return;
          
          if (!filesByDirectory.has(directoryName)) {
            filesByDirectory.set(directoryName, { dJson: null, afterJson: null });
          }
          
          const dirData = filesByDirectory.get(directoryName);
          // Only set if not already set from flashcards (to preserve preloaded data)
          if ((actualFileName === 'd.json' || actualFileName === 'D.json') && !dirData.dJson) {
            dirData.dJson = file;
          } else if (actualFileName === 'after.json' && !dirData.afterJson) {
            dirData.afterJson = file;
          }
        });
        
        // Process each directory to create previous setup entries
        const previousSetups = [];
        
        for (const [directoryName, files] of filesByDirectory.entries()) {
          // Skip if missing d.json (required)
          if (!files.dJson) continue;
          
          // Parse breakout date from directory name (e.g., "AA_Jul_31_2003")
          const dirParts = directoryName.toLowerCase().split('_');
          if (dirParts.length < 4) continue;
          
          const prevMonthStr = dirParts[1];
          const prevDay = parseInt(dirParts[2], 10);
          const prevYear = parseInt(dirParts[3], 10);
          const prevMonthIndex = monthMap[prevMonthStr];
          
          if (prevMonthIndex === undefined || isNaN(prevDay) || isNaN(prevYear)) continue;
          
          const prevBreakoutDate = new Date(prevYear, prevMonthIndex, prevDay);
          
          // Only include if previous breakout date is before current breakout date
          if (prevBreakoutDate >= currentBreakoutDate) continue;
          
          // Load d.json and after.json
          try {
            // Try both D.json and d.json (case-insensitive)
            let dJsonData = null;
            let dJsonPath = null;
            
            // First, check if we already have the data from flashcards
            if (files.dJson && files.dJson.data) {
              dJsonData = files.dJson.data;
            } else {
              // Try D.json first (capital D)
              dJsonPath = `${directoryName}/D.json`;
              let dJsonResponse = await fetch(`/api/files/local-data?file=${encodeURIComponent(dJsonPath)}&folder=${encodeURIComponent('quality_breakouts')}`);
              
              if (!dJsonResponse.ok) {
                // Try lowercase d.json
                dJsonPath = `${directoryName}/d.json`;
                dJsonResponse = await fetch(`/api/files/local-data?file=${encodeURIComponent(dJsonPath)}&folder=${encodeURIComponent('quality_breakouts')}`);
              }
              
              if (!dJsonResponse.ok) continue;
              
              const dJsonResult = await dJsonResponse.json();
              if (!dJsonResult.success || !dJsonResult.data || !Array.isArray(dJsonResult.data) || dJsonResult.data.length === 0) continue;
              
              dJsonData = dJsonResult.data;
            }
            
            // Get the last date from d.json (this is the breakout date)
            const lastDJsonEntry = dJsonData[dJsonData.length - 1];
            const lastDJsonDate = lastDJsonEntry?.Date ? new Date(lastDJsonEntry.Date) : prevBreakoutDate;
            
            // Load after.json if it exists
            let afterJsonData = null;
            if (files.afterJson) {
              try {
                // First, check if we already have the data from flashcards
                if (files.afterJson.data) {
                  afterJsonData = files.afterJson.data;
                } else {
                  const afterJsonPath = `${directoryName}/after.json`;
                  const afterJsonResponse = await fetch(`/api/files/local-data?file=${encodeURIComponent(afterJsonPath)}&folder=${encodeURIComponent('quality_breakouts')}`);
                  
                  if (afterJsonResponse.ok) {
                    const afterJsonResult = await afterJsonResponse.json();
                    if (afterJsonResult.success && afterJsonResult.data && Array.isArray(afterJsonResult.data) && afterJsonResult.data.length > 0) {
                      afterJsonData = afterJsonResult.data;
                    }
                  }
                }
                
                if (afterJsonData && afterJsonData.length > 0) {
                  // Check if after.json extends past current breakout date
                  const lastAfterJsonEntry = afterJsonData[afterJsonData.length - 1];
                  const lastAfterJsonDate = lastAfterJsonEntry?.Date ? new Date(lastAfterJsonEntry.Date) : null;
                  
                  if (lastAfterJsonDate && lastAfterJsonDate > currentBreakoutDate) {
                    // Filter after.json to only include entries up to (but not including) current breakout date
                    afterJsonData = afterJsonData.filter(entry => {
                      if (!entry.Date) return false;
                      const entryDate = new Date(entry.Date);
                      return entryDate < currentBreakoutDate;
                    });
                    
                    // If no valid entries remain, skip this setup
                    if (afterJsonData.length === 0) continue;
                  }
                }
              } catch (err) {
                console.error(`Error loading after.json for ${directoryName}:`, err);
                // Continue without after.json
              }
            }
            
            // Combine d.json and after.json
            const combinedData = [...dJsonData];
            if (afterJsonData && afterJsonData.length > 0) {
              combinedData.push(...afterJsonData);
            }
            
            // Create file entry for this previous setup
            previousSetups.push({
              id: `${directoryName}_previous_setup`,
              subfolder: directoryName,
              fileName: directoryName, // Use directory name as identifier
              data: combinedData,
              path: directoryName,
              breakoutDate: lastDJsonDate, // Use last date of d.json as the date to display
              directoryName: directoryName
            });
          } catch (err) {
            console.error(`Error processing previous setup ${directoryName}:`, err);
            continue;
          }
        }
        
        // Sort by breakout date (most recent first)
        previousSetups.sort((a, b) => {
          const dateA = a.breakoutDate?.getTime() || 0;
          const dateB = b.breakoutDate?.getTime() || 0;
          return dateB - dateA;
        });
        
        // Set fileData for all previous setups
        const fileDataToSet = {};
        previousSetups.forEach(file => {
          if (file.data) {
            fileDataToSet[file.id] = file.data;
          }
        });
        if (Object.keys(fileDataToSet).length > 0) {
          setFileData(prev => ({ ...prev, ...fileDataToSet }));
        }
        
        // Smoothly update files
        requestAnimationFrame(() => {
          if (previousSetups.length > 0) {
            setAllFiles(previousSetups);
            setDebugInfo(`Found ${previousSetups.length} previous setups for ${currentStock}`);
          } else if (currentStock) {
            setTimeout(() => {
              setAllFiles([]);
              setDebugInfo('');
            }, 200);
            console.warn(`No previous setups found for current stock: ${currentStock}`);
          } else {
            setTimeout(() => {
              setAllFiles([]);
              setDebugInfo(`No stock selected`);
            }, 200);
          }
          setTimeout(() => setIsLoading(false), 100);
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error?.name === 'AbortError') {
          console.warn('Cancelled historical file fetch for DateFolderBrowser');
          return;
        }

        console.error('Failed to load previous setups:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        setError(message);
        setDebugInfo(`Error loading previous setups: ${message}`);
        setIsLoading(false);
      }
    };
    
    fetchAllStockFiles();

    return () => {
      isActive = false;
      abortController.abort();
    };
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
      // Silently handle errors - just log to console
      console.error(`Error loading file data for ${fileId}:`, err);
    }
  }, [allFiles, fileData]);

  // Set up intersection observer for scroll reveal and progressive auto-expand effect
  useEffect(() => {
    if (!allFiles.length) return; // Don't set up observer if there are no files
    
    const observerOptions = {
      root: null, // use viewport
      rootMargin: '200px', // Larger margin so items appear earlier (200px before entering viewport)
      threshold: [0, 0.1, 0.2, 0.5] // Multiple thresholds for smoother transitions
    };

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (!entry.target || !entry.target.dataset) return; // Skip if target is invalid
        
        const id = entry.target.dataset.fileId;
        if (!id) return; // Skip if no file ID
        
        if (entry.isIntersecting) {
          // Always make the item visible when it enters the viewport (or gets close)
          // Once visible, keep it visible permanently (don't remove from visibleItems)
          setVisibleItems(prev => {
            if (!prev.includes(id)) {
              return [...prev, id];
            }
            return prev; // Keep it in the list - never remove once seen
          });
          
          // Only auto-expand if:
          // 1. The item is not manually controlled (user hasn't interacted with it)
          // 2. We're scrolling down (progressive expansion)
          // 3. Item is at least 10% visible (to prevent premature expansion)
          if (!manuallyControlledItems.includes(id) && 
              scrollingDirection.current === 'down' && 
              entry.intersectionRatio >= 0.1) {
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
          // IMPORTANT: Don't remove from visibleItems - keep items visible once revealed
          // Only auto-close expanded items if:
          // 1. The item is not manually controlled
          // 2. It was auto-expanded (is in autoExpandedItems)
          // 3. We're scrolling up
          // 4. Item is significantly out of view (scrolled past by a good margin)
          if (!manuallyControlledItems.includes(id) && 
              scrollingDirection.current === 'up' &&
              entry.intersectionRatio === 0) {
            // Only close if item is completely out of view and we're scrolling up
            setAutoExpandedItems(prev => {
              if (prev.includes(id)) {
                // Remove from expanded files but keep in visibleItems
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
   * For "Previous Setups", we want to show previous breakouts from the same ticker
   * This function is no longer used for previous setups (handled in fetchAllStockFiles),
   * but kept for compatibility
   */
  const isRelevantToCurrentStock = (fileName, stockSymbol) => {
    // This function is deprecated for previous setups
    // Previous setups are now loaded directly from d.json + after.json
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
   * 1. Uses the breakoutDate from the file object (last date of d.json)
   * 2. Calculates the difference in days between the previous breakout date and the current breakout date
   * 3. Returns a string showing "X days before breakout"
   * 
   * @param {string} fileName - The raw filename to format
   * @param {Object} file - The file object (may contain breakoutDate property)
   * @returns {string|React.ReactNode} The formatted filename for display
   */
  const displayFileName = (fileName, file = null) => {
    // Get the breakout date from the file object if available
    let previousBreakoutDate = null;
    
    if (file && file.breakoutDate) {
      previousBreakoutDate = file.breakoutDate instanceof Date ? file.breakoutDate : new Date(file.breakoutDate);
    } else {
      // Fallback: try to parse from directory name in fileName
      const fileNameParts = fileName.split(/[/\\]/);
      const directoryName = fileNameParts[0] || fileName;
      const dirParts = directoryName.toLowerCase().split('_');
      
      if (dirParts.length >= 4) {
      const monthMap = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
        const monthStr = dirParts[1];
        const day = parseInt(dirParts[2], 10);
        const year = parseInt(dirParts[3], 10);
        const monthIndex = monthMap[monthStr];
        
        if (monthIndex !== undefined && !isNaN(day) && !isNaN(year)) {
          previousBreakoutDate = new Date(year, monthIndex, day);
        }
      }
    }
    
    // Extract date from the current stock folder name
      // Format: STOCK_Month_Day_Year (e.g., "AAL_Dec_11_2006")
    let currentBreakoutDate = null;
      if (currentStock) {
        const stockParts = currentStock.split('_');
      const monthMap = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
        
        if (stockParts.length >= 4) {
          const currentMonthStr = stockParts[1];
          const currentDay = parseInt(stockParts[2], 10);
          const currentYear = parseInt(stockParts[3], 10);
          const currentMonthLower = currentMonthStr.toLowerCase();
          const currentMonthIndex = monthMap[currentMonthLower];
          
          if (currentMonthIndex !== undefined && !isNaN(currentDay) && !isNaN(currentYear) &&
              currentDay >= 1 && currentDay <= 31 &&
              currentYear >= 1900 && currentYear <= 2100) {
          currentBreakoutDate = new Date(currentYear, currentMonthIndex, currentDay);
        }
      }
    }
    
    // If we have both dates, calculate the difference
    if (previousBreakoutDate && currentBreakoutDate) {
      const timeDiff = currentBreakoutDate.getTime() - previousBreakoutDate.getTime();
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
      
      // If we couldn't calculate a time difference, format the date nicely
    if (previousBreakoutDate) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[previousBreakoutDate.getMonth()];
      const day = previousBreakoutDate.getDate();
      const year = previousBreakoutDate.getFullYear();
      return <span className="text-white">{monthName} {day}, {year}</span>;
    }
    
    // Fallback: return directory name or filename
    const nameWithoutExtension = fileName.replace('.json', '').split(/[/\\]/).pop();
    return nameWithoutExtension;
  };
  
  /**
   * Determines if a file should be included in the dropdown
   * 
   * For previous setups, we now include all files that have been created
   * (they are previous setups with combined d.json + after.json data)
   * 
   * @param {string} fileName - The filename to check
   * @param {Object} file - The file object
   * @returns {boolean} True if the file should be included, false otherwise
   */
  const shouldIncludeInDropdown = (fileName, file = null) => {
    // Include all previous setup files (they have breakoutDate property)
    if (file && file.breakoutDate) {
      return true;
    }
    
    // Fallback: check if it's a directory name format (previous setup)
    const fileNameParts = fileName.split(/[/\\]/);
    const directoryName = fileNameParts[0] || fileName;
    const dirParts = directoryName.toLowerCase().split('_');
    
    // Check if it matches the directory format: TICKER_Month_Day_Year
    if (dirParts.length >= 4) {
      const monthMap = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      const monthStr = dirParts[1];
      const day = parseInt(dirParts[2], 10);
      const year = parseInt(dirParts[3], 10);
      const monthIndex = monthMap[monthStr];
      
      if (monthIndex !== undefined && !isNaN(day) && !isNaN(year)) {
        return true;
      }
    }
    
    return false;
  };

  /**
   * Parses a date from a file object or directory name
   * 
   * @param {string} fileName - The filename/directory name to parse
   * @param {Object} file - The file object (may contain breakoutDate property)
   * @returns {Date|null} A Date object if parsing was successful, null otherwise
   */
  const parseDateFromFileName = (fileName, file = null) => {
    // First try to get date from file object
    if (file && file.breakoutDate) {
      return file.breakoutDate instanceof Date ? file.breakoutDate : new Date(file.breakoutDate);
    }
    
    // Fallback: parse from directory name format (TICKER_Month_Day_Year)
    const fileNameParts = fileName.split(/[/\\]/);
    const directoryName = fileNameParts[0] || fileName;
    const dirParts = directoryName.toLowerCase().split('_');
    
    if (dirParts.length >= 4) {
      const monthMap = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      const monthStr = dirParts[1];
      const day = parseInt(dirParts[2], 10);
      const year = parseInt(dirParts[3], 10);
      const monthIndex = monthMap[monthStr];
      
      if (monthIndex !== undefined && !isNaN(day) && !isNaN(year)) {
        return new Date(year, monthIndex, day);
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
            .filter(file => shouldIncludeInDropdown(file.fileName, file))
            .sort((a, b) => {
              // Parse dates from file objects (breakoutDate property)
              const fileDateA = parseDateFromFileName(a.fileName, a);
              const fileDateB = parseDateFromFileName(b.fileName, b);
              
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
                className={`border border-white/30 rounded-md overflow-hidden shadow-sm hover:shadow-md transition-all duration-500 ease-out transform ${
                  visibleItems.includes(file.id) 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ 
                  // Stagger animation only for items not yet visible
                  transitionDelay: visibleItems.includes(file.id) ? '0ms' : `${Math.min(index * 100, 1000)}ms`,
                  // Ensure items stay visible once revealed - no fade out
                  visibility: visibleItems.includes(file.id) ? 'visible' : 'hidden',
                  // Smooth transition for all properties
                  willChange: visibleItems.includes(file.id) ? 'auto' : 'transform, opacity'
                }}
              >
                <button 
                  className={`w-full p-4 text-left text-white bg-black hover:bg-black flex justify-between items-center setup-item-interactive transition-all duration-700 ease-out border-0 ${manuallyControlledItems.includes(file.id) ? 'manually-controlled' : ''}`}
                  onClick={() => handleFileToggle(file.id)}
                  style={{ borderBottom: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
                >
                  <span className="text-white font-semibold bg-black/95 backdrop-blur-sm px-3 sm:px-2 py-1.5 sm:py-1 rounded-md text-lg sm:text-base border border-white/30 shadow-lg inline-block">
                    {displayFileName(file.fileName, file)}
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
                        className="bg-black overflow-visible w-full h-full shadow-inner chart-container border border-white/30"
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