/**
 * Stock Files API
 * 
 * Handles fetching stock-specific files from Google Drive
 */
import { NextRequest } from 'next/server';
import { createSuccessResponse, addCacheHeaders } from '../../_shared/utils/response';
import { withErrorHandling, withEnvironmentValidation, composeMiddleware } from '../../_shared/middleware/errorHandler';
import { StockFile } from '../../_shared/types/api';
import { initializeDriveClient, getParentFolderId } from '@/lib/googleDrive';
import { ValidationError, ErrorCodes } from '@/utils/errorHandling';

interface DriveFile {
  id?: string | null;
  name?: string | null;
}

/**
 * Get stock files from Google Drive
 */
async function getStockFiles(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stockSymbol = searchParams.get('stock');

  if (!stockSymbol) {
    throw new ValidationError(
      'Stock parameter is required',
      ErrorCodes.VALIDATION_REQUIRED_FIELD,
      400,
      {},
      'Please specify a stock symbol.'
    );
  }

  try {
    const drive = await initializeDriveClient();
    const PARENT_FOLDER_ID = getParentFolderId();

    // Search for folders that match the stock symbol
    const foldersResponse = await drive.files.list({
      q: `'${PARENT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and name contains '${stockSymbol}'`,
      fields: "files(id, name)",
      pageSize: 1000,
    });

    if (!foldersResponse.data.files?.length) {
      const response = createSuccessResponse<StockFile[]>([]);
      return addCacheHeaders(response, 300);
    }

    // Process each matching folder
    const stockFiles = await Promise.all(
      foldersResponse.data.files.map(async (folder: DriveFile) => {
        // Get all JSON files in this folder
        const filesResponse = await drive.files.list({
          q: `'${folder.id}' in parents and mimeType = 'application/json'`,
          fields: "files(id, name)",
          pageSize: 1000,
        });

        const jsonFiles = await Promise.all(
          (filesResponse.data.files || []).map(async (file: DriveFile) => {
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
        
        return {
          name: folder.name!,
          data: validJsonFiles.map(f => f.data).flat(),
          metadata: {
            symbol: stockSymbol,
            timeframe: 'unknown',
            lastUpdated: new Date().toISOString()
          }
        } as StockFile;
      })
    );

    // Filter out empty results
    const validStockFiles = stockFiles.filter(file => file.data.length > 0);

    const response = createSuccessResponse<StockFile[]>(validStockFiles);
    return addCacheHeaders(response, 300);
  } catch (error: any) {
    // Log error but return empty array to maintain compatibility
    console.error("Error fetching stock files:", error.message);
    
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
)(getStockFiles); 