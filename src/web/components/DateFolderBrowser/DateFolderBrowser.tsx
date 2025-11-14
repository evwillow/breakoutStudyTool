"use client";

import React, { useCallback, useState } from "react";
import type { DateFolderBrowserProps } from "./DateFolderBrowser.types";
import { EmptyState } from "./components/EmptyState";
import { FolderList } from "./components/FolderList";
import { useFolderData } from "./hooks/useFolderData";
import { useFolderNavigation } from "./hooks/useFolderNavigation";

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

  const { expandedIds, toggle, isExpanded } = useFolderNavigation(onChartExpanded);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (fileId: string) => {
      const shouldExpand = !isExpanded(fileId);

      if (shouldExpand && !fileData[fileId]) {
        setLoadingId(fileId);
        await loadFileData(fileId);
        setLoadingId(prev => (prev === fileId ? null : prev));
      }

      if (!shouldExpand) {
        setLoadingId(prev => (prev === fileId ? null : prev));
      }

      toggle(fileId, shouldExpand);
    },
    [fileData, isExpanded, loadFileData, toggle]
  );

  return (
    <div className="w-full pt-6 px-2 sm:px-6 md:px-10 pb-4 relative">
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
          title="No previous setups found."
          description="Try selecting a different breakout."
          hint={info || null}
        />
      )}

      {session && isLoading && files.length === 0 && (
        <EmptyState
          title="Loading…"
        />
      )}

      {session && files.length > 0 && (
        <FolderList
          files={files}
          expandedIds={expandedIds}
          onToggle={handleToggle}
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

