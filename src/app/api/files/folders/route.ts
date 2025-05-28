/**
 * Google Drive Folders API
 * 
 * Handles fetching folders from Google Drive
 */
import { NextRequest } from 'next/server';
import { createSuccessResponse, addCacheHeaders } from '../../_shared/utils/response';
import { withErrorHandling, withEnvironmentValidation, composeMiddleware } from '../../_shared/middleware/errorHandler';
import { GoogleDriveFolder } from '../../_shared/types/api';
import { initializeDriveClient, getParentFolderId } from '@/lib/googleDrive';
import { AppError, ErrorCodes } from '@/utils/errorHandling';

// Cache results for improved performance
let cachedFolders: GoogleDriveFolder[] | null = null;
let cacheTime: number | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get folders from Google Drive
 */
async function getFolders(req: NextRequest) {
  // Return cached data if available and not expired
  if (cachedFolders && cacheTime && (Date.now() - cacheTime < CACHE_TTL)) {
    const response = createSuccessResponse<GoogleDriveFolder[]>(cachedFolders, {
      requestId: crypto.randomUUID()
    });
    response.headers.set('X-Cache', 'HIT');
    return addCacheHeaders(response, 3600);
  }

  try {
    // Get the drive client and parent folder ID
    const drive = await initializeDriveClient();
    const parentFolderId = getParentFolderId();
    
    // Get folders
    const foldersResponse = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
      pageSize: 1000,
    });

    const folders = foldersResponse.data.files || [];
    
    // Shuffle the folders array to randomize the order
    const shuffleFolders = (array: any[]) => {
      // Fisher-Yates shuffle algorithm
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    
    // Apply the shuffle to randomize folder order
    const shuffledFolders: GoogleDriveFolder[] = shuffleFolders([...folders]).map(folder => ({
      id: folder.id!,
      name: folder.name!,
      mimeType: 'application/vnd.google-apps.folder'
    }));
    
    // Update cache
    cachedFolders = shuffledFolders;
    cacheTime = Date.now();
    
    // Return data with cache headers
    const response = createSuccessResponse<GoogleDriveFolder[]>(shuffledFolders, {
      requestId: crypto.randomUUID()
    });
    response.headers.set('X-Cache', 'MISS');
    return addCacheHeaders(response, 3600);
  } catch (error: any) {
    // Provide more specific error information
    let errorMessage = 'Failed to fetch folders';
    let userMessage = 'Unable to load folders. Please try again.';
    
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'Network connection error';
      userMessage = 'Network connection error. Please check your internet connection.';
    } else if (error.message?.includes('credentials')) {
      errorMessage = 'Google Drive authentication failed';
      userMessage = 'Authentication error. Please contact support.';
    } else if (error.message?.includes('permission')) {
      errorMessage = 'Permission denied';
      userMessage = 'Access denied. Please contact support.';
    }
    
    throw new AppError(
      errorMessage,
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      500,
      { 
        originalError: error.message,
        errorCode: error.code 
      },
      userMessage
    );
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
)(getFolders); 