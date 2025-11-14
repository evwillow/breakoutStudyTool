import { useCallback, useEffect, useMemo, useState } from "react";
import type { FlashcardData } from "../../Flashcards/utils/dataProcessors";
import type {
  DateFolderBrowserProps,
  FileDataMap,
  PreviousSetupFile
} from "../DateFolderBrowser.types";
import { parseDirectoryDate, parseStockKey } from "../utils/dateUtils";

type UseFolderDataParams = Pick<
  DateFolderBrowserProps,
  "session" | "currentStock" | "flashcards" | "currentFlashcard"
>;

interface UseFolderDataResult {
  files: PreviousSetupFile[];
  fileData: FileDataMap;
  isLoading: boolean;
  error: string | null;
  info: string;
  loadFileData: (fileId: string) => Promise<void>;
  currentBreakoutDate: Date | null;
}

const QUALITY_BREAKOUTS_FOLDER = "quality_breakouts";

interface DirectoryMeta {
  breakoutDate: Date;
  path: string;
}

interface FlashcardCacheEntry {
  d: unknown[] | null;
  after: unknown[] | null;
}

const buildFlashcardCache = (
  flashcards: FlashcardData[] | undefined,
  ticker: string | null
): Map<string, FlashcardCacheEntry> => {
  const cache = new Map<string, FlashcardCacheEntry>();
  if (!flashcards || !ticker) return cache;

  flashcards.forEach(card => {
    card?.jsonFiles?.forEach(file => {
      if (!file?.fileName) return;
      const [directory] = file.fileName.split(/[/\\]/);
      if (!directory?.toLowerCase().startsWith(ticker)) return;

      const key = directory;
      const entry = cache.get(key) ?? { d: null, after: null };
      const fileName = file.fileName.toLowerCase();

      if (fileName.endsWith("/d.json") || fileName.endsWith("\\d.json")) {
        entry.d = (file as { data?: unknown[] }).data ?? null;
      }
      if (fileName.endsWith("/after.json") || fileName.endsWith("\\after.json")) {
        entry.after = (file as { data?: unknown[] }).data ?? null;
      }

      cache.set(key, entry);
    });
  });

  return cache;
};

const combineData = (entry: FlashcardCacheEntry | undefined): unknown[] | null => {
  if (!entry) return null;
  const { d, after } = entry;
  if (Array.isArray(d) && Array.isArray(after)) {
    return [...d, ...after];
  }
  if (Array.isArray(d)) return [...d];
  if (Array.isArray(after)) return [...after];
  return null;
};

export const useFolderData = ({
  session,
  currentStock,
  flashcards,
  currentFlashcard
}: UseFolderDataParams): UseFolderDataResult => {
  const { ticker, breakoutDate: currentBreakoutDate } = useMemo(
    () => parseStockKey(currentStock ?? null),
    [currentStock]
  );

  const [files, setFiles] = useState<PreviousSetupFile[]>([]);
  const [fileData, setFileData] = useState<FileDataMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState("");

  const flashcardCache = useMemo(
    () => buildFlashcardCache(flashcards, ticker),
    [flashcards, ticker, currentFlashcard]
  );

  useEffect(() => {
    if (!session) {
      setFiles([]);
      setFileData({});
      setIsLoading(false);
      setError(null);
      setInfo("");
      return;
    }

    if (!currentStock || !ticker || !currentBreakoutDate) {
      setFiles([]);
      setIsLoading(false);
      setError(null);
      setInfo(currentStock ? "Invalid stock format" : "Select a stock to view history.");
      return;
    }

    let isMounted = true;
    const abortController = new AbortController();

    const fetchDirectories = async (): Promise<void> => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);
      setInfo("");

      let timeoutId: NodeJS.Timeout | null = null;
      try {
        // Add timeout to prevent hanging
        timeoutId = setTimeout(() => {
          if (!abortController.signal.aborted) {
            abortController.abort();
          }
        }, 30000); // 30 second timeout

        const response = await fetch("/api/files/local-folders", { 
          signal: abortController.signal,
          credentials: 'include'
        });
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch folders (${response.status})`);
        }

        let responseData;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          throw new Error('Invalid JSON response from server');
        }
        
        // Handle both response formats: { success: true, data: { folders, totalFiles } } and { success: true, folders }
        const folders = responseData.data?.folders ?? responseData.folders;
        
        if (!Array.isArray(folders)) {
          throw new Error('Invalid response: folders is not an array');
        }
        
        const qualityFolder = folders.find?.(
          (folder: { name: string }) => folder.name === QUALITY_BREAKOUTS_FOLDER
        );

        if (!qualityFolder) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[useFolderData] quality_breakouts folder not found in response');
          }
          setInfo("No quality breakouts folder found.");
          setIsLoading(false);
          return;
        }

        const filesArray: Array<{ fileName?: string; name?: string }> = Array.isArray(
          qualityFolder?.files
        )
          ? qualityFolder.files
          : [];

        const directories = new Map<string, DirectoryMeta>();

        filesArray.forEach(file => {
          const rawPath = file.fileName ?? file.name;
          if (!rawPath) return;
          const [directory] = rawPath.split(/[/\\]/);
          if (!directory) return;

          const directoryTicker = directory.toLowerCase().split("_")[0];
          if (directoryTicker !== ticker) return;

          const directoryDate = parseDirectoryDate(directory);
          if (!directoryDate) return;
          if (directoryDate >= currentBreakoutDate) return;

          if (!directories.has(directory)) {
            directories.set(directory, {
              breakoutDate: directoryDate,
              path: directory
            });
          }
        });

        const nextFiles: PreviousSetupFile[] = Array.from(directories.entries()).map(
          ([directoryName, meta]) => ({
            id: directoryName,
            subfolder: directoryName,
            fileName: directoryName,
            data: undefined,
            path: directoryName,
            breakoutDate: meta.breakoutDate,
            directoryName
          })
        );

        nextFiles.sort((a, b) => b.breakoutDate.getTime() - a.breakoutDate.getTime());

        const prefetchedData: FileDataMap = {};
        nextFiles.forEach(file => {
          const combined = combineData(flashcardCache.get(file.directoryName));
          if (combined) {
            prefetchedData[file.id] = combined;
          }
        });

        if (!isMounted) return;

        setFiles(nextFiles);
        setFileData(prev => ({ ...prefetchedData, ...prev }));
        setInfo(
          nextFiles.length > 0
            ? `Found ${nextFiles.length} previous setups`
            : "No previous setups found for this ticker."
        );
        setIsLoading(false);
      } catch (err) {
        // Clear timeout if it's still pending
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        const error = err as { name?: string; message?: string };
        
        // Silently handle abort errors (component unmounted or dependency changed)
        if (error?.name === "AbortError") {
          // Component unmounted or dependency changed - don't update state
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }
        
        // Don't update state if component is unmounted
        if (!isMounted) {
          return;
        }
        
        // Handle network errors more gracefully
        if (error?.name === "TypeError" && error?.message?.includes("Failed to fetch")) {
          // Network error - might be offline or API unavailable
          setError("Unable to connect to server. Please check your connection.");
          setFiles([]);
          setInfo("");
          setIsLoading(false);
          return;
        }
        
        const message = err instanceof Error ? err.message : "Unknown error";
        
        // Only log unexpected errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error('[useFolderData] Error fetching directories:', err);
        }
        
        setError(message);
        setFiles([]);
        setInfo("");
        setIsLoading(false);
      }
    };

    fetchDirectories();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [session, currentStock, ticker, currentBreakoutDate, flashcardCache]);

  const loadFileData = useCallback(
    async (fileId: string) => {
      if (fileData[fileId]) return;
      
      const target = files.find(file => file.id === fileId);
      if (!target) {
        console.warn(`[useFolderData] File not found: ${fileId}`);
        return;
      }

      const tryFetch = async (path: string) => {
        try {
          const response = await fetch(
            `/api/files/local-data?file=${encodeURIComponent(path)}&folder=${encodeURIComponent(
              QUALITY_BREAKOUTS_FOLDER
            )}`
          );
          if (!response.ok) return null;
          
          const json = await response.json();
          
          // Handle API response structure: { success: true, data: { data: jsonData, fileName, folder } }
          const actualData = json.data?.data ?? json.data;
          
          if (Array.isArray(actualData)) {
            return actualData;
          }
          
          // Fallback: check if json.data itself is an array (old format)
          if (json?.success && Array.isArray(json.data)) {
            return json.data;
          }
          
          return null;
        } catch (err) {
          console.error(`[useFolderData] Error fetching ${path}:`, err);
          return null;
        }
      };

      const dPathUpper = `${target.path}/D.json`;
      const dPathLower = `${target.path}/d.json`;
      const afterPath = `${target.path}/after.json`;

      const flashcardEntry = flashcardCache.get(target.directoryName);
      const cachedCombined = combineData(flashcardEntry);
      if (cachedCombined) {
        setFileData(prev => ({ ...prev, [fileId]: cachedCombined }));
        return;
      }

      const dData =
        (await tryFetch(dPathUpper)) ??
        (await tryFetch(dPathLower)) ??
        (flashcardEntry?.d ?? null);

      if (!Array.isArray(dData) || dData.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[useFolderData] No valid D.json data found for ${fileId}`);
        }
        return;
      }

      const afterData =
        (await tryFetch(afterPath)) ??
        (Array.isArray(flashcardEntry?.after) ? flashcardEntry?.after : null);

      const combined = Array.isArray(afterData) && afterData.length > 0 ? [...dData, ...afterData] : [...dData];

      if (combined.length > 0) {
        setFileData(prev => ({ ...prev, [fileId]: combined }));
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[useFolderData] Combined data is empty for ${fileId}`);
        }
      }
    },
    [files, fileData, flashcardCache]
  );

  return {
    files,
    fileData,
    isLoading,
    error,
    info,
    loadFileData,
    currentBreakoutDate
  };
};

