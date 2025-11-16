import React from "react";
import dynamic from "next/dynamic";
import type { PreviousSetupFile, CombinedFileData } from "../DateFolderBrowser.types";
import { formatDisplayDate, formatRelativeDate } from "../utils/dateUtils";
import { LoadingSpinner } from "@/components/UI/LoadingSpinner";

const StockChart = dynamic(() => import("../../StockChart"), { ssr: false });

interface FolderItemProps {
  file: PreviousSetupFile;
  isExpanded: boolean;
  onToggle: (fileId: string) => void;
  isLoading: boolean;
  data: unknown | null;
  currentBreakoutDate: Date | null;
}

export const FolderItem: React.FC<FolderItemProps> = ({
  file,
  onToggle,
  isLoading,
  data,
  currentBreakoutDate
}) => {
  const relativeLabel = formatRelativeDate(file.breakoutDate, currentBreakoutDate);
  const dateLabel = formatDisplayDate(file.breakoutDate);

  // Load data on mount if not already loaded
  React.useEffect(() => {
    if (!data && !isLoading) {
      onToggle(file.id);
    }
  }, [data, isLoading, onToggle, file.id]);

  return (
    <div className="border border-white/30 rounded-lg overflow-hidden backdrop-blur-sm bg-black/40">
      <div className="px-4 py-3 flex items-center justify-between text-left">
        <div className="flex flex-col text-white">
          <span className="font-semibold text-sm sm:text-base">{relativeLabel || dateLabel}</span>
          {relativeLabel && (
            <span className="text-xs text-white/50 mt-0.5">{dateLabel}</span>
          )}
        </div>
      </div>

      <div className="overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center min-h-[320px] gap-3 text-white/60 text-sm">
            <LoadingSpinner size="md" />
            <span>Loading chart…</span>
          </div>
        )}

        {!isLoading && data !== null && data !== undefined && (
          <div className="h-[360px] w-full overflow-hidden">
            <StockChart
              data={
                (data as CombinedFileData)?.d && Array.isArray((data as CombinedFileData).d)
                  ? (data as CombinedFileData).d
                  : Array.isArray(data)
                  ? data
                  : null
              }
              afterData={
                (data as CombinedFileData)?.after && Array.isArray((data as CombinedFileData).after)
                  ? (data as CombinedFileData).after
                  : null
              }
              showSMA
              chartType="previous"
              backgroundColor={null}
              tightPadding={true}
              progressPercentage={100}
              showAfterAnimation={true}
              afterAnimationComplete={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

