/**
 * Google Drive File Search API
 * 
 * Searches for files in Google Drive based on a query string
 */
import { NextRequest } from 'next/server';
import { createSuccessResponse, addCacheHeaders } from '../../_shared/utils/response';
import { withErrorHandling, withEnvironmentValidation, composeMiddleware } from '../../_shared/middleware/errorHandler';
import { StockFile } from '../../_shared/types/api';
import { initializeDriveClient, getParentFolderId } from '@/lib/googleDrive';
import { AppError, ErrorCodes } from '@/utils/errorHandling';

interface DriveFile {
  id?: string | null;
  name?: string | null;
}

/**
 * Search for files matching the query string
 */
async function searchFiles(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const searchQuery = searchParams.get('query');

  if (!searchQuery) {
    // Return empty array for empty queries
    const response = createSuccessResponse<StockFile[]>([]);
    return addCacheHeaders(response, 300);
  }

  try {
    const drive = await initializeDriveClient();
    const PARENT_FOLDER_ID = getParentFolderId();

    // Get all folders in the parent folder
    const foldersResponse = await drive.files.list({
      q: `'${PARENT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
      pageSize: 1000,
    });

    if (!foldersResponse.data.files?.length) {
      const response = createSuccessResponse<StockFile[]>([]);
      return addCacheHeaders(response, 300);
    }

    // Shuffle the folders array to randomize the order
    const shuffleFolders = (array: DriveFile[]) => {
      // Fisher-Yates shuffle algorithm
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    
    const shuffledFolders = shuffleFolders([...foldersResponse.data.files]);
    const searchResults: StockFile[] = [];

    // First, check if there's a folder with the exact name matching the search query
    const exactFolderMatch = shuffledFolders.find(
      folder => folder.name?.toLowerCase() === searchQuery.toLowerCase()
    );

    if (exactFolderMatch) {
      // Get all JSON files in this folder
      const filesInExactFolder = await drive.files.list({
        q: `'${exactFolderMatch.id}' in parents and mimeType = 'application/json'`,
        fields: "files(id, name)",
        pageSize: 1000,
      });

      if (filesInExactFolder.data.files?.length) {
        const jsonFiles = await Promise.all(
          filesInExactFolder.data.files.map(async (file: DriveFile) => {
            try {
              const jsonData = await drive.files.get({
                fileId: file.id!,
                alt: "media",
              });
              return {
                fileName: file.name!,
                data: jsonData.data,
              };
            } catch (error: any) {
              console.error(`Error fetching JSON file ${file.name}:`, error.message);
              return {
                fileName: file.name!,
                data: null,
                error: error.message
              };
            }
          })
        );

        const validJsonFiles = jsonFiles.filter(f => f.data);
        if (validJsonFiles.length > 0) {
          searchResults.push({
            name: exactFolderMatch.name!,
            data: validJsonFiles.map(f => f.data).flat(),
            metadata: {
              symbol: exactFolderMatch.name!,
              timeframe: 'unknown',
              lastUpdated: new Date().toISOString()
            }
          });
        }
      }
    }

    // Search for JSON files in all folders that might contain the search query
    const searchTerms = searchQuery.toLowerCase().split('_');
    
    // Process each folder
    for (const folder of shuffledFolders) {
      // Skip the exact match folder we already processed
      if (exactFolderMatch && folder.id === exactFolderMatch.id) {
        continue;
      }
      
      // Check if folder name contains any part of the search query
      const folderNameLower = folder.name?.toLowerCase() || '';
      const folderRelevant = searchTerms.some(term => folderNameLower.includes(term));
      
      if (folderRelevant) {
        // Get all JSON files in this folder
        const filesInFolder = await drive.files.list({
          q: `'${folder.id}' in parents and mimeType = 'application/json'`,
          fields: "files(id, name)",
          pageSize: 1000,
        });

        if (filesInFolder.data.files?.length) {
          const relevantFiles = filesInFolder.data.files.filter((file: DriveFile) => {
            const fileNameLower = file.name?.toLowerCase() || '';
            return searchTerms.some(term => fileNameLower.includes(term));
          });

          if (relevantFiles.length > 0) {
            const jsonFiles = await Promise.all(
              relevantFiles.map(async (file: DriveFile) => {
                try {
                  const jsonData = await drive.files.get({
                    fileId: file.id!,
                    alt: "media",
                  });
                  return {
                    fileName: file.name!,
                    data: jsonData.data,
                  };
                } catch (error: any) {
                  console.error(`Error fetching JSON file ${file.name}:`, error.message);
                  return {
                    fileName: file.name!,
                    data: null,
                    error: error.message
                  };
                }
              })
            );

            const validJsonFiles = jsonFiles.filter(f => f.data);
            if (validJsonFiles.length > 0) {
              searchResults.push({
                name: folder.name!,
                data: validJsonFiles.map(f => f.data).flat(),
                metadata: {
                  symbol: folder.name!,
                  timeframe: 'unknown',
                  lastUpdated: new Date().toISOString()
                }
              });
            }
          }
        }
      }
    }

    const response = createSuccessResponse<StockFile[]>(searchResults);
    return addCacheHeaders(response, 300);
  } catch (error: any) {
    // Log error but return empty array to maintain compatibility
    console.error("Error searching files:", error.message);
    
    // For compatibility, return empty array instead of error
    const response = createSuccessResponse<StockFile[]>([]);
    return addCacheHeaders(response, 300);
  }
}

// Export with middleware
export const GET = composeMiddleware(
  withEnvironmentValidation([
    'GOOGLE_SERVICE_ACCOUNT_PROJECT_ID',
    'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    'GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL',
    'GOOGLE_DRIVE_PARENT_FOLDER_ID'
  ]),
  withErrorHandling
)(searchFiles); 