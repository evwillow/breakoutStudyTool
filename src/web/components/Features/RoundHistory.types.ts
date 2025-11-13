/**
 * @fileoverview Type definitions for RoundHistory component.
 * @module src/web/components/Features/RoundHistory.types
 */

export interface Round {
  id: string;
  name: string | null;
  dataset_name: string;
  created_at: string;
  accuracy: number | string | null;
  correctMatches?: number;
  totalMatches?: number;
  user_id: string;
}

export interface RoundHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadRound: (roundId: string, datasetName: string) => void;
  userId: string | null | undefined;
  onRefresh?: ((fetchRounds: () => Promise<void>) => void) | null;
}

export interface RoundCardProps {
  round: Round;
  onLoadRound: (roundId: string, datasetName: string) => void;
  onDeleteRound: (roundId: string) => Promise<void>;
  isDeleting: boolean;
  deletingId: string | null;
}

export interface TableViewProps {
  rounds: Round[];
  onLoadRound: (roundId: string, datasetName: string) => void;
  onDeleteRound: (roundId: string) => Promise<void>;
  isDeleting: boolean;
  deletingId: string | null;
}

