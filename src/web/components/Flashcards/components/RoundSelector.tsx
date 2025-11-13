import React from "react";

interface RoundSummary {
  id: string;
  dataset_name: string;
  name?: string | null;
  created_at: string;
  completed?: boolean;
}

interface RoundSelectorProps {
  isOpen: boolean;
  roundName: string;
  availableRounds: RoundSummary[];
  isCreatingRound: boolean;
  onRoundNameChange: (value: string) => void;
  onGenerateRoundName: () => void;
  onCreateRound: () => void;
  onSelectRound: (roundId: string, datasetName: string) => void;
  onCancel: () => void;
}

const RoundSelector: React.FC<RoundSelectorProps> = ({
  isOpen,
  roundName,
  availableRounds,
  isCreatingRound,
  onRoundNameChange,
  onGenerateRoundName,
  onCreateRound,
  onSelectRound,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-none">
      <div className="relative bg-black/95 backdrop-blur-sm rounded-md shadow-xl max-w-md w-full p-6 pointer-events-auto border border-white/30">
        <div className="absolute inset-0 bg-gradient-to-br from-turquoise-500/5 via-transparent to-transparent pointer-events-none rounded-md" />

        <div className="relative z-10">
          <h3 className="text-xl font-semibold text-white mb-4">Choose Round</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-white/70 mb-2">
              Round Name (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roundName}
                onChange={event => onRoundNameChange(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter") {
                    onCreateRound();
                  }
                }}
                placeholder="Auto-generated if left blank"
                maxLength={100}
                className="flex-1 px-3 py-2 bg-black/50 border border-white/30 rounded-md focus:border-turquoise-500 focus:outline-none focus:ring-1 focus:ring-turquoise-500 text-white text-sm placeholder:text-white/50"
              />
              <button
                onClick={onGenerateRoundName}
                className="px-3 py-2 bg-black/95 backdrop-blur-sm border border-white/30 text-white/90 hover:text-white rounded-md text-sm font-medium transition-colors hover:bg-black/80"
                title="Generate name"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          {availableRounds.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-white/70 mb-3 text-sm uppercase tracking-wide">
                Recent Rounds:
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableRounds.map(round => (
                  <div
                    key={round.id}
                    className="flex items-center justify-between p-3 border border-white/30 rounded-md hover:bg-black/80 hover:border-white/50 cursor-pointer transition-all bg-black/95 backdrop-blur-sm"
                    onClick={() => onSelectRound(round.id, round.dataset_name)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white/90">
                        <span className={round.completed ? "text-turquoise-400" : "text-white/50"}>
                          {round.completed ? "✓" : "◯"}
                        </span>{" "}
                        {round.name || "Unnamed"} •{" "}
                        {new Date(round.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={onCreateRound}
              disabled={isCreatingRound}
              className="flex-1 bg-turquoise-500/20 hover:bg-turquoise-500/30 text-turquoise-400 hover:text-turquoise-300 px-4 py-2 rounded-md border border-turquoise-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
            >
              {isCreatingRound ? "Creating..." : "Start New Round"}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-black/95 backdrop-blur-sm border border-white/30 text-white/90 hover:text-white rounded-md hover:bg-black/80 transition-all font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RoundSelector);

