"use client";

import React, { useCallback, useState } from "react";
import type { DateFolderBrowserProps } from "./DateFolderBrowser.types";
import { EmptyState } from "./components/EmptyState";
import { FolderList } from "./components/FolderList";
import { useFolderData } from "./hooks/useFolderData";

const DateFolderBrowser: React.FC<DateFolderBrowserProps> = props => {
  const { session, currentStock, onChartExpanded } = props;

  const {
    files,
    fileData,
    isLoading,
    error,
    info,
    loadFileData,
    currentBreakoutDate
  } = useFolderData(props);

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadedFileIds, setLoadedFileIds] = useState<Set<string>>(new Set());

  // Load all files on mount
  const handleLoadFile = useCallback(
    async (fileId: string) => {
      if (!fileData[fileId] && !loadingId) {
        setLoadingId(fileId);
        await loadFileData(fileId);
        setLoadedFileIds(prev => new Set([...prev, fileId]));
        setLoadingId(prev => (prev === fileId ? null : prev));
      }
    },
    [fileData, loadFileData, loadingId]
  );

  // Load all files when they change
  React.useEffect(() => {
    files.forEach(file => {
      if (!fileData[file.id] && !loadedFileIds.has(file.id)) {
        handleLoadFile(file.id);
      }
    });
  }, [files, fileData, loadedFileIds, handleLoadFile]);

  return (
    <div className="w-full pt-6 px-1 sm:px-2 md:px-4 pb-4 relative">
      <div className="relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-black/40 px-4 py-2 rounded-md border border-white/30">
            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-base font-semibold text-white/90">Historical Setups</span>
          </div>
        </div>
      </div>

      {!session && (
        <EmptyState
          title="Sign in to browse previous setups."
          description="We need your session to load historical files."
        />
      )}

      {session && error && (
        <EmptyState
          title="Unable to load previous setups."
          description={error}
        />
      )}

      {session && !error && files.length === 0 && !isLoading && (
        <EmptyState
          title="No setups found"
        />
      )}

      {session && isLoading && files.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EmptyState
            title="Loading…"
          />
        </div>
      )}

      {session && files.length > 0 && (
        <FolderList
          files={files}
          expandedIds={[]}
          onToggle={handleLoadFile}
          loadingId={loadingId}
          fileData={fileData}
          currentBreakoutDate={currentBreakoutDate}
        />
      )}
      </div>
    </div>
  );
};

export default DateFolderBrowser;

