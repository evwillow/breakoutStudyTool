/**
 * getStockFiles API Route
 * 
 * Fetches stock data files from Google Drive based on stock symbol.
 * Features:
 * - Searches across all top-level folders in Google Drive
 * - Implements multiple search strategies with increasing scope
 * - Caches responses for performance optimization
 * - Handles authentication with Google Drive API
 */
import { google } from "googleapis";
import { NextResponse } from "next/server";
import path from "path";

let authClient = null;
let drive = null;

/**
 * Initializes Google Drive authentication client
 * Reuses existing client if already initialized
 */
const initializeAuth = async () => {
  if (!authClient) {
    const keyFilePath = path.join(process.cwd(), "src", "config", "service-account.json");
    authClient = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    drive = google.drive({ version: "v3", auth: authClient });
  }
  return drive;
};

// Parent folder ID in Google Drive containing all stock data
const PARENT_FOLDER_ID = "18q55oXvsOL2MboehLA1OglGdepBVDDub";

/**
 * Formats the data to ensure consistent field names
 */
const formatData = (data) => {
  if (!Array.isArray(data)) return data;
  
  // Process H data to add SMAs if missing
  const isHourlyFile = data.length > 0 && 
    data[0] && 
    !data[0]["10sma"] && !data[0].SMA10 && !data[0].sma10;
  
  let processedData = [...data];
  
  // Calculate SMAs for hourly data if they're missing
  if (isHourlyFile) {
    // Calculate SMA10
    for (let i = 0; i < processedData.length; i++) {
      if (i >= 9) { // Need at least 10 points for 10-period SMA
        let sum = 0;
        for (let j = 0; j < 10; j++) {
          sum += parseFloat(processedData[i - j].Close);
        }
        processedData[i].sma10 = sum / 10;
      }
    }
    
    // Calculate SMA20
    for (let i = 0; i < processedData.length; i++) {
      if (i >= 19) { // Need at least 20 points for 20-period SMA
        let sum = 0;
        for (let j = 0; j < 20; j++) {
          sum += parseFloat(processedData[i - j].Close);
        }
        processedData[i].sma20 = sum / 20;
      }
    }
    
    // Calculate SMA50
    for (let i = 0; i < processedData.length; i++) {
      if (i >= 49) { // Need at least 50 points for 50-period SMA
        let sum = 0;
        for (let j = 0; j < 50; j++) {
          sum += parseFloat(processedData[i - j].Close);
        }
        processedData[i].sma50 = sum / 50;
      }
    }
    
    console.log("Added SMA calculations to hourly data");
  }
  
  return processedData.map(item => {
    // Special handling for H.json SMA formatting
    const isHourlyData = 
      (item.SMA10 !== undefined && item.SMA20 !== undefined) || 
      (item.sma10 !== undefined && item.sma20 !== undefined);
      
    // Ensure SMAs are consistently named and present
    const sma10 = item["10sma"] || item["10SMA"] || item["10_sma"] || item.SMA10 || item.sma10 || null;
    const sma20 = item["20sma"] || item["20SMA"] || item["20_sma"] || item.SMA20 || item.sma20 || null;
    const sma50 = item["50sma"] || item["50SMA"] || item["50_sma"] || item.SMA50 || item.sma50 || null;
    
    // Log SMA values for debugging
    if (item.SMA10 !== undefined || item.sma10 !== undefined) {
      console.log("Found hourly SMA data:", { 
        SMA10: item.SMA10,
        sma10: item.sma10,
        SMA20: item.SMA20, 
        sma20: item.sma20,
        SMA50: item.SMA50,
        sma50: item.sma50
      });
    }
    
    return {
      Open: item.Open || item.open,
      High: item.High || item.high,
      Low: item.Low || item.low,
      Close: item.Close || item.close,
      Volume: item.Volume || item.volume,
      "10sma": sma10,
      "20sma": sma20,
      "50sma": sma50
    };
  });
};

/**
 * GET handler for stock file requests
 * Implements a multi-stage search strategy:
 * 1. Look for exact match folders
 * 2. Search for stock folders within top-level folders
 * 3. Search for any JSON files containing the stock symbol
 */
export async function GET(request) {
  try {
    const stockSymbol = new URL(request.url).searchParams.get("stock");
    if (!stockSymbol) {
      return NextResponse.json({ error: "No stock symbol provided" }, { status: 400 });
    }

    console.log(`Searching for stock files for: ${stockSymbol}`);
    const drive = await initializeAuth();

    // Get all top-level folders
    const foldersResponse = await drive.files.list({
      q: `'${PARENT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
      pageSize: 1000,
    });

    if (!foldersResponse.data.files.length) {
      console.log("No folders found in parent folder");
      return NextResponse.json([], {
        status: 200,
        headers: { "Cache-Control": "public, max-age=300" },
      });
    }

    console.log(`Found ${foldersResponse.data.files.length} top-level folders`);
    foldersResponse.data.files.forEach(folder => {
      console.log(`- ${folder.name} (${folder.id})`);
    });

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
    const shuffledFolders = shuffleFolders([...foldersResponse.data.files]);
    console.log('Folders have been randomly shuffled for stock search');

    // Search for the stock folder in each top-level folder
    let stockFiles = [];
    let foundStockFolder = false;

    // First, try to find folders that exactly match the stock symbol
    for (const folder of shuffledFolders) {
      if (folder.name.toLowerCase() === stockSymbol.toLowerCase()) {
        console.log(`Found exact match folder: ${folder.name}`);
        
        // Get all JSON files in this folder
        const filesResponse = await drive.files.list({
          q: `'${folder.id}' in parents and mimeType = 'application/json'`,
          fields: "files(id, name)",
          pageSize: 1000,
        });

        console.log(`Found ${filesResponse.data.files.length} JSON files in ${folder.name}`);
        
        if (filesResponse.data.files.length > 0) {
          // Fetch the content of each JSON file
          const jsonFiles = await Promise.all(
            filesResponse.data.files.map(async (file) => {
              try {
                console.log(`Fetching content for file: ${file.name}`);
                const jsonData = await drive.files.get({
                  fileId: file.id,
                  alt: "media",
                });
                return {
                  fileName: file.name,
                  data: formatData(typeof jsonData.data === 'string' ? JSON.parse(jsonData.data) : jsonData.data),
                };
              } catch (error) {
                console.error(`Error fetching JSON file ${file.name}:`, error.message);
                return {
                  fileName: file.name,
                  data: null,
                  error: error.message
                };
              }
            })
          );

          stockFiles.push({
            folderName: folder.name,
            jsonFiles,
          });
          foundStockFolder = true;
        }
      }
    }

    // Next, search for stock folders within each top-level folder
    for (const folder of shuffledFolders) {
      console.log(`Searching for ${stockSymbol} in ${folder.name}`);
      
      // Look for the stock folder within this top-level folder
      const stockFolderResponse = await drive.files.list({
        q: `'${folder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${stockSymbol}'`,
        fields: "files(id, name)",
        pageSize: 10,
      });

      console.log(`Found ${stockFolderResponse.data.files.length} matching subfolders in ${folder.name}`);
      
      if (stockFolderResponse.data.files.length > 0) {
        for (const stockFolder of stockFolderResponse.data.files) {
          foundStockFolder = true;
          console.log(`Found stock folder ${stockFolder.name} in ${folder.name}`);

          // Get all JSON files in the stock folder
          const filesResponse = await drive.files.list({
            q: `'${stockFolder.id}' in parents and mimeType = 'application/json'`,
            fields: "files(id, name)",
            pageSize: 1000,
          });

          console.log(`Found ${filesResponse.data.files.length} JSON files in ${folder.name}/${stockFolder.name}`);
          
          if (filesResponse.data.files.length > 0) {
            // Fetch the content of each JSON file
            const jsonFiles = await Promise.all(
              filesResponse.data.files.map(async (file) => {
                try {
                  console.log(`Fetching content for file: ${file.name}`);
                  const jsonData = await drive.files.get({
                    fileId: file.id,
                    alt: "media",
                  });
                  return {
                    fileName: file.name,
                    data: formatData(typeof jsonData.data === 'string' ? JSON.parse(jsonData.data) : jsonData.data),
                  };
                } catch (error) {
                  console.error(`Error fetching JSON file ${file.name}:`, error.message);
                  return {
                    fileName: file.name,
                    data: null,
                    error: error.message
                  };
                }
              })
            );

            stockFiles.push({
              folderName: stockFolder.name,
              parentFolder: folder.name,
              jsonFiles,
            });
          }
        }
      }
    }

    // If we found stock files, return them
    if (stockFiles.length > 0) {
      console.log(`Returning ${stockFiles.length} stock file groups`);
      return NextResponse.json(stockFiles, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=300" },
      });
    }

    // If we still didn't find any files, try a broader search
    console.log("No exact matches found, trying broader search...");
    
    // Search for any JSON files that might contain the stock symbol in their name
    for (const folder of shuffledFolders) {
      // Get all JSON files in this folder
      const filesResponse = await drive.files.list({
        q: `'${folder.id}' in parents and mimeType = 'application/json'`,
        fields: "files(id, name)",
        pageSize: 1000,
      });
      
      // Filter files that contain the stock symbol in their name
      const relevantFiles = filesResponse.data.files.filter(file => 
        file.name.toLowerCase().includes(stockSymbol.toLowerCase().split('_')[0])
      );
      
      if (relevantFiles.length > 0) {
        console.log(`Found ${relevantFiles.length} relevant JSON files in ${folder.name}`);
        
        // Fetch the content of each relevant JSON file
        const jsonFiles = await Promise.all(
          relevantFiles.map(async (file) => {
            try {
              console.log(`Fetching content for file: ${file.name}`);
              const jsonData = await drive.files.get({
                fileId: file.id,
                alt: "media",
              });
              return {
                fileName: file.name,
                data: formatData(typeof jsonData.data === 'string' ? JSON.parse(jsonData.data) : jsonData.data),
              };
            } catch (error) {
              console.error(`Error fetching JSON file ${file.name}:`, error.message);
              return {
                fileName: file.name,
                data: null,
                error: error.message
              };
            }
          })
        );

        stockFiles.push({
          folderName: folder.name,
          jsonFiles,
        });
        foundStockFolder = true;
      }
    }

    // Return the found files or empty array if none found
    return NextResponse.json(stockFiles, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    console.error("Error fetching stock files:", error.message);
    return NextResponse.json([], {
      status: 200,
      headers: { "Cache-Control": "public, max-age=300" },
    });
  }
} 