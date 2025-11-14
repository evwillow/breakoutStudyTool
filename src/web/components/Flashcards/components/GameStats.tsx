import React, { useMemo } from "react";

interface GameStatsProps {
  pointsTextArray: unknown;
  accuracy: number;
  matchCount?: number;
  correctCount?: number;
}

const GameStats: React.FC<GameStatsProps> = ({
  pointsTextArray,
  accuracy
}) => {
  const safePoints = useMemo(() => {
    if (!pointsTextArray) return [];
    if (Array.isArray(pointsTextArray)) {
      return pointsTextArray
        .map(item => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    }
    if (typeof pointsTextArray === "string") {
      return [pointsTextArray.trim()].filter(Boolean);
    }
    return [];
  }, [pointsTextArray]);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="bg-black/95 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/30 w-full min-w-0">
        {safePoints.length > 0 ? (
          <ul className="list-none space-y-1">
            {safePoints.map((text, index) => (
              <li key={`point-${index}-${text}`} className="flex items-start gap-2">
                <span className="text-white/70 text-sm flex-shrink-0 mt-0.5">•</span>
                <span className="text-sm text-white/90 font-medium break-words flex-1">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="min-h-[20px]" />
        )}
      </div>

      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-2 bg-black/95 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/30 w-full min-w-0">
          <span className="text-sm font-medium text-white/90">Avg. Accuracy:</span>
          <span className="text-base font-semibold text-white">{accuracy}%</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GameStats);

