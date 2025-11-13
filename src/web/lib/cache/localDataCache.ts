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

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const FILE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const POSSIBLE_BASE_PATHS = [
  path.join(process.cwd(), "src", "data-processing", "ds", "quality_breakouts"),
  path.join(process.cwd(), "..", "..", "src", "data-processing", "ds", "quality_breakouts"),
  path.join(__dirname, "..", "..", "..", "data-processing", "ds", "quality_breakouts"),
  path.join(__dirname, "..", "..", "..", "..", "..", "src", "data-processing", "ds", "quality_breakouts"),
  "/var/www/html/breakoutStudyTool/src/data-processing/ds/quality_breakouts",
];

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

  for (const testPath of POSSIBLE_BASE_PATHS) {
    try {
      await fs.access(testPath);
      cache.basePath = testPath;
      cache.basePathResolved = true;
      return testPath;
    } catch {
      continue;
    }
  }

  cache.basePathResolved = true;
  throw new Error("Data directory not found in any of the expected locations");
}

async function getStatSafe(filePath: string) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    console.error("[localDataCache] Failed to stat file:", filePath, error);
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

  cache.folderIndexPromise = (async () => {
    const basePath = await resolveBasePath();
    const entries = await fs.readdir(basePath, { withFileTypes: true });
    const stockDirectories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

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

      for (const jsonFile of jsonFiles) {
        const filePath = path.join(stockDirPath, jsonFile);
        const stats = await getStatSafe(filePath);

        folder.files.push({
          id: `${stockDir}_${jsonFile}`,
          name: stockDir,
          fileName: `${stockDir}/${jsonFile}`,
          mimeType: "application/json",
          size: stats?.size ?? 0,
          createdTime: stats?.birthtime.toISOString() ?? new Date(0).toISOString(),
          modifiedTime: stats?.mtime.toISOString() ?? new Date(0).toISOString(),
        });
      }
    }

    cache.folderIndex = [folder];
    cache.folderIndexLoadedAt = Date.now();
    cache.folderIndexPromise = undefined;
    return cache.folderIndex;
  })();

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


