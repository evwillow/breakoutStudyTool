/**
 * @fileoverview Simple in-memory cache for local dataset responses used by flashcard APIs.
 * @module src/web/lib/cache/localDataCache.ts
 * @dependencies fs, path, @breakout-study-tool/shared
 */

import { promises as fs } from "fs";
import path from "path";
import type { LocalFolder, LocalFolderFile } from '@breakout-study-tool/shared';

// Re-export for backward compatibility
export type { LocalFolder, LocalFolderFile };

interface FileCacheEntry {
  data: unknown;
  mtimeMs: number;
  promise?: Promise<unknown>;
}

interface LocalDataCache {
  basePath: string | null;
  basePathResolved: boolean;
  folderIndex: LocalFolder[] | null;
  folderIndexLoadedAt: number;
  folderIndexPromise?: Promise<LocalFolder[]>;
  fileCache: Map<string, FileCacheEntry>;
}

// Optimized cache TTLs for faster data loading - increased for better performance
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes (increased from 10)
const FILE_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes (increased from 30)

// Priority order: env variable > root data/ > legacy paths
// Note: In Next.js, process.cwd() is the project root (where package.json is)
const POSSIBLE_BASE_PATHS = [
  // Environment variable path (highest priority - for production deployments)
  process.env.DATA_DIRECTORY ? path.join(process.env.DATA_DIRECTORY, "quality_breakouts") : null,
  // Root data/ directory (new standard location) - from project root
  path.join(process.cwd(), "data", "quality_breakouts"),
  // If running from src/web directory, go up two levels
  path.join(process.cwd(), "..", "..", "data", "quality_breakouts"),
  // Legacy paths (for backward compatibility during migration)
  path.join(process.cwd(), "src", "data-processing", "ds", "quality_breakouts"),
  path.join(process.cwd(), "..", "..", "src", "data-processing", "ds", "quality_breakouts"),
  // Using __dirname for more reliable path resolution
  path.join(__dirname, "..", "..", "..", "..", "data", "quality_breakouts"),
  path.join(__dirname, "..", "..", "..", "data-processing", "ds", "quality_breakouts"),
  path.join(__dirname, "..", "..", "..", "..", "..", "src", "data-processing", "ds", "quality_breakouts"),
  // Production paths
  "/var/www/html/breakoutStudyTool/data/quality_breakouts",
  "/var/www/html/breakoutStudyTool/src/data-processing/ds/quality_breakouts",
].filter((p): p is string => p !== null);

const globalCacheKey = "__BREAKOUT_LOCAL_DATA_CACHE__";

const cache: LocalDataCache =
  (globalThis as any)[globalCacheKey] ??
  ((globalThis as any)[globalCacheKey] = {
    basePath: null,
    basePathResolved: false,
    folderIndex: null,
    folderIndexLoadedAt: 0,
    fileCache: new Map<string, FileCacheEntry>(),
  });

async function resolveBasePath(): Promise<string> {
  if (cache.basePathResolved && cache.basePath) {
    return cache.basePath;
  }

  const attemptedPaths: string[] = [];
  const errorDetails: string[] = [];

  for (const testPath of POSSIBLE_BASE_PATHS) {
    attemptedPaths.push(testPath);
    try {
      await fs.access(testPath);
      cache.basePath = testPath;
      cache.basePathResolved = true;
      console.log(`[localDataCache] Found data directory at: ${testPath}`);
      return testPath;
    } catch (error: any) {
      // Log detailed error for debugging
      errorDetails.push(`  - ${testPath}: ${error.code || error.message}`);
      continue;
    }
  }

  cache.basePathResolved = true;
  const errorMessage = `Data directory not found. Attempted paths:\n${errorDetails.join('\n')}\n\nCurrent working directory: ${process.cwd()}\nDIRNAME: ${__dirname}\nDATA_DIRECTORY env: ${process.env.DATA_DIRECTORY || 'not set'}`;
  console.error(`[localDataCache] ${errorMessage}`);
  throw new Error(errorMessage);
}

async function getStatSafe(filePath: string) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    return null;
  }
}

function isFolderIndexFresh(): boolean {
  if (!cache.folderIndex) return false;
  return Date.now() - cache.folderIndexLoadedAt < CACHE_TTL_MS;
}

export async function getFolderIndex(): Promise<LocalFolder[]> {
  if (isFolderIndexFresh()) {
    return cache.folderIndex as LocalFolder[];
  }

  if (cache.folderIndexPromise) {
    return cache.folderIndexPromise;
  }

  const loadFolderIndex = async (): Promise<LocalFolder[]> => {
    try {
      const basePath = await resolveBasePath();
      console.log(`[localDataCache] Reading directory: ${basePath}`);
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      const stockDirectories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
      console.log(`[localDataCache] Found ${stockDirectories.length} stock directories`);

      const folder: LocalFolder = {
        id: "quality_breakouts",
        name: "quality_breakouts",
        files: [],
      };

      for (const stockDir of stockDirectories) {
        const stockDirPath = path.join(basePath, stockDir);
        let jsonFiles: string[] = [];
        try {
          jsonFiles = (await fs.readdir(stockDirPath)).filter((file) => file.endsWith(".json"));
        } catch (error) {
          console.error("[localDataCache] Failed to read directory:", stockDirPath, error);
          continue;
        }

        if (jsonFiles.length === 0) {
          continue;
        }

        // OPTIMIZATION: Skip fs.stat() calls to dramatically speed up folder indexing
        // File metadata (size, timestamps) is not needed for flashcard loading
        const now = new Date().toISOString();
        for (const jsonFile of jsonFiles) {
          folder.files.push({
            id: `${stockDir}_${jsonFile}`,
            name: stockDir,
            fileName: `${stockDir}/${jsonFile}`,
            mimeType: "application/json",
            size: 0, // Not needed for flashcards
            createdTime: now, // Placeholder - not used
            modifiedTime: now, // Placeholder - not used
          });
        }
      }

      cache.folderIndex = [folder];
      cache.folderIndexLoadedAt = Date.now();
      cache.folderIndexPromise = undefined;
      return cache.folderIndex;
    } catch (error) {
      cache.folderIndexPromise = undefined;
      console.error("[localDataCache] Error in getFolderIndex:", error);
      throw error;
    }
  };

  cache.folderIndexPromise = loadFolderIndex();

  try {
    return await cache.folderIndexPromise;
  } catch (error) {
    cache.folderIndexPromise = undefined;
    throw error;
  }
}

function isFileCacheEntryFresh(entry: FileCacheEntry | undefined, currentMtime: number | null): boolean {
  if (!entry) return false;
  if (currentMtime !== null && entry.mtimeMs !== currentMtime) {
    return false;
  }

  return Date.now() - entry.mtimeMs < FILE_CACHE_TTL_MS;
}

export async function getFileData(fileName: string): Promise<unknown> {
  const basePath = await resolveBasePath();
  const filePath = path.join(basePath, fileName);
  const stats = await getStatSafe(filePath);

  const currentMtime = stats?.mtimeMs ?? null;
  const cached = cache.fileCache.get(fileName);

  if (isFileCacheEntryFresh(cached, currentMtime)) {
    return cached!.data;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const readPromise = (async () => {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);

    cache.fileCache.set(fileName, {
      data: parsed,
      mtimeMs: currentMtime ?? Date.now(),
    });

    return parsed;
  })();

  cache.fileCache.set(fileName, {
    data: cached?.data ?? null,
    mtimeMs: cached?.mtimeMs ?? Date.now(),
    promise: readPromise,
  });

  try {
    return await readPromise;
  } catch (error) {
    cache.fileCache.delete(fileName);
    throw error;
  }
}

export async function invalidateFolderIndex() {
  cache.folderIndex = null;
  cache.folderIndexLoadedAt = 0;
}

export async function invalidateFileCache(fileName?: string) {
  if (fileName) {
    cache.fileCache.delete(fileName);
  } else {
    cache.fileCache.clear();
  }
}


