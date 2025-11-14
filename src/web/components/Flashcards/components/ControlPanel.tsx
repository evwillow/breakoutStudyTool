import React from "react";
import type { FolderOption } from "@breakout-study-tool/shared";
import GameStats from "./GameStats";

interface ControlPanelProps {
  selectedFolder: string | null;
  folderOptions: FolderOption[];
  onFolderChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  pointsTextArray: unknown;
  accuracy: number;
  matchCount: number;
  correctCount: number;
  onRoundHistory: () => void;
  onNewRound: () => void;
  isCreatingRound: boolean;
  onShuffleStocks?: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedFolder,
  folderOptions,
  onFolderChange,
  pointsTextArray,
  accuracy,
  matchCount,
  correctCount,
  onRoundHistory,
  onNewRound,
  isCreatingRound,
  onShuffleStocks
}) => (
  <div className="bg-transparent w-full">
    {/* Dataset selector (hidden by default, used during tutorial flows) */}
    <div className="flex flex-col gap-4 mb-4" style={{ display: "none" }}>
      <div className="flex flex-row flex-wrap gap-3">
        <div className="flex flex-col flex-1 min-w-[140px]">
          <label
            htmlFor="dataset-selector"
            className="mb-1 text-sm font-medium text-turquoise-700"
          >
            <svg
              className="w-4 h-4 inline-block mr-1 text-turquoise-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            Dataset:
          </label>
          <div className="relative w-full">
            <select
              id="dataset-selector"
              data-tutorial-folder-selector
              value={selectedFolder || ""}
              onChange={onFolderChange}
              className="p-3 sm:p-2 md:p-3 border border-turquoise-300 rounded-md text-turquoise-900 w-full text-base sm:text-sm md:text-base h-12 sm:h-auto appearance-none bg-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500 font-medium"
            >
              {folderOptions.map(({ key, value, label }) => (
                <option key={key} value={value} className="text-turquoise-900 font-medium">
                  {label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg
                className="h-5 w-5 text-turquoise-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="flex flex-col pt-1 sm:pt-2 lg:pt-2 px-1 sm:px-2 md:px-4 gap-3 items-start w-full relative z-50">
      <div className="w-full flex flex-row lg:flex-col items-start gap-3">
        <div className="flex-1 lg:flex-none lg:w-full min-w-0 basis-1/2 lg:basis-auto">
          <GameStats
            pointsTextArray={pointsTextArray}
            accuracy={accuracy}
            matchCount={matchCount}
            correctCount={correctCount}
          />
        </div>

        <div className="flex flex-col items-start gap-3 flex-1 lg:flex-none lg:w-full min-w-0 basis-1/2 lg:basis-auto">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/30 w-full min-w-0">
            <button
              onClick={onRoundHistory}
              data-tutorial-round-history
              className="flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors flex-1"
            >
              <svg
                className="w-4 h-4 text-white/70 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="whitespace-nowrap">Rounds</span>
            </button>
            <button
              onClick={onNewRound}
              disabled={isCreatingRound}
              className={`flex items-center justify-center rounded-md flex-shrink-0 ${
                isCreatingRound ? "opacity-50 cursor-not-allowed" : "hover:opacity-80 active:opacity-60"
              } transition-all`}
              title="New Round"
            >
              {isCreatingRound ? (
                <svg
                  className="w-4 h-4 text-white/70 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-white/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              )}
            </button>
            {onShuffleStocks && (
              <button
                onClick={onShuffleStocks}
                className="flex items-center justify-center rounded-md flex-shrink-0 hover:opacity-80 active:opacity-60 transition-all"
                title="Shuffle Stocks"
              >
                <svg
                  className="w-4 h-4 text-white/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default React.memo(ControlPanel);

