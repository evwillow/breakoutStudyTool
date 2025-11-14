import React from "react";
import dynamic from "next/dynamic";
import type { PreviousSetupFile } from "../DateFolderBrowser.types";
import { formatDisplayDate, formatRelativeDate } from "../utils/dateUtils";

const StockChart = dynamic(() => import("../../StockChart"), { ssr: false });

interface FolderItemProps {
  file: PreviousSetupFile;
  isExpanded: boolean;
  onToggle: () => void;
  isLoading: boolean;
  data: unknown | null;
  currentBreakoutDate: Date | null;
}

export const FolderItem: React.FC<FolderItemProps> = ({
  file,
  isExpanded,
  onToggle,
  isLoading,
  data,
  currentBreakoutDate
}) => {
  const relativeLabel = formatRelativeDate(file.breakoutDate, currentBreakoutDate);
  const dateLabel = formatDisplayDate(file.breakoutDate);

  return (
    <div className="border border-white/30 rounded-lg overflow-hidden bg-black/40 backdrop-blur-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition"
      >
        <div className="flex flex-col text-white">
          <span className="font-semibold text-sm sm:text-base">{relativeLabel || dateLabel}</span>
          {relativeLabel && (
            <span className="text-xs text-white/50 mt-0.5">{dateLabel}</span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-white/60 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-white/30 bg-black/40 backdrop-blur-sm">
          {isLoading && (
            <div className="flex items-center justify-center min-h-[320px] text-white/60 text-sm">
              Loading chart…
            </div>
          )}

          {!isLoading && data && (
            <div className="min-h-[360px] bg-black/40 w-full">
              <StockChart
                data={data}
                showSMA
                chartType="previous"
                backgroundColor="transparent"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

